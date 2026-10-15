# Unit rendering optimization — October 15, 2026

`UnitModelBatcher` now renders repeated GLB unit parts through InstancedMesh batches grouped by geometry, material state and shadow flags. It replaces the unused template-based renderer in gameplay. All eighteen authored unit types are supported; procedural fallbacks, skinned/morphing parts and unsupported materials retain their original rendering path.

## Behavior and ownership

* Each frame reads the actual part world matrix, including nested model animation, rotation offsets, scaling and parent movement. No simulation state or simulation frequency changes.
* Team paint, camouflage opacity, emissive damage flashes and other supported material changes select the matching material batch. Material cohorts that become unused expire after 120 rendered frames.
* Health-bar planes, selection rings and faction markers share renderer-owned copies of their primitive geometry. Ground shadows join after EffectsManager creates them. Per-unit visibility, health-fill transforms and colors remain authoritative on the original objects.
* Original objects stay on picking layer 31. SelectionManager and CommandSystem raycasters include that layer; the display camera renders the instances on layer 0. Fog and garrison state still control the entity root. Hidden entities also lose their ground-shadow instances.
* Starting units are registered after renderer creation; subsequently created units register through Game.addEntity. Removal and corpse transitions restore source layers and deregister batches. Corpses clone shared GLB geometry before their fade-out cleanup, so a dead unit cannot dispose geometry used by living instances. Type-label textures are released at death.
* Save restoration removes old registrations and shadows, then registers recreated units after restoring their saved IDs. Renderer disposal releases its own materials, instance buffers and primitive copies, while retaining cached asset geometry.

## Paired A/B benchmark

Use **Run batching A/B comparison** on `/docs/performance-stress.html`. The same scene, army, camera, seed 6819, High effects, 1024 shadows and 1280×720 buffer run with batching off and on. AI production is disabled, units hold fire, and adaptive resolution is disabled. Each case warms for four seconds and measures five. Four enemy starting units plus ten other entities remain in addition to the player count.

| Player units | Batching | FPS | p95 interval | CPU render submission | Mean draws | CPU visual update |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 200 | Off | 35.22 | 30.1 ms | 26.52 ms | 5,585 | 0.71 ms |
| 200 | On | 56.79 | 18.8 ms | 5.10 ms | 701 | 2.61 ms |
| 400 | Off | 17.71 | 58.5 ms | 52.46 ms | 11,445 | 1.64 ms |
| 400 | On | 56.81 | 18.2 ms | 8.62 ms | 1,165 | 4.70 ms |

At 400 units, draw calls dropped 89.8%, render submission CPU time dropped 83.6%, and measured FPS increased 3.2×. Visual synchronization costs more CPU because it updates the instance buffers; the net frame cost is substantially lower. In the measured 400-unit windows, all 89 unbatched frames exceeded 33.4 ms, while none of the 285 batched frames did. These are local browser measurements, not universal performance guarantees. Triangle totals include shadows and vary with shadow-refresh cadence as FPS changes; instancing does not simplify the unit geometry.

## Startup shader preparation

The first sustained combat test with batching exposed 650–720 ms foreground stalls. Common regular/instanced opaque/translucent unit, corpse, overlay and particle shader variants are now prepared during loading. Warmup uses the game's actual light/fog environment and post-processing color target, then keeps material references until match cleanup to avoid releasing all references to an intermittently used program. The loading screen shows battlefield/force preparation, and the simulation clock is reset before play begins.

Implementation uses the exact shipped [Three.js r172 compileAsync implementation](https://github.com/mrdoob/three.js/blob/r172/src/renderers/WebGLRenderer.js), including its target-scene argument. New light configurations or unsupported runtime variants may still require compilation; warmup is not a guarantee that every stall disappears.

The repeated protected-HQ AI soak ran 90 wall-clock seconds at 4× speed, reaching 360.37 simulated seconds. The final build reported:

| 30-second window | FPS | p95 | Maximum interval | CPU render submission | Mean draws | End entities / units |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 53.86 | 18.5 ms | 215.8 ms | 5.10 ms | 527 | 49 / 36 |
| 2 | 55.77 | 18.8 ms | 198.8 ms | 7.29 ms | 641 | 71 / 52 |
| 3 | 56.69 | 18.7 ms | 29.2 ms | 4.24 ms | 545 | 80 / 63 |

All windows ended PLAYING, with no captured warnings/errors in the clean test tab. The repeat did not reproduce the earlier 650–720 ms freezes, but roughly 200 ms stalls remain. These runs differ in battle evolution and shader-cache state, so they do not establish a controlled reduction in stall duration or prove that shader compilation caused every stall. The paired army benchmark above remains the controlled evidence for the draw-call optimization.

## Verification

`npm run test:batching` covers live nested transforms, team materials, camouflage, fog, garrison visibility, capacity growth, removal, ray picking, corpse geometry ownership, health-fill/color preservation, ground-shadow ownership, cleanup and both teams for all eighteen real GLB assets. Warmup checks verify the color target, restored renderer state and owned-resource cleanup. Performance, camera, roster, environment and interface checks also pass.

The browser compatibility diagnostic calls the actual selection and right-click command handlers, advances movement, checks fog/garrison removal, kills a batched tank, renders its corpse and performs an in-memory save/load round trip with saved IDs. These checks pass. The full gameplay suite remains at 99 passing tests and the same twelve pre-existing failures.

Remaining work includes model LODs for triangle-heavy distant armies, lower allocation costs in instance synchronization, and tracing any remaining rare stalls. Animated transparent parts are grouped by material state; transparency sorting is at batch granularity.
