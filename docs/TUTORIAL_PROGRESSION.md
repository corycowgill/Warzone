# Tutorial progression reliability

The tutorial derives infantry/tank training hints from the same production shortcut map used by the HUD. Training steps wait for production:complete rather than advancing when a unit is queued. Hints explain construction and deployment waits.

Movement steps require a live player unit. Group selection requires two live player units, excluding buildings. The grenade lesson requires the player's infantry grenade, rather than any friendly ability.

The one-second completion transition uses simulation time, so it pauses with gameplay. Restart/disposal removes old step listeners and cancels pending progression and hint timers. Finishing deactivates the tutorial.

Validation: 219 tests pass, including seven tutorial regression cases; controls verification passes. No fresh browser visual/playthrough validation was performed. Full guided onboarding, tutorial enemy placement/recovery and the rendered performance baseline remain follow-up work from CRITIC_REVIEW_AND_ACTION_PLAN.md.
