# Army movement, AI tactics and compact alerts

## Movement and formations

Formation destinations are planned separately for land, air and naval groups. Slots use the correct travel heading, spacing scales to the largest unit radius, blocked slots search nearby grid cells, and nearby units claim nearby slots to reduce crossing paths. Immobile units remain excluded. Formation speed remains synchronized within each domain.

Movement steering now operates on normalized directions, resolves exactly overlapping pairs deterministically and separates only units in the same domain. It tries a valid steered step, an unsteered route step and an axis slide. Every segment is sampled against terrain/wall passability, preventing large steps through blocked ground. Blocked routes get up to two recovery requests, with revision ownership preventing stale async results from taking over.

Main-thread and worker A* reject diagonal corner cutting. Simplification only removes truly collinear nodes, and failed sync searches return null instead of a direct line through obstacles. Water is identified from the heightfield, not from blocked tree/cliff cells; the worker receives a separate water grid.

Tactical retreat now follows the same route system and terrain checks with its existing speed bonus and combat protection. It no longer moves in a straight line through rivers or walls.

## AI

AI attack requests pass through a wave coordinator shared by worker and fallback decision paths. Combat-ready units gather at a staging point before advancing in formation. Seventy percent assembled releases the wave, with an eight-second timeout to avoid indefinite waiting. Active waves, pending routes, scouts and recovering/retreating units are protected from repeated attack requests. Wave orders have a 65-second mission lifetime.

Retreat decisions compare local combat strength instead of globally retreating a damaged but winning army. Damaged valuable units still retreat, but orders are not reissued every micro tick. Units recover near HQ during their retreat cooldown. Scouts head toward the actual opposing base and are reserved from attack waves temporarily.

Counter-production snapshots include observed units within friendly sight, including day/night and weather modifiers. The main-thread fallback retains composition sightings for 45 seconds. Enemy HQ location remains known. This is a practical sight approximation; forest occlusion/flare intelligence is not replicated by the AI observer helper.

## HUD

The alert stack is right-aligned, 238px wide on desktop and 190px on small screens, with 11px/10px text. It has at most three entries. Identical messages coalesce into one count, routine notices expire after 2.2 seconds, and combat warnings after four. Routine notices never evict an active combat warning. Timers and notices clear when the HUD hides. Old center-position CSS overrides were removed.

## Verification

- `test:tactics`: 18 mixed infantry/tanks traverse a narrow opening and reform near unique slots, passability holds at every simulated step, exact overlaps split deterministically, retreat routes through the opening, waves stage/release without repeated worker retasking, retreat cooldown and sight filtering work, and worker diagonal/water regressions pass.
- `test:notifications`: duplicate coalescing, three-entry cap, warning priority, expiry and timer cleanup.
- Layout, controls, gameplay-order, environment and performance regression checks pass.
- Browser: hard AI-vs-AI river match at seed 6819 completes through HQ destruction without console errors. Notification burst preview checks desktop and 390px width right alignment. This smoke match is not a balance evaluation or FPS benchmark.

Open `docs/notifications-preview.html` for repeatable production bursts and combat warnings.

The full Vitest suite reports 103 passed and the same 12 known baseline failures in resource/production test mocks and the starting-munitions assertion. Those failures are outside this change.
