# Combat playtest suite — 2026-10-25

Open `/docs/combat-playtest.html` on the game server. This is a development playtest page embedding the actual game, renderer, GLBs, fog, HUD, combat, ability and movement systems. It does not add another player-facing game mode.

## How to run

1. Finish/skip the studio intro. Choose a scenario and Load scenario.
2. Read its tactical prompt. The deployed armies are paused, initial fog is computed, and your units are selected. Inspect or queue orders, then Begin combat.
3. Use Full-screen battlefield (Escape to return) for an unobstructed normal-height HUD. Use normal selection, movement, abilities and retreat. The enemy army attack-moves toward your initial position; it uses ordinary automatic combat, not strategic AI or active ability micro.
4. The trial pauses on success, defeat or 180 simulated seconds. Export report also works during a trial. Add a clarity answer and a note before exporting.
5. Load again to reset, using the same map seed and roster. Compare an unattended baseline with an intentional tactical response. Repeat three times and log all outcomes rather than retaining only the best.

| Trial | Player task | Success condition |
| --- | --- | --- |
| Armor/support | Screen infantry and mortars with armor; assess focus fire | Eliminate the deployed enemy force with a survivor |
| Artillery | Preserve the screen and keep mortars outside minimum range | Same |
| Air/AA | Protect AA half-tracks from ground pressure | Same |
| Naval | Select patrol boats for Sonar; protect the battleship | Same; a win alone does not prove Sonar was useful |
| Retreat | Use R on three tanks starting at 40% health | Issue retreat; recover two survivors to 70% health within 30 world units of HQ |

Both sides use America, Normal difficulty, seed 6819. Plains is used for land/air and Continental for naval. Deployment uses passable distinct slots, bounded route checks and a connected naval channel. AI controllers, random map events, ordinary match victory and new training/construction requests are disabled in this harness. HQ healing, fog, weather, existing faction passives and normal combat remain enabled. These are small tactical experiments, not full-match balance tests.

Reports include outcome, time, survivors, recovered units, a bounded 256-event trace, rolling frame metrics, graphics/buffer configuration, browser information and player feedback. Later report revisions include team/damage details, initial/remaining rosters and a hidden-during-run flag. Metrics cover a rolling sample window, not necessarily the entire battle. CPU render submission is not GPU time. Tab scheduling and capture resolution affect results.

## Validation and findings

247 unit/functional tests pass. Eleven new cases cover all five deployments against actual seeded terrain/pathfinding, retreat scoring, destruction/defeat outcomes and local fog targeting for both team slots. Controls, gameplay, performance and interface scripts pass.

Fresh in-app-browser checks loaded and started all five scenarios with actual models/HUD. A real HUD Retreat command set all three damaged tanks to retreat. This is useful functional verification, not a complete five-scenario human usability study.

- Unattended armor/support: defeat at 9.5 simulated seconds, 0/6 player survivors and all four enemies alive. Raw report: `playtests/armor-unattended.json`.
- Unattended artillery: defeat at 9.7 seconds, no player survivors and four enemies alive (observed UI, no exported report retained).
- Unattended naval: success at 5.2 seconds, all three player ships alive, without a player Sonar action (observed UI). This fixture is too forgiving to establish the value of active detection. Repeat with a controlled submarine ambush before tuning ship stats.
- Air: exported partial run at approximately 11 seconds; three player units and one enemy remained. Raw report: `playtests/air-partial-unattended.json`. This is explicitly not a final result.
- Retreat baseline: an immediate HUD retreat order entered retreat, but all three wounded tanks were lost by 10.5 simulated seconds. Raw report: `playtests/retreat-before-hold.json`. The source review exposed automatic pursuit restarting after arrival; this is fixed as described below.

The armor report's rolling sample was roughly 57 FPS at a 1265x504 buffer with High graphics. This tiny-army sample is not a 1080p or large-battle performance result. Player feedback fields in retained reports are unanswered. No claim of enjoyable counters or broad faction balance follows from these observations.

## Gameplay defect fixed

CombatSystem.autoAcquireTarget applied fog restrictions only to team `player`. A local multiplayer player in slot 1 owns team `enemy` and could automatically acquire targets outside their fog. Target acquisition now uses the fog's owning team, with the legacy player fallback for older fixtures. Both local team assignments have regression coverage. This does not claim that every targeting/visibility path or multiplayer networking has been audited.

## Recovery behavior fixed

A unit reaching its retreat destination previously returned to ordinary aggressive movement immediately. It now holds the recovery position, allowing nearby HQ healing without voluntarily chasing away. It can still defend itself in range and take enemy damage; retreat is not invulnerability. A new direct order releases Hold Position. Regression coverage checks arrival, blocked pursuit, explicit override and a real-terrain routed retreat. The live rerun still ended in defeat at approximately 10.5 seconds: `playtests/retreat-after-hold.json`. The behavior fix does not establish successful recovery under this pursuit pressure. Dead-unit positions in this report fall back to entity construction positions after mesh disposal and must not be read as death locations.

## Next tuning decisions

1. Repeat armor and artillery with deliberate screening/focus fire, then compare survival and fight duration. If informed play still collapses in ten seconds, inspect damage, target priorities and deployment geometry before changing global pacing.
2. Revise naval practice into a detection-dependent ambush. Confirm detection works and its counter is understandable before balancing damage.
3. Separate the retreat drill into protected recovery and active pursuit variants. Check recovery with defensive support, then measure how much pursuit pressure it can survive. Do not tune damage solely to force this fixture to pass.
4. Have first-time players explain each outcome and name one counter-action. Record their words; do not substitute a passing test or unattended victory for comprehension.
