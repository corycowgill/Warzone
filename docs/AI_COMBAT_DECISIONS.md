# AI combat decisions

## Coordinated worker attacks

The normal worker-backed AI previously split an army and generated offset attack destinations itself, bypassing the newer flank planner. It now sends one coordinated attack with a flank request. The main-thread planner selects a reachable side approach, keeps indirect fire with the main force, and sends flankers onward to the actual objective. The synchronous AI uses that same planner.

Worker snapshots include the same attack-readiness check used by the planner. Wounded, retreating, recovering, disabled and already assigned units cannot inflate the idle attack force. Defense assignments are excluded too. This closes the difference between worker decisions and actual order eligibility.

## Local base defense

Every two seconds the AI assesses observed armed enemies within 32 world units of friendly infrastructure. It prioritizes threats nearest headquarters, groups nearby raiders, and estimates the power already engaging or travelling to that raid. It recruits healthy local combatants only when more force is needed, with at most eight new responders per assessment.

Defenders come from within 75 world units of the threat. Engaged, disabled, garrisoned, retreating, recovering and deployed siege units remain undisturbed. Naval units are not ordered onto land. Responders receive an attack-move formation order through normal pathfinding and a ten-second defense assignment so workers and attack waves cannot immediately redirect them. The next assessment counts those en-route units rather than continually recruiting more troops. Defense can respond before the offensive opening delay expires.

## Target selection

Hard AI scores observed targets by weapon effectiveness, finishing-shot opportunity, remaining health after committed damage, threat and distance. A preference for the existing target reduces needless switching. Invalid weapon matchups, stealthed units, garrisons and indirect-fire minimum ranges are excluded. Idle micro acquisition also uses observed enemies and weapon eligibility instead of scanning the full opposing army.

These changes improve decisions without adding income or damage bonuses. They do not claim that every AI subsystem is fog-limited; other abilities and strategic systems retain their existing behavior.

## Validation

145 tests pass across 13 files. Eight new tests cover local defense, preserving wounded forces, adequate existing defense, en-route assignment protection, weapon restrictions, finishing-shot targeting, live bridge dispatch and actual worker command generation. Tactics, gameplay and performance checks pass.

Run `npm run analyze:balance -- docs/balance/ai-defense.json` to reproduce the 18-fixture pacing screen. It completed 16 matches within six minutes, with median completed duration 182.3 seconds and no finishes before 90 seconds. Two Easy river fixtures reached the cap. Rerunning those with a 900-second limit completed them at 360.4 and 388.1 seconds; their reports are in `docs/balance/ai-defense-extended.json`. The preceding combat-AI screen completed 17/18 within six minutes, so this pass should not be presented as a universal match-duration improvement.

The fixtures use real core systems and worker decisions with synchronous pathfinding. Research, active abilities, dynamic faction passives, weather, neutral objectives and rendering are excluded. Results check for decision regressions and permanent stalls in this sample, not human difficulty, faction balance or live browser performance.
