# Spec: AI Overhaul

**Priority:** 5 (Critical -- #5 issue from Game Critique)
**Estimated Complexity:** High

## Problem

The AI follows one fixed build order every game, attacks in a single blob toward the enemy HQ, never scouts, never adapts, never flanks. One game against it reveals everything it will ever do. It is trivially beatable.

## Requirements

Overhaul the AI to use multiple strategies, adapt to game state, and provide a real challenge.

## Acceptance Criteria

### Strategy Variety
- [ ] AI has at least 3 distinct strategies it can choose from:
  - **Rush**: Early aggression with infantry, minimal economy
  - **Boom**: Heavy economy focus (multiple Resource Depots), delayed but overwhelming army
  - **Balanced**: Standard build order mixing economy and military
- [ ] AI randomly selects a strategy at game start (weighted by difficulty)
- [ ] AI can switch strategy mid-game based on game state (e.g., switch from Boom to Rush if attacked early)

### Tactical Improvements
- [ ] AI sends scout units to explore the map early game
- [ ] AI attacks from multiple directions (not just a single blob)
- [ ] AI retreats damaged units when outnumbered (units below 30% HP pull back)
- [ ] AI prioritizes targets intelligently (damaged units, high-value targets, counter units)
- [ ] AI builds a mix of unit types based on what the player is building (counter-composition)
- [ ] AI expands economy throughout the game (builds Resource Depots periodically)

### Difficulty Levels
- [ ] At least 2 difficulty levels: Normal and Hard
  - **Normal**: Slower build speed, less aggressive, makes some suboptimal choices
  - **Hard**: Full speed, aggressive scouting, smart composition, multi-prong attacks
- [ ] Difficulty selectable on nation select screen
- [ ] Difficulty affects: income bonus, build speed bonus, decision-making quality

### Technical
- [ ] AI decision-making runs on a timer (not every frame) to save performance
- [ ] AI state machine with clear phases: Early Game → Mid Game → Late Game
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly
- [ ] AI does not cheat with fog of war information (uses only units it has scouted)

## Technical Notes

- Refactor existing AIController.js which already has buildPhase/attackPhase/expandPhase
- Add strategy selection and game state evaluation
- Use threat assessment: count player army value vs AI army value
- Counter-composition: track what unit types the player has, build counters
- Reference: `docs/GAME_DESIGN_DOCUMENT.md` Section 12 for AI design
- Reference: `docs/GAME_CRITIQUE.md` for specific AI weaknesses

## Files to Modify

- `js/ai/AIController.js` (major refactor)
- `js/core/Constants.js` (difficulty settings)
- `js/ui/UIManager.js` (difficulty selector on nation select)
- `js/core/Game.js` (pass difficulty to AI)
