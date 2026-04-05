/**
 * Unit tests for ResourceSystem
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GAME_CONFIG, BUILDING_STATS, NATIONS } from '../../js/core/Constants.js';
import { EventBus } from '../../js/core/EventBus.js';
import { ResourceSystem } from '../../js/systems/ResourceSystem.js';

function createGameForResources(overrides = {}) {
  const eventBus = new EventBus();
  const game = {
    eventBus,
    entities: [],
    teams: {
      player: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'america' },
      enemy: { sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU, nation: 'germany' },
    },
    aiDifficulty: 'normal',
    getBuildings(team) {
      return game.entities.filter(e => e.isBuilding && e.team === team && e.alive);
    },
    hasResearch() { return false; },
    neutralStructures: null,
    ...overrides,
  };
  return game;
}

describe('ResourceSystem', () => {
  let game;
  let rs;

  beforeEach(() => {
    game = createGameForResources();
    rs = new ResourceSystem(game);
    game.resourceSystem = rs;
  });

  describe('canAfford', () => {
    it('should return true when team has enough SP', () => {
      game.teams.player.sp = 500;
      expect(rs.canAfford('player', 200)).toBe(true);
    });

    it('should return false when team cannot afford', () => {
      game.teams.player.sp = 100;
      expect(rs.canAfford('player', 200)).toBe(false);
    });

    it('should return true when cost equals balance exactly', () => {
      game.teams.player.sp = 200;
      expect(rs.canAfford('player', 200)).toBe(true);
    });
  });

  describe('canAffordMU', () => {
    it('should return true when team has enough MU', () => {
      game.teams.player.mu = 100;
      expect(rs.canAffordMU('player', 50)).toBe(true);
    });

    it('should return false when team cannot afford MU', () => {
      game.teams.player.mu = 10;
      expect(rs.canAffordMU('player', 50)).toBe(false);
    });

    it('should handle missing mu field gracefully', () => {
      game.teams.player.mu = undefined;
      expect(rs.canAffordMU('player', 50)).toBe(false);
    });
  });

  describe('canAffordBoth', () => {
    it('should require both SP and MU', () => {
      game.teams.player.sp = 300;
      game.teams.player.mu = 50;
      expect(rs.canAffordBoth('player', 200, 40)).toBe(true);
      expect(rs.canAffordBoth('player', 400, 40)).toBe(false);
      expect(rs.canAffordBoth('player', 200, 60)).toBe(false);
    });
  });

  describe('spend', () => {
    it('should deduct SP and emit resource:changed', () => {
      game.teams.player.sp = 500;
      const handler = vi.fn();
      game.eventBus.on('resource:changed', handler);

      const result = rs.spend('player', 200);

      expect(result).toBe(true);
      expect(game.teams.player.sp).toBe(300);
      expect(handler).toHaveBeenCalled();
    });

    it('should not spend if cannot afford', () => {
      game.teams.player.sp = 100;
      const result = rs.spend('player', 200);
      expect(result).toBe(false);
      expect(game.teams.player.sp).toBe(100);
    });
  });

  describe('spendMU', () => {
    it('should deduct MU', () => {
      game.teams.player.mu = 100;
      const result = rs.spendMU('player', 50);
      expect(result).toBe(true);
      expect(game.teams.player.mu).toBe(50);
    });
  });

  describe('tick (income)', () => {
    it('should add base income to both teams', () => {
      const startSP = game.teams.player.sp;
      rs.tick();
      expect(game.teams.player.sp).toBe(startSP + GAME_CONFIG.baseIncome);
    });

    it('should add building income from resource depots', () => {
      const depot = {
        isBuilding: true, team: 'player', alive: true, type: 'resourcedepot',
        _constructing: false,
      };
      game.entities.push(depot);

      const startSP = game.teams.player.sp;
      rs.tick();
      const expectedIncome = GAME_CONFIG.baseIncome + BUILDING_STATS.resourcedepot.income;
      expect(game.teams.player.sp).toBe(startSP + expectedIncome);
    });

    it('should not count buildings under construction', () => {
      const depot = {
        isBuilding: true, team: 'player', alive: true, type: 'resourcedepot',
        _constructing: true,
      };
      game.entities.push(depot);

      const startSP = game.teams.player.sp;
      rs.tick();
      expect(game.teams.player.sp).toBe(startSP + GAME_CONFIG.baseIncome);
    });

    it('should add nation income bonus', () => {
      // Britain has +2 income bonus
      game.teams.player.nation = 'britain';
      const startSP = game.teams.player.sp;
      rs.tick();
      const expectedIncome = GAME_CONFIG.baseIncome + NATIONS.britain.bonuses.incomeBonus;
      expect(game.teams.player.sp).toBe(startSP + expectedIncome);
    });

    it('should add MU income from munitions cache', () => {
      const cache = {
        isBuilding: true, team: 'player', alive: true, type: 'munitionscache',
        _constructing: false,
      };
      game.entities.push(cache);

      const startMU = game.teams.player.mu;
      rs.tick();
      const expectedMU = GAME_CONFIG.baseMUIncome + BUILDING_STATS.munitionscache.muIncome;
      expect(game.teams.player.mu).toBe(startMU + expectedMU);
    });
  });

  describe('update (accumulator)', () => {
    it('should not tick until full interval has elapsed', () => {
      const startSP = game.teams.player.sp;
      rs.update(0.5); // half a tick
      expect(game.teams.player.sp).toBe(startSP);
    });

    it('should tick when interval is reached', () => {
      const startSP = game.teams.player.sp;
      rs.update(GAME_CONFIG.tickRate); // full tick
      expect(game.teams.player.sp).toBeGreaterThan(startSP);
    });
  });

  describe('getIncomeRate', () => {
    it('should return base income for a team with no bonuses', () => {
      // america has 0 incomeBonus
      const rate = rs.getIncomeRate('player');
      expect(rate).toBe(GAME_CONFIG.baseIncome);
    });
  });
});
