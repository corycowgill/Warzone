# Warzone RTS - Requirements Tracker

## Cycle 1 - Completed (10 features)
GD-001 through GD-010: Formations, rally points, damage numbers, pop cap, minimap, abilities UI, game timer, AI abilities, audio variation, double-click select.

## Cycle 2 - Completed (5 features)
GD-012: Combat drama layer | GD-013: Veterancy visuals | GD-014: Unit counter system | GD-017: Fog of war improvements | GD-020: AI nation personalities

## Cycle 3 - Completed (4 features)
GD-021: Production queue preview | GD-023: Formation presets (5 types) | GD-024: Building tier upgrades | GD-030: Tech tree visualization

## Cycle 4 - Completed (5 features)
GD-031: Unit Stance System | GD-032: Patrol Command | GD-033: Pause/Resume | GD-034: Match History & Stats | GD-035: Shift-click Waypoint Queuing

## Cycle 5 - Completed (5 features)
GD-036: AI vs AI Spectator Mode | GD-037: Supply Caches | GD-038: Dynamic Map Events | GD-039: Unit Status Badges | GD-040: Tutorial System

## Cycle 6 - Completed (5 features)
GD-041: Three Game Modes (Annihilation/Timed/King of the Hill) | GD-042: Enhanced Spectator HUD | GD-043: Minimap Combat Pings | GD-044: King of the Hill Control Point | GD-045: Game Mode Selection UI

## Cycle 7 - Completed (5 features)
GD-046: Global Research System (10 upgrades) | GD-047: Terrain Elevation Damage Bonuses | GD-048: Smarter AI Retreat & Raids | GD-049: Production Hotkeys | GD-050: Military Score HUD

## Cycle 8 - Completed (4 features)
GD-051: Wall Pathfinding Blocking | GD-052: Ditch Cover Damage Reduction | GD-053: AI Naval/Water Awareness | GD-054: AI Building Upgrades

## Final Polish - Completed (3 items)
GD-055: Supply Cache Code Deduplication | GD-056: AI Scout Game-Time Timer | GD-057: AI Carrier Production

## Cycle 9 - Completed (8 features)
GD-058: Nation Active Abilities (6 faction-specific cooldown abilities with HUD button, F hotkey, AI usage)
GD-059: Superweapon System (Superweapon Facility building, 6 faction superweapons, charge bar, click-to-target, AI builds/fires)
GD-060: Map Resource Nodes (7 glowing nodes, +4 SP/s bonus for nearby depots, minimap markers, AI builds near nodes)
GD-061: Visual Post-Processing & Environment (EffectComposer with UnrealBloomPass + vignette, instanced trees, camera shake)
GD-062: Carrier Rework (3 AI-controlled drone fighters orbiting, auto-engage, regen on death, Launch Squadron ability)
GD-063: Building Construction Phase (start at 10% HP, scale up, semi-transparent, cancel for 75% refund, HQ pre-built)
GD-064: Salvage Income (15% SP on kill, gold floating text, tracked in end-game stats, excludes walls/ditches)
GD-065: Enhanced Combat Effects (smoke particles, debris, projectile trails, tank dust, all new effect types in EffectsManager)

## QA Fixes Applied
- Cycle 1: 6 fixes (GAME_CONFIG import, minimap Vector3, ability mode reset, double-click state, entity flash null check, production panel alive check)
- Cycle 2: 4 fixes (aura position, event listener leak, fog ghost position, ace attack balance)
- Cycle 3: 3 fixes (productionProgress property, getTotalQueueTime tier bonus, getRemainingTime simplification)
- Cycle 4: 3 fixes (defensive stance freeze, patrol mode exit, listener reference)
- Cycle 5: 4 fixes (map event timer reset, spectate input guard, aiController2 leak, supply cache targeting)
- Cycle 6: 9 fixes (minimap delta, unused variable, minimap listener leak, GameOverScreen listener leak, button visual reset, spectate panel, gameMode reset/history, annihilation fallback, dead stats code)
- Cycle 7: 5 fixes (research building destroyed, blitz_training effect, income display, research DOM leak, AI retreat timer)
- Cycle 8: 7 fixes (wall pathfinding O(1) cache, production progress bar, queue time estimate, AI shipyard filter, turret ditch reduction, research refund, scout timer)
- Cycle 9: 4 fixes (null guards, memory leaks, stale timers, tutorial text)
- Cycle 10: 4 fixes (smoke/flare zone coordinates, APC eject visibility, map seed validation, day/night shader)
- Cycle 11: 3 fixes (overkill protection edge case, fog memory leak, building limits typo)

