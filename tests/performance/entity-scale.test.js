/**
 * Performance tests for entity creation and system scaling.
 */
import { describe, it, expect } from 'vitest';
import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG, DAMAGE_MODIFIERS } from '../../js/core/Constants.js';
import { EventBus } from '../../js/core/EventBus.js';

function createPerfGame() {
  const eventBus = new EventBus();
  return {
    state: 'PLAYING',
    eventBus,
    entities: [],
    teams: {
      player: { sp: 999999, mu: 99999, nation: 'america' },
      enemy: { sp: 999999, mu: 99999, nation: 'germany' },
    },
    getUnits(team) { return this.entities.filter(e => e.isUnit && e.team === team && e.alive); },
    getBuildings(team) { return this.entities.filter(e => e.isBuilding && e.team === team && e.alive); },
    hasResearch() { return false; },
    neutralStructures: null,
    aiDifficulty: 'normal',
  };
}

function createPerfUnit(id, type, team) {
  const stats = UNIT_STATS[type];
  return {
    id,
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
    domain: stats.domain,
    attackCooldown: 0,
    attackTarget: null,
    veterancyRank: 0,
    position: { x: Math.random() * 256, y: 0, z: Math.random() * 256 },
    getPosition() { return this.position; },
    distanceTo(other) {
      const p = other.getPosition ? other.getPosition() : other;
      return Math.sqrt((this.position.x - p.x) ** 2 + (this.position.z - p.z) ** 2);
    },
    takeDamage(amount) {
      this.health -= amount;
      if (this.health <= 0) { this.health = 0; this.alive = false; }
    },
  };
}

describe('Entity Creation Performance', () => {
  it('should create 100 entities in < 10ms', () => {
    const start = performance.now();
    const game = createPerfGame();
    for (let i = 0; i < 100; i++) {
      game.entities.push(createPerfUnit(i, 'infantry', i % 2 === 0 ? 'player' : 'enemy'));
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
    expect(game.entities.length).toBe(100);
  });

  it('should create 500 entities in < 50ms', () => {
    const start = performance.now();
    const game = createPerfGame();
    const types = Object.keys(UNIT_STATS);
    for (let i = 0; i < 500; i++) {
      const type = types[i % types.length];
      game.entities.push(createPerfUnit(i, type, i % 2 === 0 ? 'player' : 'enemy'));
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(game.entities.length).toBe(500);
  });

  it('should create 1000 entities in < 100ms', () => {
    const start = performance.now();
    const game = createPerfGame();
    const types = Object.keys(UNIT_STATS);
    for (let i = 0; i < 1000; i++) {
      const type = types[i % types.length];
      game.entities.push(createPerfUnit(i, type, i % 2 === 0 ? 'player' : 'enemy'));
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe('Entity Filtering Performance', () => {
  it('should filter units by team from 1000 entities in < 5ms', () => {
    const game = createPerfGame();
    const types = Object.keys(UNIT_STATS);
    for (let i = 0; i < 1000; i++) {
      game.entities.push(createPerfUnit(i, types[i % types.length], i % 2 === 0 ? 'player' : 'enemy'));
    }

    const start = performance.now();
    const playerUnits = game.getUnits('player');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
    expect(playerUnits.length).toBe(500);
  });
});

describe('Combat Resolution Performance', () => {
  it('should resolve 500 attack calculations in < 10ms', () => {
    const game = createPerfGame();
    const types = Object.keys(UNIT_STATS).filter(t => UNIT_STATS[t].damage > 0);

    // Create attacker-target pairs
    const pairs = [];
    for (let i = 0; i < 500; i++) {
      const attackerType = types[i % types.length];
      const targetType = types[(i + 3) % types.length];
      pairs.push({
        attacker: createPerfUnit(i, attackerType, 'player'),
        target: createPerfUnit(i + 1000, targetType, 'enemy'),
      });
    }

    const start = performance.now();
    for (const { attacker, target } of pairs) {
      const modifier = DAMAGE_MODIFIERS[attacker.type]?.[target.type] ?? 1.0;
      const rawDamage = attacker.damage * modifier;
      const armorReduction = (target.armor || 0) * 0.02;
      const finalDamage = Math.max(1, rawDamage * (1 - armorReduction));
      target.takeDamage(finalDamage);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });
});

describe('EventBus Performance', () => {
  it('should emit 10000 events in < 50ms', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('test', () => count++);

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      bus.emit('test', { i });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(count).toBe(10000);
  });

  it('should handle 100 listeners on a single event without degradation', () => {
    const bus = new EventBus();
    let total = 0;
    for (let i = 0; i < 100; i++) {
      bus.on('test', (data) => { total += data.value; });
    }

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      bus.emit('test', { value: 1 });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(total).toBe(100000); // 100 listeners * 1000 events * 1
  });
});

describe('Memory Leak Patterns', () => {
  it('should not leak entities when removing dead units', () => {
    const game = createPerfGame();

    // Create and kill 1000 units
    for (let i = 0; i < 1000; i++) {
      const unit = createPerfUnit(i, 'infantry', 'player');
      game.entities.push(unit);
    }

    expect(game.entities.length).toBe(1000);

    // Kill half
    for (let i = 0; i < 500; i++) {
      game.entities[i].alive = false;
    }

    // Clean up dead entities (simulating game cleanup)
    game.entities = game.entities.filter(e => e.alive);
    expect(game.entities.length).toBe(500);
  });

  it('should not leak EventBus listeners after off()', () => {
    const bus = new EventBus();
    const handlers = [];

    // Add 100 listeners
    for (let i = 0; i < 100; i++) {
      const h = () => {};
      handlers.push(h);
      bus.on('test', h);
    }

    expect(bus.listeners.test.length).toBe(100);

    // Remove all
    for (const h of handlers) {
      bus.off('test', h);
    }

    expect(bus.listeners.test.length).toBe(0);
  });
});
