# Movement and effect recovery after loading

Saves now record retreat destinations and formation pace in addition to existing retreat flags, waypoints and queued movement orders. Older saves infer a retreat goal from the saved pending destination or remaining route. A retreat flag without any recoverable goal is cleared so it cannot permanently suppress combat.

In-flight path requests restart through normal validated movement after all entities and attack targets have been recreated. Restarting preserves queued destinations, patrol state and retreat intent. An EMP-disabled, sieged or garrisoned unit defers the restart until it can move. Explicit Stop/new movement clears that deferred order. A genuinely unreachable restored route uses existing blocked-route feedback and ends retreat instead of keeping a permanent retreat flag.

Smoke and flare zones now retain team ownership. Production payment receipts are verified through actual deserialization as well as serialization, preserving the refund bookkeeping added previously. Old effect records without a team remain unspecified; ownership is not guessed.

Eight regression tests cover retreat/formation round trips, pending retreat routes, EMP deferral and recovery, explicit-order cancellation, legacy goal fallback, effect ownership, paid receipts, patrol recovery and unreachable multiplayer paths. All 203 tests plus controls and interface checks pass. No fresh browser playthrough is claimed.
