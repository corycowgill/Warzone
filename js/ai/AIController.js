import * as THREE from 'three';
import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG } from '../core/Constants.js';

export class AIController {
  constructor(game, team = 'enemy') {
    this.game = game;
    this.team = team;
    this.enemyTeam = team === 'enemy' ? 'player' : 'enemy';

    // Strategy state
    this.strategy = 'balanced'; // 'rush' | 'balanced' | 'turtle'

    // Layer timers
    this.strategicTimer = 0;
    this.strategicInterval = 10;

    this.tacticalTimer = 0;
    this.tacticalInterval = 3;

    this.microTimer = 0;
    this.microInterval = 1;

    // Track build order progress
    this.buildOrderIndex = 0;
    this.lastAttackTime = 0;
    this.attackCooldown = 30;

    // Build order: the sequence of buildings AI wants to construct
    this.buildOrder = ['barracks', 'resourcedepot', 'warfactory', 'airfield', 'resourcedepot', 'shipyard'];
    this.nextBuildSlot = 1; // Slot index for building placement
  }

  update(delta) {
    if (this.game.state !== 'PLAYING') return;

    // Strategic layer - every 10s
    this.strategicTimer += delta;
    if (this.strategicTimer >= this.strategicInterval) {
      this.strategicTimer = 0;
      this.updateStrategy();
    }

    // Tactical layer - every 3s
    this.tacticalTimer += delta;
    if (this.tacticalTimer >= this.tacticalInterval) {
      this.tacticalTimer = 0;
      this.executeTactics();
    }

    // Micro layer - every 1s
    this.microTimer += delta;
    if (this.microTimer >= this.microInterval) {
      this.microTimer = 0;
      this.executeMicro();
    }
  }

  // =============================================
  // STRATEGIC LAYER
  // =============================================
  updateStrategy() {
    const myUnits = this.game.getUnits(this.team);
    const enemyUnits = this.game.getUnits(this.enemyTeam);
    const mySP = this.game.teams[this.team].sp;

    if (enemyUnits.length > myUnits.length * 1.5) {
      this.strategy = 'turtle';
    } else if (mySP > 800 && myUnits.length >= 5) {
      this.strategy = 'rush';
    } else {
      this.strategy = 'balanced';
    }
  }

  // =============================================
  // TACTICAL LAYER
  // =============================================
  executeTactics() {
    this.ensureBarracks();
    this.buildNextStructure();
    this.produceUnits();
    this.considerAttack();
  }

  ensureBarracks() {
    const barracks = this.game.getBuildings(this.team).filter(b => b.type === 'barracks');
    if (barracks.length === 0) {
      this.tryBuildBuilding('barracks');
    }
  }

  buildNextStructure() {
    if (this.buildOrderIndex >= this.buildOrder.length) return;

    const nextType = this.buildOrder[this.buildOrderIndex];
    const stats = BUILDING_STATS[nextType];
    if (!stats) {
      this.buildOrderIndex++;
      return;
    }

    // Check tech requirements
    if (stats.requires && stats.requires.length > 0) {
      const teamBuildings = this.game.getBuildings(this.team);
      for (const req of stats.requires) {
        if (!teamBuildings.some(b => b.type === req && b.alive)) {
          return; // Can't build yet, wait for prerequisite
        }
      }
    }

    // For resource depots, allow multiples
    if (nextType !== 'resourcedepot') {
      const existing = this.game.getBuildings(this.team).filter(b => b.type === nextType);
      if (existing.length > 0) {
        this.buildOrderIndex++;
        return;
      }
    }

    if (this.tryBuildBuilding(nextType)) {
      this.buildOrderIndex++;
    }
  }

