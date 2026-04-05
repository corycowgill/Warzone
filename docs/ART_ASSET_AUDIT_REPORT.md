# Warzone RTS - Art Asset Audit & Replacement Report

**Date:** 2026-04-04
**Purpose:** Comprehensive search of free 3D model repositories to find WWII-appropriate replacements for all game units and buildings.

---

## Executive Summary

The game currently uses a mix of:
- **Kenney sci-fi/fantasy assets** (blaster kit, space kit, castle kit) that don't match WWII
- **Generic models** (xbot for engineer, craft-cargo for bomber, city-kit buildings)
- **Some decent fits** (soldier.glb, tank.glb, turret-double.glb)

This report identifies the BEST free replacement for every unit and building, prioritizing:
1. **WWII authenticity** - Models that actually look like 1940s military equipment
2. **Style consistency** - Low-poly stylized aesthetic matching game's art direction
3. **License clarity** - CC0 preferred, CC-BY acceptable
4. **GLTF/GLB format** - Native Three.js support
5. **Poly budget** - 300-3,000 triangles per model

---

## CURRENT PROBLEMS (What Needs Replacing)

| Asset Key | Current Model | Problem |
|-----------|--------------|---------|
| `unit_engineer` | `xbot.glb` | Robot/sci-fi character, not WWII |
| `unit_aahalftrack` | `humvee.glb` | Modern Humvee, not WWII half-track |
| `unit_plane` | `fighter-jet.glb` | Modern jet, not propeller fighter |
| `unit_bomber` | `craft-cargo.glb` | Sci-fi cargo craft, not bomber |
| `unit_drone` | `drone.glb` | May be sci-fi drone |
| `unit_carrier` | `warship.glb` | Generic warship, not flat-deck carrier |
| `bld_headquarters` | `fortress.glb` | Fantasy fortress, not military HQ |
| `bld_bunker` | `castle-kit/tower-square-base.glb` | Medieval castle piece |
| `bld_wall` | `stone-wall.glb` | Medieval stone wall, not sandbags |
| `bld_supplyexchange` | `kaykit-medieval/building_market_blue.gltf` | Medieval market building |
| `bld_techlab` | `city-kit/building-a.glb` | Generic city building |
| `bld_superweapon` | `tower-defense/tower-round-top-a.glb` | Fantasy tower defense piece |
| `bld_airfield` | `structure.glb` | Generic structure |

---

## TIER 1: BEST ASSET PACKS (Complete Sets with Consistent Style)

These packs should be the PRIMARY sources due to style consistency across multiple models.

### 1. Zsky - Low Poly Military Vehicles Bundle (Poly Pizza)
- **URL:** https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X
- **License:** CC-BY 4.0
- **Format:** GLTF, FBX, OBJ
- **Contents:** 9 military vehicle models including tanks (Abrams-style), APCs, Hummers, Apache helicopter, F-16
- **Poly count:** ~500-800 per model
- **Style:** Clean low-poly, flat shaded, consistent color palette
- **Covers:** Tank, APC, scout car, heavy tank variants
- **Note:** Modern vehicles but stylized enough to read as generic military

### 2. Zsky - Low Poly Military Base Pack (itch.io)
- **URL:** https://zsky2000.itch.io/military-base-pack
- **License:** CC-BY 4.0
- **Format:** GLTF, FBX, OBJ
- **Contents:** 20+ military buildings including quarters, medic tent, bathroom, sniper tower, and more
- **Poly count:** ~400-1000 per model
- **Style:** Matches Zsky vehicles pack perfectly
- **Covers:** Barracks, headquarters, supply depot, watchtower, resource depot

### 3. MedSamer - Low-poly Military Vehicles Pack (Sketchfab)
- **URL:** https://sketchfab.com/3d-models/low-poly-military-vehicles-pack-48137988cfef4ff88f51b08b996ecc1f
- **License:** CC-BY 4.0
- **Format:** GLTF (via Sketchfab download)
- **Contents:** Tank, APC, truck, light armored cars
- **Poly count:** ~700 per model
- **Style:** Stylized pixel-art-like low poly
- **Covers:** Tank, APC, scout car, transport

### 4. ITHappy Studios - Military FREE Pack (Fab.com)
- **URL:** https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f
- **Also at:** https://ithappystudios.com/free/military-free/
- **License:** Free for commercial use
- **Format:** GLTF, FBX, OBJ, Blender, Unity, Unreal
- **Contents:** 26 assets: tank, barrels, boxes, container, hedgehog (tank trap), mortar, radio station, table, targets, tent, tower
- **Poly count:** avg 692 triangles per model (18K total)
- **Style:** Clean low-poly, consistent across all 26 models
- **Covers:** Mortar team weapon, resource depot (tent), supply depot (containers), bunker props, environment props

### 5. britdawgmasterfunk - RTS Military Characters (Sketchfab, CC0)
- **URL (Kit):** https://sketchfab.com/3d-models/military-character-kit-11-cc0-bf37b98b99534ed2b5eb4507f0564e1d
- **URL (RTS Mercs 1):** https://sketchfab.com/3d-models/rts-mercenaries-1-cc0-280b03056863466798bcd92dd012432f
- **URL (RTS Mercs 2):** https://sketchfab.com/3d-models/rts-mercenaries-2-cc0-779cd2eafedd456abd1e6879a67c6720
- **URL (Military RTS Char):** https://sketchfab.com/3d-models/military-rts-character-1-cc0-908065a7006443b29edca30276750a6d
- **License:** CC0 (no attribution required!)
- **Format:** GLTF (Sketchfab), Blend, FBX
- **Contents:** Modular military character kit + assembled RTS soldier characters
- **Style:** Specifically designed for RTS games, proportions match UE4 mannequin
- **Covers:** Infantry, commander, engineer (with different loadouts)
- **Note:** The kit version is high-poly (1.4M tris) but individual RTS characters are optimized. Use the RTS Mercenaries models which are game-ready low-poly.

