# Battlefield material and lighting pass

- Temperate terrain has greener meadow patches and broad color variation.
- High-detail rock textures project onto cliff sides to reduce stretching.
- Shoreline ground darkens and becomes smoother near the waterline.
- Water has broken animated ripple ribbons, sun highlights, shallow shelves, and
  heightfield foam. Its brightness and highlight color follow the day/night sun.
- Warm sunlight and cool fill give models more shape; dusk warms the key light.
  Night keeps enough ambient fill to read the battlefield.
- High/ultra outlines respond less strongly to texture detail, and lighter color
  quantization preserves painted surface detail.

No new geometry, scenery batches, render passes, or reflection buffers. High terrain
detail adds two rock texture samples per terrain fragment. Low/medium retain the
simple shader. Water adds arithmetic but no texture reads. This pass does not claim
a measured frame-rate improvement; GPU cost still depends on viewport and hardware.

Validation: environment checks cover all 12 map/biome combinations and now verify
that water follows sun color and intensity. Performance regression checks pass.
Browser review covered day, dusk, night, temperate, arctic, desert, and low-detail
shader variants, plus a live river match without browser errors. The environment
preview uses actual game lighting and includes time-of-day/detail controls.


## Terrain detail pass

Vegetation now grows in seeded meadow and shoreline clusters. Forests have larger canopies, wider leaf-litter decals, bushes, stumps and fallen logs. Small stone groups mark shores and cliff bases. Dressing avoids the two initial base clearings and does not modify pathfinding or cover grids.

Grass and reeds sway in a root-anchored vertex shader with one shared clock, with no per-instance CPU animation. Low terrain detail disables wind and fine desert/snow bands. Arctic ground uses sand texture grain to break up snow; desert and snow get subtle wind-carved bands in high mode.

Existing GLBs and instanced material batches are reused; no extra asset downloads or per-prop draw calls. The 12 map/biome regression cases remain below 75 scenery batches (14–64 in seed 6819). More instances can still increase vertex/shadow cost; these checks are budgets, not a frame-rate benchmark. Verification also checks deterministic instance matrices, finite bounds, water updates and detail-mode wind controls.