## Cycle 10 - Completed (7 features)
GD-066: Mortar Team & Scout Car (indirect fire AOE, fast recon with flare ability, smoke screen)
GD-067: Map Selection UI (random map option with seed input for reproducible maps)
GD-068: AA Half-Track & APC (air-only AA targeting, APC garrison with 4 infantry slots + garrisoned firing)
GD-069: Heavy Tank, SPG, Bomber & Tech Lab (T3 units gated behind Tech Lab, SPG deploy mechanic, bomber AOE)
GD-070: Patrol Boat (cheap naval unit with sonar ping ability revealing submarines)
GD-071: Day/Night Cycle (8-min rotation, sine-based lighting, night vision reduction in FogOfWar)
GD-072: Minimap Tactical Drawing (Ctrl+drag to draw, auto-fade, Ctrl+right-click to clear)

## Cycle 11 - Completed (7 features)
GD-073: QoL Hotkeys (comma=idle units, period=all units, space=jump to last combat alert, keyboard help updated)
GD-074: Submarine Stealth System (invisible by default, revealed by proximity/sonar/drone/firing, semi-transparent rendering, FogOfWar integration, AI counter-builds patrol boats)
GD-075: Overkill Protection (committed damage tracking in CombatSystem, skip overkill targets in auto-acquire)
GD-076: Unit Corpses + Building Damage States (land unit corpses lay flat and fade over 5s, buildings darken+smoke at 66% HP, fire at 33% HP)
GD-077: Surrender Button (pause menu surrender with confirmation dialog, triggers GAME_OVER defeat)
GD-078: Forest Cover System (grid-based forest lookup from tree positions, -25% damage for infantry in forest, speed reduction, vision blocking, green tint visual)
GD-079: Building Limits (BUILDING_LIMITS constant, enforced in ProductionSystem and AI, shown in build menu tooltips)

## Cycle 13 - Completed (7 features)
GD-105: Faction-Unique Units (2 per nation, 12 total: Rangers, Sherman Jumbo, Commandos, Churchill, Maquis, AMX Light, Stormtroopers, Tiger Ace, Imperial Marines, Zero, Jaegers, Sturmhaubitze - stat overrides, passive abilities, visual accents)
GD-106: Water Shader & Terrain Enhancement (ShaderMaterial water with vertex displacement, specular highlights, depth gradient, animated foam; terrain vertex color variation with noise, dirt patches, shoreline blend)
GD-107: Enhanced Audio System (SpeechSynthesis voice lines for move/attack/select/underfire/spotted, wind/bird/artillery ambient layers)
GD-108: Procedural Unit Animations (infantry walking bob/legs/arms, tank rumble, air banking on turns, naval bob, building chimney smoke while producing, weapon recoil)
GD-109: Strategic Zoom (NATO military symbols via canvas-rendered sprites at zoom >140, smooth model-to-symbol blend 140-170, team-colored backgrounds)
GD-111: Commander/Hero Units (1 per team from HQ, 600HP officer with gold accents, 3 nation-specific abilities with cooldowns, 90s respawn, AI produces commanders)
GD-112: Weather System (Clear/Rain/Fog/Sandstorm cycling every 3-4min, vision/speed multipliers, particle systems, fog manipulation, sandstorm infantry DPS, map-specific weather pools)