### 6. Gotz von Berlichingen - Hearts of Iron IV Models (Sketchfab)
- **URL (profile):** https://sketchfab.com/vonBerlichingen
- **License:** CC-BY (check individual models)
- **Format:** GLTF (via Sketchfab)
- **Contents:** Extensive WWII collection including:
  - Submarine (ballistic missile sub): https://sketchfab.com/3d-models/submarine-low-poly-e363d3575d23495aa79fc8f3d9b88a67
  - Graf Zeppelin aircraft carrier: https://sketchfab.com/3d-models/german-aircraft-carrier-graf-zeppelin-low-poly-826d09ed54ab425a83ba09e82f082c70
  - Volkssturmmann soldier: https://sketchfab.com/3d-models/volkssturmmann-low-poly-4af4b7f64eb8415a83be6b341b214b39
  - Rocket launch base: https://sketchfab.com/3d-models/rocket-launch-base-low-poly-2d3e9be60c9b4dbf8b5aabb0a60f75cd
  - U-Boot Bunker: https://sketchfab.com/3d-models/u-boot-bunker-ww2-low-poly-0780d3a9092f4dc589bf829db5151150
  - Multiple WWII aircraft (Horten, Messerschmitt, Focke-Wulf variants)
- **Style:** Specifically made for Hearts of Iron IV, low-poly with 512-1K textures
- **Covers:** Submarine, carrier, soldier, superweapon (V2 launch base), bunker, aircraft

---

## UNIT-BY-UNIT RECOMMENDATIONS

### Infantry (WWII Soldiers)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | RTS Mercenaries 1 (CC0) by britdawgmasterfunk | https://sketchfab.com/3d-models/rts-mercenaries-1-cc0-280b03056863466798bcd92dd012432f | CC0 | ~800 | Purpose-built for RTS games, CC0 license, multiple variants |
| 2 | Sketchfab | WW2 Soldier Low Poly by M0zg0jed | https://sketchfab.com/3d-models/ww2-soldier-low-poly-8dd47904297445cf9a628f71a3b5250a | CC-BY | ~600 | Specifically WWII themed |
| 3 | Sketchfab | Low Poly WW2 Soldier by Beanie33 | https://sketchfab.com/3d-models/low-poly-ww2-soldier-045513909a684d259d59f2a1217f45d9 | CC-BY | ~500 | Quick low-poly game model |
| 4 | Sketchfab | low poly soldier by Kolos Studios | https://sketchfab.com/3d-models/low-poly-soldier-daf5de38902e458aa57ff5ba9460ca02 | CC-BY | ~400 | Clean minimal style |
| 5 | OpenGameArt | Rigged Lowpoly WW2 Soldier | https://opengameart.org/content/rigged-lowpoly-ww2-soldier | CC/OGA | ~800 | Rigged, specifically WWII German |

**Current model:** `soldier.glb` -- May already be acceptable. Evaluate against the above.
**Recommendation:** Use britdawgmasterfunk's RTS Mercenaries (CC0) for infantry. They are specifically designed for RTS games at appropriate scale and poly count.

---

### Commander (Officer with distinct uniform)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Military RTS Character 1 (CC0) by britdawgmasterfunk | https://sketchfab.com/3d-models/military-rts-character-1-cc0-908065a7006443b29edca30276750a6d | CC0 | ~1000 | Distinct from basic soldiers, RTS-designed |
| 2 | Sketchfab | RTS Mercenaries 2 (CC0) by britdawgmasterfunk | https://sketchfab.com/3d-models/rts-mercenaries-2-cc0-779cd2eafedd456abd1e6879a67c6720 | CC0 | ~800 | Different character variants |
| 3 | Sketchfab | Military Character Kit Textured (CC0) | https://sketchfab.com/3d-models/military-character-kit-textured-cc0-7103a15d0c0141d6b3372e781e2f4e92 | CC0 | varies | Modular kit, assemble unique officer |

**Current model:** `mini-arena/character-soldier.glb` -- Kenney mini arena, too generic.
**Recommendation:** Use britdawgmasterfunk's Military RTS Character 1. Same creator as infantry but visually distinct.

---

### Engineer (With tools)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | RTS Mercenaries 2 variant (CC0) by britdawgmasterfunk | https://sketchfab.com/3d-models/rts-mercenaries-2-cc0-779cd2eafedd456abd1e6879a67c6720 | CC0 | ~800 | Use a different loadout variant as engineer |
| 2 | Sketchfab | Clothing and Character Kit 1.0 (CC0) | https://sketchfab.com/3d-models/clothing-and-character-kit-10-cc0-7c733dceb2e04c4fb7e7dbd85316c1e7 | CC0 | varies | Modular, can add tool accessories |

**Current model:** `xbot.glb` -- CRITICAL REPLACEMENT NEEDED. This is a sci-fi robot.
**Recommendation:** Use a different variant from britdawgmasterfunk's RTS character collection.

---

### Tank (Sherman/T-34 style)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | itch.io | FREE Stylized Tank by MrEliptik | https://mreliptik.itch.io/free-lowpoly-tank-3d-model | CC0 | ~500 | Includes GLTF, stylized, CC0, 2 color variants |
| 2 | Poly Pizza | Zsky Military Vehicles (tank) | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | ~600 | Part of 9-model consistent set |
| 3 | Sketchfab | MedSamer Military Vehicles (tank) | https://sketchfab.com/3d-models/low-poly-military-vehicles-pack-48137988cfef4ff88f51b08b996ecc1f | CC-BY | ~700 | Stylized pixel-art style |
| 4 | Sketchfab | Low Poly M4A3(76) HVSS by Dezryelle | https://sketchfab.com/3d-models/low-poly-m4a376-hvss-710e93ef16c84160a5e8b980ce07163a | CC-BY | ~1000 | Historically accurate Sherman |
| 5 | Sketchfab | Sherman Tank Stylised by matthall | https://sketchfab.com/3d-models/sherman-tank-stylised-blender-lowpoly-ww2-7f9284c0405b45308df38e5c1dd5dd6a | CC-BY | ~800 | Specifically stylized WWII Sherman |

