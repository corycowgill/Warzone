# Warzone RTS - Art Asset Manifest

## Visual Style Guide

### Recommended Art Style: Low-Poly Stylized Military

The game should use a **low-poly stylized** aesthetic -- clean geometric shapes, flat or gradient shading, minimal textures. This style is:
- Performant in browser (Three.js / WebGL)
- Easy to maintain visual consistency across many asset sources
- Timeless -- does not age like realistic graphics
- Lightweight file sizes for fast web loading

**Target polygon budget per model:**
- Units: 300-2,000 triangles
- Buildings: 500-3,000 triangles
- Environment props: 50-500 triangles

### Faction Color Palette

Colors are already defined in Constants.js NATIONS. Apply via tinted materials or texture atlas swaps:

| Faction   | Primary Color | Hex       | Accent          |
|-----------|--------------|-----------|-----------------|
| America   | Blue         | `#3355FF` | White/Silver    |
| Britain   | Green        | `#33AA33` | Khaki           |
| France    | Blue-Violet  | `#6666FF` | White/Red       |
| Japan     | Red          | `#FF3333` | White            |
| Germany   | Gray         | `#666666` | Dark Red/Black  |
| Austria   | Orange-Brown | `#CC6633` | White/Red       |

**Implementation:** Load models as neutral gray/olive, then apply team color via `mesh.material.color.set(nationColor)` or use a color-swap shader for multi-part models.

### Scale Guidelines

- 1 game unit = ~1 meter
- Infantry: ~1.8 units tall
- Tank: ~3 units long, ~1.5 units tall
- Buildings: 4-8 units footprint depending on `size` in Constants.js
- Naval units: 5-15 units long (scaled down from realistic for gameplay readability)

---

## Primary Asset Sources (Recommended)

These sources are prioritized for consistency, license clarity, and GLTF support:

| Priority | Source | URL | License | Why |
|----------|--------|-----|---------|-----|
| 1 | **Poly Pizza** | https://poly.pizza/ | CC-BY (most) | Huge library, GLTF downloads, no login, consistent low-poly style |
| 2 | **Kenney.nl** | https://kenney.nl/assets | CC0 | Professional quality, GLTF/GLB included, completely free |
| 3 | **Quaternius** | https://quaternius.com/ | CC0 | 2500+ models, game-ready, GLTF via Poly Pizza |
| 4 | **Kay Lousberg (KayKit)** | https://kaylousberg.itch.io/ | CC0 | Beautiful stylized packs, GLTF included |
| 5 | **Sketchfab** | https://sketchfab.com/ | Various CC | Massive library, GLTF download, filter by license |
| 6 | **OpenGameArt.org** | https://opengameart.org/ | Various CC | Community contributed, mixed quality |
| 7 | **ambientCG** | https://ambientcg.com/ | CC0 | PBR textures and HDRIs |
| 8 | **Poly Haven** | https://polyhaven.com/ | CC0 | HDRIs and environment maps |

---

## Unit Models

### Infantry
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Low Poly Military Vehicles bundle (includes soldiers) | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | GLTF/FBX | ~500 | Bundle by Zsky, consistent style with tanks |
| Sketchfab | Low Poly Soldiers Rigged Free | https://sketchfab.com/3d-models/low-poly-soldiers-rigged-free-8474871344b041b690d9c91d983cc214 | CC-BY | GLTF | ~800 | By MadTrollStudio, rigged and animated |
| Sketchfab | Low Poly Soldier | https://sketchfab.com/3d-models/low-poly-soldier-daf5de38902e458aa57ff5ba9460ca02 | CC-BY | GLTF | ~400 | By Kolos Studios, simple clean style |
| Poly Pizza | Soldier models | https://poly.pizza/search/soldier | CC-BY | GLTF | Varies | Browse for best style match |

**Recommendation:** Use MadTrollStudio's rigged soldiers from Sketchfab -- they come with animations and match well with low-poly vehicle styles.

### Tank
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Low Poly Military Vehicles (Zsky) | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | GLTF/FBX | ~600 | Includes Tank + Light Tank, 9 vehicle bundle |
| itch.io | Free Stylized Tank (MrEliptik) | https://mreliptik.itch.io/free-lowpoly-tank-3d-model | CC0 | GLTF/FBX | ~500 | Stylized, clean design, CC0 |
| Sketchfab | Low-poly Military Vehicles Pack | https://sketchfab.com/3d-models/low-poly-military-vehicles-pack-48137988cfef4ff88f51b08b996ecc1f | CC-BY | GLTF | ~700 | By MedSamer, includes tank + APC + truck |
| Poly Pizza | Tank search | https://poly.pizza/search/tank | CC-BY | GLTF | Varies | Many options available |

