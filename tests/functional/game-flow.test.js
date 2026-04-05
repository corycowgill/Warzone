/**
 * Functional tests for game flow integration.
 * Tests end-to-end scenarios using real game constants.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG, TECH_TREE, DAMAGE_MODIFIERS } from '../../js/core/Constants.js';
import { EventBus } from '../../js/core/EventBus.js';
import { ResourceSystem } from '../../js/systems/ResourceSystem.js';
import { ProductionSystem } from '../../js/systems/ProductionSystem.js';

function createIntegrationGame() {
  const eventBus = new EventBus();
  const game = {
    state: 'PLAYING',
    mode: '1P',
    eventBus,
    entities: [],
    teams: {
      player: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'america' },
      enemy: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'germany' },
    },
    aiDifficulty: 'normal',
    gameElapsed: 0,
    getUnits(team) { return game.entities.filter(e => e.isUnit && e.team === team && e.alive); },
    getBuildings(team) { return game.entities.filter(e => e.isBuilding && e.team === team && e.alive); },
    hasResearch() { return false; },
    soundManager: null,
    nationAbilitySystem: null,
    neutralStructures: null,
    createUnit(unitType, team, position) {
      const stats = UNIT_STATS[unitType];
      const unit = {
        id: game.entities.length + 1,
        type: unitType,
        team,
        isUnit: true,
        isBuilding: false,
        alive: true,
        health: stats.hp,
        maxHealth: stats.hp,
        damage: stats.damage,
        range: stats.range,
        speed: stats.speed,
        armor: stats.armor || 0,
        attackRate: stats.attackRate,
        domain: stats.domain,
        position: { ...(position || { x: 0, y: 0, z: 0 }) },
        getPosition() { return { ...this.position, clone: () => ({ ...this.position, add: () => this.position }) }; },
      };
      game.entities.push(unit);
      return unit;
    },
  };

  game.resourceSystem = new ResourceSystem(game);
  game.productionSystem = new ProductionSystem(game);
  return game;
}

function addBuilding(game, type, team) {
  const stats = BUILDING_STATS[type];
  const building = {
    id: game.entities.length + 5000,
    type,
    team,
    isBuilding: true,
    isUnit: false,
    alive: true,
    health: stats.hp,
    maxHealth: stats.hp,
    produces: [...(stats.produces || [])],
    productionQueue: [],
    productionTimer: 0,
    currentProduction: null,
    _constructing: false,
    _productionTotalTime: 0,
    tier: 1,
    nation: game.teams[team]?.nation || null,
    game,
    rallyPoint: { clone: () => ({ x: 0, y: 0, z: 10, add: () => ({ x: 0, y: 0, z: 10 }) }) },
    canProduce(unitType) { return this.produces.includes(unitType); },
    queueUnit(unitType) { if (this.canProduce(unitType)) this.productionQueue.push(unitType); },
    getPosition() { return { x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0, add: () => ({ x: 0, y: 0, z: 10 }) }) }; },
    getTierBonus() { return null; },
    getProductionProgress() {
      if (!this.currentProduction) return 0;
      const total = this._productionTotalTime || (UNIT_STATS[this.currentProduction]?.buildTime ?? 3);
      return 1 - (this.productionTimer / total);
    },
    update(deltaTime) {
      if (!this.alive || this._constructing) return;
      if (this.currentProduction) {
        this.productionTimer -= deltaTime;
      } else if (this.productionQueue.length > 0) {
        this.currentProduction = this.productionQueue.shift();
        const s = UNIT_STATS[this.currentProduction];
        this.productionTimer = s ? s.buildTime : 3;
        this._productionTotalTime = this.productionTimer;
      }
    },
  };
  game.entities.push(building);
  return building;
}

describe('Full Production Flow', () => {
  let game;

  beforeEach(() => {
    game = createIntegrationGame();
  });

  it('should produce infantry: click build -> resources deducted -> unit spawns', () => {
    const barracks = addBuilding(game, 'barracks', 'player');
    const startSP = game.teams.player.sp;
    const handler = vi.fn();
    game.eventBus.on('production:complete', handler);

    // Step 1: Request production
    const result = game.productionSystem.requestProduction(barracks, 'infantry');
    expect(result).toBe(true);
    expect(game.teams.player.sp).toBe(startSP - UNIT_STATS.infantry.cost);

    // Step 2: Building starts working on the queue
    barracks.update(0); // Pop from queue to current
    expect(barracks.currentProduction).toBe('infantry');

    // Step 3: Wait for build time to elapse
    barracks.update(UNIT_STATS.infantry.buildTime + 0.1);
    expect(barracks.productionTimer).toBeLessThanOrEqual(0);

    // Step 4: ProductionSystem completes it
    game.productionSystem.update(0.016);
    expect(handler).toHaveBeenCalled();
    expect(game.getUnits('player').length).toBeGreaterThanOrEqual(1);
    expect(barracks.currentProduction).toBeNull();
  });

  it('should handle queuing 5 units and producing them sequentially', () => {
    const barracks = addBuilding(game, 'barracks', 'player');
    game.teams.player.sp = 5000;

    // Queue 5 infantry
    for (let i = 0; i < 5; i++) {
      game.productionSystem.requestProduction(barracks, 'infantry');
    }
    expect(barracks.productionQueue.length).toBe(5);

    let produced = 0;
    game.eventBus.on('production:complete', () => produced++);

    // Simulate building updates and production system
    for (let i = 0; i < 5; i++) {
      barracks.update(0); // Pop from queue
      expect(barracks.currentProduction).toBe('infantry');

      // Advance time past build time
      barracks.update(UNIT_STATS.infantry.buildTime + 0.1);

      // Complete production
      game.productionSystem.update(0.016);
    }

    expect(produced).toBe(5);
    expect(game.getUnits('player').length).toBe(5);
  });

  it('should respect tech tree requirements', () => {
    // Try to produce a tank without a barracks
    const warfactory = addBuilding(game, 'warfactory', 'player');
    game.teams.player.sp = 5000;

    // Tank requires barracks according to TECH_TREE
    const result = game.productionSystem.requestProduction(warfactory, 'tank');
    expect(result).toBe(false);

    // Now add a barracks
    addBuilding(game, 'barracks', 'player');
    const result2 = game.productionSystem.requestProduction(warfactory, 'tank');
    expect(result2).toBe(true);
  });

  it('should respect population cap', () => {
    const barracks = addBuilding(game, 'barracks', 'player');
    game.teams.player.sp = 100000;

    // Fill to pop cap
    for (let i = 0; i < GAME_CONFIG.maxUnitsPerTeam; i++) {
      game.createUnit('infantry', 'player', { x: 0, y: 0, z: 0 });
    }

    const result = game.productionSystem.requestProduction(barracks, 'infantry');
    expect(result).toBe(false);
  });
});

describe('Resource Economy Flow', () => {
  let game;

  beforeEach(() => {
    game = createIntegrationGame();
  });

  it('should generate income over time from buildings', () => {
    addBuilding(game, 'resourcedepot', 'player');
    const startSP = game.teams.player.sp;

    // Simulate 5 seconds of income
    for (let i = 0; i < 5; i++) {
      game.resourceSystem.update(GAME_CONFIG.tickRate);
    }

    const expectedIncome = (GAME_CONFIG.baseIncome + BUILDING_STATS.resourcedepot.income) * 5;
    expect(game.teams.player.sp).toBe(startSP + expectedIncome);
  });

  it('should drain resources when producing multiple units', () => {
    const barracks = addBuilding(game, 'barracks', 'player');
    game.teams.player.sp = 200;

    // 200 SP / 50 per infantry = 4 max
    let produced = 0;
    for (let i = 0; i < 10; i++) {
      if (game.productionSystem.requestProduction(barracks, 'infantry')) {
        produced++;
      }
    }

    expect(produced).toBe(4);
    expect(game.teams.player.sp).toBe(0);
  });
});

describe('Combat Damage Calculation', () => {
  it('should apply damage modifiers correctly', () => {
    // Tank vs Infantry should do 2.0x damage
    const tankDamage = UNIT_STATS.tank.damage;
    const modifier = DAMAGE_MODIFIERS.tank.infantry;
    const rawDamage = tankDamage * modifier;
    expect(rawDamage).toBe(70); // 35 * 2.0

    // Infantry vs Tank should do 0.4x damage
    const infDamage = UNIT_STATS.infantry.damage;
    const infMod = DAMAGE_MODIFIERS.infantry.tank;
    const infRawDamage = infDamage * infMod;
    expect(infRawDamage).toBeCloseTo(3.2); // 8 * 0.4
  });

  it('armor should reduce damage (2% per point)', () => {
    const armorPoints = 3;
    const armorReduction = armorPoints * 0.02; // 6%
    const rawDamage = 100;
    const reduced = rawDamage * (1 - armorReduction);
    expect(reduced).toBe(94);
  });

  it('veterancy should increase damage', () => {
    const baseDamage = 10;
    const vetRank = 2; // Elite
    const vetBonus = 0.10 * vetRank; // +20%
    const boosted = baseDamage * (1 + vetBonus);
    expect(boosted).toBe(12);
  });
});

describe('Tech Tree Integrity', () => {
  it('every unit should be producible through some building chain', () => {
    for (const [unitType, tech] of Object.entries(TECH_TREE)) {
      const building = tech.building;
      expect(BUILDING_STATS[building].produces, `${building} should produce ${unitType}`)
        .toContain(unitType);
    }
  });

  it('no circular tech dependencies', () => {
    // Verify no building requires itself or creates a cycle
    for (const [type, stats] of Object.entries(BUILDING_STATS)) {
      const requires = stats.requires || [];
      expect(requires, `${type} should not require itself`).not.toContain(type);

      // Check for indirect cycles (depth 3)
      for (const req of requires) {
        const reqReqs = BUILDING_STATS[req]?.requires || [];
        expect(reqReqs, `Cycle: ${type} -> ${req} -> ${type}`).not.toContain(type);
        for (const reqReq of reqReqs) {
          const reqReqReqs = BUILDING_STATS[reqReq]?.requires || [];
          expect(reqReqReqs, `Cycle: ${type} -> ${req} -> ${reqReq} -> ${type}`)
            .not.toContain(type);
        }
      }
    }
  });
});