**Current model:** `tank.glb` -- Evaluate current. If generic, replace with MrEliptik's CC0 tank.
**Recommendation:** MrEliptik's tank is CC0, includes GLTF, and has a clean stylized look perfect for the game's aesthetic.

---

### Heavy Tank (Tiger/IS-2 style)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Tiger 1 by SGAstudio | https://sketchfab.com/3d-models/low-poly-tiger-1-673d62cd884d45cba535007b0553f954 | CC-BY | ~800 | Specifically Panzer VI Tiger, WWII iconic |
| 2 | Sketchfab | Tank Tiger 2 by TimeTo3D | https://sketchfab.com/3d-models/tank-tiger-2-f23650309a294143a7811737ca314219 | CC-BY | ~1000 | King Tiger variant |
| 3 | Sketchfab | Tank WWII by kolopolo | https://sketchfab.com/3d-models/tank-wwii-025a1dbef1e04b259555ab0e38312a6b | CC-BY | ~700 | Generic WWII heavy tank |
| 4 | Sketchfab | Low Poly Tank by RoyArcane | https://sketchfab.com/3d-models/low-poly-tank-e08b47e076514f44b523f35e8f7cd826 | CC-BY | ~600 | Simple low poly tank |

**Current model:** `tank.glb` (same as medium tank, just scaled up) -- NEEDS DISTINCT MODEL
**Recommendation:** Use the Low Poly Tiger 1. The Tiger is THE iconic WWII heavy tank and will read clearly as a heavier, more dangerous vehicle.

---

### Scout Car (Jeep/Kubelwagen)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Military Jeep Willys MB by SilkevdSmissen | https://sketchfab.com/3d-models/low-poly-military-jeep-willys-mb-ww2-scene-fcf129444005466ebd6cbbe0685aeec2 | CC-BY | ~800 | Authentic WWII Willys Jeep |
| 2 | Sketchfab | Low Poly Jeep Vehicles by Shushanto | https://sketchfab.com/3d-models/low-poly-jeep-vehicles-free-3d-model-54a9ad0c2fc14f41bd79fca99a5c7585 | CC-BY | ~2900 | Made in Blender, obj export |
| 3 | Sketchfab | VW Typ 82 Kubelwagen by Kado3D | https://sketchfab.com/3d-models/vw-typ-82-kubelwagen-low-poly-2e56ea4dc18e46eaa9431456cb506c77 | check | ~1200 | Authentic German WWII scout car |
| 4 | Poly Pizza | Zsky Hummer variant | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | ~600 | Modern Humvee but reads as light vehicle |

**Current model:** `scout-vehicle.glb` -- Evaluate fit.
**Recommendation:** The Willys MB Jeep is THE iconic WWII scout car. Perfect for the game.

---

### APC (Armored Personnel Carrier)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | APC (Low Poly) by iZnoGouD | https://sketchfab.com/3d-models/armoured-personnel-carrier-apc-low-poly-6342f74c0f1b454891ec6faea189764d | CC-BY | ~800 | Game-ready APC |
| 2 | Sketchfab | [Free] Armored Vehicle Low Poly by GraphOrigin | https://sketchfab.com/3d-models/free-armored-vehicle-low-poly-04a8451dd0c44ed2a6fbb2f8f9f9f7ae | CC-BY | ~700 | Designed for game jams |
| 3 | Sketchfab | MedSamer Military Vehicles (APC) | https://sketchfab.com/3d-models/low-poly-military-vehicles-pack-48137988cfef4ff88f51b08b996ecc1f | CC-BY | ~700 | Part of consistent vehicle pack |
| 4 | Poly Pizza | Zsky APC | https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X | CC-BY | ~600 | Part of 9-model set |

**Current model:** `apc.glb` -- Evaluate. May be adequate.
**Recommendation:** iZnoGouD's APC or the Zsky bundle APC for style consistency with other vehicles.

---

### AA Half-Track

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | [Free] Armored Vehicle Low Poly by GraphOrigin | https://sketchfab.com/3d-models/free-armored-vehicle-low-poly-04a8451dd0c44ed2a6fbb2f8f9f9f7ae | CC-BY | ~700 | Adapt as half-track with AA turret |
| 2 | Sketchfab | Russian APC by G_System_Studos | https://sketchfab.com/3d-models/russian-apc-09488b18d45a4eddb2d58b5cded077c8 | CC-BY | ~800 | Low-poly Russian armored vehicle |
| 3 | ITHappy | Military FREE (use tank + modify) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | ~700 | Use as base, add AA gun mesh procedurally |

**Current model:** `humvee.glb` -- CRITICAL REPLACEMENT. Modern Humvee is wrong era.
**Recommendation:** Use GraphOrigin's armored vehicle and pair with a turret model. Alternatively, programmatically combine an APC body with a separate AA gun model.

---

### SPG (Self-Propelled Gun)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Artillery Tank by LowPolyCount | https://sketchfab.com/3d-models/low-poly-artillery-tank-71f4dbbda897422783a6eb292ad23a6c | check | ~800 | Artillery on tank chassis = SPG |
| 2 | Keep current | `cannon-mobile.glb` | local | -- | -- | Evaluate if the mobile cannon reads well enough |
| 3 | Sketchfab | Simple Low Poly Tank by Liam Howard | https://sketchfab.com/3d-models/simple-low-poly-tank-6e9819fa32464aa4a68b87a2443b69cd | CC-BY | ~500 | Simple tank, scale cannon up |

**Current model:** `cannon-mobile.glb` -- May be adequate if it reads as a vehicle-mounted cannon.
**Recommendation:** The Low Poly Artillery Tank specifically matches the SPG concept (gun on tracked chassis). Evaluate current model first.

---

