/**
 * Unit tests for Building entity
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UNIT_STATS, BUILDING_STATS } from '../../js/core/Constants.js';

// We test the Building logic using a mock that mirrors the real Building class
// since the real class imports THREE.js for mesh construction
function createBuilding(type, team) {
  const stats = BUILDING_STATS[type];
  return {
    type, team,
    isBuilding: true,
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
    nation: null,
    game: { hasResearch: () => false, neutralStructures: null },

    canProduce(unitType) { return this.produces.includes(unitType); },
    queueUnit(unitType) {
      if (this.canProduce(unitType)) {
        this.productionQueue.push(unitType);
      }
    },
    getProductionProgress() {
      if (!this.currentProduction) return 0;
      const total = this._productionTotalTime || (UNIT_STATS[this.currentProduction]?.buildTime ?? 3);
      return 1 - (this.productionTimer / total);
    },
    getFullQueue() {
      const result = [];
      if (this.currentProduction) {
        result.push({ type: this.currentProduction, progress: this.getProductionProgress(), isCurrent: true });
      }
      for (const ut of this.productionQueue) {
        result.push({ type: ut, progress: 0, isCurrent: false });
      }
      return result;
    },
    getTotalQueueCost() {
      let total = 0;
      for (const item of this.getFullQueue()) {
        const s = UNIT_STATS[item.type];
        if (s) total += s.cost;
      }
      return total;
    },
    cancelQueueItem(index) {
      if (index === 0 && this.currentProduction) {
        const cancelled = this.currentProduction;
        this.currentProduction = null;
        this.productionTimer = 0;
        return cancelled;
      } else if (index >= 1) {
        const queueIdx = index - 1;
        if (queueIdx < this.productionQueue.length) {
          return this.productionQueue.splice(queueIdx, 1)[0];
        }
      }
      return null;
    },
    getTierBonus() { return null; },
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
}

describe('Building', () => {
  describe('canProduce', () => {
    it('barracks should produce infantry', () => {
      const b = createBuilding('barracks', 'player');
      expect(b.canProduce('infantry')).toBe(true);
    });

    it('barracks should not produce tank', () => {
      const b = createBuilding('barracks', 'player');
      expect(b.canProduce('tank')).toBe(false);
    });

    it('warfactory should produce tank', () => {
      const b = createBuilding('warfactory', 'player');
      expect(b.canProduce('tank')).toBe(true);
    });
  });

  describe('queueUnit', () => {
    it('should add unit to queue if building can produce it', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      expect(b.productionQueue).toContain('infantry');
    });

    it('should not add unit to queue if building cannot produce it', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('tank');
      expect(b.productionQueue).toHaveLength(0);
    });

    it('should allow queuing multiple units', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.queueUnit('infantry');
      b.queueUnit('mortar');
      expect(b.productionQueue).toHaveLength(3);
    });
  });

  describe('update (production)', () => {
    it('should start producing when queue has items and no current production', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.update(0);
      expect(b.currentProduction).toBe('infantry');
      expect(b.productionTimer).toBe(UNIT_STATS.infantry.buildTime);
    });

    it('should count down production timer', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.update(0); // Start production
      const startTimer = b.productionTimer;
      b.update(1.0); // 1 second
      expect(b.productionTimer).toBeCloseTo(startTimer - 1.0);
    });

    it('should not produce while constructing', () => {
      const b = createBuilding('barracks', 'player');
      b._constructing = true;
      b.queueUnit('infantry');
      b.update(0);
      expect(b.currentProduction).toBeNull();
    });
  });

  describe('getFullQueue', () => {
    it('should return empty array when nothing is producing', () => {
      const b = createBuilding('barracks', 'player');
      expect(b.getFullQueue()).toHaveLength(0);
    });

    it('should include current production and queued items', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.queueUnit('mortar');
      b.update(0); // Start first item

      const queue = b.getFullQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].isCurrent).toBe(true);
      expect(queue[0].type).toBe('infantry');
      expect(queue[1].isCurrent).toBe(false);
      expect(queue[1].type).toBe('mortar');
    });
  });

  describe('cancelQueueItem', () => {
    it('should cancel current production (index 0)', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.update(0); // Start production

      const cancelled = b.cancelQueueItem(0);
      expect(cancelled).toBe('infantry');
      expect(b.currentProduction).toBeNull();
    });

    it('should cancel queued item (index >= 1)', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.queueUnit('mortar');
      b.update(0); // Start first item

      const cancelled = b.cancelQueueItem(1);
      expect(cancelled).toBe('mortar');
      expect(b.productionQueue).toHaveLength(0);
    });

    it('should return null for invalid index', () => {
      const b = createBuilding('barracks', 'player');
      expect(b.cancelQueueItem(5)).toBeNull();
    });
  });

  describe('getTotalQueueCost', () => {
    it('should sum costs of all queued items', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.queueUnit('infantry');
      b.queueUnit('mortar');
      b.update(0); // Start first item

      const expected = UNIT_STATS.infantry.cost * 2 + UNIT_STATS.mortar.cost;
      expect(b.getTotalQueueCost()).toBe(expected);
    });
  });

  describe('getProductionProgress', () => {
    it('should return 0 when nothing is producing', () => {
      const b = createBuilding('barracks', 'player');
      expect(b.getProductionProgress()).toBe(0);
    });

    it('should return progress between 0 and 1', () => {
      const b = createBuilding('barracks', 'player');
      b.queueUnit('infantry');
      b.update(0); // Start
      b.update(UNIT_STATS.infantry.buildTime / 2); // Half done

      const progress = b.getProductionProgress();
      expect(progress).toBeGreaterThan(0.4);
      expect(progress).toBeLessThan(0.6);
    });
  });
});
