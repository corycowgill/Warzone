# Retreat destination planning — 2026-10-27

Wounded units below 70% health now favor headquarters recovery over nearby non-healing buildings. The candidate pool keeps an HQ available even when eight nearer depots would otherwise exclude it. This is a scoring preference, not a guarantee that the HQ wins over every closer or safer destination.

Threat is scored at each actual rally point using visible enemy weapon reach and damage. The planner can choose a sheltered side of a building instead of always taking its nearest, enemy-facing side. Local fog ownership and stealth filter enemy information so the retreat choice does not react to unseen contacts. The planner uses its existing spatial query; this is a bounded heuristic, not a complete influence map or line-of-sight solver.

Route validation tries up to three distinct bases first, then one alternate approach per base. The command-time budget is six route probes, increased from three. Land/naval passability, map bounds and endpoint validation remain enforced. Units retain the prior Hold Position behavior on arrival; direct orders release it. No damage, healing rate, speed or faction stats were changed.

Validation: 252 tests pass, plus controls, gameplay and performance checks. Five added cases cover HQ healing preference, sheltered positioning, hidden/stealthed information, alternate approaches and bounded work with dense depot layouts. These establish planner behavior; no new live browser retreat result or survival improvement is claimed. The failed browser runs in COMBAT_PLAYTESTS.md remain historical evidence and were not relabeled as successes.