### Mortar Team

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | ITHappy | Military FREE Pack (mortar model) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | ~400 | Includes a dedicated mortar model |
| 2 | Keep current | `cannon.glb` | local | -- | -- | Static cannon may work for mortar |
| 3 | Sketchfab | WW2 Low Poly Weapons Pack by AkioHonda | https://sketchfab.com/3d-models/ww2-low-poly-weapons-pack-4242e664ec1a489b99dc0d543f958915 | CC-BY | varies | WWII weapons, may include mortar |

**Current model:** `cannon.glb` -- Acceptable as placeholder.
**Recommendation:** Use ITHappy's mortar model from their Military FREE pack for authentic crew-served weapon appearance.

---

### Drone (Recon UAV)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | LOW POLY DRONE by Trockk | https://sketchfab.com/3d-models/low-poly-drone-3a5eba0df3154257a712fad731a3e4d2 | CC-BY | ~400 | Clean low-poly quadcopter |
| 2 | Poly Pizza | Drone search results | https://poly.pizza/search/Drone | CC-BY | varies | Multiple drone options |
| 3 | Keep current | `drone.glb` | local | -- | -- | Evaluate current model |

**Current model:** `drone.glb` -- Evaluate. The game is alt-history WWII so a modern drone is somewhat anachronistic but acceptable for gameplay.
**Recommendation:** Keep current if it reads well. Drones are the most "alt-history" unit anyway.

---

### Plane (P-51/Spitfire Fighter)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low-poly Propeller Plane by RC-Studios | https://sketchfab.com/3d-models/low-poly-propeller-plane-3ca91472b1b64072a0d3a64d86690df8 | CC-BY | ~500 | Animated propeller, WWII-style |
| 2 | Sketchfab | LowPoly Aircraft Collection (curated) | https://sketchfab.com/quid/collections/lowpoly_aircraft-c4d7ec57e10a49718c93c61ab4cb5fea | various | varies | Includes Bf-109 and other WWII fighters |
| 3 | Sketchfab | Low-Poly Biplane by lord_syrup | https://sketchfab.com/3d-models/low-poly-biplane-755175daea384176813e7dc90b2245a5 | CC-BY | ~400 | WWI-style but reads as classic fighter |
| 4 | vonBerlichingen | Various WWII German fighters | https://sketchfab.com/vonBerlichingen | CC-BY | ~500-800 | Messerschmitt, Focke-Wulf, Horten designs |

**Current model:** `fighter-jet.glb` -- CRITICAL REPLACEMENT. A modern jet fighter is completely wrong for WWII.
**Recommendation:** Replace with a propeller-driven fighter. The RC-Studios low-poly propeller plane or a model from the LowPoly Aircraft collection would be ideal.

---

### Bomber (B-17/Lancaster)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Boeing B-17 Flying Fortress by helijah | https://sketchfab.com/3d-models/boeing-b-17-flying-fortress-927f07f6ddcf470ab0387ce5829024d5 | check | ~2000 | THE iconic WWII bomber |
| 2 | Sketchfab | Avro Lancaster Bomber by jpo1703 | https://sketchfab.com/3d-models/avro-lancaster-bomber-1941-airplane-f52898273e85457aa0413ea01987bfca | CC-BY | ~1500 | British WWII heavy bomber |
| 3 | vonBerlichingen | Junkers EF 132 (low poly) | https://sketchfab.com/3d-models/junkers-ef-132-low-poly-375794303a544ba780c0f73942366d24 | CC-BY | ~800 | German bomber design, Hearts of Iron model |
| 4 | vonBerlichingen | Horten H.XVIII "Amerikabomber" | https://sketchfab.com/3d-models/horten-hxviii-amerikabomber-low-poly-177defde3dd346acb1b33773658ff343 | CC-BY | ~600 | Alt-history German bomber |

**Current model:** `craft-cargo.glb` -- CRITICAL REPLACEMENT. Sci-fi cargo ship.
**Recommendation:** B-17 Flying Fortress or Lancaster Bomber. Both are unmistakable WWII heavy bombers. The vonBerlichingen models are lower poly and HoI4-optimized.

---

### Battleship

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Poly Pizza | Low Poly Battleship by Angelo Raffaele Catalano | https://poly.pizza/m/cqV6mUkn7Ow | CC-BY | ~800 | Clean low-poly style, direct GLTF download |
| 2 | Sketchfab | Low poly battleship by minehffd | https://sketchfab.com/3d-models/low-poly-battleship-8d5e7633b6084c5f947f7134c495a59b | CC-BY | ~1000 | Free download |
| 3 | Keep current | `battleship.glb` | local | -- | -- | Evaluate current |

**Current model:** `battleship.glb` -- Evaluate. May already be decent.
**Recommendation:** Poly Pizza battleship for guaranteed GLTF format and clean style.

---

### Aircraft Carrier

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low-poly Aircraft Carrier by Dewi | https://sketchfab.com/3d-models/low-poly-aircraft-carrier-367a8f96cb9e40aba7fce00944e16346 | CC-BY | ~1200 | Low-poly game-ready carrier |
| 2 | vonBerlichingen | Graf Zeppelin carrier (low poly) | https://sketchfab.com/3d-models/german-aircraft-carrier-graf-zeppelin-low-poly-826d09ed54ab425a83ba09e82f082c70 | CC-BY | ~1000 | WWII German carrier, Hearts of Iron style |
| 3 | Sketchfab | Gerald R Ford carrier by waelXcm | https://sketchfab.com/3d-models/gerald-r-ford-aircraft-carrier-562bf516e1494df38d8f222504dc798b | CC-BY | ~2000 | Modern but recognizable carrier shape |

**Current model:** `warship.glb` -- NEEDS REPLACEMENT. A generic warship doesn't read as a flat-deck carrier.
**Recommendation:** The Graf Zeppelin model is perfect - it's specifically a WWII-era carrier made for a strategy game (Hearts of Iron IV).

---

