# Spec: Performance - Spatial Hash and Entity Manager

**Priority:** 10 (Medium -- Architecture from Architect proposal)
**Estimated Complexity:** Medium

## Problem

Combat range checks are O(n^2) -- every unit checks distance to every enemy every frame. Entity queries use Array.filter() repeatedly. With 100 entities this creates ~10,000 distance checks per frame, degrading performance.

## Requirements

Implement spatial partitioning and an entity manager for efficient queries.

## Acceptance Criteria

- [ ] New `SpatialHash` class in `js/core/SpatialHash.js`
  - Grid-based spatial partitioning (cell size = max unit vision range, ~20 world units)
  - Insert, remove, update entity positions
  - Query: get all entities within radius of a point
  - Query: get all entities in a rectangular area
- [ ] New `EntityManager` class in `js/core/EntityManager.js`
  - Replaces raw `game.entities[]` array
  - Per-team entity indexes (avoid repeated filter calls)
  - Methods: `getByTeam(team)`, `getUnits(team)`, `getBuildings(team)`, `getInRadius(pos, radius, team)`
  - Integrates spatial hash for radius queries
- [ ] CombatSystem uses spatial hash for range checks instead of iterating all entities
- [ ] SelectionManager uses spatial hash for drag-select area queries
- [ ] Game.js refactored to use EntityManager instead of raw arrays
- [ ] Object pooling for projectiles (pre-allocate pool of 50, reuse)
- [ ] Object pooling for Vector3 temporaries in hot paths
- [ ] Performance: combat system update takes <1ms with 100 entities (down from current O(n^2))
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly
- [ ] All existing functionality preserved (no regressions)

## Technical Notes

- Spatial hash: Map<cellKey, Set<Entity>> where cellKey = `${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`
- Update entity positions in spatial hash each frame (or on move)
- Reference: `docs/ARCHITECTURE_PROPOSAL.md` Section D for implementation details
- Be careful with the refactor -- many systems reference game.entities directly

## Files to Modify

- `js/core/SpatialHash.js` (new)
- `js/core/EntityManager.js` (new)
- `js/core/Game.js` (use EntityManager)
- `js/systems/CombatSystem.js` (use spatial queries)
- `js/systems/SelectionManager.js` (use spatial queries)
- `js/entities/Projectile.js` (object pooling)
