# Warzone environment art

The battlefield now uses original Blender scenery and generated ground albedo textures in the same muted olive, stone, timber and teal direction as the military roster.

## Assets and integration

26 self-contained scenery GLBs live in `assets/models/environment/warzone-original/`: six trees (oak, birch, broadleaf, pine, fir, palm), boulder, cliff, mountain outcrop, grass, reeds, bush, stump, fallen log, resource outcrop, supply cache and ten replacement field-prop slots. All environment, tree and prop manifest entries point to these assets. The field-prop slots retain their legacy identifiers for compatibility; currently unused slots are not scattered into playable lanes.

`EnvironmentScenery.js` batches GLB material parts into InstancedMesh objects. Tree positions keep the existing collision/forest-cover rules. Small ground dressing is cosmetic; cliffs and mountain outcrops occupy existing high-ground cliff sites. Desert uses palms; arctic uses pale conifers and omits meadow grass. Soft forest-floor decals follow heightfield vertices. Resource nodes and supply pickups use GLBs while keeping their gameplay markers and rewards.

`TerrainMaterials.js` blends four 512px WebP albedo tiles in world space with rotated secondary sampling, slope/height masks, broad color variation and biome adjustments. The textures are in `assets/textures/environment/`, alongside the original generated atlas. Water uses the actual generated heightfield for depth coloring and animated shoreline foam, with ripple highlights and fresnel tint. Rivers, ponds and coastlines share this material. Water remains a shader surface, rather than a static GLB, to fit generated maps.

Continental coast parameters are now sampled once per map instead of once per vertex. This removes jagged shore spikes. Seeded continental terrain and prop placement therefore differ from older versions; old replay seeds do not reproduce the old coastline. Other templates retain their existing height generation. Starting areas and land/water gameplay rules remain in place.

Terrain geometry, instanced geometry, material instances, decal masks and water height textures are disposed on restart. Shared ground albedo textures are reused across matches.

## Reproduction

```
python scripts/build-terrain-textures.py
blender --background --python scripts/generate-environment.py
blender --background --python scripts/render-environment.py
npm run test:environment
npm run test:roster
npm run test:camera
npm run test:interface
```

Inspect `/docs/environment-preview.html` for coast, forest, river and highland views with temperate/desert/arctic controls. The contact sheet is `docs/environment-assets.png`.

Validation parses all 26 GLBs with real Three.js, checks PBR preservation, finite geometry and budgets, and constructs all 12 map-template/biome combinations. Seeded height/collision determinism, instanced transforms, batch budgets and water uniforms pass. GLBs total 1.72 MiB, each below 12,000 triangles and 1.5 MB. Four runtime texture tiles total about 0.47 MiB. Browser review uses the game's Three.js 0.172. A fresh tutorial loads 65/65 models with zero failures and no browser rendering errors. The full gameplay suite retains 99 passing and 12 pre-existing failing tests.

This is a stylized browser environment with geometric foliage, flat PBR scenery and albedo ground detail. It has no foliage LOD system, skeletal wind animation, dynamic water reflections, terrain normal-map set or measured large-army GPU target.

## Texture provenance

Generated with the built-in ImageGen tool using the imagegen skill, then split into four 512px runtime WebP tiles. Source: `assets/textures/environment/terrain-atlas-source.png`. Runtime assets: `grass.webp`, `dirt.webp`, `rock.webp`, `sand.webp` in the same directory. No third-party texture pack is required.

Final generation prompt:

> Use case: stylized-concept. Asset type: production terrain albedo texture atlas for a stylized WWII RTS game. Generate one square 2048x2048 image divided into exactly four equal square quadrants, no gaps, no borders, no text. Orthographic straight-down material scans, flat diffuse lighting with no directional shadows, no horizon or perspective. TOP LEFT: desaturated olive meadow grass with tiny painterly blade clumps and moss, restrained soft variation. TOP RIGHT: warm brown compacted dirt with fine small pebbles and subtle wheel-worn earth. BOTTOM LEFT: weathered cool gray limestone with layered mineral striations and fine cracks. BOTTOM RIGHT: pale warm sand with fine wind ripples and sparse grit. Premium hand-painted sculptural game material style, rich natural microdetail at consistent small scale, calm large shapes so tactical units remain readable, muted realistic palette. Each individual quadrant should tile seamlessly on its own along all four edges; avoid isolated large objects, plants, rocks or leaves crossing edges. No baked illumination, labels, watermarks or UI.
