# Full-match simulation and large-army audit — 2026-10-24

This is an automated core-simulation screen, not a complete human playtest or a browser FPS measurement. It uses real units, terrain, combat, production, resources, pathfinding and AI worker decisions at fixed 0.1-second steps. Rendering, active abilities, research, neutral objectives and loot are excluded. Simulated matches end at headquarters destruction or 600 seconds. The mixed-army stress workloads run for 120 simulated seconds.

## Changes supported by the results

- AI construction now searches up to 36 alternative expansion slots when terrain or occupied ground blocks a planned site. It expands on both sides of its HQ instead of exhausting a single direction. Eligibility and faction construction discounts use the authoritative shared building rules. Successful placement alone advances the slot.
- France's extra income is reduced from +4 to +2 SP/s. Its 10% cheaper units, 10% faster production and stationary-infantry passive are retained. This is one conservative adjustment, not a declaration that factions are balanced.
- Added reproducible all-pair, mirror-match and movement-stress scripts, per-type damage/kill totals, blocked-order counts and CPU-step timings. A regression test checks deterministic match outcomes despite nondeterministic profiling times.

## Matchup coverage and controls

Four 180-match sweeps cover every unordered faction pair, both side assignments, continental/river/plains maps and seeds 6819/9071. Another 30-match holdout uses plains seed 24817. There are also two 36-game identical-faction mirror audits and 30 stress workloads across the sweeps and dedicated movement audit.

The original independent-strategy sweep produced a 136–44 player/enemy split. After construction fixes it was 142–38. Identical factions also showed a 28–8 split. Those results confound side assignment with AI strategy/worker RNG: they are unsuitable as direct faction win-rate estimates.

Controlled sweeps initialize both AI strategy selectors and worker streams from the same seed. This is a diagnostic control only; normal game AI randomness is unchanged. The controlled pre-tuning split was 93–87; after the income adjustment it was 97–83. Controlled identical-faction fixtures were 22–14. Residual map, deployment and seed effects remain.

| Faction | Controlled before income tuning | Controlled after |
| --- | --- | --- |
| America | 26/60 | 28/60 |
| Britain | 39/60 | 44/60 |
| France | 54/60 | 42/60 |
| Germany | 14/60 | 14/60 |
| Japan | 16/60 | 17/60 |
| Austria | 31/60 | 35/60 |

All 180 controlled fixtures finished both before and after tuning. Median duration increased from 195.0 to 212.2 simulated seconds, with median first combat unchanged at 31.0 seconds. The tuned duration range was 105.3–591.7 seconds. Before the construction fix, 30 of 360 AI team-runs never built a war factory; after the fix this dropped to zero in every sweep.

The unused-seed holdout finished 29/30 matches. France won 4/10 and Britain 10/10. France/Austria with France on the player side hit the ten-minute cap (France HQ 231 HP, Austria HQ 1000 HP). This confirms seed sensitivity and leaves Britain's strength and long defensive matches as follow-up concerns. The small holdout is not enough evidence for another immediate faction nerf. Germany and Japan also remain weak in the main land-focused fixtures; naval and active-ability play need dedicated coverage.

Per-type totals in the tuned set: infantry ~943,545 damage / 8,961 kills; tanks ~903,071 / 9,050; drones ~203,449 / 1,730; mortar teams ~98,201 / 693. These are usage-weighted totals, not cost-normalized effectiveness. Do not infer individual unit strength from them alone.

## Large-army and movement results

Stress deployments request 100 or 250 units per side, skipping unwalkable tiles. Actual peak totals were 199–200 and 476–500. Every workload completed its requested 120 simulated seconds without a crash; these are endurance workloads, so match timeouts here are expected.

Dedicated movement runs measured CPU-step p95 of 1.73–2.14 ms near 200 units and 7.22–7.89 ms near 500 units. The largest individual step was 119.15 ms. These are host-dependent observations, sometimes collected alongside other analysis processes, not a stable frame-rate guarantee or proof of hitch-free play.

No sustained movement stall episodes were detected. A diagnostic stall requires an active movement order over 3 world units from its next waypoint, with displacement below 0.25 world units per sampled second for at least four seconds. It excludes combat, pending paths, garrisons and EMP-disabled units. Blocked-order events ranged from 18 to 173 per stress run; these include intentionally unreachable requests and exhausted recovery, and are not the same as undetected stuck units. Neither metric proves all navigation cases work.

Fresh rendered benchmarking could not be completed: the in-app browser automation connection was absent, and native Edge computer-use approval timed out before navigation. Existing `large-battle-after.json` measurements are historical and were not substituted for a fresh result. Desktop GPU/frame rate, rendering hitches and a full human playthrough remain unverified.

## Reproduce

```powershell
npm run analyze:balance:full -- docs/balance/recheck.json --controlled
npm run analyze:balance:full -- docs/balance/recheck-holdout.json --controlled --holdout
npm run analyze:balance:mirror -- docs/balance/recheck-mirror.json --controlled
npm run analyze:movement-stress
npm test
npm run test:controls
npm run test:performance
```

`full-sweep.json` is the captured pre-fix baseline at a287190; `full-sweep-after.json` adds the construction fix; `full-sweep-controlled.json` adds matching AI seeds; `full-sweep-tuned.json` adds the France income change. Earlier artifacts require their corresponding source state to reproduce; rerunning current code does not regenerate historical balance values. CPU timings will vary between runs.

Raw reports are stored alongside this document. Validation: 176 tests plus controls, performance and interface checks.
