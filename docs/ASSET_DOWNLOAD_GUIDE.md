# Warzone RTS - Asset Download Guide

## Quick Start: Priority Downloads

These are the TOP priority downloads that will have the biggest visual impact.
Download each model, export/convert to GLB format, and place in the specified directory.

### TIER 1: Complete Packs (Download These First)

| Pack | URL | License | Models | Destination |
|------|-----|---------|--------|-------------|
| **Zsky Military Vehicles** | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | 9 vehicles (tank, APC, hummer, etc.) | `assets/models/units/` |
| **Zsky Military Base** | https://zsky2000.itch.io/military-base-pack | CC-BY | 20+ buildings | `assets/models/buildings/` |
| **ITHappy Military FREE** | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | 26 assets (mortar, tent, barrels) | `assets/models/buildings/` + `assets/models/environment/` |
| **britdawgmasterfunk RTS Mercs 1** | https://sketchfab.com/3d-models/rts-mercenaries-1-cc0-280b03056863466798bcd92dd012432f | CC0 | RTS soldiers | `assets/models/units/` |
| **britdawgmasterfunk RTS Mercs 2** | https://sketchfab.com/3d-models/rts-mercenaries-2-cc0-779cd2eafedd456abd1e6879a67c6720 | CC0 | More RTS soldiers | `assets/models/units/` |
| **vonBerlichingen HoI4 Collection** | https://sketchfab.com/vonBerlichingen | CC-BY | WWII subs, carriers, planes, bunkers | Multiple dirs |

### TIER 2: Critical Individual Replacements

| Unit/Building | Best Model | URL | License | Save As |
|--------------|-----------|-----|---------|---------|
| **Fighter Plane** | Low-poly Propeller Plane by RC-Studios | https://sketchfab.com/3d-models/low-poly-propeller-plane-3ca91472b1b64072a0d3a64d86690df8 | CC-BY | `assets/models/units/fighter-jet.glb` |
| **Bomber** | Junkers EF 132 by vonBerlichingen | https://sketchfab.com/3d-models/junkers-ef-132-low-poly-375794303a544ba780c0f73942366d24 | CC-BY | `assets/models/units/craft-cargo.glb` |
| **Heavy Tank** | Low Poly Tiger 1 by SGAstudio | https://sketchfab.com/3d-models/low-poly-tiger-1-673d62cd884d45cba535007b0553f954 | CC-BY | `assets/models/units/heavy-tank.glb` |
| **Tank** | FREE Stylized Tank by MrEliptik | https://mreliptik.itch.io/free-lowpoly-tank-3d-model | CC0 | `assets/models/units/tank.glb` |
| **Submarine** | Submarine Low Poly by vonBerlichingen | https://sketchfab.com/3d-models/submarine-low-poly-e363d3575d23495aa79fc8f3d9b88a67 | CC-BY | `assets/models/units/submarine.glb` |
| **Aircraft Carrier** | Graf Zeppelin by vonBerlichingen | https://sketchfab.com/3d-models/german-aircraft-carrier-graf-zeppelin-low-poly-826d09ed54ab425a83ba09e82f082c70 | CC-BY | `assets/models/units/warship.glb` |
| **Superweapon** | Rocket Launch Base by vonBerlichingen | https://sketchfab.com/3d-models/rocket-launch-base-low-poly-2d3e9be60c9b4dbf8b5aabb0a60f75cd | CC-BY | `assets/models/buildings/tower-defense/tower-round-build-f.glb` |
| **Bunker** | U-Boot Bunker WW2 by vonBerlichingen | https://sketchfab.com/3d-models/u-boot-bunker-ww2-low-poly-0780d3a9092f4dc589bf829db5151150 | CC-BY | `assets/models/buildings/bunker.glb` |
| **Scout Car** | Willys Jeep by SilkevdSmissen | https://sketchfab.com/3d-models/low-poly-military-jeep-willys-mb-ww2-scene-fcf129444005466ebd6cbbe0685aeec2 | CC-BY | `assets/models/units/scout-vehicle.glb` |

