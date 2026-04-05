# Spec 010: Performance - Spatial Hash and Entity Manager

## Summary
Integrated the orphaned EntityManager into Game.js, added spatial queries to SelectionManager for drag-select, and introduced Vec3Pool for hot-path Vector3 reuse.

## Changes
- **Game.js**: Imported EntityManager, created instance in constructor (256 world units, 16-unit cells). Entity add/remove now registers with EntityManager. `getUnits()`, `getBuildings()`, `getEntitiesByTeam()` delegate to EntityManager. `updatePositions()` called each frame. `clear()` called on restart.
- **EntityManager.js**: Added `queryRect()` method for rectangular spatial queries. Added `clear()` method for game restart. Made `updatePositions()` work with internal entity tracking when no argument given.
- **Vec3Pool.js**: New utility - pre-allocates 32 Vector3s with acquire/release pattern.
- **CombatSystem.js**: AOE splash damage and kamikaze on-death now use spatial grid query instead of iterating all enemies. Effect position vectors use Vec3Pool instead of `.clone()`.
- **SelectionManager.js**: Drag-select unprojects screen corners to world-space ground plane, uses EntityManager `queryRect()` to narrow candidates before screen-space filtering. `worldToScreen()` uses Vec3Pool.

## Decisions
- Kept `this.entities[]` array in Game.js as the authoritative list (backward compatible). EntityManager is a parallel index for fast queries.
- Kept `this.spatialGrid` (SpatialGrid) alongside EntityManager since combat auto-acquire already uses it effectively.
- Vec3Pool only used where effects methods `.copy()` the position (verified they don't store the reference).
