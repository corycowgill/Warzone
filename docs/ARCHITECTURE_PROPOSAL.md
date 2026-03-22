# Warzone RTS Engine -- Architecture Proposal

**Author:** Game Engine Architect
**Date:** 2026-03-22
**Status:** Proposal

---

## A. ENGINE ASSESSMENT

### Current Strengths

1. **Clean module structure.** The codebase is well-organized into 43 ES module files across logical directories (`core/`, `rendering/`, `world/`, `entities/`, `units/`, `buildings/`, `systems/`, `ai/`, `ui/`). Import paths are clear and there are no circular dependencies.

2. **Working game loop and state machine.** `Game.js` has a proper `MENU -> NATION_SELECT -> LOADING -> PLAYING -> GAME_OVER` state machine with clean transitions. The `requestAnimationFrame` loop is correctly structured with delta-time-based updates.

3. **EventBus decoupling.** The pub/sub EventBus enables loose coupling between systems (combat events, production events, selection changes). This is a solid foundation that should be preserved and extended.

4. **Functional A* pathfinding.** `PathfindingSystem` implements A* with a MinHeap open set, 8-directional movement, path simplification, and domain-aware routing (land vs. naval vs. air). The 5000-iteration cap prevents freezes.

5. **Detailed procedural geometry.** Every unit and building is hand-crafted from Three.js primitives with impressive detail -- tanks have tracks, wheels, turret rings, exhaust pipes; infantry have helmets, weapons, boots. This shows care for visual identity.

6. **Multi-domain combat.** The system supports land, air, and naval units with damage modifiers, armor reduction, attack rates, and auto-target acquisition. The `DAMAGE_MODIFIERS` matrix creates meaningful counter-play.

7. **AI with strategic layers.** The `AIController` has three update layers (strategic at 10s, tactical at 3s, micro at 1s) with build orders, tech tree awareness, and retreat logic.

8. **Zero build tooling.** Using CDN importmaps and a simple HTTP server means zero configuration, instant setup, and no npm/webpack complexity. For a prototype, this is a genuine advantage.

### Current Weaknesses

1. **No object pooling.** Every unit, projectile, geometry, and material is allocated fresh and never recycled. With 50 units per team, 100+ projectiles, and explosion particles, this creates significant GC pressure and frame hitches.

2. **O(n^2) entity queries everywhere.** `CombatSystem.update()` filters all entities for units, then for each unit iterates all enemies. `SelectionManager.handleClick()` traverses every mesh of every entity. `ResourceSystem.tick()` filters all entities for buildings. These linear scans happen every frame or every few frames.

3. **No spatial partitioning.** Range checks in `autoAcquireTarget()` and `CombatSystem` compute distances between every unit and every enemy -- O(units * enemies) per frame. With 100 entities this is 10,000 distance calculations per second.

4. **Massive draw call count.** Each procedural unit is a `THREE.Group` containing 20-60 individual meshes (e.g., Infantry has ~25 meshes, Tank has ~30, Headquarters has ~50). With 100 entities, that is 2,000-6,000 draw calls -- far beyond the ~200-300 budget for smooth 60fps.

5. **No frustum culling optimization.** Three.js does basic frustum culling on individual meshes, but with entities as Groups containing many children, culling efficiency is poor. No LOD system exists.

6. **Geometry/material duplication.** Each Infantry instance creates its own `BoxGeometry`, `SphereGeometry`, `MeshPhongMaterial` instances. 50 infantry means 50 copies of identical helmet geometry and material. This wastes GPU memory.

7. **Pathfinding on main thread.** A* with 5000-iteration cap on a 128x128 grid runs synchronously. Multiple simultaneous pathfinding requests (e.g., moving 20 units at once) can cause frame drops.

8. **No fog of war.** All entities are always visible. This eliminates scouting, ambushes, and information asymmetry -- core RTS mechanics.

9. **No control groups.** Players cannot assign units to numbered groups (Ctrl+1, press 1 to select). This is a fundamental RTS interaction missing.

