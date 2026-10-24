# Tutorial progression reliability

The tutorial derives infantry/tank training hints from the same production shortcut map used by the HUD. Training steps wait for production:complete rather than advancing when a unit is queued. Hints explain construction and deployment waits.

Movement steps require a live player unit. Group selection requires two live player units, excluding buildings. The grenade lesson requires the player's infantry grenade, rather than any friendly ability.

The one-second completion transition uses simulation time, so it pauses with gameplay. Restart/disposal removes old step listeners and cancels pending progression and hint timers. Finishing deactivates the tutorial.

Validation: 219 tests pass, including seven tutorial regression cases; controls verification passes. No fresh browser visual/playthrough validation was performed. Full guided onboarding, tutorial enemy placement/recovery and the rendered performance baseline remain follow-up work from CRITIC_REVIEW_AND_ACTION_PLAN.md.

## Training debrief

The completion screen offers a fresh Easy headquarters-destruction skirmish on Plains, retaining the tutorial's faction choices. It tears down the old match before starting the new one; duplicate exit actions are ignored. Return to Menu uses the same normal match teardown instead of reloading the browser.

The debrief explains the victory objective, focuses its primary action, labels the dialog, and uses the established brass/ivory command palette with wrapping buttons and visible keyboard focus. Validation: 221 tests pass, including teardown order, fresh match configuration, duplicate-click prevention and menu exit. Browser visual validation remains outstanding. Combat target recovery remains follow-up work.
