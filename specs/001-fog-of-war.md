# Spec: Fog of War System

**Priority:** 1 (Critical -- #1 issue from Game Critique)
**Estimated Complexity:** High

## Problem

The entire map is visible at all times. The `vision` stat exists on every unit in Constants.js but is completely unused. There is zero information asymmetry, which destroys all strategic depth. No scouting, no ambushes, no surprise attacks.

## Requirements

Implement a grid-based Fog of War system with three visibility states:

1. **Hidden (black)** -- Never explored. Terrain and entities invisible.
2. **Explored (dark, semi-transparent)** -- Previously seen but no current vision. Terrain visible, entities hidden. Last-known building positions shown as ghosted.
3. **Visible (clear)** -- Currently within a friendly unit/building's vision radius. Full visibility.

## Acceptance Criteria

- [ ] New `FogOfWarSystem` class in `js/systems/FogOfWarSystem.js`
- [ ] Fog grid resolution: at least 1 cell per 2 world units (128x128 for current map)
- [ ] Each unit/building reveals fog in a circle matching its `vision` stat from Constants.js
- [ ] Fog updates every frame based on current friendly unit/building positions
- [ ] Hidden areas render as solid black overlay on the terrain
- [ ] Explored areas render as semi-transparent dark overlay (50-70% opacity)
- [ ] Visible areas are fully clear
- [ ] Enemy units/buildings in hidden or explored areas are not rendered (mesh.visible = false)
- [ ] Enemy units/buildings entering visible areas become visible (mesh.visible = true)
- [ ] Buildings in explored (but not visible) areas show as "ghosted" (last-known position, translucent)
- [ ] Minimap reflects fog of war state (hidden=black, explored=dark, visible=normal)
- [ ] Fog of war only applies to the player team (enemy AI has full vision for now)
- [ ] Performance: fog update takes <2ms per frame with 100 entities
- [ ] Game starts with only the area around starting base visible
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly with fog system active

## Technical Notes

- Use a 2D grid (Uint8Array) for fog state per cell
- Render fog as a PlaneGeometry with a DataTexture overlay, or use a canvas-based texture
- Update the DataTexture each frame based on vision calculations
- Use the `vision` stat from UNIT_STATS and a default vision of 8 for buildings
- Reference: `docs/ARCHITECTURE_PROPOSAL.md` Section C.2 for implementation approach
- Integrate with Game.js update loop

## Files to Modify

- `js/systems/FogOfWarSystem.js` (new)
- `js/core/Game.js` (integrate fog system)
- `js/world/Minimap.js` (fog on minimap)
- `js/core/Constants.js` (building vision stats if needed)