10. **Health bars as 3D meshes.** Each entity creates 3D plane meshes for health bars that billboard toward the camera. This adds 2 draw calls per entity and fights the rendering pipeline. Screen-space UI would be more efficient.

11. **UI built with inline styles and DOM manipulation.** The HUD, production panel, and build menu use extensive inline CSS strings and `innerHTML`. This is fragile, hard to maintain, and causes layout thrashing.

12. **No asset loading pipeline.** Everything is procedural geometry. There is no `GLTFLoader`, no texture loading, no asset manifest, no loading screen with progress. The game cannot use artist-created models.

13. **Memory leaks on restart.** `Game.restart()` removes meshes from the scene but does not dispose geometries, materials, or textures. The `EventBus` listeners from destroyed systems are never cleaned up. The `SelectionManager`'s DOM selection box element is never removed.

14. **Single shadow-casting light.** One `DirectionalLight` covers the entire 256x256 world with a 300x300 shadow camera. Shadow map resolution is spread thin, causing visible shadow acne and peter-panning.

15. **No sound spatialization.** `SoundManager` plays procedural sounds globally with no positional audio. Combat sounds from across the map are heard at full volume.

### Performance Bottlenecks (Priority Order)

| Bottleneck | Impact | Cause |
|---|---|---|
| Draw calls | **Critical** | 20-60 meshes per entity, no instancing |
| Entity queries | **High** | Array.filter() on every entity every frame |
| Combat range checks | **High** | O(n^2) distance calculations |
| Pathfinding | **Medium** | Synchronous A* on main thread |
| GC pressure | **Medium** | No object pooling, temporary Vector3 allocations |
| Shadow rendering | **Low** | Single massive shadow map |

### Scalability Concerns

- **Entity count ceiling at ~80-100** before frame rate drops below 60fps on mid-range hardware, primarily due to draw calls.
- **Map size limited to 128x128 grid** (256 world units). Larger maps would require chunked terrain, hierarchical pathfinding, and LOD.
- **No multiplayer architecture.** All game state is in-memory with direct method calls. No command buffer, no deterministic simulation, no state serialization.
- **No save/load.** Entity state is distributed across class instances with no serialization layer.

---

## B. RECOMMENDED ARCHITECTURE

### Keep Three.js, Add Infrastructure

Three.js is the right choice for a browser-based 3D RTS. The CDN importmap approach should be extended (not replaced with a bundler) for as long as possible. The focus should be on adding missing infrastructure within the Three.js ecosystem.

### Entity Component System (ECS) -- Lightweight

Do NOT adopt a full ECS framework (bitecs, ecsy). Instead, evolve the current Entity hierarchy into a **component-based entity model** that preserves the existing class structure while enabling data-oriented queries.

```
Entity
  .components = Map<string, ComponentData>
  - PositionComponent { x, y, z, rotation }
  - HealthComponent { current, max, armor }
  - CombatComponent { damage, range, attackRate, cooldown, targetId }
  - MovementComponent { speed, domain, moveTarget, waypoints }
  - RenderComponent { meshId, visible, lodLevel }
  - SelectableComponent { selected, selectionRingRadius }
  - ProductionComponent { queue, currentItem, timer }
```

**EntityManager** replaces `Game.entities[]`:
- Maintains typed arrays indexed by entity ID for cache-friendly iteration
- Provides `query(components[])` to efficiently find entities with specific components
- Maintains per-team entity lists to avoid `filter(e => e.team === team)` every frame

### Spatial Partitioning

Implement a **uniform grid** (not a quadtree -- simpler, faster for RTS with uniform entity distribution):

```
SpatialGrid {
  cellSize: 16  // world units per cell
  cells: Map<cellKey, Set<entityId>>

  insert(entity)
  remove(entity)
  update(entity)  // called when entity moves
  queryRadius(x, z, radius) -> entityId[]
  queryRect(x1, z1, x2, z2) -> entityId[]
}
```

