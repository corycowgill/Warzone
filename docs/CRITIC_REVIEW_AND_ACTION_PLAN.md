# Warzone: critic review and improvement plan

Reviewed 2026-10-24 against build a77986d. This is a source-and-evidence review, not a fresh hands-on playthrough. Current visuals, sound mix, input feel, browser FPS and human enjoyment remain unscored. The March GAME_CRITIQUE.md is historical: its missing-feature claims no longer describe this build.

## Verdict

Warzone has progressed from a minimal RTS prototype into a feature-rich game. Its next milestone should be one excellent, understandable, repeatable match. Adding more units, modes or asset detail before proving that match risks widening the gap between feature count and polish.

The strongest product idea is immediate browser access to stylized combined-arms warfare. The biggest product risk is that players encounter a complicated command interface, an uneven opponent and uncertain performance before they experience a satisfying tactical decision. This is a risk assessment, not a claim established by user research.

## What is already working in its favor

- A substantial strategic vocabulary exists: faction bonuses, SP/MU resources, research, abilities, veterancy, fog, control groups and several victory modes.
- Original GLBs cover the unit/building roster; scenery and title art have an established charcoal, ivory, brass and tactical blue/coral direction. This makes an art consistency pass practical without rebuilding everything again.
- Command reliability has received concrete fixes: route recovery, retreat destinations, save restoration, production refunds, queue focus and minimap orders.
- Reproducible simulations and regression coverage provide a useful foundation. They are especially valuable when changing combat and economy.

## Critic assessment

| Area | Assessment | Evidence and implication |
| --- | --- | --- |
| First five minutes | Needs immediate attention | TutorialSystem still teaches infantry production with 1; ProductionShortcuts uses I. A player can follow instructions and fail. Audit every instruction against real controls. |
| Combat satisfaction | Promising, unproven in live play | Target selection, artillery formations, casualty withdrawal and firing reveals exist. Tests establish behavior, not whether players understand or enjoy it. Evaluate selection clarity, impact, counterplay and recovery together. |
| Strategic economy | Has depth, needs visible stakes | ResourceSystem includes passive SP/MU, depot income, nearby-node bonuses, research and neutral bonuses. Game.getBuildingNodeBonus grants a bonus per qualifying depot near a node; it does not establish exclusive node ownership. Test whether safe depot stacking beats contested expansion before redesigning the economy. |
| Faction balance | Known concern | Controlled land-focused audit: Britain 44/60, Germany 14/60, Japan 17/60; unused-seed holdout Britain 10/10. These exclude important systems and are signals to investigate, not final multiplayer win rates. |
| Map strategy | Better layouts; domain relevance unproven | Four templates have lanes, landmarks and validated paths. River causeways interrupt naval travel; islands intentionally lack an opposing land connection. Verify victory access and meaningful naval targets rather than assuming water automatically creates naval strategy. |
| AI | Much stronger foundation; needs a readable personality | AI now scouts, retains enemy memory and counter-builds. A technically adaptive AI can still feel repetitive or unfair. Compare its observed information, tactical behavior and difficulty assists with what a human sees. |
| Presentation | Cohesive direction; no basis for an AAA rating yet | Authored GLBs and art tokens exist. Assets mainly use geometry and flat PBR materials. Judge silhouettes, team identification and terrain contrast at normal play zoom before commissioning more detail. |
| Performance | Release gate remains open | Core stress tests complete near 200–500 units; occasional long CPU steps remain. Previous rendered measurements had browser-host scheduling limitations. Neither unit count nor CPU timing establishes smooth desktop play. |
| Replay value | Enough modes; quality needs consolidation | Multiple modes and campaign systems exist. Review distinct tactical situations, mission completion and rematch motivation before increasing content volume. |

## Ordered action plan

Targets below are proposed acceptance criteria, not measured current performance. Finish each gate before expanding the next phase. Preserve current saves, multiplayer command routing and keyboard access throughout.

### 1. Establish an honest playable baseline — priority P0

Run fresh foreground-browser sessions on a recorded desktop configuration at 1920x1080: tutorial, normal skirmish, 50-vs-50 battle, 100-vs-100 stress and a complete late-game match. Include cold loading, selecting a large army, mass production, dense deaths and pause/resume. Record browser, GPU, quality, actual live units, frame-time median/p95/p99, long frames, CPU stages, draws and memory. Separate cold and warm runs; repeat three times. Keep the tab foreground and report wall-frame timing separately from CPU submission.

Proposed gate: 50-vs-50 should sustain a 60 FPS target on the named reference desktop at the chosen default preset, with p95 frame time at or below 20 ms. Treat failures as profiling tasks, not grounds to remove gameplay systems blindly. Report 100-vs-100 as a stress ceiling until a supported battle size is agreed. Check memory after three match restarts and investigate retained growth. No new engine port decision until the actual limiting stage is identified.

Deliverable: reproducible browser benchmark and a short ranked bottleneck report. Existing docs/large-battle.html is the starting point, extended to longer representative captures.

