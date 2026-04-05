# Spec: Dual Resource Economy (SP + Munitions)

**Priority:** 6 (High -- Economy redesign from GDD)
**Estimated Complexity:** Medium

## Problem

The game has only one resource (SP) with passive income. There's no harvesting, no map control incentive, no interesting economic decisions. The economy is so passive it might as well not exist.

## Requirements

Add Munitions (MU) as a second resource. SP funds basic units/buildings. MU funds advanced units, upgrades, and abilities.

## Acceptance Criteria

- [x] New resource: Munitions (MU), starting value: 0
- [x] Munitions Cache building added (cost: 250 SP, generates 5 MU/s)
- [x] MU displayed in HUD resource bar alongside SP
- [x] Advanced units require MU in addition to SP:
  - Plane: 300 SP + 100 MU
  - Battleship: 500 SP + 150 MU
  - Carrier: 600 SP + 200 MU
  - Submarine: 350 SP + 100 MU
- [x] Basic units (infantry, tank, drone) cost only SP (unchanged)
- [x] Production system checks both SP and MU before allowing production
- [x] Insufficient resources shows which resource is lacking in UI
- [x] Resource nodes visible on map (glowing markers at fixed positions)
  - Resource Depots built near nodes generate 2x income
- [x] Salvage income: destroying enemy units grants 15% of their SP cost to the killer's team
- [x] AI understands and builds Munitions Caches
- [x] MU shown on minimap resource node positions
- [x] No console errors introduced
- [x] Game still loads and plays correctly

## Technical Notes

- Add `mu` field to team state in Game.js alongside `sp`
- Add `muCost` to UNIT_STATS in Constants.js (0 for basic units)
- Add Munitions Cache to BUILDING_STATS with `muIncome` field
- Modify ResourceSystem to track and update both resources
- Modify ProductionSystem to check both resources
- Reference: `docs/GAME_DESIGN_DOCUMENT.md` Section 5

## Status: COMPLETE

## Files Modified

- `js/core/Constants.js` — Added muCost to plane/battleship/carrier/submarine, fixed startingMU to 0, fixed munitionscache muIncome to 5
- `js/systems/ProductionSystem.js` — General MU check for all units with muCost, MU refund on cancel
- `js/systems/CombatSystem.js` — Salvage income (15% of SP cost) awarded to killer's team on combat:kill

<!-- NR_OF_TRIES: 1 -->