This reduces combat range checks from O(n^2) to O(n * k) where k is the number of entities in nearby cells.

### Render Pipeline

1. **Merge entity geometries** into shared `BufferGeometry` instances. All infantry share one geometry.
2. **Use `InstancedMesh`** for identical unit types. 50 infantry = 1 draw call with 50 instances.
3. **LOD system**: Full detail within 50 units, simplified geometry at 50-150, billboard sprites beyond 150.
4. **Object pooling** for projectiles, particles, and effects.

### Asset Manager

```
AssetManager {
  cache: Map<string, LoadedAsset>

  loadGLTF(url) -> Promise<Group>
  loadTexture(url) -> Promise<Texture>
  getModel(key) -> Group.clone()
  preloadManifest(manifest) -> Promise<void>

  // Keeps reference counts, disposes when unused
  release(key)
}
```

Extend the importmap to include Three.js addons:
```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/"
  }
}
```

### State Machine Improvements

- Add `PAUSED` state between `PLAYING` transitions
- Add `LOADING` state with actual progress tracking (asset preloading)
- Make state transitions emit events with `previousState` for proper cleanup
- Add `dispose()` method to every system for clean shutdown

---

## C. NEW SYSTEMS NEEDED

### 1. Asset Pipeline

**Priority: Phase 1**

```
src/systems/AssetManager.js

- GLTFLoader integration via importmap addons
- Model caching with clone-on-request
- Texture atlas support for unit team colors
- Loading progress callbacks for loading screen
- Fallback to procedural geometry when models are unavailable
```

The import map update:
```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/"
  }
}
```

Usage: `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';`

### 2. Fog of War

**Priority: Phase 1**

Grid-based visibility system with three states per cell:

| State | Visual | Meaning |
|---|---|---|
| **Hidden** | Black overlay | Never explored |
| **Explored** | Darkened, grayscale | Previously seen but not currently visible |
| **Visible** | Full color | Currently within a friendly unit's vision radius |

Implementation approach:
- Maintain a `Uint8Array(mapSize * mapSize)` visibility grid per team
- Each frame, clear visible cells to explored, then mark cells within each unit's `vision` radius as visible
- Render fog as a full-screen quad with a `DataTexture` sampled in a custom `ShaderMaterial`
- Hide enemy units/buildings that are not in visible cells
- Minimap respects fog state

This is the single most impactful gameplay feature missing from the prototype.

### 3. Particle System

**Priority: Phase 2**

Replace the current `EffectsManager` explosion spheres with a proper GPU particle system:

```
ParticleSystem {
  pools: Map<effectType, ParticlePool>

  emit(type, position, params)
  update(delta)

  // Effect types:
  - explosion: 20-40 particles, orange/yellow, outward burst + gravity
  - smoke: 8-12 particles, gray, slow rise, fade
  - muzzleFlash: 1-3 particles, bright white/yellow, instant fade
  - buildingFire: continuous emitter, orange/red, upward draft
  - dust: 4-8 particles, tan, ground-level spread on movement
  - waterSplash: 6-10 particles, blue/white, for naval combat
}
```

Use `THREE.Points` with a custom `ShaderMaterial` for GPU-accelerated particles. One draw call per particle type regardless of count.

### 4. Audio Engine

**Priority: Phase 4**

Extend `SoundManager` with:

```
AudioEngine extends SoundManager {
  // Positional audio
  createPositionalSound(soundName, position, range)

  // Music system
  playMusic(trackName, { loop, fadeIn })
  stopMusic({ fadeOut })
  crossfadeMusic(newTrack, duration)

  // Ambient layers
  addAmbientLayer(name, sound, volume)  // wind, birds, distant artillery

  // Sound pools (prevent overlapping identical sounds)
  poolSize: 4  // max simultaneous attack sounds
}
```

Use Three.js `PositionalAudio` tied to `AudioListener` on the camera for spatialized combat sounds. Distant battles should sound distant.

### 5. UI Framework

**Priority: Phase 2**

