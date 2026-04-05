# Spec: Dual Resource Economy (SP + Munitions)

**Priority:** 6 (High -- Economy redesign from GDD)
**Estimated Complexity:** Medium

## Problem

The game has only one resource (SP) with passive income. There's no harvesting, no map control incentive, no interesting economic decisions. The economy is so passive it might as well not exist.

## Requirements

Add Munitions (MU) as a second resource. SP funds basic units/buildings. MU funds advanced units, upgrades, and abilities.

## Acceptance Criteria

- [ ] New resource: Munitions (MU), starting value: 0
- [ ] Munitions Cache building added (cost: 250 SP, generates 5 MU/s)
- [ ] MU displayed in HUD resource bar alongside SP
- [ ] Advanced units require MU in addition to SP:
  - Plane: 300 SP + 100 MU
  - Battleship: 500 SP + 150 MU
  - Carrier: 600 SP + 200 MU
  - Submarine: 350 SP + 100 MU
- [ ] Basic units (infantry, tank, drone) cost only SP (unchanged)
- [ ] Production system checks both SP and MU before allowing production
- [ ] Insufficient resources shows which resource is lacking in UI
- [ ] Resource nodes visible on map (glowing markers at fixed positions)
  - Resource Depots built near nodes generate 2x income
- [ ] Salvage income: destroying enemy units grants 15% of their SP cost to the killer's team
- [ ] AI understands and builds Munitions Caches
- [ ] MU shown on minimap resource node positions
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly

## Technical Notes

- Add `mu` field to team state in Game.js alongside `sp`
- Add `muCost` to UNIT_STATS in Constants.js (0 for basic units)
- Add Munitions Cache to BUILDING_STATS with `muIncome` field
- Modify ResourceSystem to track and update both resources
- Modify ProductionSystem to check both resources
- Reference: `docs/GAME_DESIGN_DOCUMENT.md` Section 5

## Audit (2026-04-05)
**Status: INCOMPLETE** — MU resource, HUD display, Munitions Cache building, resource nodes, minimap integration all work. AI builds MU caches. Missing: advanced units (plane, battleship, carrier, submarine) don't require MU costs in production. Salvage income (15% of destroyed enemy unit cost) not implemented. MU generation is 4/s not 5/s. Starting MU is 100 not 0.

## Files to Modify

- `js/core/Constants.js` (MU costs, Munitions Cache building)
- `js/core/Game.js` (team MU state)
- `js/systems/ResourceSystem.js` (dual resource tracking)
- `js/systems/ProductionSystem.js` (dual resource checking)
- `js/buildings/MunitionsCache.js` (new building)
- `js/buildings/BuildingFactory.js` (register new building)
- `js/ui/HUD.js` (MU display)
- `js/ai/AIController.js` (AI builds MU caches)

<!-- NR_OF_TRIES: 0 -->