**Recommendation:** MrEliptik's CC0 tank for zero-attribution simplicity, or the Zsky bundle for a complete matching military vehicle set.

### Drone (UAV)
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Drone models | https://poly.pizza/search/drone | CC-BY | GLTF | Varies | Multiple low-poly drone options |
| FetchCFD | Drone 3D Model | https://fetchcfd.com/threeDViewGltf/1658-drone-3d-model | Free | GLB/OBJ | ~400 | Quadcopter style |
| Sketchfab | Various low-poly drones | https://sketchfab.com/search?q=low+poly+drone&type=models&sort_by=-likeCount | Various CC | GLTF | Varies | Filter by downloadable + CC license |

**Recommendation:** Search Poly Pizza for a simple quadcopter or military drone shape that matches the stylized aesthetic.

### Plane (Fighter Jet)
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Sketchfab | FREE Fighter Jet Collection - Low Poly | https://sketchfab.com/3d-models/free-fighter-jet-collection-low-poly-cb5966c988d9403895be89b364c2252f | CC-BY | GLTF | ~500 each | By bohmerang, includes F-35, F-22, F-18 |
| Poly Pizza | Jet / airplane search | https://poly.pizza/search/jet | CC-BY | GLTF | Varies | Multiple options |
| Quaternius | Aircraft models (via Poly Pizza) | https://poly.pizza/u/Quaternius | CC0 | GLTF | ~400 | Check for airplane/jet models |

**Recommendation:** bohmerang's fighter jet collection on Sketchfab -- multiple real-world jet models in consistent low-poly style, free CC-BY.

### Battleship
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Low Poly Battleship | https://poly.pizza/m/cqV6mUkn7Ow | CC-BY | GLTF/OBJ | ~800 | By Angelo Raffaele Catalano |
| Poly Pizza | Ship search | https://poly.pizza/search/ship | CC-BY | GLTF | Varies | Multiple warship options |
| Sketchfab | Military Vehicles Pack (vkh3d) | https://sketchfab.com/3d-models/military-vehicles-pack-in-low-poly-9b4f6eac5a874772b84fb3a4edd9b1d7 | Various | GLTF | ~1000 | 16-piece pack includes naval |

**Recommendation:** Poly Pizza's low poly battleship by Angelo Raffaele Catalano -- clean style, direct GLTF download.

### Carrier (Aircraft Carrier)
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Carrier / aircraft carrier search | https://poly.pizza/search/aircraft%20carrier | CC-BY | GLTF | Varies | Look for simple flat-deck carrier shape |
| 3DModels.org | Cavour Aircraft Carrier | https://3dmodels.org/3d-models/cavour-aircraft-carrier/ | Free | GLTF 2.0 | ~2000 | Detailed but may need simplification |
| Sketchfab | Low poly warships | https://sketchfab.com/search?q=low+poly+aircraft+carrier&type=models | Various CC | GLTF | Varies | Filter by free + CC |

**Recommendation:** Search Poly Pizza for a simple carrier silhouette. If none found, the Cavour model from 3DModels.org is available in GLTF 2.0 but may need polygon reduction.

### Submarine
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Poly Pizza | Submarine (Poly by Google) | https://poly.pizza/m/7-3Vgg6rR4j | CC-BY | GLTF | ~300 | Simple, clean low-poly submarine |
| Poly Pizza | Submarine search | https://poly.pizza/search/submarine | CC-BY | GLTF | Varies | Multiple options |
| itch.io | PSX Style Low Poly Submarine | https://blendervoyage.itch.io/psxstylelowpolysubmarine | Free | GLTF/FBX | ~400 | Retro stylized |

**Recommendation:** The Poly by Google submarine on Poly Pizza -- simple silhouette, direct GLTF, CC-BY.

---

## Building Models