Replace inline HTML/CSS string building with a lightweight panel system:

```
UIPanel {
  element: HTMLElement
  visible: boolean

  show() / hide() / toggle()
  setContent(html)
  addChild(panel)

  // Auto-cleanup on destroy
  destroy()
}

UIManager {
  panels: Map<string, UIPanel>
  tooltipSystem: TooltipManager

  createPanel(config) -> UIPanel
  showTooltip(text, screenPos)
  hideTooltip()
}
```

Specific UI improvements:
- **Health bars as HTML overlays** instead of 3D meshes (use CSS transforms to position over entities)
- **Tooltip system** for hovering over units/buildings/buttons
- **Drag selection box** as a CSS element (already partially done)
- **Control group bar** showing groups 0-9 with unit counts
- **Minimap improvements**: click-drag to scroll, right-click to issue commands

### 6. Networking (Future)

**Priority: Phase 5**

Architecture for deterministic lockstep multiplayer:

```
CommandBuffer {
  // All player actions are recorded as commands
  commands: Command[]

  addCommand(playerId, type, params, tick)
  getCommandsForTick(tick) -> Command[]
}

NetworkManager {
  ws: WebSocket

  // Lockstep: game advances in fixed ticks
  // Each tick, players exchange commands
  // Game state is deterministic given same commands

  sendCommand(command)
  onCommandReceived(callback)

  // Sync check: hash game state periodically
  computeStateHash() -> number
}
```

Key requirement: the game loop must become **deterministic** -- no `Math.random()` in gameplay code (use seeded PRNG), no floating-point-dependent branching, fixed timestep.

### 7. Save/Load System

**Priority: Phase 3**

```
Serializer {
  serialize(game) -> JSON
  deserialize(json, game)
}

// Each entity/system implements:
interface Serializable {
  toJSON() -> object
  fromJSON(data)
}
```

Serialize: entity positions, health, teams, production queues, resource balances, AI state, terrain seed. Do NOT serialize meshes -- reconstruct from entity data.

### 8. Replay System

**Priority: Phase 5**

Built on top of the command buffer:

```
ReplayRecorder {
  recording: boolean
  commands: { tick, playerId, type, params }[]

  startRecording()
  recordCommand(tick, command)
  stopRecording() -> ReplayData
  saveReplay(filename)
}

ReplayPlayer {
  replayData: ReplayData
  currentTick: number
  speed: number  // 0.5x, 1x, 2x, 4x

  play() / pause() / seekToTick(tick)
}
```

### 9. Camera System

**Priority: Phase 1**

Extend `CameraController` with:

```
CameraController {
  // Existing: keyboard pan, edge pan, zoom, rotation

  // New features:
  smoothFollow(target, offset)     // smooth lerp to target position
  bookmark(slot)                   // save camera position to slot 0-9
  recallBookmark(slot)             // restore camera position
  focusOnEntity(entity)            // center camera on entity with smooth transition
  shake(intensity, duration)       // screen shake on explosions

  // Edge scrolling with dead zones near UI elements
  edgeScrollExclusions: Rect[]     // don't edge-scroll near minimap, panels

  // Smooth zoom with easing
  zoomTo(level, duration)
}
```

---

## D. PERFORMANCE OPTIMIZATIONS

### 1. Object Pooling

Create a generic pool and specific pools:

```js
class ObjectPool {
  constructor(factory, reset, initialSize = 20) {
    this.pool = [];
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : this.factory();
  }

  release(obj) {
    this.reset(obj);
    this.pool.push(obj);
  }
}
```

Apply to:
- **Projectiles**: Pool of 50, reset position/direction/alive state
- **Particles**: Pool of 200 per effect type
- **Vector3 temporaries**: Pool of 20 reusable Vector3 objects for calculations
- **Raycaster results**: Reuse intersection arrays

### 2. Instanced Rendering

Replace individual unit meshes with `THREE.InstancedMesh`:

