# Battle readability

Command markers now use a restrained mint/blue/coral/amber palette, with different shapes for attacks, retreat and blocked routes. They expire after 0.75 seconds, with at most six active markers. Attack confirmation appears at the target; retreat confirmation appears at the friendly headquarters. Existing movement and attack-move markers remain connected to their original command paths.

Incoming attacks produce a short, camera-relative edge cue instead of the full-screen red damage vignette. Feedback follows the local team in multiplayer and hotseat, and is suppressed in spectator mode. Cues last 650 milliseconds and coalesce into four fixed elements. These show the attacker's bearing at attack time, not an exact projectile collision timestamp.

A compact status area on the right shows blocked routes briefly and provides a button to select idle combat units. The idle scan runs once per second, excludes held, moving, engaged, garrisoned, disabled and retreating units, and revalidates local ownership when clicked. Hiding the HUD clears the feedback.

Health bars use a quieter health palette, align their shrinking fill to the actual 2.5-unit bar width, and separate fill/background/border layers to avoid overlap. Existing bullet sparks, shell bursts and artillery dust waves were reviewed and retained; this pass does not replace those established effects.

Open `docs/battle-feedback-preview.html` through the local development server to exercise the actual feedback component and effects manager. Preview buttons cover move, attack, retreat, blocked routes, incoming fire, weapon impacts and idle selection.

Validation: 135 tests pass across 11 files, including local-team filtering, cue expiry and cleanup, camera rotation, idle eligibility, marker caps and geometry disposal. VFX, controls and performance verification scripts pass. Browser preview confirmed idle selection and rendered without warnings or errors. Large live battles still need playtesting; no frame-rate gain is claimed.
