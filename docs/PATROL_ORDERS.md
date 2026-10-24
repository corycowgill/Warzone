# Routed patrol orders

Patrol (P, then click a destination) now uses the normal domain pathfinding transaction for every leg, rather than steering directly between endpoints. Orders beginning at the current position immediately route to the other endpoint. Replays may supply plain coordinate objects as well as Three.js vectors.

Patrol assignments survive attack-move combat resumption and blocked-route recovery. Stop, explicit move/attack, and other overriding orders retain their normal cancellation behavior. Disabled, garrisoned and immobile units cannot start a new patrol. An unreachable route cancels the patrol and uses the existing blocked-order feedback rather than retrying every frame. Single-player uses asynchronous paths; multiplayer uses synchronous deterministic routing through the existing lockstep command.

Validation: 231 tests pass, including five patrol cases covering routed legs, combat resumption, endpoint cycling, failed routes, stale results after Stop, recovery and disabled units. Controls, gameplay and performance checks pass. Fresh browser playthrough and multiplayer peer-to-peer testing were not performed. Paths may use the existing nearest-passable destination behavior; no new patrol editor or minimap patrol gesture is introduced.
