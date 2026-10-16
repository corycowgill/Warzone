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
