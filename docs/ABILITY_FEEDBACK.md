# Ability command feedback

The unit command card now takes ability names and descriptions from unit ability data. Engineer G is correctly labeled Plant Mine; patrol boats show Sonar Ping, mortars Smoke Screen and other roles their actual ability names. Fully deployed tank groups show Exit Siege.

A compact status line reports ready units, remaining cooldown, EMP disablement, garrison restriction or required munitions. Group readiness is bounded by current MU and the authoritative base per-unit ability cost. Unavailable single-ability groups disable the mouse button; mixed ability groups remain clickable and receive a tooltip warning to select one type for predictable targeting. Tooltips include the ability description and per-unit MU cost. Accessible names include status.

This is a feedback pass. It preserves the existing G input path, ability targeting, payment and multiplayer execution behavior. Mixed-group targeting and entity-targeted ability execution need their own audit; this change does not claim to fix those paths. The new readiness helper is shared only by command-card presentation.

Validation: 258 tests pass, including six feedback/rendering cases. Controls, gameplay and interface checks pass. Fresh browser visual testing was not performed.

## Control-path follow-up

The subsequent ability controls pass replaces the earlier mixed-selection warning with a defined rule: G casts the first eligible selected ability family only. Its readiness controls button availability. See ABILITY_CONTROLS.md for self activation, entity targeting, multiplayer group execution and payment fixes. Current validation: 270 tests.