### Headquarters
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| KayKit | Medieval Hexagon Pack (castle/keep) | https://kaylousberg.itch.io/kaykit-medieval-hexagon | CC0 | GLTF/FBX | ~1500 | Includes large buildings, can repurpose castle as HQ |
| Sketchfab | Low Poly Military Building | https://sketchfab.com/3d-models/low-poly-military-building-game-ready-241c8df97f8c46cf8864740b446e411e | CC-BY | GLTF | ~800 | Game-ready military building by 3RDimens |
| ITHappy Studios | Military FREE Pack | https://ithappystudios.com/free/military-free/ | Free | GLTF/FBX | ~700 | 26 assets including HQ-style buildings |
| OpenGameArt | Military Base 3D Model | https://opengameart.org/content/military-base-3d-model | CC/OGA | Various | ~1000 | Simple military base model |

**Recommendation:** ITHappy Studios Military FREE pack -- includes multiple military building types with consistent style and GLTF support.

### Barracks
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| ITHappy Studios | Military FREE Pack | https://ithappystudios.com/free/military-free/ | Free | GLTF/FBX | ~500 | Includes barracks-style buildings |
| KayKit | Medieval Hexagon Pack (barracks included) | https://kaylousberg.itch.io/kaykit-medieval-hexagon | CC0 | GLTF | ~600 | Has barracks model in 4 team colors |
| OpenGameArt | LowPoly Buildings Pack | https://opengameart.org/content/lowpoly-buildings-pack | CC-BY | FBX/OBJ | ~400 | Modular building pieces |
| Kenney | Tower Defense Kit | https://kenney.nl/assets/tower-defense-kit | CC0 | GLTF/GLB | ~300 | Tower/base building pieces |

### War Factory
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| ITHappy Studios | Military FREE Pack (hangar/garage) | https://ithappystudios.com/free/military-free/ | Free | GLTF/FBX | ~700 | Hangar or garage model works as war factory |
| OpenGameArt | Modular Buildings | https://opengameart.org/content/modular-buildings | CC0 | FBX/OBJ | ~800 | 100 modular pieces, construct factory |
| Kenney | Tower Defense Kit | https://kenney.nl/assets/tower-defense-kit | CC0 | GLTF/GLB | ~500 | Modular base pieces |

### Airfield
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| ITHappy Studios | Military FREE Pack (hangar) | https://ithappystudios.com/free/military-free/ | Free | GLTF/FBX | ~700 | Hangar model for airfield |
| Poly Pizza | Hangar / airport search | https://poly.pizza/search/hangar | CC-BY | GLTF | Varies | Low-poly hangar options |

### Shipyard
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Kenney | Pirate Kit (dock pieces) | https://kenney.nl/assets/pirate-kit | CC0 | GLTF/GLB | ~400 | 70 assets, includes dock/pier structures |
| Poly Pizza | Dock / pier search | https://poly.pizza/search/dock | CC-BY | GLTF | Varies | Waterfront structures |

### Resource Depot
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| KayKit | Medieval Hexagon Pack (mine/warehouse) | https://kaylousberg.itch.io/kaykit-medieval-hexagon | CC0 | GLTF | ~500 | Mine or warehouse model |
| Kenney | Tower Defense Kit | https://kenney.nl/assets/tower-defense-kit | CC0 | GLTF/GLB | ~300 | Storage/resource building pieces |
| OpenGameArt | LowPoly Buildings Pack | https://opengameart.org/content/lowpoly-buildings-pack | CC-BY | FBX/OBJ | ~400 | Warehouse-type structures |

### Ditch (Defensive)
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| Kenney | Tower Defense Kit (walls/barriers) | https://kenney.nl/assets/tower-defense-kit | CC0 | GLTF/GLB | ~100 | Wall segments and barriers |
| Procedural | Generate in code | N/A | N/A | N/A | ~50 | Simple trench geometry can stay procedural |

**Recommendation:** The ditch is simple enough to remain procedural (a terrain depression with sandbag edges). Use Kenney Tower Defense Kit walls if you want a visual upgrade.

---

## Environment Assets

### Trees and Vegetation
| Source | Asset | URL | License | Format | Poly Count | Notes |
|--------|-------|-----|---------|--------|------------|-------|
| **Kenney** | **Nature Kit** | https://kenney.nl/assets/nature-kit | CC0 | GLTF/GLB | 50-200 each | **330 assets** -- trees, bushes, rocks, grass. Top pick. |
| Quaternius | 150+ LowPoly Nature Models | https://quaternius.itch.io/150-lowpoly-nature-models | CC0 | FBX/OBJ/GLTF | 50-300 | Animated trees, flowers, mushrooms |
| KayKit | Forest Nature Pack | https://kaylousberg.itch.io/kaykit-forest | CC0 | GLTF | 50-200 | Stylized forest props |

