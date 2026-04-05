# Spec: Selection UX Improvements

**Priority:** 8 (High-- Visual polish and usability)
**Estimated Complexity:** Medium

## Problem

Unit selection lacks visual clarity. No selection circles on the ground, health bars are basic, no unit status indicators. The drag-select box needs improvement.

## Requirements

Improve selection visuals and unit status display for better battlefield readability.

## Acceptance Criteria

- [x] Selected units show a colored circle on the ground beneath them (green for friendly, red for enemy if selected)
- [x] Selection circles scale with unit size (larger for tanks/ships, smaller for infantry)
- [x] Health bars float above units, visible at all times (not just when selected)
  - Green when HP > 60%, yellow when 30-60%, red when < 30%
  - Health bars face camera (billboard)
  - Health bars only visible for units within a reasonable distance from camera
- [x] Selected building shows its footprint outline on the ground
- [x] Drag selection box renders as a semi-transparent rectangle (current implementation improved)
- [x] Double-click a unit to select all visible units of that type on screen
- [x] Status icons above units for: moving (arrow), attacking (sword/cross), idle (none), producing (gear)
- [x] Unit type label shown below health bar when zoomed in close enough
- [x] No console errors introduced
- [x] Game still loads and plays correctly

## Technical Notes

- Selection circles: RingGeometry or CircleGeometry with transparent material, added as child of unit mesh
- Health bars: Sprite or PlaneGeometry facing camera, update width based on HP ratio
- Use THREE.Sprite for billboard elements or update rotation each frame
- Performance: use object pooling or instanced rendering for health bars if needed

## Files to Modify

- `js/entities/Unit.js` (selection circle, health bar mesh)
- `js/entities/Entity.js` (health bar thresholds, type label)
- `js/entities/Building.js` (footprint outline)
- `js/systems/SelectionManager.js` (double-click select, improved drag box)
- `js/rendering/SceneManager.js` (health bar rendering)
- `js/ui/HUD.js` (status display)

## Status: COMPLETE

<!-- NR_OF_TRIES: 1 -->