```js
// One InstancedMesh per unit type per team
const infantryMesh = new THREE.InstancedMesh(
  sharedInfantryGeometry,
  infantryMaterial,
  MAX_INFANTRY
);

// Per-instance data:
// - Transform matrix (position + rotation)
// - Color (team tint via instanceColor)
// - Custom attributes (health for shader-based health bars)
```

Expected draw call reduction: from ~3,000 to ~50.

For the current procedural geometry (multi-mesh groups), the approach is:
1. **Short term**: Merge each unit's Group into a single `BufferGeometry` using `BufferGeometryUtils.mergeGeometries()`
2. **Medium term**: Replace procedural geometry with GLTF models (one mesh per unit)
3. **Long term**: Use InstancedMesh with GLTF geometry

### 3. Frustum Culling Optimization

- Set `entity.mesh.frustumCulled = true` (default) but ensure bounding spheres are computed correctly for Groups
- Call `entity.mesh.updateMatrixWorld()` only when entity moves (not every frame)
- For entities far from camera, skip health bar updates and animation

### 4. Web Workers for Pathfinding

Move A* to a Web Worker:

```js
// pathfinding.worker.js
self.onmessage = (e) => {
  const { requestId, start, end, domain, grid } = e.data;
  const path = astar(start, end, domain, grid);
  self.postMessage({ requestId, path });
};

// PathfindingSystem.js
class PathfindingSystem {
  constructor(game) {
    this.worker = new Worker('js/workers/pathfinding.worker.js');
    this.pendingRequests = new Map();
    this.worker.onmessage = (e) => this.handleResult(e.data);
  }

  findPathAsync(start, end, domain) {
    return new Promise((resolve) => {
      const id = this.nextRequestId++;
      this.pendingRequests.set(id, resolve);
      this.worker.postMessage({ requestId: id, start, end, domain, grid: this.walkableGrid });
    });
  }
}
```

Transfer the walkable grid once on game start; only send start/end per request.

### 5. Spatial Hashing for Combat Range Checks

Replace the current O(n^2) approach:

```js
class SpatialHash {
  constructor(cellSize = 16) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(x, z) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  insert(entity) {
    const pos = entity.getPosition();
    const key = this._key(pos.x, pos.z);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(entity);
    entity._spatialKey = key;
  }

  update(entity) {
    const pos = entity.getPosition();
    const newKey = this._key(pos.x, pos.z);
    if (newKey !== entity._spatialKey) {
      this.remove(entity);
      this.insert(entity);
    }
  }

  remove(entity) {
    if (entity._spatialKey && this.cells.has(entity._spatialKey)) {
      this.cells.get(entity._spatialKey).delete(entity);
    }
  }

  queryRadius(x, z, radius) {
    const results = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCZ = Math.floor((z - radius) / this.cellSize);
    const maxCZ = Math.floor((z + radius) / this.cellSize);
    const r2 = radius * radius;

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const cell = this.cells.get(`${cx},${cz}`);
        if (!cell) continue;
        for (const entity of cell) {
          const pos = entity.getPosition();
          const dx = pos.x - x, dz = pos.z - z;
          if (dx * dx + dz * dz <= r2) results.push(entity);
        }
      }
    }
    return results;
  }
}
```

### 6. Additional Optimizations

- **Skip updates for off-screen entities**: Only update animations/visual state for entities within the camera frustum
- **Throttle AI**: AI already runs at 1s/3s/10s intervals -- keep this
- **Batch EventBus emissions**: Queue events during update, flush after update completes
- **Reuse materials**: Create material singletons per team color, share across all entities of that type
- **Dispose on removal**: When entities die, properly dispose geometry/material/texture to free GPU memory

---

## E. FILE STRUCTURE

### Proposed New Organization