**Recommendation:** Kenney Nature Kit is the gold standard -- 330 CC0 assets with GLTF, perfectly optimized for games.

### Terrain Textures
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| **ambientCG** | PBR Materials Library | https://ambientcg.com/ | CC0 | PNG/JPG | 2000+ PBR materials -- grass, dirt, sand, snow, rock |
| OpenGameArt | CC0 Terrain Textures | https://opengameart.org/content/cc0-terrain-textures | CC0 | PNG | Grass, rock, stone, wood, dirt |
| OpenGameArt | 30 Grass Textures (Tileable) | https://opengameart.org/content/30-grass-textures-tilable | CC0 | PNG | 30 seamless grass variations |
| itch.io | Watercolor Terrain Textures | https://voxelcorelab.itch.io/watercolor-terrain-textures | CC0 | PNG | 16 hand-painted textures, stylized |

**Recommendation:** ambientCG for realistic PBR terrain, or the Watercolor set from Voxel Core Lab for stylized look matching low-poly models.

### Water
| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| Three.js Examples | Water shader | Built-in | MIT | Three.js includes `Water.js` and `Water2.js` examples |
| ambientCG | Water textures | https://ambientcg.com/ | CC0 | Normal maps for water surface |

**Recommendation:** Use Three.js built-in Water shader -- it is already optimized for the engine and looks great.

### Skybox / Environment Map
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| **Poly Haven** | HDRI Sky Maps | https://polyhaven.com/hdris/skies | CC0 | HDR/EXR | Hundreds of free sky HDRIs, perfect for Three.js |
| HDRI Skies | Sky HDRIs | https://hdri-skies.com/free-hdris/ | Free (commercial OK) | HDR | 2K resolution sky maps |
| FreeStylized | Stylized Skyboxes | https://freestylized.com/all-skybox/ | Free | PNG/Cubemap | Stylized game skyboxes |
| ambientCG | Environment Maps | https://ambientcg.com/ | CC0 | HDR | High quality, various categories |

**Recommendation:** Poly Haven sky HDRIs -- CC0, high quality, perfect for Three.js `PMREMGenerator`. Use a clear day sky for default, overcast for dramatic battles.

---

## Effects and Textures

### Explosion Effects
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| OpenGameArt | Smoke Particle Assets | https://opengameart.org/content/smoke-particle-assets | CC0 | PNG | 77 particles in 5 styles (explosion, smoke, flash) |
| itch.io | Explosion/Particle FX | https://itch.io/game-assets/tag-explosions/tag-sprites | Various | PNG/Spritesheet | Multiple free explosion sprite packs |

### Smoke / Particles
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| OpenGameArt | Smoke Particle Assets | https://opengameart.org/content/smoke-particle-assets | CC0 | PNG | Black smoke, white puff, flash effects |
| Procedural | Three.js particle system | Built-in | N/A | N/A | Use `THREE.Points` with small textures |

### Muzzle Flash
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| OpenGameArt | Smoke Particle Assets (flash style) | https://opengameart.org/content/smoke-particle-assets | CC0 | PNG | Includes "flash" particle style |
| Procedural | Additive blended sprite | N/A | N/A | N/A | Simple yellow-white circle with additive blending |

### Selection Indicators / Health Bars
| Source | Notes |
|--------|-------|
| Procedural | Best kept procedural -- `THREE.RingGeometry` for selection circles, `THREE.PlaneGeometry` with color for health bars |

**Recommendation:** Keep selection indicators and health bars procedural. They need to scale dynamically and match faction colors. The current approach of rendering them in Three.js is correct.

---

## Audio Assets