### Submarine

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | vonBerlichingen | Submarine (low poly) | https://sketchfab.com/3d-models/submarine-low-poly-e363d3575d23495aa79fc8f3d9b88a67 | CC-BY | ~500 | WWII ballistic sub, HoI4 model |
| 2 | Sketchfab | Submarine by fengol | https://sketchfab.com/3d-models/submarine-06a20113f01c4ec3adf6bd20ef9153b2 | CC-BY | ~400 | Low-poly game prototype sub |
| 3 | Sketchfab | Submarine-lowpoly by nanchark | https://sketchfab.com/3d-models/submarine-lowpoly-38bf422c212f44af820d6811876e0b76 | CC-BY | ~500 | Simple low-poly sub |
| 4 | Keep current | `submarine.glb` | local | -- | -- | Evaluate |

**Current model:** `submarine.glb` -- Evaluate.
**Recommendation:** vonBerlichingen's submarine, consistent with their carrier and other WWII models.

---

### Patrol Boat

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Elco 80ft PT by ThomasBeerens | https://sketchfab.com/3d-models/elco-80ft-pt-e759cb35865c480f8db77c91020e8f6c | check | ~1500 | Authentic WWII PT boat |
| 2 | Sketchfab | Low poly boat by mrarfeen | https://sketchfab.com/3d-models/low-poly-boat-e83fbd8fa890434493c7752aba8e59fa | CC-BY | ~400 | Simple low-poly boat |
| 3 | Keep current | `patrol-boat.glb` | local | -- | -- | Evaluate |

**Current model:** `patrol-boat.glb` -- Evaluate.
**Recommendation:** The Elco PT boat is a historically authentic WWII patrol torpedo boat. Perfect for the game.

---

## BUILDING RECOMMENDATIONS

### Headquarters (Military Command Post)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Military Building by 3RDimens | https://sketchfab.com/3d-models/low-poly-military-building-game-ready-241c8df97f8c46cf8864740b446e411e | CC-BY | ~800 | Game-ready military building, PBR |
| 2 | Zsky | Military Base Pack (HQ building) | https://zsky2000.itch.io/military-base-pack | CC-BY | ~700 | Part of consistent building set |
| 3 | Sketchfab | "The Military Base" LowPoly by VirtualPixels | https://sketchfab.com/3d-models/the-military-base-lowpoly-bb162304bff3477da5ded555d217a3b4 | CC-BY | ~1500 | Complete military base scene |

**Current model:** `fortress.glb` -- CRITICAL REPLACEMENT. Fantasy fortress.
**Recommendation:** 3RDimens' military building is specifically designed for FPS/RTS games with proper military aesthetic.

---

### Barracks (Training Facility)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Zsky | Military Base Pack (barracks) | https://zsky2000.itch.io/military-base-pack | CC-BY | ~600 | Quarters/barracks building |
| 2 | ITHappy | Military FREE Pack | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | ~500 | Contains barracks-style buildings |
| 3 | Keep current | `barracks.glb` | local | -- | -- | Evaluate |

**Current model:** `barracks.glb` -- Evaluate if military-looking.
**Recommendation:** Zsky's Military Base Pack for consistent style with other buildings.

---

### War Factory (Vehicle Production)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Lowpoly Tank Hangar by A1 | https://sketchfab.com/3d-models/lowpoly-tank-hangar-aed356cda5994a199cd2136216ca32ae | CC-BY | ~1200 | Military hangar specifically for tanks |
| 2 | Sketchfab | Airport Hangar by assetfactory | https://sketchfab.com/3d-models/airport-hangar-639543b61c264ffeb923f9d3f5c758ee | CC-BY | ~800 | Large hangar building |
| 3 | ITHappy | Military FREE Pack (container/hangar) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | ~700 | Container/hangar style |

**Current model:** `structure-metal.glb` -- May be adequate if it reads as industrial.
**Recommendation:** The Tank Hangar is perfect for a war factory - it's literally a military vehicle building.

---

### Airfield (With runway)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Airfield Hangar by xplanepilot | https://sketchfab.com/3d-models/airfield-hangar-bb630d26096d4dffab6a21147e44d8cb | CC-BY | ~800 | Based on RAF Old Sarum WWII hangars |
| 2 | Sketchfab | Runway and Hangar by Derek.Dziedzic | https://sketchfab.com/3d-models/runway-and-hangar-cf6a8925f591421a9b82c28c61ad4c47 | CC-BY | ~1000 | Complete runway + hangar set |
| 3 | Sketchfab | Airfield with buildings by Antony.Wells | https://sketchfab.com/3d-models/airfield-runway-with-a-few-buildings-8d9994ffe502432a883b448e82f1127c | CC-BY | ~1500 | Complete mini airfield with buildings |

**Current model:** `structure.glb` -- NEEDS REPLACEMENT. Generic structure.
**Recommendation:** The RAF Old Sarum hangar is authentically WWII and reads immediately as an airfield.

---

### Shipyard (Naval Dock)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | [FREE] Lowpoly Wooden Docks Vol.3 by SimplePolygon | https://sketchfab.com/3d-models/free-lowpoly-wooden-docks-vol3-asset-pack-8195bee6fc954abbad1c816c606f7197 | CC-BY | ~600 | Dock/pier structures |
| 2 | Sketchfab | Low Poly Container Yard by designedbyjonathan | https://sketchfab.com/3d-models/low-poly-container-yard-02bac2a61588496786a5cb4cdda3b6f5 | CC-BY | ~1000 | Port/shipyard feel |
| 3 | Keep current | `dock.glb` | local | -- | -- | Evaluate |

**Current model:** `dock.glb` -- May already work.
**Recommendation:** SimplePolygon's dock pack provides multiple dock pieces that can be assembled.

---

