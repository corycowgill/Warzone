# Battle VFX review and fixes

The review found stale particle state/positions on pool reuse, live sprite stealing
at capacity, smoke using debris gravity, particle sizes overwritten every frame,
dynamic point lights per muzzle flash, instant impacts ahead of projectile arrival,
and incomplete effect resource cleanup when restarting a match.

Particle reuse now resets position, size, flags, rotation, opacity and blending.
Fire/sparks use emissive additive blending; smoke uses normal alpha blending, rises,
and expands from its authored size. Movement dust and lingering smoke use pooled
billboards instead of allocating sphere geometry. Muzzle flashes shrink quickly,
vary by weapon, point toward the target, and add no dynamic lights.

Rifle and cannon tracers are short moving segments. Artillery projectiles and tracers
arc; torpedoes stay at the water surface. Regular unit and turret impact visuals fire
once on arrival, with water hits producing splash instead of duplicate land explosions.
Combat damage timing, accuracy, fire rates and damage values are unchanged.

Budgets admit whole particle bursts without stealing active sprites: 100/240/500
sprites at low/medium/high, up to 180 active effects and 24 scorch marks. Heavy bursts
may be skipped under saturation. Restart cleanup disposes effects, pooled materials
and manager textures. Damage labels no longer write depth over other effects.

Validation: `npm run test:vfx` covers reuse, sizes, smoke motion, light-free flashes,
tracer length, particle/effect limits, cleanup, projectile overshoot, arcs, water
height, impact timing and water/land routing. Performance and unit-batching checks
pass. Browser review exercised all weapon previews, high/low stress bursts and an
accelerated AI battle through victory without console errors. This is a correctness
and presentation pass; no new FPS benchmark is claimed.

Open `docs/vfx-preview.html` for repeatable weapon/destruction previews, particle
quality selection, pause, clear, and stress controls.


## Layered impact presentation

Heavy impacts and destruction now send a broken dust wave across a small terrain-conforming grid. Water splashes produce a pale expanding ripple at the shared water surface. At most 12 waves are active, each uses one draw, and all remain inside the existing 180-effect admission limit. Their geometry and materials are disposed on expiry and restart.

Fire begins white-hot and cools through amber/red; sparks, energy hits, and water droplets retain their own colors. Shell and artillery bursts last longer so smoke separates from the initial flash. Smoke uses a six-lobed cloud texture generated once per match instead of a plain circular gradient. No new asset downloads or dynamic lights are introduced.

Regression coverage checks wave grounding, water height, wave limits, shader progress, disposal, fire cooling and preserved energy colors, alongside the previous pool/timing/budget checks. Browser preview verifies shader compilation and high/low stress bursts; no new gameplay FPS benchmark is claimed.