### TIER 3: Nice-to-Have Upgrades

| Unit/Building | Best Model | URL | License |
|--------------|-----------|-----|---------|
| Battleship | Low Poly Battleship by Catalano | https://poly.pizza/m/cqV6mUkn7Ow | CC-BY |
| Commander | Military RTS Character 1 by britdawgmasterfunk | https://sketchfab.com/3d-models/military-rts-character-1-cc0-908065a7006443b29edca30276750a6d | CC0 |
| Mortar | ITHappy Military FREE (mortar model) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free |
| Drone | LOW POLY DRONE by Trockk | https://sketchfab.com/3d-models/low-poly-drone-3a5eba0df3154257a712fad731a3e4d2 | CC-BY |
| Patrol Boat | Low poly boat by Fardeen Ahmed | https://poly.pizza/search/patrol+boat | CC-BY |

---

## How to Download and Convert

### From Sketchfab:
1. Visit the model URL
2. Click "Download 3D Model" 
3. Choose "glTF" format
4. Extract the ZIP
5. Place the `.glb` or `.gltf` + `.bin` files in the appropriate `assets/models/` directory

### From Poly Pizza:
1. Visit the model URL
2. Click "Download"
3. Choose GLTF format
4. Place in appropriate directory

### From itch.io:
1. Visit the pack URL
2. Download (some are free, some are "pay what you want" with $0 minimum)
3. Extract and find GLTF/GLB files
4. Place in appropriate directory

### Converting FBX/OBJ to GLB:
If a model is only available in FBX or OBJ format:
1. Use https://gltf.report/ (online converter)
2. Or use Blender: File > Import > FBX/OBJ, then File > Export > glTF 2.0 (.glb)
3. Keep poly count under 3,000 triangles

---

## Attribution Requirements

Models with CC-BY license require attribution. Add credits to the game's credits screen:

```
3D Models:
- Zsky (CC-BY 4.0) - Military vehicles and base buildings
- britdawgmasterfunk (CC0) - RTS military characters
- vonBerlichingen (CC-BY) - WWII naval vessels and aircraft
- MrEliptik (CC0) - Stylized tank
- ITHappy Studios (Free) - Military props and equipment
- RC-Studios (CC-BY) - Propeller plane
- SGAstudio (CC-BY) - Tiger tank
- SilkevdSmissen (CC-BY) - Willys Jeep
- Kenney.nl (CC0) - Nature kit, space kit assets
```

---

## File Naming Convention

After downloading, rename files to match the AssetManager manifest:
```
assets/models/units/
  soldier.glb          (infantry)
  tank.glb             (medium tank)
  heavy-tank.glb       (heavy tank - Tiger)
  scout-vehicle.glb    (scout car - Jeep)
  apc.glb              (APC)
  humvee.glb           (AA half-track)
  cannon-mobile.glb    (SPG)
  cannon.glb           (mortar)
  drone.glb            (recon drone)
  fighter-jet.glb      (fighter plane - replace with prop plane)
  craft-cargo.glb      (bomber - replace with WWII bomber)
  battleship.glb       (battleship)
  warship.glb          (aircraft carrier)
  submarine.glb        (submarine)
  patrol-boat.glb      (patrol boat)
  xbot.glb             (engineer - replace with soldier variant)
  mini-arena/character-soldier.glb (commander)

assets/models/buildings/
  fortress.glb         (headquarters)
  barracks.glb         (barracks)
  structure-metal.glb  (war factory)
  dock.glb             (shipyard)
  structure.glb        (airfield)
  storage.glb          (supply depot)
  barrel.glb           (munitions cache)
  stone-wall.glb       (wall)
  fence-fortified.glb  (ditch)
  watch-tower.glb      (watch tower)
  shipping-port.glb    (supply exchange)
  tent.glb             (resource depot)
```
