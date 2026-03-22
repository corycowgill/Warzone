# Spec: Faction Asymmetry (Nation Unique Abilities)

**Priority:** 3 (Critical -- #3 issue from Game Critique)
**Estimated Complexity:** High

## Problem

All 6 nations share identical stats, units, buildings, and tech trees. They differ only in team color hex code. Nation choice is purely cosmetic, which is the single most damaging design failure for replayability.

## Requirements

Implement unique passive bonuses and active abilities for each nation as defined in the Game Design Document (`docs/GAME_DESIGN_DOCUMENT.md` Section 2).

## Acceptance Criteria

### Passive Bonuses (always active)
- [ ] **America** -- Industrial Powerhouse: All production buildings produce units 15% faster
- [ ] **Great Britain** -- Fortified Positions: Defensive buildings (Ditch/future turrets) have +25% HP and +15% range
- [ ] **France** -- Entrenched Doctrine: Infantry deal +20% damage when stationary for 3+ seconds
- [ ] **Japan** -- Bushido Code: All units deal +10% damage when below 50% HP
- [ ] **Germany** -- Blitzkrieg Doctrine: All vehicles (tanks) have +10% speed and +1 armor
- [ ] **Austria** -- Imperial Engineering: Buildings cost 10% less SP and build 10% faster

### Active Abilities (cooldown-based, activated by player)
- [ ] **America** -- Lend-Lease (120s cooldown): Instantly grants 200 SP
- [ ] **Japan** -- Banzai Charge (80s cooldown): Selected infantry gain +50% speed and +30% damage for 8 seconds
- [ ] At minimum America and Japan active abilities must work; others can be placeholder buttons
- [ ] Active ability button shown in HUD when playing, with cooldown timer
- [ ] Ability hotkey: F key activates faction ability

### General
- [ ] Nation passive bonuses defined in Constants.js NATIONS object
- [ ] FactionAbilitySystem class manages active abilities and cooldowns
- [ ] Nation selection screen shows passive/active ability descriptions
- [ ] Passive bonuses apply automatically during gameplay
- [ ] AI nations also benefit from their passive bonuses
- [ ] No console errors introduced
- [ ] Game still loads and plays correctly

## Technical Notes

- Add `passive` and `ability` properties to NATIONS in Constants.js
- Create `js/systems/FactionAbilitySystem.js` for ability logic
- Passive bonuses modify stats at unit/building creation or in combat calculations
- Production speed modifier: multiply buildTime by (1 - bonus) in ProductionSystem
- Damage modifiers: apply in CombatSystem.calculateDamage()
- Reference: `docs/GAME_DESIGN_DOCUMENT.md` Section 2 for full faction details

## Files to Modify

- `js/core/Constants.js` (nation definitions with abilities)
- `js/systems/FactionAbilitySystem.js` (new)
- `js/systems/CombatSystem.js` (damage modifiers)
- `js/systems/ProductionSystem.js` (production speed modifiers)
- `js/core/Game.js` (integrate faction system)
- `js/ui/HUD.js` (ability button and cooldown display)
- `js/ui/UIManager.js` (nation select descriptions)
