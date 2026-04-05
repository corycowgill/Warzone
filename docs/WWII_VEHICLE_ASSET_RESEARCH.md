# WWII Ground Vehicle 3D Asset Research Report

**Date:** 2026-04-04
**Purpose:** Find the best free 3D models of WWII ground military vehicles for the Warzone RTS game.

---

## Current State of Assets

The project currently uses **GLB/GLTF** format models loaded via Three.js GLTFLoader. Existing unit models are mostly repurposed from Kenney asset packs (CC0) and Three.js examples (MIT). Key gaps:

- `unit_tank` and `unit_heavytank` share the same generic `tank.glb` (Kenney)
- `unit_aahalftrack` uses `humvee.glb` (a modern SUV, not a WWII half-track)
- `unit_scoutcar` uses a futuristic race car model
- `unit_spg` uses a generic mobile cannon
- `unit_apc` uses `apc.glb` (Kenney tractor-police model)
- No vehicle has actual WWII-era appearance

**Required format: GLB or GLTF** (loaded by AssetManager.js via GLTFLoader)

---

## TIER 1: BEST FINDS (Recommended for immediate use)

### 1. Sketchfab - Dezryelle's Sherman Tank Collection
**BEST OPTION for Sherman/Allied Tanks**

| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Low Poly M4A3(75)W Sherman | [Sketchfab](https://sketchfab.com/3d-models/low-poly-m4a375w-sherman-tank-0d5533e114bf4849bc8c9213e4ee9cf9) | CC-BY | ~5-10k est | GLB/GLTF/OBJ/FBX | 5/5 | 4/5 |
| Low Poly M4A3(76) HVSS | [Sketchfab](https://sketchfab.com/3d-models/low-poly-m4a376-hvss-710e93ef16c84160a5e8b980ce07163a) | CC-BY | ~5-10k est | GLB/GLTF/OBJ/FBX | 5/5 | 4/5 |
| Low Poly M4A1(76) | [Sketchfab](https://sketchfab.com/3d-models/low-poly-m4a176-41d46853195742eda8926566ce68cecf) | CC-BY | ~5-10k est | GLB/GLTF/OBJ/FBX | 5/5 | 4/5 |

- Historically accurate, UV unwrapped, game-ready
- Untextured/unrigged (would need color material applied in-engine)
- Not animated

---

### 2. Sketchfab - Applepie68905 Collection (German Vehicles)
**BEST OPTION for German Vehicles**

| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Sd.Kfz. 251 (Half-Track) | [Sketchfab](https://sketchfab.com/3d-models/sdkfz-251-f1ef76c3419e49de9360fdcf4973aab3) | CC-BY | 13.4k | GLB/GLTF | 5/5 | 4/5 |
| Sd.Kfz. 234 Puma (Armored Car) | [Sketchfab](https://sketchfab.com/3d-models/sdkfz-234-puma-28252f54e2d14d1785042cfa4eb0be80) | CC-BY | ~10k est | GLB/GLTF | 5/5 | 4/5 |

- Good poly count for RTS game
- Consistent style between models
- Not animated

---

### 3. Sketchfab - Low Poly Tiger I
| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Low Poly Tiger 1 | [Sketchfab](https://sketchfab.com/3d-models/low-poly-tiger-1-673d62cd884d45cba535007b0553f954) | CC-BY | ~8-15k est | GLB/GLTF | 5/5 | 4/5 |

- German Panzer VI Tiger I heavy tank
- Low poly, suitable for RTS
- Not animated

---

### 4. Sketchfab - Panzer IV (barking_dogo)
| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Panzerkampfwagen IV Ausf.E | [Sketchfab](https://sketchfab.com/3d-models/panzerkampfwagen-iv-ausfe-low-poly-version-0b2a7fcef04f47bd97ce8a77182f63de) | CC-BY | 27.7k | GLB/GLTF | 5/5 | 3/5 |

- Higher poly than ideal for RTS (may need decimation)
- No UV mapping or rigging
- Not animated

---

### 5. Sketchfab - T-34 Soviet Tank
| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Tank T-34 (RomanGurd) | [Sketchfab](https://sketchfab.com/3d-models/tank-t-34-01af3ca4a7bf41ebbd5f1986edeb77fd) | CC-BY | 34.7k | GLB/GLTF | 5/5 | 4/5 |
| T-34 (1941) (XxRxX) | [Sketchfab](https://sketchfab.com/3d-models/t-34-1941-16b36c4eac8f4e7e8c1c9bca0668106d) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |

- Higher poly; may need decimation for RTS
- Not animated

---

### 6. Sketchfab - Churchill Tank
| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Low-poly Churchill Mk. VII | [Sketchfab](https://sketchfab.com/3d-models/low-poly-churchill-mk-vii-ac032b8154f941a99914ba8679109064) | CC-BY | ~5-15k est | GLB/GLTF | 5/5 | 4/5 |

- British heavy infantry tank
- Low poly, game-ready
- Not animated

---

### 7. Sketchfab - Willys Jeep
| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Willys Jeep Low Poly | [Sketchfab](https://sketchfab.com/3d-models/willys-jeep-low-poly-57ab28eb0f21472ead1f5dadf4e73a27) | CC-BY | ~3-6k est | GLB/GLTF | 5/5 | 3/5 |
| Jeep Willys (skudgee) | [Sketchfab](https://sketchfab.com/3d-models/jeep-willys-a28600c16b9e44bcb160ede0d199180d) | CC-BY | <6k | GLB/GLTF | 5/5 | 4/5 |
| Low Poly Military Jeep WW2 | [Sketchfab](https://sketchfab.com/3d-models/low-poly-military-jeep-willys-mb-ww2-scene-fcf129444005466ebd6cbbe0685aeec2) | CC-BY | ~3-6k est | GLB/GLTF | 5/5 | 4/5 |

- Multiple options at various quality levels
- Cartoon/low poly style available
- Not animated

---

## TIER 2: GOOD FINDS (Require evaluation/conversion)

### 8. Sketchfab - Heavy Tanks

| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| Tiger II H (Konigstiger) | [Sketchfab](https://sketchfab.com/3d-models/tiger-ii-h-konigstiger-f33fc5fbaef04727b4f9b9a1230084d6) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| Tiger 2 (Konig Tiger II) FREE | [Sketchfab](https://sketchfab.com/3d-models/tiger-2-konig-tiger-ii-free-1efd3b97987049f59bc736aeabe996bf) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| Henschel Tiger II (Stafford) | [Sketchfab](https://sketchfab.com/3d-models/tank-pzkpfwvi-ausfb-henschel-tiger-ii-f3fe1d22f3bb4528af3b152917daa65b) | CC-BY | low poly | GLB/GLTF | 5/5 | 4/5 |
| IS-2 (1945) | [Sketchfab](https://sketchfab.com/3d-models/is-2-1945-3d5606eb80e14e5ea045db53d475d3c9) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| IS2 Heavy Tank | [Sketchfab](https://sketchfab.com/3d-models/is2-heavy-tank-4ecb3d27eb5d491ba76a4c3ceeeb5895) | CC-BY | high poly | GLB/GLTF | 5/5 | 4/5 |
| IS-3 Heavy Tank | [Sketchfab](https://sketchfab.com/3d-models/is-3-heavy-tank-toshueyi-4a885f0c252d4d5fadf1df6fb77aa92b) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| M26 Pershing (Javafern) | [Sketchfab](https://sketchfab.com/3d-models/m26-pershing-1e0feee5754b430db591f56d06c26c6c) | CC-BY | 10.9k | GLB/GLTF | 5/5 | 4/5 |

- M26 Pershing by Javafern is particularly good (Company of Heroes 2 asset, 10.9k tris)
- Henschel Tiger II is stylized low-poly, good for game use
- IS-2/IS-3 models may need poly reduction

---

### 9. Sketchfab - Artillery / SPG

| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| StuG III (Satriarfl) | [Sketchfab](https://sketchfab.com/3d-models/stug-iii-e0b090fe9a7f44bba9b600f3128c36b3) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| StuG III Ausf G (CloudHub) | [Sketchfab](https://sketchfab.com/3d-models/stug-iii-ausf-g-052a7e7e6b2a42fe9a9b6c1294a12e20) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| StuG III Aufs. G (JooL) | [Sketchfab](https://sketchfab.com/3d-models/stug-iii-aufs-g-14e16abe7e8d4fb3888c92f4a72a487a) | CC-BY | varies | GLB/GLTF | 5/5 | 4/5 |
| Katyusha BM13 | [Sketchfab](https://sketchfab.com/3d-models/katyusha-bm13-bb46c77dc61b46a0be797fe12aa9a36e) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| Katyusha M13 Rocket | [Sketchfab](https://sketchfab.com/3d-models/katyusha-m13-rocket-709c910543c0450a93abd5714743fe08) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |

- M7 Priest models exist on Sketchfab ([tag page](https://sketchfab.com/tags/m7-priest)) but specifics need manual review
- Not animated

---

### 10. Sketchfab - Light Vehicles

| Model | URL | License | Tris | Format | WWII Accuracy | Quality |
|-------|-----|---------|------|--------|---------------|---------|
| VW Typ 82 Kubelwagen Low Poly | [Sketchfab](https://sketchfab.com/3d-models/vw-typ-82-kubelwagen-low-poly-2e56ea4dc18e46eaa9431456cb506c77) | Unknown (check) | 5.1k | GLB/GLTF | 5/5 | 3/5 |
| GAZ-67 (Jorma Rysky) | [Sketchfab](https://sketchfab.com/3d-models/gaz-67-41d1668b1dad444ba50cb82113c1dfa6) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| GAZ-67 Low Poly (Harri Jones) | [Sketchfab](https://sketchfab.com/3d-models/gaz-67-low-poly-russian-jeep-7e9e881c566149ccbc3be74409219f3b) | CC-BY | low | GLB/GLTF | 5/5 | 3/5 |
| Universal Carrier (artfletch) | [Sketchfab](https://sketchfab.com/3d-models/universal-carrier-7ae49e2042f447dc983a567b85423b8e) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |
| Sd.Kfz. 251 6-Rad (Ravrt) | [Sketchfab](https://sketchfab.com/3d-models/sdkfz251-6-rad-03b013369977418b96cc04f9391e66b6) | CC-BY | varies | GLB/GLTF | 5/5 | 3/5 |

---

## TIER 3: ASSET PACKS (Multiple vehicles in one download)

### 11. Poly.pizza - Low Poly Military Vehicles (Zsky)
- **URL:** [poly.pizza](https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X)
- **License:** CC0 (Public Domain) - typical for poly.pizza
- **Format:** GLB, FBX, OBJ
- **Contents:** 9 military vehicle models (tank, APC, jeep, truck variants)
- **Poly count:** Very low poly (stylized)
- **WWII Accuracy:** 2/5 (generic military, not specifically WWII)
- **Quality:** 3/5
- **Animated:** No
- **No login required** to download

### 12. Sketchfab - Low-poly Military Vehicles Pack (MedSamer)
- **URL:** [Sketchfab](https://sketchfab.com/3d-models/low-poly-military-vehicles-pack-48137988cfef4ff88f51b08b996ecc1f)
- **License:** Check on page (free download)
- **Format:** GLB/GLTF
- **Contents:** Tank, APC, truck, light armored cars
- **Poly count:** 3.7k triangles total (extremely low poly)
- **WWII Accuracy:** 2/5 (stylized/generic)
- **Quality:** 3/5 (pixel-art aesthetic)
- **Animated:** No

### 13. Kenney.nl - Tanks Pack
- **URL:** [kenney.nl/assets/tanks](https://kenney.nl/assets/tanks)
- **License:** CC0 (Public Domain)
- **Format:** OBJ, FBX, GLB (via additional package)
- **Contents:** 80 tank assets (appears to be stylized/cartoon tanks, not WWII-specific)
- **WWII Accuracy:** 1/5 (generic cartoon tanks)
- **Quality:** 4/5 (very polished, consistent style)
- **Animated:** No
- Already partially in use by this project

### 14. Itch.io - Coynese Low-Poly WW2 Tank
- **URL:** [itch.io](https://coynese.itch.io/low-poly-ww2-tank-3d-model)
- **License:** Check on page (name your own price / free)
- **Format:** ZIP (127 kB, likely OBJ/FBX - verify)
- **WWII Accuracy:** 4/5
- **Quality:** 3/5
- **Animated:** No

### 15. Itch.io - Widgeon 3D Low Poly Military Vehicles
- **URL:** [itch.io](https://widgeon.itch.io/3d-low-poly-military-vehicles)
- **License:** Check on page (name your own price)
- **Format:** OBJ
- **Contents:** Tank (247kB), Armoured Vehicle (131kB), Attack Helicopter (261kB)
- **WWII Accuracy:** 2/5 (generic military)
- **Quality:** 3/5
- **Animated:** No

### 16. CGTrader - WWII Model Pack
- **URL:** [CGTrader](https://www.cgtrader.com/3d-models/military/military-vehicle/wwii-model-pack)
- **License:** CGTrader Royalty Free License (check specifics)
- **Format:** Multiple (MAX, OBJ, FBX, 3DS, C4D)
- **Contents:** 147 objects including Sherman Tank, Tiger Tank, Half Track, Kubelwagen, Maus Tank, Jeep, Junkers Ju87, trucks
- **WWII Accuracy:** 5/5
- **Quality:** 4/5 (2048x2048 textures)
- **Price:** Likely paid (check page) -- included here due to comprehensive contents
- **Animated:** No

### 17. CGTrader - Free Individual Models

| Model | URL | License | Format |
|-------|-----|---------|--------|
| Low Poly WW2 Sherman Tank | [CGTrader](https://www.cgtrader.com/free-3d-models/military/military-vehicle/low-poly-ww2-sherman-tank) | CGTrader Free | FBX, BLEND |
| WWII Tiger 1 Tank | [CGTrader](https://www.cgtrader.com/free-3d-models/military/military-vehicle/wwii-tiger-1-tank) | CGTrader Free | FBX, OBJ, MAX, MA |
| M4 Sherman Medium Tank | [CGTrader](https://www.cgtrader.com/free-3d-models/military/military-vehicle/m4-sherman-medium-tank) | CGTrader Free | Multiple |

- CGTrader free models: 6,271 polys (Tiger 1), separated turret (Sherman)
- Need format conversion to GLB for this project

---

## TIER 4: ADDITIONAL SOURCES (Browse manually)

### Sites with WWII content requiring manual browsing:

| Site | URL | Notes |
|------|-----|-------|
| Free3D WW2 Tanks | [free3d.com](https://free3d.com/3d-models/ww2-tank) | 20 free WW2 tank models, various formats |
| Free3D Low Poly Tanks | [free3d.com](https://free3d.com/3d-models/lowpoly-tank) | 57 free low-poly tank models |
| TurboSquid Free Tanks | [turbosquid.com](https://www.turbosquid.com/Search/3D-Models/free/tank) | Free section, OBJ/FBX/MAX |
| TurboSquid Free Sherman | [turbosquid.com](https://www.turbosquid.com/Search/3D-Models/free/sherman-tank) | Free Sherman models |
| TurboSquid Free Panzer | [turbosquid.com](https://www.turbosquid.com/Search/3D-Models/free/panzer) | Free Panzer models |
| RigModels WW2 | [rigmodels.com](https://rigmodels.com/index.php?searchkeyword=ww2) | Free, OBJ/FBX/STL/DAE/GLB formats |
| RigModels Tanks | [rigmodels.com](https://rigmodels.com/?searchkeyword=tank) | Free tank models, GLB available |
| OpenGameArt Military | [opengameart.org](https://opengameart.org/art-search-advanced?keys=tank&field_art_type_tid%5B%5D=10) | Search 3D models for tank/military |
| Poly.pizza Military | [poly.pizza](https://poly.pizza/search/military) | CC0 models, no login, GLB format |
| Poly.pizza Tanks | [poly.pizza](https://poly.pizza/search/tank) | CC0 tank models |
| Poly.pizza Jeeps | [poly.pizza](https://poly.pizza/search/Jeep) | CC0 jeep models |
| Sketchfab WW2 Low Poly | [sketchfab.com](https://sketchfab.com/tags/ww2-lowpoly) | Tag page for all WW2 low poly |
| Sketchfab Low Poly Tanks | [sketchfab.com](https://sketchfab.com/tags/low_poly_tanks) | Tag page for low poly tanks |
| Itch.io WW2 Assets | [itch.io](https://itch.io/game-assets/tag-war/tag-world-war-ii) | WW2 game assets |
| Itch.io Low Poly Tanks | [itch.io](https://itch.io/game-assets/free/tag-low-poly/tag-tanks) | Free low-poly tank assets |
| Itch.io 3D Military | [itch.io](https://itch.io/game-assets/tag-3d/tag-military) | 3D military game assets |

---

## RECOMMENDED ASSET MAPPING

Based on research, here is the recommended mapping from game units to specific models:

| Game Unit | Current Model | Recommended Replacement | Source |
|-----------|--------------|------------------------|--------|
| `unit_tank` (Tank) | tank.glb (generic) | Low Poly M4A3(75)W Sherman (Dezryelle) | Sketchfab CC-BY |
| `unit_heavytank` (HeavyTank) | tank.glb (same) | Low Poly Tiger 1 (SGAstudio) | Sketchfab CC-BY |
| `unit_scoutcar` (ScoutCar) | scout-vehicle.glb (futuristic) | Willys Jeep Low Poly OR Sd.Kfz. 234 Puma | Sketchfab CC-BY |
| `unit_apc` (APC) | apc.glb (tractor) | Sd.Kfz. 251 Half-Track (Applepie68905) | Sketchfab CC-BY |
| `unit_aahalftrack` (AAHalfTrack) | humvee.glb (modern SUV) | M3 Half-Track (search Sketchfab) | Sketchfab CC-BY |
| `unit_spg` (SPG) | cannon-mobile.glb (generic) | StuG III Ausf G (CloudHub or JooL) | Sketchfab CC-BY |
| `unit_mortarteam` (MortarTeam) | cannon.glb (generic) | Katyusha BM13 OR keep cannon | Sketchfab CC-BY |
| `unit_commander` (Commander) | character-soldier.glb | Keep (infantry model is fine) | Existing |
| `unit_drone` (Drone) | drone.glb | Keep (drone is faction-agnostic) | Existing |

---

## LICENSE SUMMARY

| License | Models Found | Requirements |
|---------|-------------|-------------|
| **CC0** | Kenney packs, Poly.pizza models, Quaternius | None - free to use |
| **CC-BY** | Most Sketchfab models listed above | Must credit the author |
| **CC-BY-SA** | Some Sketchfab models | Must credit + share-alike |
| **MIT** | Three.js example models | Include license text |
| **CGTrader Free** | CGTrader free models | Check individual terms |

**Important:** All CC-BY models require attribution. Update `assets/models/LICENSES.md` when adding any new models.

---

## FORMAT CONVERSION NOTES

- **Sketchfab downloads** typically offer GLB, GLTF, FBX, OBJ, and USDZ formats
- **Poly.pizza** offers direct GLB download (best for this project)
- **OBJ/FBX models** can be converted to GLB using:
  - Blender (File > Import > Export as GLB)
  - `gltf-pipeline` npm package: `npx gltf-pipeline -i model.gltf -o model.glb`
  - Online: [gltf.report](https://gltf.report/) for optimization
- **Poly reduction** for high-poly models: Use Blender's Decimate modifier

---

## NEXT STEPS

1. **Download and evaluate** Tier 1 models (Dezryelle Sherman, Applepie68905 Sd.Kfz 251/234, Tiger I, Churchill)
2. **Test in-engine** -- drop GLB files into `assets/models/units/` and update AssetManager.js manifest
3. **Ensure consistent visual style** -- all models should look coherent at RTS camera distance
4. **Add attribution** to LICENSES.md for all CC-BY models used
5. **Consider the Poly.pizza Zsky pack** as a quick stylistic fallback if WWII-specific models don't look cohesive together
6. **Browse manual links** in Tier 4 for any missing vehicle types (M7 Priest, M3 Half-Track specifically)
