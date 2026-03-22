# Spec: Control Groups

**Priority:** 2 (Critical -- #2 issue from Game Critique)
**Estimated Complexity:** Medium

## Problem

Players cannot save unit selections to hotkeys. Managing 50 units by manually click-selecting every time is physically impossible at any competitive pace. This has been standard in RTS games since 1995 (Warcraft II).

## Requirements

Implement Ctrl+Number control groups and camera bookmarks.

## Acceptance Criteria

- [ ] Ctrl+1 through Ctrl+9 assigns currently selected units to that control group
- [ ] Pressing 1-9 (without Ctrl) selects the units in that control group
- [ ] Double-tapping a number key (1-9) selects AND centers camera on the control group
- [ ] A unit can belong to multiple control groups
- [ ] Control groups survive unit death (dead units are removed from group)
- [ ] Shift+Number adds currently selected units to existing control group (append)
- [ ] Control group indicators shown in the HUD (small numbered badges showing group size)
- [ ] Selected units show their control group number near their health bar or selection circle
- [ ] Visual feedback when a control group is assigned (brief flash or sound)
- [ ] Control groups only store player team units (not enemy units even if somehow selected)
- [ ] No conflict with existing keyboard shortcuts (camera uses arrows/W/Q/E, commands use A/S/D/B/M)
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly

## Technical Notes

- Store control groups as `Map<number, Set<Unit>>` in SelectionManager or a new ControlGroupManager
- Listen for keydown events in InputManager.js
- Differentiate single-tap (select) vs double-tap (select + center) with a 300ms timer
- Clean up dead units from groups in the game update loop or via EventBus 'unit:destroyed'
- Reference existing InputManager.js key handling pattern

## Files to Modify

- `js/systems/InputManager.js` (key bindings for Ctrl+1-9, 1-9, Shift+1-9)
- `js/systems/SelectionManager.js` (control group storage and recall)
- `js/ui/HUD.js` (control group display)
- `js/rendering/CameraController.js` (center on group)
