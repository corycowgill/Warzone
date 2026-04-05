# Warzone Development History

- 2026-03-22: Project initialized with Ralph Wiggum. 10 specs created from Game Critique + GDD + Architecture Proposal.
- 2026-04-05: Spec 001 (Fog of War) verified complete via audit. Minor deviations: filename FogOfWar.js, 10Hz throttle, building vision 12.
- 2026-04-05: Spec 005 (AI Overhaul) verified complete via audit. 17/18 criteria met; game phases use time-based triggers instead of explicit FSM.
- 2026-04-05: Spec 007 (Rally Points & Build Queue) complete. Added queue size limit (5), spawn-near-building with move-to-rally, attack-move to enemy rally positions.
- 2026-04-05: Spec 008 (Selection UX) completed remaining gaps: building footprint outlines, unit type labels, activity status icons (moving/attacking/idle), health bar thresholds fixed to 60%/30%.
- 2026-04-05: Spec 004 (Map Variety) completed. Added 3 biome palettes (temperate/desert/arctic), props block pathfinding, biome selector UI, minimap shows props.
- 2026-04-05: Spec 009 (Particle Effects) completed. Added dedicated fire effect for critical buildings, larger death explosions (40-50 particles), and water splash on projectile/water impact.
- 2026-04-05: Spec 002 (Control Groups) completed. Added Shift+Number append to groups, HUD control group badges. Unit-level group number display skipped as unnecessary cosmetic.