### 2. Make the opening self-explanatory — priority P0

Audit tutorial, F1, tooltips and button labels against shared shortcut definitions. Teach a compact loop: build barracks, train infantry, set rally, select and attack-move, retreat, take an economic opportunity. Highlight the actual control when teaching it. Show clear affordability, prerequisite and invalid-placement reasons. Keep notifications small and outside the command area.

Run five first-time players through the tutorial and a default match without coaching. Record where they hesitate, ask for help or issue the wrong command. Proposed gate: at least four of five can build and train within three minutes and can explain the current victory objective and next useful action by minute five. This is a usability screen, not a statistically representative study.

Deliverable: synchronized help text, guided opening, and an issue log from observed sessions.

### 3. Prove the combat loop — priority P1

Create five short replayable scenarios: infantry against armor with support, artillery behind a front line, air attack against AA, submarine versus escort, and a losing attack followed by retreat and recovery. Test at normal camera zoom, including low graphics quality. Display role/counter descriptions before raw stat overload; make selection, disabled state, retreat and ability targeting legible. Tune VFX/audio only where they help identify the weapon, threat or outcome.

Proposed gate: four of five testers identify why each encounter was won/lost and one useful response. No persistent blocked movement in the tested routes, no targeting through hidden information, and no command loss across HUD/minimap/keyboard. Add regression coverage for defects actually found.

Deliverable: scenario fixtures, verified command behavior and an evidence-backed combat tuning list.

### 4. Make territory and faction choice matter — priority P1

Compare three equal-cost openings: safe depot economy, contested node expansion and early military pressure. Measure five-minute income, investment payback, exposure and whether the lead can be contested. First explain existing node value in the UI. If stacking safe depots dominates, prototype one change at a time: limited bonus beneficiaries per node, a control requirement, or diminishing safe-economy returns. Do not stack all three changes without evidence.

Use one land map and one water-focused map as reference competitive layouts. Validate reachable objectives, buildable expansion sites, alternate approaches and naval bombardment/transport routes. Give waterways useful targets; avoid requiring every match to use every domain.

Expand balance fixtures to research, active abilities, dynamic passives and objectives, with paired sides, additional unseen seeds and naval scenarios. Investigate Britain/Germany/Japan first. Change one economic or combat lever at a time and reserve holdout seeds. Proposed screening band: aggregate controlled faction results around 40–60%, reported with per-map counts and uncertainty; do not conceal matchup problems inside averages. Human matches decide whether apparent balance is enjoyable.

Reconcile pacing deliberately: the design document targets 12–20 minutes, while the recent simplified harness median was about 212 seconds. Neither proves the desired human match length. Start with an 8–12 minute standard-skirmish hypothesis, measure human sessions, then update the design target or tune pacing. Keep short tutorial/challenge sessions separate.

Deliverable: a contested-economy experiment, two reference maps and a full-system balance report.

### 5. Consolidate presentation and replay value — priority P2

Use normal-play screenshots to audit every unit role, building silhouette, terrain biome and HUD state against the existing art palette. Prioritize team readability, scale, selection rings, readable shadows and restrained effects over polygon count. Audit the audio mix during dense combat: cap repeated acknowledgements, retain important warnings and make title music activation obvious.

Review the first three campaign missions end to end. Give each a distinct decision, a clear briefing, failure explanation and a useful debrief. Surface actionable post-match facts such as economic downtime, unit losses by role and objective control where tracked reliably. Make rematch preserve setup and offer one clear next challenge.

Proposed gate: no blocking issues across tutorial plus three missions; testers can distinguish roles and identify their next goal at normal zoom. Complete a consistent desktop accessibility pass for text size, keyboard focus, color-independent team cues and reduced motion.

Deliverable: one polished tutorial-to-skirmish-to-rematch slice, then three polished missions.

## Recommended next implementation batch

1. Fix instructional drift using the shared production hotkeys; audit tutorial completion events and remove obsolete control advice.
2. Extend the rendered battle profiler for repeatable longer captures and complete the foreground-browser baseline.
3. Build the five combat scenarios and run the first usability sessions.

Stop adding modes and doing wholesale asset replacements during this batch. Fix measured blockers first. Do not promise engine migration, a new full roster, or broad faction rebalances as a substitute for proving the match.

## Review limits and sources

No new live visual/audio playtest or benchmark was performed for this review. Source inspection used js/systems/TutorialSystem.js, ResourceSystem.js, GameModeSystem.js, FogOfWar.js, js/ui/ProductionShortcuts.js, js/core/Game.js and js/ai/AIController.js. Supporting repository evidence: docs/balance/FULL_MATCH_AUDIT.md, BALANCE_AND_PACING.md, BATTLEFIELD_LAYOUTS.md, LARGE_BATTLE_PERFORMANCE.md, ROSTER_ASSETS.md, ART_DIRECTION.md and GAME_DESIGN_DOCUMENT.md. Historical documents contain old test totals and asset claims; they should not be treated as current build verdicts.
