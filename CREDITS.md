# WARZONE - Credits

## Game

**WARZONE: Strategic Command & Control**
A browser-based 3D Real-Time Strategy game built with web technologies.

---

## 3D Model Assets

### Kenney.nl Asset Packs (CC0 - Public Domain)

All Kenney assets are licensed under **Creative Commons CC0 1.0 Universal** (Public Domain).
No attribution is required, but credit is given in appreciation of the work.

Source: [https://kenney.nl/assets](https://kenney.nl/assets)

| Pack | Version | Models Used In |
|------|---------|---------------|
| **Nature Kit** | 2.1 | Environment trees (tree_default, tree_oak, tree_cone, tree_detailed, tree_fat, tree_palm) |
| **Space Kit** | 2.0 | Turrets (turret-double, turret-single), aircraft (craft-cargo, craft-speeder), rockets |
| **Tower Defense Kit** | 2.1 | Superweapon facility (tower-round-top-a), turret towers, drone UFOs |
| **Castle Kit** | 2.0 | Bunker (tower-square-base), walls, gates, siege equipment |
| **City Kit Commercial** | 2.1 | Tech Lab (building-a), skyscrapers, city structures |
| **Car Kit** | 3.0 | Humvee/AA Half-Track, trucks, scout vehicle, APC |
| **Blaster Kit** | 2.1 | Weapon models (blaster variants), grenades |
| **Mini Arena** | 1.1 | Commander unit (character-soldier) - Additional credit: Tony Schaer |
| **Survival Kit** | - | Building structures (structure, structure-metal), fences, barrels, tents |
| **Pirate Kit** | - | Naval units (battleship, destroyer, patrol-boat, warship, landing-craft), cannons |

### Kay Lousberg - KayKit Medieval (CC0)

| Pack | Models Used In |
|------|---------------|
| **KayKit Medieval** | Supply Exchange (building_market_blue) |

Source: [https://kaylousberg.itch.io/](https://kaylousberg.itch.io/)

### Three.js Example Models (MIT License)

Source: [https://github.com/mrdoob/three.js](https://github.com/mrdoob/three.js)

| Model | Used As |
|-------|---------|
| **Soldier.glb** | Infantry unit (animated walk/run/idle) |
| **Xbot.glb** | Engineer unit (animated robot character) |
| **Ferrari.glb** | Vehicle reference model |

### Khronos Group glTF Sample Assets

| Model | License | Used As |
|-------|---------|---------|
| **DamagedHelmet (helmet.glb)** | CC-BY 4.0 | Reference model |

Original author: theblueturtle_ (Sketchfab)
Source: [https://github.com/KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)

---

## Audio

All sound effects are procedurally generated using the **Web Audio API**.
No external audio files are used.

---

## Code Libraries

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **Three.js** | 0.172.0 | MIT | 3D rendering engine |
| **GLTFLoader** | (Three.js addon) | MIT | GLTF/GLB model loading |

Source: [https://threejs.org/](https://threejs.org/)

---

## Tools & Technologies

- **JavaScript ES Modules** - Native browser modules, no build tools
- **HTML5 Canvas** - Minimap rendering
- **CSS3** - UI styling and animations
- **Web Audio API** - Procedural sound synthesis
- **Node.js** - Development server

---

## Development Team

### AI Agents — Claude Opus 4.6

| Role | Agent |
|------|-------|
| **Ability System** | Designed and implemented all active/passive unit and building abilities |
| **Accessibility** | Ensured playability across diverse hardware and input methods |
| **Animator** | Produced all character and building animations |
| **Anti-Cheat** | Detection and prevention of unfair play |
| **Asset Pipeline** | Import, processing, and delivery of all art and audio assets |
| **Backend Services** | Server-side services — accounts, leaderboards, persistence |
| **Balance Data** | Quantitative game health — unit stats, win rates, patch notes |
| **Build & CI** | Compilation, packaging, and delivery pipeline |
| **Build & Tech Tree** | Construction, production queuing, and tech prerequisites |
| **Campaign Scripting** | Single-player mission triggers, objectives, and scripted sequences |
| **Cinematic & Narrative** | In-engine story delivery — cutscenes, dialogue, subtitles |
| **Codebase Archaeology** | Analyzed the prototype to build shared knowledge for all agents |
| **Combat** | Damage calculation, combat resolution, attack mechanics |
| **Concept Artist** | Defined the visual language — faction identity, style guides |
| **Economy** | Resource gathering, income, and economic feedback loop |
| **Environment Artist** | Terrain textures, structures, props, environmental dressing |
| **Fog of War** | Visibility system — what each player can and cannot see |
| **Game Systems Designer** | Faction design, unit roles, balance targets, game feel |
| **HUD** | In-game heads-up display — selection, command card, resources |
| **Lobby & Matchmaking** | Pre-game experience — finding opponents and setting up matches |
| **Localization** | Internationalization pipeline — string tables, locale switching |
| **Map Editor** | Scenario editor — terrain painting, object placement, triggers |
| **Map & Terrain** | Terrain system, tile types, resource nodes |
| **Menus & Settings** | Main menu, settings, profile screens |
| **Minimap** | Tactical overview — unit dots, camera pan, pings, alerts |
| **Multiplayer Map Designer** | Competitive map layouts, resource placement, chokepoints |
| **Music** | Adaptive soundtrack — faction themes, combat intensity |
| **Narrative Designer** | Story, lore, unit voice lines, tooltips |
| **Networking & Sync** | Multiplayer simulation — deterministic lockstep, desync detection |
| **Pathfinding** | Unit navigation — A*, flow fields, formation movement |
| **Performance Profiling** | CPU, GPU, memory performance across target hardware |
| **Physics & Collision** | Collision detection, projectile physics, terrain interaction |
| **Platform Integration** | Storefronts, launchers, OS services |
| **Production** | Project coordination — milestone tracking, dependency management |
| **QA & Testing** | Automated test infrastructure — regression, determinism, benchmarks |
| **Rendering** | Visual output pipeline — shaders, LOD, fog-of-war visuals, post-processing |
| **Replay** | Recording, storage, and playback of game replays |
| **Sound Engine** | Runtime audio — spatial audio, voice lines, ambient sound, mixing |
| **Strategic AI** | High-level computer opponent — build orders, army composition, scouting |
| **Technical Artist** | Art/engine bridge — polygon budgets, rigging, shader library |
| **UI Artist** | Visual design of all interface elements — icons, menus, loading screens |
| **Unit AI** | Tactical micro — threat assessment, kiting, focus fire, retreat |
| **Unit Behavior** | Unit state machines, command queuing, targeting, formations |
| **Unit & Character Artist** | 3D models for units, heroes, and creatures |
| **VFX Artist** | Real-time visual effects — explosions, spells, projectiles |
| **Voice Director** | Voice over production — casting, session notes, VO QA |

### Human

**Cory Cowgill** — Humble Human Director

---

## License Notice

This game uses assets under the following licenses:

- **CC0 1.0 Universal (Public Domain)** - Kenney.nl assets, KayKit Medieval
- **MIT License** - Three.js, Three.js example models
- **CC-BY 4.0** - Khronos Group glTF Sample Assets (DamagedHelmet by theblueturtle_)
