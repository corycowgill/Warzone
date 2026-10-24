# Tactical minimap controls

Right-click moves owned units, or sets rally points for owned selected buildings. Shift-right-click queues movement; attack-move targeting uses the same order type as battlefield commands. Multiplayer dispatches through lockstep, without local simulation mutation. Selected building rally destinations are drawn with brass connectors and circles, capped at eight indicators. Selected units have ivory rings and retreating units brass rings. Hovering the minimap shows the mouse-control legend.

Contact colors and combat-loss pings use the local team rather than assuming the player-side team. Garrisoned units are not plotted separately. Hidden enemy combat deaths and stealthed submarines do not generate revealing markers. Remembered contacts use stored positions; a stale contact disappears when its old location is currently observed empty. If a fog grid belongs to another hot-seat perspective, enemy contacts are withheld rather than trusting that grid. This does not overhaul the main scene's hot-seat fog implementation.

Combat/movement pings are capped at 24. Tactical drawings remain capped at ten, each drawing is capped at 256 sampled points, and releasing the mouse outside the canvas finishes the drawing. Window blur discards an unfinished stroke. Listener cleanup includes the new window handlers.

Six regression tests cover contact visibility, local multiplayer ownership, stealth and stale intelligence, kill-ping privacy/bounds, rally/queued movement, lockstep dispatch and outside release/blur. All 209 tests plus controls, performance and interface checks pass. A fresh browser visual review remains unavailable.
