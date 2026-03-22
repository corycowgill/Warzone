# Spec: Rally Points and Build Queue

**Priority:** 7 (High -- Standard RTS feature)
**Estimated Complexity:** Medium

## Problem

Production buildings have no rally points (produced units just appear at the building). There's no visible build queue with progress. These are standard RTS features missing from the game.

## Requirements

Add rally points for production buildings and improve the build queue UI.

## Acceptance Criteria

### Rally Points
- [ ] Right-clicking on the ground while a production building is selected sets a rally point
- [ ] Rally point shown as a flag/marker icon at the target position with a line from building to point
- [ ] Newly produced units automatically move to the rally point after spawning
- [ ] Rally point can be set to an enemy unit/position to auto-attack-move
- [ ] Each production building has its own independent rally point
- [ ] Rally point persists until changed
- [ ] Rally point line and marker only shown when the building is selected
- [ ] Default rally point: slightly in front of the building if none set

### Build Queue
- [ ] Buildings can queue up to 5 units for production
- [ ] Queued units shown as icons in the production panel with queue position numbers
- [ ] First unit in queue shows progress bar
- [ ] Right-clicking a queued unit cancels it and refunds the cost
- [ ] Resources deducted when unit is queued (not when production starts)
- [ ] If not enough resources, queue attempt is rejected with UI feedback
- [ ] Queue processes automatically: when one unit finishes, next begins

### General
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly
- [ ] Works with all production buildings (Barracks, War Factory, Airfield, Shipyard)

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
