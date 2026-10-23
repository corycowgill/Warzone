# Large-battle performance pass

## Reproduce

Run the development server and open `/docs/large-battle.html` in a regular desktop browser. Finish or skip the studio intro, click **Start 50 vs 50**, let loading finish, then click **Capture 60 frames**. The page pauses at deployment so the first capture starts with exactly 100 live units. Reload the profiler to repeat the initial scenario; subsequent captures continue the existing battle.

Use **Export JSON** to save the report for comparisons across graphics settings or browsers.

The harness loads the actual game in an iframe: GLB units, environment, terrain, post-processing, particles, projectiles, combat, movement and HUD are real. Each side gets 30 infantry, 12 tanks, four mortar teams and four drones. It uses America/Germany, plains map seed 6819 and the normal fixed-step game loop. Spectator mode removes fog visibility restrictions. AI controllers are disabled after loading so production and strategic decisions do not change the deployed force. This measures a concentrated battle, not a complete AI match or multiplayer networking.

The report records initial/remaining armies, attack count, simulation advancement, wall-frame metrics, CPU system timings, draw calls, triangles and GPU resource counts. Stage timings overlap: damage-label time is included in combat time, for example. Render submission measures CPU work issuing graphics commands, not GPU completion. The tab pauses the simulation at capture completion.

## Changes

- Retained animated corpses now have a quality budget: 4/8/12/24 at Low/Medium/High/Ultra. The nearest wrecks are retained when the budget is exceeded. Immediate death effects and gameplay deaths are unaffected. Evicted and expired corpse meshes release their owned geometry/materials.
- Damage-number canvas textures are reused by rounded damage and effectiveness color, with at most 32 cached textures per effects manager. Cache disposal happens at manager cleanup; transient uncached labels still release their textures on expiry.
- Damage and salvage labels share a maximum of 24 active text effects, preventing mass casualties from turning into an unbounded text burst.
- Corpse conversion now also disposes the removed status-badge texture.

The texture cache deliberately retains some GPU memory between hits to avoid repeated canvas rasterization and texture uploads. This is bounded reuse, not a claim that the total texture count always falls.

## Browser host limits

The embedded browser used for verification produced roughly one scheduled frame per second despite much shorter measured CPU work. Its document was reported visible, but the frame spacing still differed substantially from the CPU stages. These captures establish a working 50-vs-50 battle and compare render workload; they do **not** establish normal desktop FPS, smoothness, GPU time or a universal speedup. Run the same profiler in a normal foreground browser for those measurements.

Snapshots are retained in `docs/balance/large-battle-before.json` and `docs/balance/large-battle-after.json`. They are individual samples, not a statistical benchmark. Asset/shader caches, worker completion, graphics settings and host scheduling can affect results. Initial armies, simulation time, attack count and buffer dimensions are included so differences remain visible.

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial units per side | 50 | 50 |
| Simulation time captured | 7.47 s | 7.47 s |
| Attacks | 265 | 266 |
| Average draw calls | 1,560 | 1,222 |
| Average triangles | 1,589,893 | 1,491,210 |
| Average render-submission CPU time | 30.38 ms | 23.65 ms |
| Average damage-label CPU time per call | 0.328 ms | 0.073 ms |
| Remaining units, player/enemy | 10/12 | 10/12 |

The final capture observed at most 12 retained corpses, 24 active text effects and 27 cached damage textures. Buffer dimensions matched at 1265 × 625. The roughly 22% lower draw-call count is the clearest workload reduction; timing differences should be treated as indicative until repeated in a normal desktop browser. The cached textures increased end-of-capture texture count from 45 to 71, while geometry count fell from 379 to 354.

## Regression checks

137 Vitest tests pass across 12 files. New tests cover quality-dependent corpse limits, nearest-detail retention, GPU-resource disposal, damage-texture reuse, combined label admission and cache cleanup. VFX, gameplay, performance and actual-GLB batching checks also pass. Ordinary desktop profiling and the separate river-map timeout investigation remain follow-up work.

The automation host also reported an unattributed MutationObserver startup error in the iframe profiler. Removing the repository's nation-card observer did not resolve the error, so that experiment was reverted. The game continued through deployment and both captures; the error's source remains unconfirmed. This is another reason to repeat the profiler in a normal foreground browser rather than treating embedded-host measurements as desktop performance.
