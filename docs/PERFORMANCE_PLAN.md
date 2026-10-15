# Warzone performance plan

1. Establish a fixed rendering benchmark using the original post-processing pipeline, identical seeded terrain, camera, models and viewport. Record frame-time percentiles, render submission time, total draws/triangles across all passes, and backing-buffer size. This isolates rendering; measure gameplay separately with stage timings.
2. Remove the second full scene render for outlines by consuming the main scene pass depth texture. Apply bloom/vignette/outline toggles independently and synchronize composer resolution with the renderer.
3. Cap excessive default pixel density and add adaptive resolution with warmup, hysteresis, a user-controlled toggle and a bounded floor. Keep simulation timing independent of render quality.
4. Remove per-frame minimap canvas readback and throttle its redraw to 10 Hz, HUD refresh to 10 Hz. Keep command/selection handling immediate.
5. Split dense grass/reed batches into 64-unit spatial chunks so offscreen dressing can be culled. Keep inexpensive tree/rock batches together to avoid excessive draw calls. Make terrain detail and shadow-quality settings take effect without restarting.
6. Verify rendering on Three.js 0.172, run deterministic and integration tests, inspect gameplay and record benchmark results and practical limits here. Preserve the prior pipeline as an explicitly labeled benchmark fixture.

Target: stable frame pacing with a 60 FPS adaptive target; no guaranteed FPS claim without a measured workload/device. FPS and WebGL submission time do not independently measure GPU execution time. Existing gameplay-suite failures remain separately documented.

## Implemented and measured — October 15, 2026

All six steps are implemented. F3 toggles a rolling monitor with FPS, p95 frame time, simulation CPU time, visual-update CPU time, render submission time, total draws/triangles and actual drawing-buffer dimensions. The monitor refreshes twice per second. Adaptive resolution waits four seconds, evaluates two-second windows, lowers scale only above 22 ms, and recovers slowly after ten seconds below 18.2 ms. Scale stays between 60–100% of the selected resolution, with a minimum pixel ratio of 0.5. Disable it in Settings → Display for manual resolution.

Post-processing consumes the primary scene pass depth texture. Bloom, vignette and outlines switch independently; outlines run for High/Ultra. Shadow quality selects 512/1024/2048 maps; shadows refresh at up to 30 Hz except Ultra. Medium/Low terrain uses four texture samples instead of eight. Minimap redraws at 10 Hz with a reusable grid-sized fog overlay, eliminating per-frame canvas readback. HUD values refresh at 10 Hz; control-group badges rebuild only when counts change. Scenery uses 16–64 material batches across the twelve tested map/biome combinations.

### Controlled renderer comparison

Open `/docs/performance-benchmark.html` and click **Run comparison**. It uses the same seeded terrain (6819), 24 tank GLBs, camera, 960×540 buffer and 1024 shadow map for both pipelines, with 45 warmup frames and five seconds of samples per pipeline. `benchmarks/LegacyPostProcessing.js` preserves the original pipeline from commit `7107e85`. This comparison isolates the post-processing change; it does not claim to measure minimap, adaptive resolution, simulation or earlier scenery batching differences.

| Metric | Original pipeline | Optimized pipeline |
| --- | ---: | ---: |
| FPS | 60.0 | 60.0 |
| p95 frame interval | 16.8 ms | 16.8 ms |
| Mean CPU render submission | 2.05 ms | 1.57 ms |
| Draw calls across all passes | 554 | 285 |
| Submitted triangles across all passes | 987,880 | 493,948 |
| Shader compilation errors | 0 | 0 |

Both runs hit the browser's 60 Hz ceiling. Measured draw calls fell 48.6%, triangle submissions 50.0%, and CPU render submission 23.4%. These are local measurements, not universal FPS guarantees or GPU execution timings. Large late-game armies need separate gameplay samples using F3; retain the engine unless measurements still justify a Unity prototype.

Validation: adaptive-control/telemetry regression checks, camera checks, environment checks and localhost interface smoke checks pass. Full gameplay suite: 99 pass, 12 existing failures (starting-resource expectation and resource/production mock fixtures).

Live AI-battle smoke test: High preset at 1280×720 showed about 60 FPS, 16.9 ms rolling p95, 39–43 entities, approximately 0.2 ms simulation and 0.1–0.2 ms visual CPU work. Medium and High presets were switched in-session; no warning/error logs appeared. Preset changes can stall while shaders compile; this is not a late-game stress benchmark. High preset was restored after testing.
