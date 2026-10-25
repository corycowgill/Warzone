# Queued movement during combat

Shift-click movement now appends a destination while a stationary unit has an attack target, rather than interrupting that engagement. Queued moves remain pending through siege mode and EMP and start once the unit can move and has no attack target, active route or pending path. This does not change explicit right-click movement, which still overrides the current order.

Stop clears pending destinations. Dead, garrisoned and immobile units reject new queued movement. Pending destinations are cloned and capped at 64 per unit; additional waypoints at the cap are ignored. A waypoint event/marker is emitted only when at least one unit accepts the command. Existing save serialization and multiplayer command routing remain in use.

Validation: 236 tests pass, including five regression cases covering stationary combat, siege/EMP recovery, immediate idle movement, cloned/bounded queues and cancellation. Controls and gameplay checks pass. No fresh browser playthrough or multi-peer network test was performed. A perpetual patrol still requires an overriding order before queued normal moves can execute.