### Tech Lab (Research Building)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Military Building by 3RDimens | https://sketchfab.com/3d-models/low-poly-military-building-game-ready-241c8df97f8c46cf8864740b446e411e | CC-BY | ~800 | Can serve as tech lab with radar dish added |
| 2 | Sketchfab | Science Lab Lowpoly by Helyx Silveira | https://sketchfab.com/3d-models/science-lab-lowpoly-e0d65331317b424ca82d317c27652f7f | CC-BY | ~1000 | Laboratory building |
| 3 | Sketchfab | Radar by captaj0987 | https://sketchfab.com/3d-models/radar-bc37c812cb4e4177897a86f270fba9a1 | CC-BY | ~400 | Add to any building for "tech" look |

**Current model:** `city-kit/building-a.glb` -- NEEDS REPLACEMENT. Generic city building.
**Recommendation:** Combine a military building with a radar dish model to create a distinct "tech lab" look.

---

### Bunker (Defensive Fortification)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | vonBerlichingen | U-Boot Bunker WW2 (low poly) | https://sketchfab.com/3d-models/u-boot-bunker-ww2-low-poly-0780d3a9092f4dc589bf829db5151150 | CC-BY | ~600 | Authentic WWII concrete bunker |
| 2 | Sketchfab | Sci-fi Bunker by gregwagner | https://sketchfab.com/3d-models/sci-fi-bunker-2567a460d6cc475fa679e877c78f05d3 | CC-BY | ~800 | Can read as reinforced bunker |
| 3 | Sketchfab | Low Poly Concrete Barricade by Arthur.Zim | https://sketchfab.com/3d-models/low-poly-concrete-barricade-game-ready-f1e7368b46b14c2ebe1b1475aa947c1b | CC-BY | 404 tris | Simple defensive structure |

**Current model:** `castle-kit/tower-square-base.glb` -- CRITICAL REPLACEMENT. Medieval castle piece.
**Recommendation:** vonBerlichingen's WWII bunker is authentically period-correct.

---

### Turret (Gun Emplacement)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | [Free] Turret Low Poly by GraphOrigin | https://sketchfab.com/3d-models/free-turret-low-poly-640f6c1015bb41ef9843547caffa8254 | CC-BY | ~500 | Game-ready turret |
| 2 | Sketchfab | Low poly gun turret by randomModelsMan | https://sketchfab.com/3d-models/low-poly-gun-turret-ded3ef789773404e8f336d19eb688205 | CC-BY | ~400 | Simple gun turret |
| 3 | Keep current | `turret-double.glb` | local | -- | -- | May be adequate |

**Current model:** `turret-double.glb` -- Likely from blaster/space kit. Evaluate if military-looking.
**Recommendation:** Keep if it reads as military. Replace with GraphOrigin's turret if too sci-fi.

---

### AA Turret (Anti-Aircraft Gun)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Anti-aircraft gun 8.8 cm Flak 18 by Nikita Vitik | https://sketchfab.com/3d-models/anti-aircraft-gun-88-cm-flak-18-f7bcf845f5b24104ae403c794660e0e5 | CC-BY | ~1200 | THE iconic WWII 88mm Flak gun |
| 2 | Sketchfab | Gatling Gun Turret low poly by mhanna | https://sketchfab.com/3d-models/gatling-gun-turret-low-poly-93fd12e44609464686fede4778664b54 | CC-BY | ~600 | Multi-barrel AA-style turret |
| 3 | Keep current | `turret-single.glb` | local | -- | -- | Evaluate |

**Current model:** `turret-single.glb` -- May be from blaster kit.
**Recommendation:** The 88mm Flak 18 is the MOST iconic WWII anti-aircraft gun. Instantly recognizable.

---

### Wall (Barricade/Sandbags)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Military Sandbag Barrier by Shorty_Digitan | https://sketchfab.com/3d-models/military-sandbag-barrier-free-low-poly-3f4d0ec9510244bab16bbd0916a3495b | CC-BY | ~400 | FBX with PBR textures |
| 2 | Sketchfab | Low Poly Barrier for Military Base by Kolos Studios | https://sketchfab.com/3d-models/low-poly-barrier-for-an-military-base-839aec4819f74240afa84f232e2cff28 | CC-BY | ~300 | Includes sandbags + machine gun |
| 3 | Sketchfab | Barricade Set by TampaJoey | https://sketchfab.com/3d-models/barricade-set-low-poly-game-ready-209e7dc032de483cae12eb5c3e7f1bcf | CC-BY | ~500 | Multiple barricade types |
| 4 | Sketchfab | Urban/Military Sandbag Wall by Neslihan Cakmak | https://sketchfab.com/3d-models/urbanmilitary-sandbag-wall-9c18daee3ecf41e995e54998d5cc61c0 | CC-BY | ~400 | Wall segment |

**Current model:** `stone-wall.glb` -- NEEDS REPLACEMENT. Medieval stone wall.
**Recommendation:** Military Sandbag Barrier is exactly what a WWII defensive wall should look like.

---

### Supply Depot / Resource Depot

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | ITHappy | Military FREE Pack (tent + containers) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | ~500 | Military tent and supply containers |
| 2 | Sketchfab | Lowpoly Boxes and Barrels Pack by mcsteegs | https://sketchfab.com/3d-models/lowpoly-boxes-and-barrels-pack-free-d3b3880d5cc74d26b7ddb059c4b83fba | CC-BY | ~300 | Supply crates and barrels |
| 3 | Sketchfab | Low/High Poly Military Crate by Ethica | https://sketchfab.com/3d-models/lowhigh-poly-military-crate-f2d489dacec3485988d757639535d5df | CC-BY | ~400 | Military-specific crate |

**Current model (supply):** `storage.glb` -- Evaluate.
**Current model (resource):** `tent.glb` -- May already be adequate.
**Recommendation:** ITHappy's Military FREE pack includes both tent and container models with consistent style.

---

