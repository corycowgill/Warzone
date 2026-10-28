# Reliable ability controls

G now activates Siege Mode, Deploy, Sonar, Plant Mine and faction self abilities immediately. Point abilities request a location. EMP and Torpedo Salvo request a visible enemy picked from the actual model geometry, including instanced picking proxies. A missed entity click keeps targeting active and asks for a visible enemy.

Mixed selection G applies to units sharing the first eligible selected ability ID, matching the displayed command. Targeted casts retain that owned group even if selection changes before the target click; dead or garrisoned units are excluded on execution. Commander targeting retains its separate handling. Readiness feedback now describes the same group.

Multiplayer commands carry an optional target entity ID. Confirmed regular casts execute every owned unit in the command rather than only the first unit when abilityIndex is present. Serialized point targets become Vector3 instances before ability execution so smoke/flare code can clone them. Commander indexed abilities still execute once.

Combat rejects missing, friendly, neutral and out-of-range entity targets, and missing/out-of-range point targets, before charging MU. Engineer mine payment is delegated to Engineer.plantMine, fixing a duplicate charge (50 MU in CombatSystem plus another 50 in Engineer). The advertised mine cost remains 50 MU.

Validation: 270 tests pass, including 12 new ability-order cases. Controls, gameplay and interface checks pass. Browser hands-on casting and live multi-peer synchronization remain unverified; replay playback was not audited in this change. Mixed-group targeting deliberately affects one ability family per G command.
