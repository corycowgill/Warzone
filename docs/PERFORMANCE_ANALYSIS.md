# Army scaling analysis — October 15, 2026

The next optimization priority is batching repeated unit meshes and their tactical overlays. Local measurements show rendering cost growing much faster than simulation cost. This analysis adds a repeatable real-game diagnostic, without changing normal gameplay rendering.

**Follow-up implemented:** [UNIT_BATCHING.md](UNIT_BATCHING.md) documents active unit/overlay batching, gameplay compatibility and the paired 200/400-unit benchmark. The source findings and measurements below describe the pre-batching baseline.

## Method

Open `/docs/performance-stress.html`. The page uses the actual Game, UnitFactory, GLB roster, terrain, fog, minimap, HUD and fixed-step simulation. The HTML contains the normal game's DOM scaffold with a diagnostic startup module instead of `main.js`. Use a disposable tab; it starts its own game. Saved graphics preferences are copied and restored in memory, never saved. The diagnostic disables autosave and match-history writes.

Army scaling uses plains terrain, map/game seed 6819, temperate biome, America/Germany, 1280×720 drawing buffer, High graphics, 1024 directional shadows, and adaptive resolution disabled. Player units grow to 50/100/200/400, using infantry/tank/scoutcar. Four starting enemy units and ten other entities remain; actual total populations appear below. AI production is disabled and units hold fire to keep population stable. These are concentrated army rendering tests, not combat/pathfinding benchmarks or normal population limits. Each case warms for two seconds and measures five seconds. Shadow, resolution and post-processing comparisons keep the same 400-unit population.

CPU timings use `performance.now()`; render submission includes browser/driver waits and is not an isolated GPU timer. Draws and triangles aggregate all passes, including shadows. The initial army/normal-speed results below used the previous foreground telemetry with a 250 ms cutoff; they should not be used to rule out rare longer stalls. The soak exposed this measurement limitation. Telemetry now retains long foreground frames and excludes hidden/resumed intervals using visibility state and clock resets. F3 also shows maximum sampled interval. These results identify a bottleneck on this local browser/device, not guaranteed FPS on other devices. Subsystem instrumentation adds some CPU overhead.

## Measured population scaling

| Player units | Total entities | FPS | p95 interval | Simulation CPU/frame | Render submission CPU/frame | Mean draws |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 64 | 56.80 | 19.0 ms | 0.13 ms | 7.23 ms | 1,416 |
| 100 | 114 | 56.84 | 18.7 ms | 0.16 ms | 13.36 ms | 2,626 |
| 200 | 214 | 36.53 | 30.7 ms | 0.43 ms | 25.94 ms | 5,444 |
| 400 | 414 | 17.76 | 63.4 ms | 1.51 ms | 53.12 ms | 11,271 |

At 200 units, five sampled frames exceeded 33.4 ms; at 400, all 89 frames did. At 400 units, visual updates averaged 0.82 ms, combat 0.44 ms/frame and fog 0.08 ms/frame. HUD work averaged 0.69 ms/frame; it increases with population but remains much smaller than render submission.

## Controlled graphics comparisons at 400 units

| Settings | Buffer | FPS | Render submission | Mean draws | Submitted triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| High | 1280×720 | 17.76 | 53.12 ms | 11,271 | 5,487,898 |
| No directional shadows | 1280×720 | 18.66 | 50.23 ms | 8,160 | 2,985,294 |
| No shadows, half resolution | 640×360 | 18.80 | 49.71 ms | 8,160 | 2,985,294 |
| No shadows, direct render, simpler terrain | 1280×720 | 18.96 | 49.38 ms | 8,144 | 2,985,278 |

Cutting pixel count by 75% barely changes FPS. Removing post-processing also barely changes it. This strongly indicates command submission/object/material overhead is the first issue to address in this workload. It does not prove GPU costs are zero. Adaptive resolution is useful for pixel-bound scenes but cannot repair this army-rendering workload.

## Source findings