```
warzone/
  index.html
  server.js
  css/
    style.css
    ui-panels.css        # NEW: extracted panel styles
  assets/                # NEW
    models/
      units/
        infantry.glb
        tank.glb
        drone.glb
        plane.glb
        battleship.glb
        carrier.glb
        submarine.glb
      buildings/
        headquarters.glb
        barracks.glb
        warfactory.glb
        airfield.glb
        shipyard.glb
        resourcedepot.glb
        ditch.glb
    textures/
      terrain/
        grass.png
        sand.png
        rock.png
        water_normal.png
      ui/
        icons/          # unit/building icons for HUD
    audio/
      sfx/
      music/
  js/
    main.js
    core/
      Game.js
      Constants.js
      EventBus.js
      EntityManager.js       # NEW: replaces Game.entities[]
      SpatialHash.js         # NEW: spatial partitioning
      ObjectPool.js          # NEW: generic object pool
    rendering/
      SceneManager.js
      CameraController.js
      EffectsManager.js
      ParticleSystem.js      # NEW: GPU particles
      FogOfWar.js            # NEW: visibility rendering
      LODManager.js          # NEW: level of detail
    world/
      Terrain.js
      Minimap.js
      TerrainChunk.js        # NEW: for larger maps
    entities/
      Entity.js
      Unit.js
      Building.js
      Projectile.js
      components/            # NEW: component data classes
        PositionComponent.js
        HealthComponent.js
        CombatComponent.js
        MovementComponent.js
        RenderComponent.js
    units/
      Infantry.js
      Tank.js
      Drone.js
      Plane.js
      Battleship.js
      AircraftCarrier.js
      Submarine.js
      UnitFactory.js
    buildings/
      Headquarters.js
      Barracks.js
      WarFactory.js
      Airfield.js
      Shipyard.js
      ResourceDepot.js
      Ditch.js
      BuildingFactory.js
    systems/
      InputManager.js
      SelectionManager.js
      CommandSystem.js
      CombatSystem.js
      ResourceSystem.js
      ProductionSystem.js
      PathfindingSystem.js
      SoundManager.js
      AssetManager.js        # NEW: model/texture loading
      FogOfWarSystem.js      # NEW: visibility logic
      ControlGroupSystem.js  # NEW: Ctrl+1-9 groups
      SaveLoadSystem.js      # NEW: serialization
    ai/
      AIController.js
      AIStrategist.js        # NEW: extracted from AIController
      AITactician.js         # NEW: extracted from AIController
    ui/
      UIManager.js
      HUD.js
      MainMenu.js
      GameOverScreen.js
      UIPanel.js             # NEW: base panel class
      TooltipManager.js      # NEW: tooltip system
      ControlGroupBar.js     # NEW: visual control group display
    workers/                 # NEW
      pathfinding.worker.js
  docs/
    ARCHITECTURE_PROPOSAL.md
    GAME_DESIGN_DOCUMENT.md
```

### Module Dependency Graph (Simplified)

```
main.js
  -> Game.js
       -> EventBus.js, Constants.js
       -> SceneManager.js -> THREE
       -> CameraController.js -> THREE
       -> Terrain.js -> THREE, Constants
       -> Minimap.js -> Constants
       -> EntityManager.js (NEW) -> SpatialHash.js (NEW)
       -> InputManager.js -> THREE
       -> SelectionManager.js -> THREE
       -> CommandSystem.js -> THREE, PathfindingSystem
       -> CombatSystem.js -> Projectile, Constants
       -> ResourceSystem.js -> Constants
       -> ProductionSystem.js -> Constants, UnitFactory, BuildingFactory
       -> PathfindingSystem.js -> Constants
       -> SoundManager.js
       -> AIController.js -> Constants
       -> UIManager.js -> HUD, GameOverScreen
       -> UnitFactory.js -> Infantry, Tank, Drone, Plane, Battleship, AircraftCarrier, Submarine
       -> BuildingFactory.js -> Headquarters, Barracks, WarFactory, Airfield, Shipyard, ResourceDepot, Ditch
       -> EffectsManager.js -> THREE
       -> FogOfWarSystem.js (NEW) -> FogOfWar.js (NEW)
       -> ControlGroupSystem.js (NEW)
       -> AssetManager.js (NEW) -> GLTFLoader
```

