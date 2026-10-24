# Battle pacing and AI progression

This pass fixes AI technology stalls and several sources of side bias, and gives armies more time to maneuver before contact.

- Starting armies now mirror their distance from headquarters. Global movement speed is 4 rather than 5 (20% slower, with unit speed ratios preserved).
- Combat initiative alternates each simulation tick instead of always resolving the player side first.
- Spectator matches apply difficulty income bonuses symmetrically. Human damage assists and extra starting armor are excluded from spectator, hotseat and multiplayer matches. Single-player assists remain available.
- AI opening delays are 180/120/75/45 seconds for Kids/Easy/Normal/Hard.
- The AI advances its build order only after successful placement, including repeatable resource depots. Previously it could repeatedly build depots without progressing to factories.
- After fielding six armed units, the AI can reserve the cost of its next available building. Engaged armies release that reserve. Worker commands account for planned construction and nation discounts before spending on production.
- Production placement uses the seeded game RNG. Saves retain RNG state, spawn sequence and combat initiative.

## Reproducible pacing screen

Run `npm run analyze:balance:baseline` to snapshot JavaScript from commit `431222c` into the ignored `.tmp/balance-baseline` directory and regenerate `docs/balance/before.json`. Run `npm run analyze:balance -- docs/balance/after.json` for the current implementation. Neither command changes the checked-out branch.

The 18 fixtures cover three nation pairs, three maps, Easy/Normal/Hard and both nation orders. Each uses fixed 0.1-second steps and a six-minute simulation cap. Medians use the upper middle observation for even-sized samples.

| Measurement | Before | After |
| --- | ---: | ---: |
| Completed matches | 17/18 | 18/18 |
| Median first combat | 30.2 s | 36.2 s |
| Median completed match | 145.8 s | 162.0 s |
| Matches ending before 90 seconds | 1 | 0 |
| AI teams constructing a war factory | 0/36 | 36/36 |
| AI teams constructing an airfield | 0/36 | 32/36 |

These fixtures demonstrate restored tech progression and slower pacing, not balanced faction win rates. Side results were 7 player / 10 enemy wins plus one timeout before, and 7 / 11 after. Further faction tuning requires a larger seed/map matrix and human playtesting.

The harness uses actual unit classes, static nation/faction modifiers, terrain, pathfinding, combat, resource and production systems, and AI worker decisions. It runs paths and worker decisions synchronously. Rendering, research, active abilities, dynamic faction passives, weather, neutral objectives and loot are excluded. Renderer randomness is separated from simulation randomness. This is a repeatable regression screen, not a live browser performance or full-game balance benchmark.

## Validation

The complete Vitest suite passes: 126 tests across nine files. Eleven balance regression cases cover deployment symmetry, mode/difficulty rules, alternating initiative, AI placement acknowledgement and budgeting, seeded production, income display consistency, and save-state round trips. Existing fixture failures were corrected to reflect current resource, rally-point and Three.js behavior.

Additional tactics, gameplay, controls, layouts, performance and VFX verification scripts pass. Browser smoke testing covers spectator startup and early simulation without console warnings or errors; the complete match matrix above runs in the headless harness.

## Combat coordination follow-up

Large multi-pronged attacks now retain a main force and send the fastest third of eligible land combatants through a reachable side approach. Mortars and self-propelled guns remain with the main force. Flankers proceed to the actual objective after reaching their approach, with a timeout to avoid waiting indefinitely. If neither side approach has a route, the army advances together. Route probing is capped at four synchronous searches per launch; issued orders retain normal per-unit path validation.

Formation orders position mortars and self-propelled guns behind the assault line at a shared movement pace. Waves that lose at least half of an initial force of five or more withdraw their survivors. Retreating units wait through their cooldown and recover to 70% health before joining another wave; damaged units prioritize the headquarters recovery area. The worker recognizes recovery as an active assignment, and saves preserve recovery state.

Five new regression tests cover the flank-to-objective transition, inaccessible-flank fallback, casualty withdrawal, recovery eligibility and artillery formation placement. The suite now passes 131 tests. Tactics, gameplay and performance verification also pass.

`docs/balance/combat-ai.json` records the follow-up fixture run: 17/18 matches finished within the cap, median completed duration 166.2 seconds, median first contact 36.2 seconds, and no finishes before 90 seconds. One river fixture reached the six-minute cap. This is a limitation to investigate with live playtesting, not proof of a stalemate or improved faction balance. Reproduce with `npm run analyze:balance -- docs/balance/combat-ai.json`; the same harness exclusions above apply. No browser frame-rate improvement is claimed.

## Full matchup audit — 2026-10-24

See [the full-match audit](balance/FULL_MATCH_AUDIT.md) for all-pair coverage, strategy-seed controls, the AI construction fix, France income adjustment, large-army CPU/movement results and explicit rendered-playtest limitations.
