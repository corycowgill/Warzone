/**
 * Unit tests for Constants.js
 * Validates data integrity of all game constants.
 */
import { describe, it, expect } from 'vitest';
import {
  UNIT_STATS, BUILDING_STATS, DAMAGE_MODIFIERS, UNIT_COUNTERS,
  TECH_TREE, NATIONS, VETERANCY, GAME_CONFIG, BUILDING_LIMITS,
  BUILDING_UPGRADES, RESEARCH_UPGRADES
} from '../../js/core/Constants.js';

describe('UNIT_STATS', () => {
  const unitTypes = Object.keys(UNIT_STATS);

  it('should have all required fields for every unit type', () => {
    const numericFields = ['hp', 'speed', 'damage', 'range', 'cost', 'buildTime', 'attackRate', 'armor', 'vision'];
    for (const type of unitTypes) {
      const stats = UNIT_STATS[type];
      for (const field of numericFields) {
        expect(stats, `${type} missing field: ${field}`).toHaveProperty(field);
        expect(typeof stats[field], `${type}.${field} should be a number`).toBe('number');
      }
      // domain is a string
      expect(stats, `${type} missing domain`).toHaveProperty('domain');
      expect(typeof stats.domain, `${type}.domain should be a string`).toBe('string');
    }
  });

  it('should have positive HP for all units', () => {
    for (const type of unitTypes) {
      expect(UNIT_STATS[type].hp, `${type} should have positive HP`).toBeGreaterThan(0);
    }
  });

  it('should have non-negative cost for all units', () => {
    for (const type of unitTypes) {
      expect(UNIT_STATS[type].cost, `${type} should have non-negative cost`).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have a valid domain for all units', () => {
    const validDomains = ['land', 'air', 'naval'];
    for (const type of unitTypes) {
      expect(validDomains, `${type} has invalid domain: ${UNIT_STATS[type].domain}`)
        .toContain(UNIT_STATS[type].domain);
    }
  });

  it('should have positive build time for all units', () => {
    for (const type of unitTypes) {
      expect(UNIT_STATS[type].buildTime, `${type} should have positive buildTime`).toBeGreaterThan(0);
    }
  });

  it('should have non-negative armor for all units', () => {
    for (const type of unitTypes) {
      expect(UNIT_STATS[type].armor, `${type} should have non-negative armor`).toBeGreaterThanOrEqual(0);
    }
  });

  it('engineer should have 0 damage (non-combat unit)', () => {
    expect(UNIT_STATS.engineer.damage).toBe(0);
  });

  it('commander should be among the most expensive units', () => {
    // Commander at 500 SP is one of the most expensive; carrier is 600
    expect(UNIT_STATS.commander.cost).toBeGreaterThanOrEqual(400);
  });
});

describe('BUILDING_STATS', () => {
  const buildingTypes = Object.keys(BUILDING_STATS);

  it('should have HP and cost for every building', () => {
    for (const type of buildingTypes) {
      const stats = BUILDING_STATS[type];
      expect(stats, `${type} missing hp`).toHaveProperty('hp');
      expect(stats.hp, `${type} should have positive HP`).toBeGreaterThan(0);
      expect(stats, `${type} missing cost`).toHaveProperty('cost');
      expect(stats.cost, `${type} should have non-negative cost`).toBeGreaterThanOrEqual(0);
    }
  });

  it('headquarters should have 0 cost (starting building)', () => {
    expect(BUILDING_STATS.headquarters.cost).toBe(0);
  });

  it('all produces arrays should reference valid unit types', () => {
    for (const type of buildingTypes) {
      const produces = BUILDING_STATS[type].produces || [];
      for (const unitType of produces) {
        expect(UNIT_STATS, `${type} produces unknown unit: ${unitType}`).toHaveProperty(unitType);
      }
    }
  });

  it('all requires arrays should reference valid building types', () => {
    for (const type of buildingTypes) {
      const requires = BUILDING_STATS[type].requires || [];
      for (const req of requires) {
        expect(BUILDING_STATS, `${type} requires unknown building: ${req}`).toHaveProperty(req);
      }
    }
  });

  it('headquarters should produce infantry and commander', () => {
    expect(BUILDING_STATS.headquarters.produces).toContain('infantry');
    expect(BUILDING_STATS.headquarters.produces).toContain('commander');
  });
});

describe('DAMAGE_MODIFIERS', () => {
  it('should have an entry for every combat unit type', () => {
    const combatUnits = Object.keys(UNIT_STATS).filter(t => UNIT_STATS[t].damage > 0);
    for (const type of combatUnits) {
      expect(DAMAGE_MODIFIERS, `Missing damage modifiers for ${type}`).toHaveProperty(type);
    }
  });

  it('should have positive self-modifier (same type vs same type)', () => {
    for (const type of Object.keys(DAMAGE_MODIFIERS)) {
      if (DAMAGE_MODIFIERS[type][type] !== undefined) {
        expect(DAMAGE_MODIFIERS[type][type], `${type} vs ${type} should be >= 0`)
          .toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('engineer should have 0.0 against all targets', () => {
    const engMods = DAMAGE_MODIFIERS.engineer;
    for (const target of Object.keys(engMods)) {
      expect(engMods[target], `engineer vs ${target}`).toBe(0);
    }
  });

  it('tank should be strong against infantry (>= 1.5x)', () => {
    expect(DAMAGE_MODIFIERS.tank.infantry).toBeGreaterThanOrEqual(1.5);
  });

  it('AA units should be strong against air (>= 1.5x)', () => {
    expect(DAMAGE_MODIFIERS.aahalftrack.drone).toBeGreaterThanOrEqual(1.5);
    expect(DAMAGE_MODIFIERS.aahalftrack.plane).toBeGreaterThanOrEqual(1.5);
    expect(DAMAGE_MODIFIERS.aaturret.drone).toBeGreaterThanOrEqual(1.5);
    expect(DAMAGE_MODIFIERS.aaturret.plane).toBeGreaterThanOrEqual(1.5);
  });
});

describe('UNIT_COUNTERS', () => {
  it('should have counter info for all combat unit types', () => {
    const combatUnits = Object.keys(UNIT_STATS).filter(t => UNIT_STATS[t].damage > 0);
    for (const type of combatUnits) {
      expect(UNIT_COUNTERS, `Missing counters for ${type}`).toHaveProperty(type);
    }
  });

  it('counter lists should reference valid unit or building types', () => {
    for (const [type, counters] of Object.entries(UNIT_COUNTERS)) {
      for (const strong of counters.strong) {
        const valid = UNIT_STATS[strong] || BUILDING_STATS[strong] || strong === 'building';
        expect(valid, `${type} strong vs unknown: ${strong}`).toBeTruthy();
      }
      for (const weak of counters.weak) {
        const valid = UNIT_STATS[weak] || BUILDING_STATS[weak] || weak === 'building';
        expect(valid, `${type} weak vs unknown: ${weak}`).toBeTruthy();
      }
    }
  });
});

describe('TECH_TREE', () => {
  it('should have an entry for every producible unit', () => {
    for (const type of Object.keys(UNIT_STATS)) {
      expect(TECH_TREE, `Missing tech tree entry for ${type}`).toHaveProperty(type);
    }
  });

  it('building references should be valid', () => {
    for (const [unitType, tech] of Object.entries(TECH_TREE)) {
      expect(BUILDING_STATS, `${unitType} tech tree references unknown building: ${tech.building}`)
        .toHaveProperty(tech.building);
    }
  });

  it('requirements should reference valid buildings', () => {
    for (const [unitType, tech] of Object.entries(TECH_TREE)) {
      for (const req of tech.requires) {
        expect(BUILDING_STATS, `${unitType} requires unknown building: ${req}`)
          .toHaveProperty(req);
      }
    }
  });

  it('building should list the unit in its produces array', () => {
    for (const [unitType, tech] of Object.entries(TECH_TREE)) {
      const buildingProduces = BUILDING_STATS[tech.building]?.produces || [];
      expect(buildingProduces, `${tech.building} should produce ${unitType}`)
        .toContain(unitType);
    }
  });
});

describe('NATIONS', () => {
  it('should have both allied and enemy nations', () => {
    const sides = Object.values(NATIONS).map(n => n.side);
    expect(sides).toContain('allied');
    expect(sides).toContain('enemy');
  });

  it('all nations should have complete bonus objects', () => {
    const bonusKeys = ['infantryDamage', 'tankDamage', 'productionSpeed', 'incomeBonus', 'costReduction'];
    for (const [nation, data] of Object.entries(NATIONS)) {
      for (const key of bonusKeys) {
        expect(data.bonuses, `${nation} missing bonus: ${key}`).toHaveProperty(key);
      }
    }
  });

  it('cost reduction should be <= 1.0 (no cost increase)', () => {
    for (const [nation, data] of Object.entries(NATIONS)) {
      expect(data.bonuses.costReduction, `${nation} costReduction`)
        .toBeLessThanOrEqual(1.0);
    }
  });
});

describe('VETERANCY', () => {
  it('should have 4 ranks', () => {
    expect(VETERANCY.ranks).toHaveLength(4);
  });

  it('ranks should require increasing kill counts', () => {
    for (let i = 1; i < VETERANCY.ranks.length; i++) {
      expect(VETERANCY.ranks[i].kills).toBeGreaterThan(VETERANCY.ranks[i - 1].kills);
    }
  });

  it('should have positive bonuses per rank', () => {
    expect(VETERANCY.bonusPerRank.damage).toBeGreaterThan(0);
    expect(VETERANCY.bonusPerRank.maxHP).toBeGreaterThan(0);
    expect(VETERANCY.bonusPerRank.armor).toBeGreaterThan(0);
    expect(VETERANCY.bonusPerRank.speed).toBeGreaterThan(0);
  });
});

describe('GAME_CONFIG', () => {
  it('should have reasonable default values', () => {
    expect(GAME_CONFIG.startingSP).toBeGreaterThan(0);
    expect(GAME_CONFIG.startingMU).toBeGreaterThan(0);
    expect(GAME_CONFIG.baseIncome).toBeGreaterThan(0);
    expect(GAME_CONFIG.maxUnitsPerTeam).toBeGreaterThanOrEqual(20);
    expect(GAME_CONFIG.mapSize).toBeGreaterThan(0);
    expect(GAME_CONFIG.worldScale).toBeGreaterThan(0);
  });

  it('starting SP should be enough to build at least a barracks', () => {
    expect(GAME_CONFIG.startingSP).toBeGreaterThanOrEqual(BUILDING_STATS.barracks.cost);
  });
});

describe('BUILDING_UPGRADES', () => {
  it('should have upgrade paths for production buildings', () => {
    expect(BUILDING_UPGRADES).toHaveProperty('barracks');
    expect(BUILDING_UPGRADES).toHaveProperty('warfactory');
    expect(BUILDING_UPGRADES).toHaveProperty('airfield');
  });

  it('upgrade costs should increase with tier', () => {
    for (const [type, config] of Object.entries(BUILDING_UPGRADES)) {
      for (let i = 1; i < config.costs.length; i++) {
        expect(config.costs[i], `${type} tier ${i + 1} cost`)
          .toBeGreaterThanOrEqual(config.costs[i - 1]);
      }
    }
  });

  it('production speed bonuses should increase with tier', () => {
    for (const [type, config] of Object.entries(BUILDING_UPGRADES)) {
      for (let tier = 2; tier <= config.maxTier; tier++) {
        expect(config.bonuses[tier].productionSpeed, `${type} tier ${tier}`)
          .toBeGreaterThan(config.bonuses[tier - 1].productionSpeed);
      }
    }
  });
});