### Build System Recommendation

**Stay with no-build for now.** The CDN importmap approach works well and eliminates tooling complexity. Consider adding a build step only when:
- The project needs npm packages that are not available via CDN
- Code splitting becomes necessary for load times
- TypeScript is adopted for type safety

If/when a build system is needed, use **Vite** -- it supports importmaps, has near-zero config, and handles Three.js tree-shaking well.

---

## F. IMPLEMENTATION PHASES

### Phase 1: Critical Infrastructure (Weeks 1-3)

**Goal: Make the game feel like a real RTS**

1. **Fog of War** -- Grid-based visibility system with explored/visible/hidden states. Render as a full-screen shader overlay. This is the most impactful gameplay addition.

2. **Control Groups** -- Ctrl+0-9 to assign, 0-9 to recall, double-tap to center camera. Store as arrays of entity IDs. Display in a HUD bar.

3. **Entity Manager + Spatial Hash** -- Replace `Game.entities[]` with a managed collection. Spatial hash for O(1) neighbor queries. Refactor `CombatSystem.autoAcquireTarget()` to use spatial queries.

4. **Asset Manager skeleton** -- `GLTFLoader` integration, importmap addon support, model caching. Initially load one test model to prove the pipeline.

5. **Camera improvements** -- Smooth transitions, camera bookmarks (F5-F8), screen shake, edge scroll dead zones near UI panels.

6. **Memory cleanup** -- Add `dispose()` to all systems, proper geometry/material disposal on entity death, EventBus listener cleanup on restart.

### Phase 2: Visual Overhaul (Weeks 4-6)

**Goal: Look like a modern browser game**

1. **Instanced rendering** -- Merge procedural geometry per unit type into single BufferGeometry. Use InstancedMesh for units of the same type and team.

2. **Particle system** -- GPU-based particles via `THREE.Points` and custom shaders. Replace sphere-based explosions.

3. **Terrain upgrade** -- Texture splatting (grass/sand/rock blend based on height), water shader with animated normals, terrain shadows.

4. **GLTF model loading** -- Replace procedural geometry with artist-created models as they become available. Maintain procedural fallbacks.

5. **LOD system** -- 3 LOD levels per entity type. Switch based on distance from camera.

6. **Lighting improvements** -- Cascaded shadow maps or split the shadow into near/far regions. Add ambient occlusion.

### Phase 3: Gameplay Systems (Weeks 7-10)

**Goal: Depth and replayability**

1. **Unit abilities** -- Special abilities per unit type (e.g., infantry entrench, tank siege mode, drone EMP). Cooldown-based with visual feedback.

2. **Upgrade system** -- Research upgrades at buildings (armor, damage, speed). Apply as stat modifiers.

3. **Veterancy** -- Units gain experience from kills. Veteran units get stat bonuses and visual indicators (stars/chevrons).

4. **Formation system** -- Units move in formation (line, wedge, column). Maintain relative positions.

5. **Rally point visualization** -- Show rally point flags with lines from buildings.

6. **Build preview** -- Ghost mesh of building at cursor during placement mode with red/green validity indication.

### Phase 4: Polish (Weeks 11-14)

**Goal: Production quality feel**

1. **Audio engine** -- Positional audio, music system with crossfading, ambient sound layers, sound pooling to prevent overlap.

2. **UI overhaul** -- Panel-based UI system, tooltip manager, animated transitions, control group bar, minimap command support.

3. **Camera polish** -- Smooth follow for selected units, cinematic mode for replays, proper edge scroll feel.

4. **Visual effects** -- Unit death animations, building construction animation (rising from ground), selection circle pulse, damage smoke on low-health buildings.

5. **AI improvements** -- Difficulty levels, more strategies, flanking behavior, coordinated attacks, economy management.

6. **Nation differentiation** -- Unique bonuses per nation (damage, speed, armor, cost reductions), unique unit skins.

### Phase 5: Advanced Features (Weeks 15+)

**Goal: Competitive and community features**

