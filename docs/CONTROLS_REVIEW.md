# Controls review

- Gameplay shortcuts ignore text fields, editable content, composition, browser modifiers and repeated keydown events. Ctrl+A remains select-all without also arming attack-move. Number groups ignore text entry and key repeats.
- Mouse release outside the battlefield, blur, hidden-page changes and teardown reset input and hide the drag box. Old input/selection listeners and selection boxes are removed between matches.
- Ability, superweapon and building placement clicks preserve the current selection; dragging does not accidentally place/cast on the following click. Right-click cancels targeting. Stop/Hold cancel pending move/attack/patrol modes.
- Move/M now arms a destination click. A + left-click attack-moves; P + left-click sets patrol. Normal right-click remains contextual movement/attack/garrison. Command-card actions share the keyboard dispatch, including multiplayer lockstep for Stop, Hold, Stance, Retreat and abilities.
- Selection, type selection and control groups use the local multiplayer/hot-seat team. Shift-box selection adds to the existing selection rather than replacing it.
- Ground picking ignores environment props and uses the actual canvas rectangle. Selection and contextual order rays also use canvas coordinates.
- Minimap moves filter local units, go through lockstep in multiplayer and reject paused/spectator orders.
- Camera input is disabled outside active play, releases held keys when typing, clears edge-pan on pointer exit, handles touch cancellation, and normalizes diagonal pan speed. Q/E, middle-drag rotation, Shift+middle-drag pan and Home reset remain available.

Validation: `test:controls` executes real input, selection, camera, command-card and minimap handlers against Three.js objects and event surfaces. It covers modifiers/typing, ownership, targeting preservation, cancellation, release outside canvas, pause, picking, constant pan speed, lockstep and listener disposal. `test:camera`, `test:gameplay` and `test:interface` also pass. Browser smoke review uses a separate live match and checks Ctrl+A, order targeting, command buttons and console errors. Live review exposed a synthetic-event `preventDefault` error in button dispatch; it was corrected and added to the real command-card regression cases.