## Cycle 14 - Completed (10 features)
GD-125: Tactical Retreat Command (R hotkey, +40% speed, -25% damage taken, white flash, nearest friendly building target)
GD-126: Command Card UI Panel (3x4 context-sensitive grid replacing old command panel, unit abilities + building production buttons)
GD-127: AI Unit Ability Usage (mortar smoke, tank siege vs buildings, drone EMP on high-value, battleship barrage on groups, scout flare)
GD-128: Resource Market / Supply Exchange (new building, SP↔MU conversion with cooldown, AI trades when advantageous)
GD-129: Improved Particle Effects (billboard sprites with pooling, enhanced explosions/muzzle flash/bullet impact, scorch marks)
GD-130: AI Retreat and Unit Preservation (retreat below 30% HP, hard AI preserves rank 2+ veterans, prioritizes commanders/heavytanks)
GD-133: Dynamic Shadows Under Units (flat shadow sprites scaled by unit type, updated every frame)
GD-134: Challenge Scenarios (5 scenarios with star ratings, wave spawning, localStorage tracking, challenge select UI)
GD-138: Early Game Acceleration (3 infantry + 1 scout car per team at game start)
GD-139: Victory Condition Polish (auto-resolve button when enemy has no production, VICTORY/DEFEAT overlay, slow-motion effect)

## Pending / Deferred
| ID | Priority | Status | Description |
|----|----------|--------|-------------|
| GD-015 | MEDIUM | DONE (as GD-037) | Destructible Environment and Supply Caches |
| GD-019 | LOW-MED | DONE (as GD-038) | Dynamic Map Events System |
| GD-022 | HIGH | DONE (as GD-037) | Destructible Environment & Supply Caches |
| GD-025 | MEDIUM | DONE (as GD-038) | Dynamic Map Events |
| GD-026 | MEDIUM | DONE (as GD-036) | Spectator/Observer Mode |
| GD-027 | MEDIUM | DONE (as GD-039) | Unit Status Badges |
| GD-028 | MEDIUM | DONE (as GD-035) | Smart Control Group Auto-Refill |
| GD-029 | MEDIUM | WONT_DO | Last Seen Ghost Overlay (partially covered by GD-017 fog improvements; full ghost overlay not needed at 9.5/10) |

## Cycle 15 - Final Polish
GD-140: Production Queue Overview Panel (backtick toggle, lists all production buildings with progress, click-to-center)
GD-141: Minimap Right-Click Move Command (already functional, added green ping flash at target)
GD-142: Move Order Ground Markers (green ring for move, red ring for attack-move, fade over 1s, pooled max 10)
GD-143: Hover Tooltip System (mouseover shows name, HP bar, stats, counter matchups; throttled raycasting at 100ms)
GD-144: Selection Quality-of-Life (Shift+click/hotkey queues 5 units, Ctrl+A selects all military, Ctrl+Z selects all of type, double-click verified working)

## QA Fixes Applied (Cycles 12-15)
- Cycle 12: 7 fixes (mine memory leak, engineer MU cost, engineer damage, mine cooldown, branch research HUD, MU event data, MU null guard)
- Cycle 13: 7 fixes (commander abilities non-functional, smoke zone expiry, weather fog dispose, ability sound missing, duplicate ambient methods, speech queue cancel, commander timeouts)
- Cycle 14: 9 fixes (shadow sprite leaks, shadow restart cleanup, auto-resolve DOM, exchange cooldown reset, victory overlay cleanup, effects cleanup, barrage timeout tracking, R-key conflict, particle pool cap)
- Cycle 15: 5 fixes (double ground marker, tooltip fog-of-war leak, stale tooltip on death, ghost mesh memory leak, orphaned state on restart)

## Total Features Implemented: 97
## Total QA Fixes: 80 (52 original + 28 new)
## Total Development Cycles: 15 (11 original + 4 continuous improvement)
## Game Designer Final Rating: 8.5/10 - "At ceiling for browser-based code-only single-player military RTS - SHIP IT"

---

## Final Status
- **Total Features:** 97
- **Total QA Fixes:** 80
- **Total Cycles:** 15
- **Game Designer Final Rating:** 8.5/10 (independent assessment)
- **Status:** COMPLETE - AT CEILING - SHIP IT
- **Verdict:** Further improvement requires external assets (3D models, audio samples) or multiplayer networking, which are beyond the code-only constraint