  tryBuildBuilding(type) {
    const stats = BUILDING_STATS[type];
    if (!stats) return false;

    if (!this.game.resourceSystem.canAfford(this.team, stats.cost)) {
      return false;
    }

    const hq = this.game.getHQ(this.team);
    if (!hq) return false;

    const hqPos = hq.getPosition();

    // Place buildings in a grid pattern near HQ
    const slot = this.nextBuildSlot;
    const row = Math.floor(slot / 3);
    const col = slot % 3;
    const spacing = 18;

    const buildPos = new THREE.Vector3(
      hqPos.x + (col - 1) * spacing,
      0,
      hqPos.z + (row + 1) * spacing
    );

    // Clamp to map bounds
    const worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    buildPos.x = Math.max(15, Math.min(worldSize - 15, buildPos.x));
    buildPos.z = Math.max(15, Math.min(worldSize - 15, buildPos.z));

    // Check if terrain is walkable before building
    if (this.game.terrain && !this.game.terrain.isWalkable(buildPos.x, buildPos.z)) {
      // Try nearby positions
      const offsets = [
        { x: spacing, z: 0 }, { x: -spacing, z: 0 },
        { x: 0, z: spacing }, { x: 0, z: -spacing }
      ];
      let found = false;
      for (const off of offsets) {
        const altPos = new THREE.Vector3(buildPos.x + off.x, 0, buildPos.z + off.z);
        altPos.x = Math.max(15, Math.min(worldSize - 15, altPos.x));
        altPos.z = Math.max(15, Math.min(worldSize - 15, altPos.z));
        if (this.game.terrain.isWalkable(altPos.x, altPos.z)) {
          buildPos.copy(altPos);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    const result = this.game.productionSystem.requestBuilding(type, this.team, buildPos);
    if (result) {
      this.nextBuildSlot++;
      return true;
    }
    return false;
  }

  produceUnits() {
    const buildings = this.game.getBuildings(this.team);
    const myUnits = this.game.getUnits(this.team);

    // Don't produce if at unit cap
    if (myUnits.length >= GAME_CONFIG.maxUnitsPerTeam) return;

    for (const building of buildings) {
      if (building.produces.length === 0) continue;
      if (building.currentProduction || building.productionQueue.length > 1) continue;

      let unitType = null;

      if (building.type === 'headquarters' || building.type === 'barracks') {
        unitType = 'infantry';
      } else if (building.type === 'warfactory') {
        unitType = 'tank';
      } else if (building.type === 'airfield') {
        // Mix of drones and planes
        const drones = myUnits.filter(u => u.type === 'drone').length;
        unitType = drones < 3 ? 'drone' : 'plane';
      } else if (building.type === 'shipyard') {
        // Cycle through naval units
        const battleships = myUnits.filter(u => u.type === 'battleship').length;
        const subs = myUnits.filter(u => u.type === 'submarine').length;
        if (battleships < 2) unitType = 'battleship';
        else if (subs < 2) unitType = 'submarine';
        else unitType = 'battleship';
      }

      if (unitType && building.canProduce(unitType)) {
        this.game.productionSystem.requestProduction(building, unitType);
      }
    }
  }

  considerAttack() {
    const myUnits = this.game.getUnits(this.team);
    const idleUnits = myUnits.filter(u => !u.attackTarget && !u.moveTarget);

    let attackThreshold;
    switch (this.strategy) {
      case 'rush': attackThreshold = 5; break;
      case 'turtle': attackThreshold = 12; break;
      default: attackThreshold = 8; break;
    }

    this.lastAttackTime += this.tacticalInterval;

    if (idleUnits.length >= attackThreshold || this.lastAttackTime > this.attackCooldown) {
      if (idleUnits.length >= 3) {
        this.launchAttack(idleUnits);
      }
    }
  }

  launchAttack(units) {
    if (units.length === 0) return;
    this.lastAttackTime = 0;

    // Find priority target
    const enemyHQ = this.game.getHQ(this.enemyTeam);
    let targetPos;

    if (enemyHQ) {
      targetPos = enemyHQ.getPosition().clone();
    } else {
      const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
      if (enemies.length > 0) {
        targetPos = enemies[0].getPosition().clone();
      } else {
        return;
      }
    }

    // Send units with spread
    for (const unit of units) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        0,
        (Math.random() - 0.5) * 20
      );
      const attackPos = targetPos.clone().add(offset);

      // Use pathfinding
      if (unit.domain === 'land' && this.game.pathfinding) {
        const path = this.game.pathfinding.findPathForDomain(
          unit.getPosition(), attackPos, unit.domain
        );
        if (path && path.length > 1) {
          unit.followPath(path);
        } else {
          unit.moveTo(attackPos);
        }
      } else {
        unit.moveTo(attackPos);
      }
      unit._attackMove = true;
    }
  }

  // =============================================
  // MICRO LAYER
  // =============================================
  executeMicro() {
    const myUnits = this.game.getUnits(this.team);

    for (const unit of myUnits) {
      // Retreat critically damaged units
      if (unit.health / unit.maxHealth < 0.2) {
        this.retreatUnit(unit);
        continue;
      }

      // If unit's attack target is dead, find new one
      if (unit.attackTarget && !unit.attackTarget.alive) {
        unit.attackTarget = null;
      }

      // If unit is idle, look for nearby enemies
      if (!unit.attackTarget && !unit.moveTarget) {
        const nearbyEnemy = this.findNearestEnemy(unit, unit.range * 5);
        if (nearbyEnemy) {
          unit.attackEntity(nearbyEnemy);
        }
      }
    }
  }

  retreatUnit(unit) {
    const hq = this.game.getHQ(this.team);
    if (hq) {
      const retreatPos = hq.getPosition().clone();
      retreatPos.x += (Math.random() - 0.5) * 15;
      retreatPos.z += (Math.random() - 0.5) * 15;
      unit.moveTo(retreatPos);
    }
  }

  findNearestEnemy(unit, maxRange) {
    const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
    let nearest = null;
    let nearestDist = maxRange;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = unit.distanceTo(enemy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }
}