* `Game.startGame()` constructs `InstancedRenderer`; no gameplay code calls `registerEntityType()` or `addEntity()` on it. The measured instanced-unit count is zero in every test. This existing class is not currently batching armies.
* Infantry, tank and scoutcar GLBs each contain eight mesh primitives and eight materials. Their triangle counts are 2,586, 12,582 and 2,936 respectively. Per-unit cloning produces many separately submitted draws even when the same unit type appears hundreds of times.
* `Entity.createHealthBar()` creates three separate planes per entity. `EffectsManager.createEntityShadow()` creates a separate ground-shadow mesh/material per entity. These are additional candidates for instanced rendering.
* The renderer samples include hidden/off-camera shadow casters and tactical overlays, so dividing draw count by visible unit count is not an exact model-part count.

## Live AI baseline

Three consecutive ten-second windows at normal speed used the seeded live AI battle with production, movement and combat enabled. FPS was 56.61 / 56.55 / 56.54; p95 was 20.0 / 19.3 / 19.1 ms. Entity counts ended at 24 / 32 / 37. Simulation cost was 0.11 / 0.17 / 0.15 ms/frame and render submission 1.87 / 2.54 / 2.95 ms/frame. One frame in window two reached 50 ms. This early battle is not a substitute for the concentrated army test.

## Sustained AI soak with corrected telemetry

The final soak ran 90 wall-clock seconds at 4× simulation speed, reaching 365.43 simulated seconds (6:05). Both HQs were made invulnerable **only in this diagnostic** to prevent an early victory from ending the workload. Production, movement, combat, effects and both AIs remained active. This is an artificial endurance workload, not a balanced match. All three windows ended in PLAYING state; no warning/error logs were captured. Autosave, achievement persistence and match-history writes were disabled by the diagnostic.

| 30-second window | End game time | Entities / units | FPS | p95 | Maximum interval | Frames >33.4 ms | Simulation CPU | Render submission CPU |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 126.47 s | 44 / 31 | 55.86 | 19.2 ms | 104.0 ms | 7 | 0.65 ms | 6.54 ms |
| 2 | 245.57 s | 69 / 51 | 54.92 | 22.0 ms | 81.4 ms | 18 | 0.98 ms | 14.30 ms |
| 3 | 365.43 s | 66 / 44 | 56.04 | 19.7 ms | 38.9 ms | 2 | 0.88 ms | 9.70 ms |

Renderer resource counts at the end of the windows were 394/563/493 geometries, 115/171/193 textures and 155/175/173 shader programs. The geometry/program counts do not grow monotonically; texture growth may reflect additional unit/effect types or incomplete cleanup. This short soak does not establish a memory leak. Shader compilation and allocation/GC are candidates for traces of the long frames, not confirmed causes. WebGL submission time can also contain synchronization stalls.

The previous telemetry discarded foreground frames above 250 ms. Regression checks now explicitly retain an 852 ms foreground interval while excluding hidden-tab and first-resume gaps. The repeated soak above used the corrected foreground sampling, so its maximum intervals are retained rather than silently filtered by that cutoff.

## Next implementation priorities

1. Build and validate unit batching by model part, material and team, starting with static vehicle bodies. Preserve independently rotating turrets, animations, picking, fog visibility, selection and corpse transitions. Do not simply enable the dormant instancing class: its template traversal and root visibility handling need correctness checks for those features.
2. Batch health bars and ground-shadow sprites. Share immutable geometry/materials where safe. Measure per-frame draw budgets at 50/100/200 units before and after, keeping the current diagnostic scene fixed.
3. Add distance-based model LODs for tanks and other detailed units after submission counts are reduced. Instancing reduces draw overhead; it does not remove per-instance triangles.
4. Profile moving and actively fighting large armies separately before changing spatial indexing or AI. The idle scaling test does not justify a simulation rewrite.
5. Attribute rare long stalls with browser CPU/GPU traces and shader compilation markers. The first accelerated run reached a 170 ms foreground interval before ending at 98 simulated seconds. Resource/program growth suggests shader compilation is worth investigating, but these samples do not establish the cause.
6. Add long-session resource lifecycle checks across match restarts; renderer resource counts alone do not measure GPU memory bytes or prove a leak. Existing entity/material ownership needs an audit before disposing shared GLB geometry.

A Unity port would still need batching, LODs and efficient overlays. These measurements support addressing the current rendering path first; they do not measure or predict Unity WebGL performance.

Run `npm run analyze:assets` to reproduce the complete unit/building primitive, material and triangle budget table. Run `npm run test:performance` for adaptive resolution, minimap and telemetry regression checks, including preservation of long foreground stalls and exclusion of background/resume gaps.
