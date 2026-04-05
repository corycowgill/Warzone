/**
 * Unit tests for ProductionSystem
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG, TECH_TREE } from '../../js/core/Constants.js';
import { EventBus } from '../../js/core/EventBus.js';
import { ProductionSystem } from '../../js/systems/ProductionSystem.js';
import { ResourceSystem } from '../../js/systems/ResourceSystem.js';

function createTestGame() {
  const eventBus = new EventBus();
  const game = {
    state: 'PLAYING',
    eventBus,
    entities: [],
    teams: {
      player: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'america' },
      enemy: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'germany' },
    },
    getUnits(team) { return game.entities.filter(e => e.isUnit && e.team === team && e.alive); },
    getBuildings(team) { return game.entities.filter(e => e.isBuilding && e.team === team && e.alive); },
    hasResearch() { return false; },
    soundManager: null,
    nationAbilitySystem: null,
    neutralStructures: null,
    aiDifficulty: 'normal',
    createUnit(unitType, team, position) {
      const unit = {
        id: Math.floor(Math.random() * 10000),
        type: unitType,
        team,
        isUnit: true,
        isBuilding: false,
        alive: true,
        health: UNIT_STATS[unitType]?.hp || 100,
        maxHealth: UNIT_STATS[unitType]?.hp || 100,
        damage: UNIT_STATS[unitType]?.damage || 10,
        position: { ...position },
      };
      game.entities.push(unit);
      return unit;
    },
  };

  game.resourceSystem = new ResourceSystem(game);
  game.productionSystem = new ProductionSystem(game);
  return game;
}

function createBarracks(team, game) {
  const building = {
    id: 2000 + Math.floor(Math.random() * 1000),
    type: 'barracks',
    team,
    isBuilding: true,
    isUnit: false,
    alive: true,
    health: BUILDING_STATS.barracks.hp,
    maxHealth: BUILDING_STATS.barracks.hp,
    produces: [...BUILDING_STATS.barracks.produces],
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
    update(delta) {
      if (!this.alive || this._constructing) return;
      if (this.currentProduction) {
        this.productionTimer -= delta;
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

describe('ProductionSystem', () => {
  let game;

  beforeEach(() => {
    game = createTestGame();
  });

  describe('requestProduction', () => {
    it('should deduct resources and queue a unit', () => {
      const barracks = createBarracks('player', game);
      const startSP = game.teams.player.sp;
      const cost = UNIT_STATS.infantry.cost;

      const result = game.productionSystem.requestProduction(barracks, 'infantry');

      expect(result).toBe(true);
      expect(game.teams.player.sp).toBe(startSP - cost);
      expect(barracks.productionQueue).toContain('infantry');
    });

    it('should fail if building cannot produce the unit type', () => {
      const barracks = createBarracks('player', game);
      const result = game.productionSystem.requestProduction(barracks, 'tank');
      expect(result).toBe(false);
    });

    it('should fail if team cannot afford the unit', () => {
      const barracks = createBarracks('player', game);
      game.teams.player.sp = 10; // Not enough for infantry (50 SP)
      const result = game.productionSystem.requestProduction(barracks, 'infantry');
      expect(result).toBe(false);
      expect(game.teams.player.sp).toBe(10); // Not deducted
    });

    it('should fail if population cap is reached', () => {
      const barracks = createBarracks('player', game);
      // Fill up to max units
      for (let i = 0; i < GAME_CONFIG.maxUnitsPerTeam; i++) {
        game.entities.push({
          isUnit: true, isBuilding: false, team: 'player', alive: true, type: 'infantry'
        });
      }
      const result = game.productionSystem.requestProduction(barracks, 'infantry');
      expect(result).toBe(false);
    });

    it('should emit production:started event', () => {
      const barracks = createBarracks('player', game);
      const handler = vi.fn();
      game.eventBus.on('production:started', handler);

      game.productionSystem.requestProduction(barracks, 'infantry');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        building: barracks,
        unitType: 'infantry',
      }));
    });

    it('should emit production:error when cannot afford', () => {
      const barracks = createBarracks('player', game);
      game.teams.player.sp = 0;
      const handler = vi.fn();
      game.eventBus.on('production:error', handler);

      game.productionSystem.requestProduction(barracks, 'infantry');

      expect(handler).toHaveBeenCalled();
    });

    it('should queue multiple units when called multiple times', () => {
      const barracks = createBarracks('player', game);
      game.teams.player.sp = 1000;

      game.productionSystem.requestProduction(barracks, 'infantry');
      game.productionSystem.requestProduction(barracks, 'infantry');
      game.productionSystem.requestProduction(barracks, 'infantry');

      // First goes to queue, building.update() pops it to currentProduction
      expect(barracks.productionQueue.length).toBe(3);
    });
  });

  describe('completeProduction', () => {
    it('should spawn a unit and clear building production', () => {
      const barracks = createBarracks('player', game);
      barracks.currentProduction = 'infantry';
      barracks.productionTimer = 0;

      const handler = vi.fn();
      game.eventBus.on('production:complete', handler);

      game.productionSystem.completeProduction(barracks);

      expect(barracks.currentProduction).toBeNull();
      expect(barracks.productionTimer).toBe(0);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        unitType: 'infantry',
      }));
      // A new unit should exist
      const units = game.getUnits('player');
      expect(units.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('update', () => {
    it('should complete production when timer reaches zero', () => {
      const barracks = createBarracks('player', game);
      barracks.currentProduction = 'infantry';
      barracks.productionTimer = 0;

      const handler = vi.fn();
      game.eventBus.on('production:complete', handler);

      game.productionSystem.update(0.016);

      expect(handler).toHaveBeenCalled();
    });

    it('should skip buildings under construction', () => {
      const barracks = createBarracks('player', game);
      barracks._constructing = true;
      barracks.currentProduction = 'infantry';
      barracks.productionTimer = 0;

      const handler = vi.fn();
      game.eventBus.on('production:complete', handler);

      game.productionSystem.update(0.016);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('hasTechRequirements', () => {
    it('should return true for infantry (no requirements)', () => {
      expect(game.productionSystem.hasTechRequirements('player', 'infantry')).toBe(true);
    });

    it('should return false for tank without barracks', () => {
      // Tank requires barracks
      expect(game.productionSystem.hasTechRequirements('player', 'tank')).toBe(false);
    });

    it('should return true for tank when barracks exists', () => {
      createBarracks('player', game);
      expect(game.productionSystem.hasTechRequirements('player', 'tank')).toBe(true);
    });
  });
});