### Supply Exchange

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | Sketchfab | Low Poly Container Yard by designedbyjonathan | https://sketchfab.com/3d-models/low-poly-container-yard-02bac2a61588496786a5cb4cdda3b6f5 | CC-BY | ~1000 | Shipping containers = trade/exchange |
| 2 | Sketchfab | LOW POLY INDUSTRIAL WAREHOUSE by Colin.Greenall | https://sketchfab.com/3d-models/low-poly-industrial-warehouse-316a80fb28c04e14933b8b1b40187c90 | CC-BY | ~800 | Warehouse = supply exchange |

**Current model:** `kaykit-medieval/building_market_blue.gltf` -- CRITICAL REPLACEMENT. Medieval market.
**Recommendation:** Container yard or industrial warehouse. Either reads as a supply exchange point.

---

### Superweapon Facility (Missile Silo / V2 Launcher)

| Priority | Source | Model | URL | License | Poly Count | Notes |
|----------|--------|-------|-----|---------|------------|-------|
| **1 (BEST)** | vonBerlichingen | Rocket launch base (low poly) | https://sketchfab.com/3d-models/rocket-launch-base-low-poly-2d3e9be60c9b4dbf8b5aabb0a60f75cd | CC-BY | ~800 | WWII-era rocket launch facility, HoI4 buildable |
| 2 | Sketchfab | Missile Silo Low Poly by dpgb | https://sketchfab.com/3d-models/missile-silo-low-poly-8f19a60d4d8a44efa42eea3d781dda19 | CC-BY | ~1000 | Animated opening hatch doors |
| 3 | Sketchfab | Low-Poly Rocket Launcher by adriansade98 | https://sketchfab.com/3d-models/low-poly-rocket-launcher-4644d979ec274b9b9bc6c93088aebf31 | CC-BY | ~600 | Free for commercial/personal use |

**Current model:** `tower-defense/tower-round-top-a.glb` -- CRITICAL REPLACEMENT. Fantasy tower.
**Recommendation:** vonBerlichingen's rocket launch base is specifically a WWII-era V2-style launch facility.

---

## ENVIRONMENT PROPS

### Military Props (Sandbags, Crates, Barrels, Fences)

| Source | Model | URL | License | Notes |
|--------|-------|-----|---------|-------|
| ITHappy | Military FREE Pack (26 props) | https://www.fab.com/listings/be36701c-890c-40b7-bd91-10919327f66f | Free | Tank traps (hedgehogs), barrels, boxes, targets, radio |
| Sketchfab | FREE Lowpoly Barrels Set by Gamefruit | https://sketchfab.com/3d-models/free-lowpoly-barrels-set-18860cfaa1054b33a5c99bca9250e8da | CC-BY | 4 texture variants |
| Sketchfab | Military Sandbag Barrier | https://sketchfab.com/3d-models/military-sandbag-barrier-free-low-poly-3f4d0ec9510244bab16bbd0916a3495b | CC-BY | Sandbag walls |
| Sketchfab | Low Poly Barrier + Machine Gun by Kolos Studios | https://sketchfab.com/3d-models/low-poly-barrier-for-an-military-base-839aec4819f74240afa84f232e2cff28 | CC-BY | Sandbags + MG emplacement |
| Sketchfab | Crates And Barrels by Mateusz Wolinski | https://sketchfab.com/3d-models/crates-and-barrels-5ae3c72285474862a89d69c2f2ad2246 | CC-BY | Supply props |
| Sketchfab | Radar (stylized army) by captaj0987 | https://sketchfab.com/3d-models/radar-bc37c812cb4e4177897a86f270fba9a1 | CC-BY | Radar dish prop |

---

## AUDIO ASSETS

### Weapon & Combat Sounds

| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| OpenGameArt | 100 CC0 SFX | https://opengameart.org/content/100-cc0-sfx | CC0 | General game sounds including impacts |
| OpenGameArt | CC0 Sound Effects | https://opengameart.org/content/cc0-sound-effects | CC0 | Military/combat focused |
| OpenGameArt | 25 CC0 bang/firework SFX | https://opengameart.org/content/25-cc0-bang-firework-sfx | CC0 | Cannon, explosions, gunshots |
| OpenGameArt | CC0 Sounds Library | https://opengameart.org/content/cc0-sounds-library | CC0 | Comprehensive sound library |
| Happy Soul Music | Heavy Weapons & Explosions | https://happysoulmusic.com/heavy-weapons-and-explosions-sound-effects/ | CC0 | 93 tracks: cannon, mortar, RPG, tank |

### UI Sounds

| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| Kenney | UI Audio | https://kenney.nl/assets/ui-audio | CC0 | Click, hover, confirm |
| OpenGameArt | 100 CC0 SFX (UI subset) | https://opengameart.org/content/100-cc0-sfx | CC0 | Includes UI sounds |

---

## UI ICON SETS

| Source | Asset | URL | License | Notes |
|--------|-------|-----|---------|-------|
| itch.io | WWII Weapon Icons | https://itch.io/game-assets/free/tag-world-war-ii | varies | Multiple free icon packs |
| itch.io | Military sprites/icons | https://itch.io/game-assets/tag-military/tag-sprites | varies | Various military sprite packs |
| Kenney | Game Icons | https://kenney.nl/assets/game-icons | CC0 | 200+ game icons |

---

## PRIORITIZED REPLACEMENT PLAN

### Phase 1: CRITICAL REPLACEMENTS (Worst Mismatches)
These models are blatantly wrong era/theme and should be replaced first:

1. **`unit_plane`** (`fighter-jet.glb`) -> Low-poly propeller plane
2. **`unit_bomber`** (`craft-cargo.glb`) -> B-17 or Lancaster bomber
3. **`unit_engineer`** (`xbot.glb`) -> britdawgmasterfunk RTS character
4. **`unit_aahalftrack`** (`humvee.glb`) -> Armored vehicle + AA gun
5. **`bld_headquarters`** (`fortress.glb`) -> Military building by 3RDimens
6. **`bld_bunker`** (`castle-kit/tower-square-base.glb`) -> WWII concrete bunker
7. **`bld_wall`** (`stone-wall.glb`) -> Military sandbag barrier
8. **`bld_supplyexchange`** (`kaykit-medieval/building_market_blue.gltf`) -> Industrial warehouse
9. **`bld_superweapon`** (`tower-defense/tower-round-top-a.glb`) -> Rocket launch base
10. **`bld_techlab`** (`city-kit/building-a.glb`) -> Military building + radar

