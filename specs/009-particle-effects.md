# Spec: Particle Effects and Visual Polish

**Priority:** 9 (Medium -- Visual quality from Critique)
**Estimated Complexity:** Medium

## Problem

Effects are minimal: explosions are 12 orange spheres, muzzle flashes are a single sphere, projectiles are yellow spheres. There is no smoke, fire, debris, or screen shake. The game lacks visual impact.

## Requirements

Upgrade the particle/effects system for satisfying combat feedback.

## Acceptance Criteria

- [ ] Improved explosions: 20-30 particles with variation in size, color (orange→red→black), and velocity
- [ ] Explosion particles have gravity (fall back down) and fade out
- [ ] Smoke trails on projectiles (small gray particles along flight path)
- [ ] Muzzle flash: brief bright flash with small particle burst at the firing unit
- [ ] Smoke rising from damaged buildings (below 50% HP)
- [ ] Fire effect on critically damaged buildings (below 25% HP) -- orange/red flickering particles
- [ ] Death explosion: larger effect when a unit is destroyed
- [ ] Camera shake on nearby explosions (subtle, 0.1-0.3 second duration)
- [ ] Water splash effect when projectiles/units enter water
- [ ] Dust kick-up when land units move (small particles at feet/treads)
- [ ] Particle system uses object pooling (pre-allocate particles, reuse them)
- [ ] Max 200 active particles at any time (performance budget)
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly
- [ ] Maintains 30+ FPS with effects active

## Technical Notes

- Extend or replace EffectsManager.js
- Use THREE.Points with BufferGeometry for efficient particle rendering
- Particle struct: position, velocity, life, size, color, alpha
- Update all particles in a single buffer update per frame
- Camera shake: offset camera position briefly, lerp back
- Reference: `docs/ARCHITECTURE_PROPOSAL.md` Section C.3

## Files to Modify

- `js/rendering/EffectsManager.js` (major upgrade)
- `js/rendering/CameraController.js` (screen shake)
- `js/entities/Unit.js` (movement dust)
- `js/entities/Building.js` (damage smoke/fire)
- `js/systems/CombatSystem.js` (trigger effects on hit/kill)
