# Spec: Rally Points and Build Queue

**Priority:** 7 (High -- Standard RTS feature)
**Estimated Complexity:** Medium

## Problem

Production buildings have no rally points (produced units just appear at the building). There's no visible build queue with progress. These are standard RTS features missing from the game.

## Requirements

Add rally points for production buildings and improve the build queue UI.

## Acceptance Criteria

### Rally Points
- [x] Right-clicking on the ground while a production building is selected sets a rally point
- [x] Rally point shown as a flag/marker icon at the target position with a line from building to point
- [x] Newly produced units automatically move to the rally point after spawning
- [x] Rally point can be set to an enemy unit/position to auto-attack-move
- [x] Each production building has its own independent rally point
- [x] Rally point persists until changed
- [x] Rally point line and marker only shown when the building is selected
- [x] Default rally point: slightly in front of the building if none set

### Build Queue
- [x] Buildings can queue up to 5 units for production
- [x] Queued units shown as icons in the production panel with queue position numbers
- [x] First unit in queue shows progress bar
- [x] Right-clicking a queued unit cancels it and refunds the cost
- [x] Resources deducted when unit is queued (not when production starts)
- [x] If not enough resources, queue attempt is rejected with UI feedback
- [x] Queue processes automatically: when one unit finishes, next begins

### General
- [x] No console errors introduced
- [x] Game still loads and plays correctly
- [x] Works with all production buildings (Barracks, War Factory, Airfield, Shipyard)

## Technical Notes

- Rally point stored on Building entity as `rallyPoint: Vector3`
- Build queue stored on Building as `productionQueue: Array<{type, progress, buildTime}>`
- ProductionSystem processes the queue
- Reference existing ProductionSystem.js pattern

## Files to Modify

- `js/entities/Building.js` (rally point, queue storage)
- `js/systems/ProductionSystem.js` (queue processing)
- `js/systems/CommandSystem.js` (rally point setting via right-click)
- `js/ui/HUD.js` (queue display, cancel on right-click)
- `js/rendering/EffectsManager.js` (rally point visual)

## Status: COMPLETE

<!-- NR_OF_TRIES: 1 -->