### Weapon / Combat Sounds
| Source | Asset | URL | License | Format | Notes |
|--------|-------|-----|---------|--------|-------|
| **Happy Soul Music** | Heavy Weapons & Explosions SFX | https://happysoulmusic.com/heavy-weapons-and-explosions-sound-effects/ | CC0 | OGG/MP3 | 93 tracks: cannon, grenade, mortar, tank, RPG, etc. |
| OpenGameArt | 100 CC0 SFX | https://opengameart.org/content/100-cc0-sfx | CC0 | WAV/OGG | General game sounds including impacts |
| OpenGameArt | CC0 Sound Effects | https://opengameart.org/content/cc0-sound-effects | CC0 | Various | Military/combat focused CC0 sounds |
| Zapsplat | Gun Sound Effects | https://www.zapsplat.com/sound-effect-category/guns/ | Royalty-free | MP3/WAV | Professional weapon recordings, free with attribution |

### Ambient / Music
| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| OpenGameArt | Music section | https://opengameart.org/art-search-advanced?keys=military+music&field_art_type_tid=12 | Various CC | Search for military/strategy game music |
| Kenney | Music tracks | https://kenney.nl/assets?t=audio | CC0 | General game music |

### UI Sounds
| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| Kenney | UI Audio | https://kenney.nl/assets/ui-audio | CC0 | Click, hover, confirm sounds |
| OpenGameArt | 100 CC0 SFX | https://opengameart.org/content/100-cc0-sfx | CC0 | Includes UI-appropriate sounds |

**Note:** The game already has a procedural SoundManager using Web Audio API. These assets would replace/supplement those procedural sounds for higher quality.

---

## Integration Plan

### Phase 1: Quick Wins (Highest Visual Impact)
1. **Kenney Nature Kit** -- Replace terrain with trees, rocks, grass props
2. **Poly Haven HDRI Skybox** -- Instant atmosphere upgrade
3. **Three.js Water shader** -- Replace flat blue plane with reflective water

### Phase 2: Unit Models
1. Download GLTF models from Poly Pizza / Sketchfab
2. Create `AssetManager.js` using `THREE.GLTFLoader`
3. Apply faction colors via material override
4. Scale models to game unit sizes

### Phase 3: Building Models
1. Source from ITHappy Studios Military pack + Kenney Tower Defense Kit
2. Match building footprint to `size` values in Constants.js
3. Add construction animation (scale from 0 to 1)

### Phase 4: Effects and Polish
1. Add particle textures for explosions and smoke
2. Replace procedural sounds with recorded audio
3. Add terrain textures with splatmap blending

### Asset Loading Architecture
```javascript
// Recommended GLTFLoader setup for Three.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

// Load and cache models
const modelCache = new Map();
async function loadModel(name, url) {
    if (modelCache.has(name)) return modelCache.get(name);
    const gltf = await loader.loadAsync(url);
    modelCache.set(name, gltf.scene);
    return gltf.scene;
}
```

### File Organization
```
warzone/
  assets/
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
      environment/
        trees/
        rocks/
        props/
    textures/
      terrain/
        grass.png
        dirt.png
        sand.png
        snow.png
      effects/
        explosion.png
        smoke.png
        muzzle.png
      skybox/
        sky.hdr
    audio/
      weapons/
      ui/
      music/
```

---

## License Summary

| License | Assets Using It | Attribution Required? |
|---------|----------------|----------------------|
| CC0 | Kenney, Quaternius, KayKit, ambientCG, Poly Haven | No |
| CC-BY | Poly Pizza (most), some Sketchfab | Yes -- credit author |
| CC-BY-SA | Some OpenGameArt | Yes -- share alike |

**Recommendation:** Prefer CC0 assets where possible to avoid attribution complexity. For CC-BY assets, maintain a `CREDITS.md` file listing all attributed authors.

---

## Top Recommended Asset Bundles (Best Value)

These bundles provide the most assets in a single download with consistent style:

1. **Kenney Nature Kit** (330 assets, CC0, GLTF) -- Environment
2. **Kenney Tower Defense Kit** (160 assets, CC0, GLTF) -- Buildings/structures
3. **ITHappy Studios Military FREE** (26 assets, Free, GLTF) -- Military buildings
4. **Poly Pizza "Low Poly Military Vehicles" by Zsky** (9 models, CC-BY, GLTF) -- Vehicles
5. **KayKit Medieval Hexagon Pack** (200+ assets, CC0, GLTF) -- Buildings in team colors
6. **Sketchfab Fighter Jet Collection by bohmerang** (multiple jets, CC-BY, GLTF) -- Air units
7. **Poly Haven HDRIs** (hundreds, CC0, HDR) -- Skyboxes
8. **ambientCG Materials** (2000+, CC0, PNG) -- Terrain textures
