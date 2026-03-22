# Spec: Map Variety and Random Generation

**Priority:** 4 (Critical -- #4 issue from Game Critique)
**Estimated Complexity:** Medium

## Problem

The terrain generator produces the identical map every game. No random seed, no map variety, no map objects (trees, cliffs, rocks). Combined with identical nations, this means every game is the same game.

## Requirements

Add seeded random terrain generation and environmental props to create unique maps each game.

## Acceptance Criteria

- [ ] Terrain generation uses a random seed (different map each game)
- [ ] Optional: player can enter a map seed for reproducible maps
- [ ] Terrain heightmap uses simplex/perlin noise with the seed for natural-looking terrain
- [ ] At least 3 terrain biomes with different color palettes:
  - Temperate (green grass, blue water) -- default
  - Desert (sand, oasis water)
  - Arctic (snow, ice water)
- [ ] Map objects placed procedurally: trees, rocks, bushes (at least 30-50 per map)
  - Props are simple Three.js geometry (cone trees, sphere bushes, box rocks) -- NOT models yet
  - Props block unit movement (integrated with pathfinding grid)
  - Props do not spawn on water or in base areas
- [ ] Terrain has height variation: hills and valleys from noise function
- [ ] Water placement varies by seed (not always just the right edge)
- [ ] Resource nodes (glowing spots on map) placed at strategic locations for future resource system
- [ ] Starting base areas are always on flat, clear ground
- [ ] Biome selection available on nation select screen (dropdown or buttons)
- [ ] Minimap reflects terrain colors and prop positions
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly
- [ ] Pathfinding works correctly with new terrain features

## Technical Notes

- Implement a simple seeded PRNG (mulberry32 or similar) -- no external library needed
- Use 2D simplex noise for heightmap (implement in ~50 lines or use a simple noise function)
- Place water based on noise threshold rather than fixed position
- Ensure base areas (corners/edges) are cleared of obstacles
- Props can be simple merged BufferGeometry for performance
- Reference: `docs/ARCHITECTURE_PROPOSAL.md` for terrain recommendations

## Files to Modify

- `js/world/Terrain.js` (seeded generation, biomes, props)
- `js/systems/PathfindingSystem.js` (obstacle integration)
- `js/world/Minimap.js` (reflect new terrain)
- `js/ui/UIManager.js` or `js/ui/MainMenu.js` (biome selection UI)
- `js/core/Game.js` (pass seed to terrain)
