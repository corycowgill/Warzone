# Battlefield layout redesign

New matches use terrain layout version 2. The seed controls shore phase, landform variation, noise and vegetation; matching seeds remain deterministic.

- **Continental:** a scalloped coastline, headlands and coves, four inland/bluff landmarks, two cleared flanking trails.
- **River:** a continuous winding channel, sloped banks and two broad land fords aligned to the trails. Crossings interrupt naval travel; they are terrain causeways, not bridges with water clearance.
- **Islands:** two main base islands and two smaller offshore islands, warped shore profiles, shallow shelves, coastal rock crowns and a central naval passage. Land connectivity between opposing islands is intentionally absent.
- **Plains:** open interior, off-axis ponds, northern/southern ridges and exposed rock landmarks, with two land approaches kept clear.

Forests occupy wider groves with larger canopies. Landmark rock crowns share the existing cliff batches and have blocked footprints. Trees and small dressing avoid the trails. The ground shader paints broken dirt paths and paired wheel wear without extra draws or texture downloads. Both starting areas have a flat inner construction clearing and blended shoulders.

## Compatibility

Save and replay metadata record layoutVersion and biome. Replay recording also captures the actual resolved terrain seed. Saves without layoutVersion regenerate version 1 with the original height and prop generation; new saves retain version 2. Existing saves without biome metadata default to temperate, as before. Geometry changes require starting a new match to see the redesigned layout.

## Route correction and verification

Map verification exposed a pre-existing A* defect in both main-thread and worker implementations: `0 || Infinity` replaced the start node's valid zero cost. Nullish fallback preserves zero. Regression coverage executes both implementations against the generated land maps.

`npm run test:layouts` checks 24 template/seed combinations: finite heights, flat walkable construction clearings, two open land lanes, actual main-thread and worker A* paths, naval passage, landmark availability and legacy generation. `test:environment` additionally checks all 12 template/biome combinations at seed 6819 for repeatable instance transforms, bounded geometry and scenery budgets. Performance and gameplay-order regressions also run. Browser preview covers layout overviews, biome materials, high/low detail and shader errors.

The scenery budget is fewer than 75 instanced material batches and 600,000 scenery triangles in the biome fixture. These are regression budgets, not a new FPS benchmark or a guarantee for every seed.

Use `docs/environment-preview.html`: Layout selects a template; Overview frames the map; Forest, Highlands and Coast inspect details.


The full Vitest suite was also run: 103 passed, 12 failed. The failures match the known baseline in resource/production mocks and the starting-munitions assertion; they are outside the terrain/pathfinding changes. Legacy fixtures hash heights, collision and tree placement against the pre-redesign revision for all four templates.
