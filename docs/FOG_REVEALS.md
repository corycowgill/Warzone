# Fog combat reveal timing

Actual unit shots, defensive turret shots and infantry firing from APCs start a two-second firing reveal on the firing entity or vehicle. Reload cooldowns do not refresh intelligence. Existing submarine stealth checks still take precedence.

Fog ticks reveal timers once per simulation step, including ticks that skip the throttled grid computation. Worker and synchronous paths use the same lifetime. A pending worker computation no longer triggers a redundant synchronous computation whose result would subsequently be overwritten.

Validation: 212 tests pass, including new worker/fallback lifetime and pending-worker regression tests. Performance and controls checks pass. Browser visual review and FPS measurement were not performed.
