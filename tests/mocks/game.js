/**
 * Mock Game object for unit testing.
 * Provides the minimal game context that systems and entities depend on.
 */
import { EventBus } from '../../js/core/EventBus.js';
import { GAME_CONFIG } from '../../js/core/Constants.js';

/**
 * Create a mock game object with configurable options.
 * @param {object} overrides - properties to override on the mock game
 */
export function createMockGame(overrides = {}) {
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
    _lastDelta: 0.016,

    // System stubs
    resourceSystem: null,
    productionSystem: null,
    combatSystem: null,
    selectionManager: null,
    soundManager: null,
    sceneManager: null,
    cameraController: null,
    fogOfWar: null,
    neutralStructures: null,
    research: { player: {}, enemy: {} },

    // Helper methods
    getUnits(team) {
      return game.entities.filter(e => e.isUnit && e.team === team && e.alive);
    },
    getBuildings(team) {
      return game.entities.filter(e => e.isBuilding && e.team === team && e.alive);
    },
    hasResearch(team, id) {
      return false;
    },
    createUnit(unitType, team, position) {
      const unit = createMockUnit(unitType, team, position);
      game.entities.push(unit);
      return unit;
    },

    ...overrides,
  };

  return game;
}

/**
 * Create a mock unit for testing.
 */
export function createMockUnit(type, team, position = { x: 0, y: 0, z: 0 }) {
  let nextId = createMockUnit._nextId || 1;
  createMockUnit._nextId = nextId + 1;

  const { UNIT_STATS } = require_constants();
  const stats = UNIT_STATS[type] || { hp: 100, speed: 5, damage: 10, range: 8, cost: 100, domain: 'land', buildTime: 3, attackRate: 1.0, armor: 0, vision: 10 };

  return {
    id: nextId,
    type,
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
    attackRate: stats.attackRate || 1.0,
    domain: stats.domain,
    vision: stats.vision || 10,
    attackCooldown: 0,
    attackTarget: null,
    moveTarget: null,
    waypoints: [],
    isMoving: false,
    isRetreating: false,
    isGarrisoned: false,
    empDisabledTimer: 0,
    veterancyRank: 0,
    veterancyKills: 0,
    stance: 'aggressive',
    position: { x: position.x || 0, y: position.y || 0, z: position.z || 0 },

    getPosition() { return { x: this.position.x, y: this.position.y, z: this.position.z, clone: () => ({ ...this.position, add: () => this.position }) }; },
    distanceTo(other) {
      const p = other.getPosition ? other.getPosition() : other;
      return Math.sqrt((this.position.x - p.x) ** 2 + (this.position.z - p.z) ** 2);
    },
    isInRange(target) {
      return this.distanceTo(target) <= this.range * GAME_CONFIG.worldScale;
    },
    canAttack() { return this.attackCooldown <= 0; },
    takeDamage(amount) {
      this.health -= amount;
      if (this.health <= 0) { this.health = 0; this.alive = false; }
    },
    stop() { this.moveTarget = null; this.waypoints = []; this.isMoving = false; this.attackTarget = null; },
    addKill() { this.veterancyKills++; },
    cycleStance() {
      const stances = ['aggressive', 'defensive', 'holdfire'];
      const idx = stances.indexOf(this.stance);
      this.stance = stances[(idx + 1) % stances.length];
      return this.stance;
    },
    startRetreat() { this.isRetreating = true; },
  };
}

/**
 * Create a mock building for testing.
 */
export function createMockBuilding(type, team, position = { x: 0, y: 0, z: 0 }) {
  let nextId = createMockBuilding._nextId || 1000;
  createMockBuilding._nextId = nextId + 1;

  const { BUILDING_STATS, UNIT_STATS } = require_constants();
  const stats = BUILDING_STATS[type] || { hp: 500, cost: 200, produces: [], size: 2, requires: [] };

  return {
    id: nextId,
    type,
    team,
    isUnit: false,
    isBuilding: true,
    alive: true,
    health: stats.hp,
    maxHealth: stats.hp,
    cost: stats.cost,
    produces: stats.produces || [],
    size: stats.size || 2,
    tier: 1,
    nation: null,
    game: null,

    productionQueue: [],
    productionTimer: 0,
    currentProduction: null,
    _constructing: false,
    _constructionElapsed: 0,
    _constructionTime: 0,
    _sabotaged: false,
    _productionTotalTime: 0,
    rallyPoint: { x: position.x, y: position.y, z: position.z + 10, clone: () => ({ x: position.x, y: 0, z: position.z + 10, add: () => ({ x: position.x, y: 0, z: position.z + 10 }) }) },

    getPosition() { return { x: position.x, y: position.y, z: position.z, clone: () => ({ x: position.x, y: position.y, z: position.z, add: (v) => ({ x: position.x + (v?.x || 0), y: position.y + (v?.y || 0), z: position.z + (v?.z || 0) }) }) }; },
    canProduce(unitType) { return this.produces.includes(unitType); },
    queueUnit(unitType) {
      if (this.canProduce(unitType)) {
        this.productionQueue.push(unitType);
      }
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
    getProductionProgress() {
      if (!this.currentProduction) return 0;
      const totalTime = this._productionTotalTime || (UNIT_STATS[this.currentProduction]?.buildTime ?? 3);
      return 1 - (this.productionTimer / totalTime);
    },
    getTotalQueueCost() {
      let total = 0;
      for (const item of this.getFullQueue()) {
        const s = UNIT_STATS[item.type];
        if (s) total += s.cost;
      }
      return total;
    },
    getTotalQueueTime() {
      let total = 0;
      if (this.currentProduction) total += Math.max(0, this.productionTimer);
      for (const ut of this.productionQueue) {
        const s = UNIT_STATS[ut];
        if (s) total += s.buildTime;
      }
      return total;
    },
    getRemainingTime() {
      return this.currentProduction ? Math.max(0, this.productionTimer) : 0;
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
    canUpgrade() { return false; },
    getUpgradeCost() { return 0; },
    getTierBonus() { return null; },
    takeDamage(amount) {
      this.health -= amount;
      if (this.health <= 0) { this.health = 0; this.alive = false; }
    },
    update(deltaTime) {
      if (!this.alive || this._constructing || this._sabotaged) return;
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

// Helper to lazily import constants (avoids circular dependency issues)
let _constants = null;
function require_constants() {
  if (!_constants) {
    // This will be resolved by vitest from the actual source
    _constants = require('../../js/core/Constants.js');
  }
  return _constants;
}

// For ES module compatibility, also export an async loader
export async function loadConstants() {
  return await import('../../js/core/Constants.js');
}