1. **Save/Load** -- Full game state serialization to JSON. Auto-save at intervals. Save slot UI.

2. **Replay system** -- Command recording during gameplay. Replay viewer with speed controls, camera freedom, timeline scrubbing.

3. **Multiplayer** -- WebSocket server, deterministic lockstep simulation, lobby system, player matchmaking.

4. **Campaign mode** -- Scripted missions with objectives, story triggers, map transitions.

5. **Map editor** -- In-game terrain editing, entity placement, save/load custom maps.

---

## G. THREE.JS SPECIFIC RECOMMENDATIONS

### Features to Leverage

| Feature | Use Case | Priority |
|---|---|---|
| `InstancedMesh` | Render 50+ identical units in 1 draw call | **Critical** |
| `ShaderMaterial` | Fog of war overlay, particle system, water shader | **High** |
| `DataTexture` | Fog of war grid, terrain color map | **High** |
| `BufferGeometryUtils.mergeGeometries()` | Merge multi-mesh units into single geometry | **High** |
| `PositionalAudio` + `AudioListener` | Spatialized combat sounds | **Medium** |
| `LOD` object | Automatic detail switching by distance | **Medium** |
| `Frustum` | Manual culling checks for update skipping | **Medium** |
| `Raycaster` layers | Separate layers for terrain, units, buildings, UI | **Medium** |
| `WebGLRenderTarget` | Minimap rendering, post-processing | **Low** |
| `EffectComposer` | Bloom on muzzle flashes, SSAO | **Low** |

### Import Map Updates

Current:
```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js"
  }
}
```

Recommended:
```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/"
  }
}
```

This enables importing any Three.js addon:
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BufferGeometryUtils } from 'three/addons/utils/BufferGeometryUtils.js';
```

### Performance Best Practices for Three.js RTS

1. **Never create geometry/material in update loops.** Pre-create all variants at initialization.

2. **Reuse materials aggressively.** All infantry of the same team share one `MeshPhongMaterial` instance. Changing one material property changes all entities -- use this for team color tinting.

3. **Use `Object3D.matrixAutoUpdate = false`** for static entities (buildings). Manually call `updateMatrix()` only when the building is placed or destroyed.

4. **Minimize `scene.traverse()`** calls. The current codebase traverses entity meshes for raycasting on every click. Cache the mapping instead.

5. **Use `Layers`** for raycasting efficiency:
   ```js
   terrain.mesh.layers.set(0);
   playerUnits.forEach(u => u.mesh.layers.set(1));
   enemyUnits.forEach(u => u.mesh.layers.set(2));
   buildings.forEach(b => b.mesh.layers.set(3));
   raycaster.layers.set(1); // Only test player units
   ```

6. **Limit shadow casters.** Only buildings and large units (tanks, ships) should cast shadows. Infantry and projectiles should not.

7. **Pool Vector3 and Matrix4 objects.** Every `new THREE.Vector3()` in an update loop creates GC pressure. Declare them at module scope and reuse.

8. **Use `renderer.info`** to monitor draw calls, triangles, and textures during development:
   ```js
   console.log('Draw calls:', renderer.info.render.calls);
   console.log('Triangles:', renderer.info.render.triangles);
   ```

---

## Summary: Top 5 Architectural Priorities

1. **Fog of War** -- The single most impactful gameplay feature missing. Adds scouting, stealth, ambush, and information warfare.

2. **Instanced Rendering + Geometry Merging** -- The single most impactful performance fix. Reduces draw calls from ~3,000 to ~50.

3. **Spatial Hash + EntityManager** -- Eliminates O(n^2) combat queries and per-frame array filtering. Makes 200+ entity games viable.

4. **Control Groups + Camera Bookmarks** -- Core RTS interaction pattern that every player expects. Quick to implement, high impact on playability.

5. **Object Pooling + Memory Management** -- Eliminates GC hitches, prevents memory leaks on restart, enables sustained play sessions.

These five changes transform the prototype from a tech demo into a playable RTS engine.
