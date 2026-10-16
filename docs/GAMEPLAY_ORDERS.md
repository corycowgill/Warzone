# Gameplay pass: dependable tactical orders

This pass focuses on army control and combat continuity rather than changing balance.

- A newer move, attack, stop, hold, retreat or patrol invalidates older path requests.
  Late results cannot redirect the unit or clear a newer pending request.
- Ground and naval units wait for a valid route instead of moving directly through
  terrain while the worker computes a path. Unreachable orders stop retrying and
  give the local player a throttled message.
- Hold (D or the command card) keeps units in position, including during target
  pursuit and idle separation. They can still fire at enemies in range. Move or
  another explicit order releases Hold.
- Attack-move preserves its destination and resumes after an engagement. Automatic
  target acquisition and AI focus fire preserve that intent. Single-point routes
  no longer silently turn attack-move into ordinary movement.
- Shift-right-click queues destinations separately from path nodes. Every queued
  leg obtains its own route; queued orders survive pending path results and combat.
- Land, air and naval formations use separate movement speeds. Deployed, disabled
  or garrisoned units cannot reduce a marching group's speed to zero.
- Inspected enemy units expose no command card actions and cannot receive player
  hotkey orders. Command card Stop/Hold use lockstep commands in multiplayer.
- Hold state, queued destinations, pending goals and attack-move intent are saved
  with backward-compatible defaults. Multiplayer movement resolves paths
  synchronously so worker completion timing cannot alter simulation state.

Validation: `npm run test:gameplay` exercises stale/reordered results, cancellation,
hold pursuit, queued path requests, combat resumption, single-point routes, save
serialization, mixed-domain speeds, deployed units, enemy ownership and the
synchronous multiplayer path branch. Batching, performance, VFX and audio checks
pass. Browser play checked selection, move/Stop/Hold and Shift-queued movement in
a running skirmish without console errors. Two-client multiplayer and a complete
save/load round trip were not exercised in this pass.
