# Original Warzone roster

All 18 unit and 21 building entries in AssetManager now load original, self-contained Blender GLBs. This includes the existing three armored vehicles, 15 additional units, 18 regular/extra building assets, and three additional capturable structures. The destroyer remains an extra asset: the game currently exposes 17 producible unit classes. Six nations share these role models and retain their existing faction statistics and accent markers.

Ground units include equipped infantry, engineer, commander, two-person mortar crew, reconnaissance car, AA halftrack, self-propelled gun, armor and quadrotor. Air/naval assets include propeller fighter, twin-engine bomber, battleship, destroyer, patrol boat, carrier and submarine. Buildings use concrete foundations, framed windows, standing-seam roofs, role-specific equipment, depots, industrial sawtooth roofs, a hollow hangar, docks, fortifications and radio structures.

## Integration

- Every unit/building manifest path points to `assets/models/{units,buildings}/warzone-original/`.
- Five capturable structure types use authored models and recolor only TeamColor paint on capture.
- Carrier escort aircraft reuse the fighter GLB at reduced scale.
- Authored PBR materials survive Game.addEntity's toon conversion. Tracks, glass, masonry and steel retain their authored colors.
- Models keep the existing gameplay target sizes, centering and orientation conventions. Naval models receive a shallow waterline offset.
- Procedural fallbacks remain available if asset loading fails. Terrain, trees and decorative props are outside this roster replacement.

## Reproduce

From the repository root with Blender on PATH:

```
blender --background --python scripts/generate-armored-vehicles.py
blender --background --python scripts/generate-roster.py
blender --background --python scripts/render-roster.py
npm run test:roster
npm run test:armor
npm run test:interface
```

Source is split into `roster_common.py`, `roster_units.py` and `roster_buildings.py`. Category `roster-manifest.json` files record exported budgets. The armor generator is safely importable for shared geometry helpers.

## Review and validation

Open `/docs/roster-preview.html` to orbit any of the 39 assets, switch player/enemy/neutral colors, and run the browser factory audit. The audit constructs all 17 actual unit classes, all 16 building classes, the five capturable types, and carrier escorts. It verifies authored model presence and PBR preservation, then checks capture repainting. Contact sheets are `roster-ground.png`, `roster-air-naval.png` and `roster-buildings.png`.

The Node roster verifier parses all GLBs using Three.js and checks scale, grounding/waterline, finite geometry, shadows, isolated team materials, preserved PBR after repeated toon processing and per-model budgets. All 39 together occupy 9.96 MiB. Each is below 22,000 triangles, 12 material meshes and 1.5 MB. Models use geometry and flat PBR materials; there are no external texture dependencies.

These are static stylized models, without skeletal animation, texture atlases or LODs. Large-army GPU performance has not been benchmarked. The full gameplay suite still has the previously verified baseline of 99 passing and 12 failing tests (constants, resource mocks and rally-position mocks).