### Phase 2: SIGNIFICANT UPGRADES
These could be improved but aren't egregiously wrong:

11. **`unit_heavytank`** (reused `tank.glb`) -> Distinct Tiger tank model
12. **`unit_carrier`** (`warship.glb`) -> Proper aircraft carrier
13. **`unit_commander`** (`mini-arena/character-soldier.glb`) -> Military RTS Character
14. **`bld_airfield`** (`structure.glb`) -> Airfield hangar

### Phase 3: EVALUATE AND IMPROVE
Evaluate these current models - they may already be acceptable:

15. `unit_tank` (`tank.glb`) - Replace with MrEliptik CC0 tank if not WWII-looking
16. `unit_apc` (`apc.glb`) - May be fine
17. `unit_scoutcar` (`scout-vehicle.glb`) - Replace with Willys Jeep if too modern
18. `unit_infantry` (`soldier.glb`) - May be fine
19. `unit_battleship` (`battleship.glb`) - May be fine
20. `unit_submarine` (`submarine.glb`) - May be fine
21. `bld_turret` (`turret-double.glb`) - May be fine if not too sci-fi
22. `bld_aaturret` (`turret-single.glb`) - Replace with Flak 88 if too sci-fi

---

## TOP CREATOR RECOMMENDATIONS

These creators produce the most consistent, game-ready, properly licensed WWII assets:

| Creator | Platform | License | Specialty | Profile URL |
|---------|----------|---------|-----------|-------------|
| **britdawgmasterfunk** | Sketchfab | CC0 | RTS military characters | https://sketchfab.com/britdawgmasterfunk |
| **Gotz von Berlichingen** | Sketchfab | CC-BY | WWII military (HoI4 mods) | https://sketchfab.com/vonBerlichingen |
| **Zsky** | Poly Pizza / itch.io | CC-BY | Low-poly military vehicles + bases | https://poly.pizza/u/Zsky |
| **MedSamer** | Sketchfab | CC-BY | Low-poly military vehicles | https://sketchfab.com/MidSamer |
| **ITHappy Studios** | Fab.com | Free | Military props and buildings | https://ithappystudios.com/free/military-free/ |
| **3RDimens** | Sketchfab | CC-BY | Game-ready military buildings | search on Sketchfab |
| **Kolos Studios** | Sketchfab | CC-BY | Military base props | search on Sketchfab |

---

## LICENSE TRACKER (For CREDITS.md)

If using CC-BY models, these attributions are required:

| Model Used For | Creator | License | Attribution Text |
|---------------|---------|---------|-----------------|
| Various WWII | Gotz von Berlichingen | CC-BY 4.0 | "WWII models by Gotz von Berlichingen (Sketchfab)" |
| Military Vehicles | Zsky | CC-BY 4.0 | "Low Poly Military Vehicles by Zsky (Poly Pizza)" |
| Military Vehicles | MedSamer | CC-BY 4.0 | "Low-poly Military Vehicles Pack by MedSamer (Sketchfab)" |
| Military Building | 3RDimens | CC-BY 4.0 | "Low Poly Military Building by 3RDimens (Sketchfab)" |
| Sandbag Barrier | Shorty_Digitan | CC-BY 4.0 | "Military Sandbag Barrier by Shorty_Digitan (Sketchfab)" |
| Turret | GraphOrigin | CC-BY 4.0 | "Turret Low Poly by GraphOrigin (Sketchfab)" |
| Flak 18 | Nikita Vitik | CC-BY 4.0 | "Anti-aircraft gun Flak 18 by Nikita Vitik (Sketchfab)" |
| Battleship | Angelo Raffaele Catalano | CC-BY 4.0 | "low poly battleship by Angelo Raffaele Catalano (Poly Pizza)" |
| Aircraft Carrier | Dewi | CC-BY 4.0 | "Low-poly Aircraft Carrier by Dewi (Sketchfab)" |
| PT Boat | ThomasBeerens | check | "Elco 80ft PT by ThomasBeerens (Sketchfab)" |
| Propeller Plane | RC-Studios | CC-BY 4.0 | "Low-poly Propeller Plane by RC-Studios (Sketchfab)" |
| B-17 | helijah | check | "Boeing B-17 Flying Fortress by helijah (Sketchfab)" |

**CC0 models (no attribution needed):**
- britdawgmasterfunk: Military Character Kit, RTS Mercenaries 1 & 2, Military RTS Character
- MrEliptik: FREE Stylized Tank
- ITHappy Studios: Military FREE Pack
- Kenney: All packs (Nature Kit, Tower Defense Kit, etc.)

---

## DOWNLOAD WORKFLOW

For each model replacement:

1. **Download** from source in GLTF/GLB format
2. **Optimize** in Blender if needed (decimate to target poly count)
3. **Export** as GLB with embedded textures
4. **Place** in `assets/models/units/` or `assets/models/buildings/`
5. **Update** `AssetManager.MANIFEST` with new path
6. **Test** in-game with team color tinting (`getTeamTintedModel`)
7. **Verify** scale matches `targetSize` in manifest

---

## SUMMARY

**Total models needing replacement:** 10 critical, 4 significant, 8 to evaluate
**Best single source for vehicles:** Zsky (Poly Pizza) + MrEliptik (itch.io)
**Best single source for characters:** britdawgmasterfunk (Sketchfab, CC0)
**Best single source for WWII naval/air:** Gotz von Berlichingen (Sketchfab)
**Best single source for buildings:** Zsky Military Base Pack + ITHappy Military FREE
**Best single source for props:** ITHappy Military FREE + Kenney Tower Defense Kit
