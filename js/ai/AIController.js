import * as THREE from 'three';
import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG, AI_DIFFICULTY, DAMAGE_MODIFIERS, RESEARCH_UPGRADES, BUILDING_UPGRADES } from '../core/Constants.js';

// Multiple build order strategies
const BUILD_ORDERS = {
  rush: ['barracks', 'barracks', 'resourcedepot', 'warfactory'],
  boom: ['resourcedepot', 'barracks', 'resourcedepot', 'warfactory', 'resourcedepot', 'airfield'],
  turtle: ['barracks', 'turret', 'resourcedepot', 'warfactory', 'turret', 'aaturret', 'airfield'],
  air: ['barracks', 'resourcedepot', 'warfactory', 'airfield', 'airfield', 'resourcedepot'],
  balanced: ['barracks', 'resourcedepot', 'warfactory', 'airfield', 'resourcedepot', 'shipyard']
};

const NATION_PERSONALITIES = {
  japan: {
    preferredStrategy: 'air',
    unitBias: { drone: 2.0, plane: 1.5, infantry: 0.8 },
    aggressionMultiplier: 1.3,
    earlyHarass: true,
    gracePeriodReduction: 20
  },
  germany: {
    preferredStrategy: 'rush',
    unitBias: { tank: 2.0, infantry: 1.0 },
    aggressionMultiplier: 1.2,
    earlyHarass: false,
    gracePeriodReduction: 10
  },
  austria: {
    preferredStrategy: 'boom',
    unitBias: { infantry: 2.0, tank: 0.8 },
    aggressionMultiplier: 1.0,
    earlyHarass: false,
    gracePeriodReduction: 0
  }
};

export class AIController {
  constructor(game, team = 'enemy', difficulty = 'normal') {
    this.game = game;
    this.team = team;
    this.enemyTeam = team === 'enemy' ? 'player' : 'enemy';

    // Difficulty settings
    this.difficulty = difficulty;
    this.config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;

    // Strategy state
    this.strategy = 'balanced';
    this.chosenBuildOrder = null;

    // Layer timers
    this.strategicTimer = 0;
    this.strategicInterval = this.config.strategicInterval;

    this.tacticalTimer = 0;
    this.tacticalInterval = this.config.tacticalInterval;

    this.microTimer = 0;
    this.microInterval = this.config.microInterval;

    // Scouting
    this.scoutTimer = 0;
    this.scoutInterval = 20;
    this.scoutSent = false;
    this.lastKnownEnemyComposition = {};

    // Build tracking
    this.buildOrderIndex = 0;
    this.lastAttackTime = 0;
    this.attackCooldown = 30;
    this.nextBuildSlot = 1;
    this.attackWaveCount = 0;
    this.gameTime = 0;

    // Grace period: AI won't attack during this time (seconds)
    this.gracePeriod = difficulty === 'easy' ? 120 : difficulty === 'hard' ? 45 : 75;

    // Choose initial strategy
    this.chooseStrategy();

    // Apply nation personality
    const nationKey = this.game.teams[this.team]?.nation;
    this.personality = NATION_PERSONALITIES[nationKey] || null;
    if (this.personality) {
      // Override strategy with nation preference
      if (this.personality.preferredStrategy && !this.config.buildOrderVariety) {
        this.strategy = this.personality.preferredStrategy;
        this.chosenBuildOrder = [...BUILD_ORDERS[this.strategy]];
      }
      // Re-filter shipyard after personality override
      if (!this.hasSignificantWater()) {
        this.chosenBuildOrder = this.chosenBuildOrder.filter(b => b !== 'shipyard');
      }
      // Reduce grace period for aggressive nations
      this.gracePeriod = Math.max(30, this.gracePeriod - (this.personality.gracePeriodReduction || 0));
    }
  }

  chooseStrategy() {
    if (!this.config.buildOrderVariety) {
      // Easy AI always uses balanced
      this.strategy = 'balanced';
      this.chosenBuildOrder = [...BUILD_ORDERS.balanced];
      if (!this.hasSignificantWater()) {
        this.chosenBuildOrder = this.chosenBuildOrder.filter(b => b !== 'shipyard');
      }
      return;
    }

    // Randomly pick a strategy weighted by situation
    const strategies = ['rush', 'boom', 'turtle', 'air', 'balanced'];
    const weights = [0.2, 0.2, 0.15, 0.2, 0.25];

    let r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < strategies.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) {
        this.strategy = strategies[i];
        break;
      }
    }

    this.chosenBuildOrder = [...BUILD_ORDERS[this.strategy]];
    this.buildOrderIndex = 0;

    // Remove shipyard from build order if no significant water on the map
    if (!this.hasSignificantWater()) {
      this.chosenBuildOrder = this.chosenBuildOrder.filter(b => b !== 'shipyard');
    }
  }

  hasSignificantWater() {
    if (!this.game.terrain) return false;
    const mapSize = GAME_CONFIG.mapSize;
    let waterCells = 0;
    const totalSamples = 100;
    for (let i = 0; i < totalSamples; i++) {
      const x = Math.random() * mapSize * GAME_CONFIG.worldScale;
      const z = Math.random() * mapSize * GAME_CONFIG.worldScale;
      if (this.game.terrain.isWater(x, z)) waterCells++;
    }
    return waterCells > totalSamples * 0.15; // >15% water
  }

  update(delta) {
    if (this.game.state !== 'PLAYING') return;
    this.gameTime += delta;

    // Strategic layer
    this.strategicTimer += delta;
    if (this.strategicTimer >= this.strategicInterval) {
      this.strategicTimer = 0;
      this.updateStrategy();
    }

    // Tactical layer
    this.tacticalTimer += delta;
    if (this.tacticalTimer >= this.tacticalInterval) {
      this.tacticalTimer = 0;
      this.executeTactics();
    }

    // Micro layer
    this.microTimer += delta;
    if (this.microTimer >= this.microInterval) {
      this.microTimer = 0;
      this.executeMicro();
    }

    // Scouting layer
    if (this.config.scouting) {
      this.scoutTimer += delta;
      if (this.scoutTimer >= this.scoutInterval) {
        this.scoutTimer = 0;
        this.executeScouting();
      }
    }

    // Scout reset timer (game-time based, not wall-clock)
    if (this.scoutSent && this._scoutResetTimer > 0) {
      this._scoutResetTimer -= delta;
      if (this._scoutResetTimer <= 0) {
        this.scoutSent = false;
      }
    }
  }

  // =============================================
  // STRATEGIC LAYER
  // =============================================
  updateStrategy() {
    const myUnits = this.game.getUnits(this.team);
    const enemyUnits = this.game.getUnits(this.enemyTeam);
    const mySP = this.game.teams[this.team].sp;

    // Count enemy composition (for counter-play)
    this.lastKnownEnemyComposition = {};
    for (const unit of enemyUnits) {
      this.lastKnownEnemyComposition[unit.type] = (this.lastKnownEnemyComposition[unit.type] || 0) + 1;
    }

    // Adapt strategy based on game state
    if (this.config.countersPlayer) {
      this.adaptToEnemyComposition();
    }

    // Adjust attack cooldown based on strategy and unit count
    if (enemyUnits.length > myUnits.length * 1.5) {
      // Outgunned - build up more
      this.attackCooldown = 45;
    } else if (mySP > 1000 && myUnits.length >= 8) {
      this.attackCooldown = 20;
    } else {
      this.attackCooldown = 30;
    }
  }

  adaptToEnemyComposition() {
    const comp = this.lastKnownEnemyComposition;
    const airCount = (comp.drone || 0) + (comp.plane || 0);
    const tankCount = comp.tank || 0;
    const infantryCount = comp.infantry || 0;
    const totalEnemy = airCount + tankCount + infantryCount;

    if (totalEnemy === 0) return;

    // If enemy is heavy air, prioritize AA and anti-air units
    if (airCount / totalEnemy > 0.4) {
      this.tryBuildDefense('aaturret');
    }

    // If enemy is heavy tanks, ensure we have war factory and planes
    if (tankCount / totalEnemy > 0.5) {
      // Planes counter tanks well
      if (!this.chosenBuildOrder.includes('airfield')) {
        this.chosenBuildOrder.push('airfield');
      }
    }
  }

  tryBuildDefense(type) {
    const existing = this.game.getBuildings(this.team).filter(b => b.type === type);
    if (existing.length < 2) {
      this.tryBuildBuilding(type);
    }
  }

  // =============================================
  // TACTICAL LAYER
  // =============================================
  executeTactics() {
    this.ensureBarracks();
    this.buildNextStructure();
    this.buildDefenses();
    this.produceUnits();
    this.considerSuperweapon();
    this.considerBuildNearNode();

    // Early harassment for aggressive nations
    if (this.personality && this.personality.earlyHarass && this.gameTime > 60 && this.gameTime < this.gracePeriod) {
      const harassUnits = this.game.getUnits(this.team).filter(u =>
        u.type === 'drone' && !u.attackTarget && !u.moveTarget
      );
      if (harassUnits.length >= 2) {
        const enemyBuildings = this.game.getBuildings(this.enemyTeam);
        if (enemyBuildings.length > 0) {
          const target = enemyBuildings.find(b => b.type === 'resourcedepot') || enemyBuildings[0];
          if (target) {
            this.sendUnitsToTarget(harassUnits.slice(0, 2), target.getPosition().clone());
          }
        }
      }
    }

    this.considerAttack();

    // Opportunistic raids on normal/hard difficulty
    if (this.config.targetPriority && this.gameTime > this.gracePeriod + 30) {
      this.detectOpportunisticRaid();
    }

    // AI research upgrades
    this.considerResearch();

    // AI building upgrades
    this.considerBuildingUpgrades();
  }

  considerResearch() {
    if (!this.game.research) return;
    const state = this.game.research[this.team];
    if (!state || state.inProgress) return;
    const sp = this.game.teams[this.team].sp;
    if (sp < 250) return; // need resources for units first

    // Prioritize research based on strategy
    const priorities = ['improved_armor', 'heavy_shells', 'rapid_fire', 'field_medics',
                        'advanced_optics', 'jet_engines', 'naval_plating', 'supply_lines',
                        'fortified_bunkers', 'blitz_training'];
    for (const id of priorities) {
      if (state.completed.includes(id)) continue;
      const upgrade = RESEARCH_UPGRADES[id];
      if (!upgrade || upgrade.cost > sp) continue;
      const hasBuilding = this.game.getBuildings(this.team).some(b => b.type === upgrade.building);
      if (!hasBuilding) continue;
      this.game.startResearch(this.team, id);
      break;
    }
  }

  considerBuildingUpgrades() {
    const sp = this.game.teams[this.team].sp;
    if (sp < 300) return; // save resources for units
    const buildings = this.game.getBuildings(this.team);
    for (const b of buildings) {
      if (!b.canUpgrade || !b.canUpgrade()) continue;
      const cost = b.getUpgradeCost();
      if (cost > 0 && sp >= cost && this.game.resourceSystem.canAfford(this.team, cost)) {
        this.game.resourceSystem.spend(this.team, cost);
        b.upgrade();
        break; // one upgrade per tactical tick
      }
    }
  }

  ensureBarracks() {
    const barracks = this.game.getBuildings(this.team).filter(b => b.type === 'barracks');
    if (barracks.length === 0) {
      this.tryBuildBuilding('barracks');
    }
  }

  buildDefenses() {
    // Only turtle strategy or hard AI builds defenses proactively
    if (this.strategy !== 'turtle' && this.difficulty !== 'hard') return;

    const myBuildings = this.game.getBuildings(this.team);
    const turretCount = myBuildings.filter(b => b.type === 'turret').length;
    const aaTurretCount = myBuildings.filter(b => b.type === 'aaturret').length;

    const mySP = this.game.teams[this.team].sp;

    // Build turrets if we have barracks and enough SP
    if (turretCount < 3 && mySP > 400) {
      const hasBarracks = myBuildings.some(b => b.type === 'barracks' && b.alive);
      if (hasBarracks) {
        this.tryBuildDefenseNearBase('turret');
      }
    }

    // Build AA turrets if war factory exists
    if (aaTurretCount < 2 && mySP > 500) {
      const hasWarfactory = myBuildings.some(b => b.type === 'warfactory' && b.alive);
      if (hasWarfactory) {
        this.tryBuildDefenseNearBase('aaturret');
      }
    }
  }

  tryBuildDefenseNearBase(type) {
    const hq = this.game.getHQ(this.team);
    if (!hq) return;

    const hqPos = hq.getPosition();
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 15;

    const buildPos = new THREE.Vector3(
      hqPos.x + Math.cos(angle) * radius,
      0,
      hqPos.z + Math.sin(angle) * radius
    );

    const worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    buildPos.x = Math.max(15, Math.min(worldSize - 15, buildPos.x));
    buildPos.z = Math.max(15, Math.min(worldSize - 15, buildPos.z));

    if (this.game.terrain && !this.game.terrain.isWalkable(buildPos.x, buildPos.z)) return;

    this.game.productionSystem.requestBuilding(type, this.team, buildPos);
  }

  buildNextStructure() {
    if (!this.chosenBuildOrder || this.buildOrderIndex >= this.chosenBuildOrder.length) {
      // Build order complete - add more resource depots
      const depots = this.game.getBuildings(this.team).filter(b => b.type === 'resourcedepot');
      if (depots.length < 4 && this.game.teams[this.team].sp > 400) {
        this.tryBuildBuilding('resourcedepot');
      }
      return;
    }

    const nextType = this.chosenBuildOrder[this.buildOrderIndex];
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
          return;
        }
      }
    }

    // For non-depot buildings, skip if already exists (except turrets/AA)
    if (nextType !== 'resourcedepot' && nextType !== 'turret' && nextType !== 'aaturret' && nextType !== 'wall') {
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

    const slot = this.nextBuildSlot;
    const row = Math.floor(slot / 3);
    const col = slot % 3;
    const spacing = 18;

    const buildPos = new THREE.Vector3(
      hqPos.x + (col - 1) * spacing,
      0,
      hqPos.z + (row + 1) * spacing
    );

    const worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    buildPos.x = Math.max(15, Math.min(worldSize - 15, buildPos.x));
    buildPos.z = Math.max(15, Math.min(worldSize - 15, buildPos.z));

    if (this.game.terrain && !this.game.terrain.isWalkable(buildPos.x, buildPos.z)) {
      const offsets = [
        { x: spacing, z: 0 }, { x: -spacing, z: 0 },
        { x: 0, z: spacing }, { x: 0, z: -spacing },
        { x: spacing, z: spacing }, { x: -spacing, z: -spacing }
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
        unitType = this.chooseAirUnit(myUnits);
      } else if (building.type === 'shipyard') {
        // Only build naval units if there's water on the map
        if (this.hasSignificantWater()) {
          unitType = this.chooseNavalUnit(myUnits);
        }
      }

      // Apply nation personality unit bias
      if (this.personality && this.personality.unitBias && unitType) {
        const bias = this.personality.unitBias;
        // If the building can produce a biased unit, consider switching
        for (const [biasType, weight] of Object.entries(bias)) {
          if (weight > 1.0 && building.produces.includes(biasType) && Math.random() < (weight - 1.0)) {
            unitType = biasType;
            break;
          }
        }
      }

      // Counter-play: if we know enemy has lots of air, prioritize AA-friendly units
      if (this.config.countersPlayer && unitType) {
        unitType = this.adjustForCounter(unitType, building, myUnits);
      }

      if (unitType && building.canProduce(unitType)) {
        this.game.productionSystem.requestProduction(building, unitType);
      }
    }
  }

  chooseAirUnit(myUnits) {
    const drones = myUnits.filter(u => u.type === 'drone').length;
    const planes = myUnits.filter(u => u.type === 'plane').length;

    // Strategy-based air choices
    if (this.strategy === 'air') {
      return planes < drones ? 'plane' : 'drone';
    }
    return drones < 3 ? 'drone' : 'plane';
  }

  chooseNavalUnit(myUnits) {
    const battleships = myUnits.filter(u => u.type === 'battleship').length;
    const subs = myUnits.filter(u => u.type === 'submarine').length;
    const carriers = myUnits.filter(u => u.type === 'carrier').length;
    if (battleships < 2) return 'battleship';
    if (subs < 2) return 'submarine';
    if (carriers < 1) return 'carrier';
    // Rotate through fleet composition
    const total = battleships + subs + carriers;
    if (battleships <= subs) return 'battleship';
    if (subs <= carriers) return 'submarine';
    return 'carrier';
  }

  adjustForCounter(unitType, building, myUnits) {
    const comp = this.lastKnownEnemyComposition;
    const airCount = (comp.drone || 0) + (comp.plane || 0);
    const tankCount = comp.tank || 0;

    if (airCount > 3 && building.type === 'airfield') {
      // Build more planes to counter air
      return 'plane';
    }
    if (tankCount > 4 && building.type === 'warfactory') {
      return 'tank';
    }
    return unitType;
  }

  considerAttack() {
    // Grace period: don't attack until enough time has passed
    if (this.gameTime < this.gracePeriod) return;

    const myUnits = this.game.getUnits(this.team);
    const idleUnits = myUnits.filter(u => !u.attackTarget && !u.moveTarget);

    const threshold = this.config.attackThresholdMultiplier;
    let attackThreshold;
    switch (this.strategy) {
      case 'rush': attackThreshold = Math.floor(6 * threshold); break;
      case 'turtle': attackThreshold = Math.floor(14 * threshold); break;
      case 'air': attackThreshold = Math.floor(8 * threshold); break;
      default: attackThreshold = Math.floor(10 * threshold); break;
    }

    // Apply personality aggression
    if (this.personality && this.personality.aggressionMultiplier) {
      attackThreshold = Math.floor(attackThreshold / this.personality.aggressionMultiplier);
    }

    // Minimum units required scales with wave count (first wave needs more)
    const minUnits = this.attackWaveCount === 0 ? 5 : 3;

    this.lastAttackTime += this.tacticalInterval;

    if (idleUnits.length >= attackThreshold || this.lastAttackTime > this.attackCooldown) {
      if (idleUnits.length >= minUnits) {
        if (this.config.multiPronged && idleUnits.length >= 8) {
          this.launchMultiProngedAttack(idleUnits);
        } else {
          this.launchAttack(idleUnits);
        }
      }
    }
  }

  // =============================================
  // ATTACK LOGIC
  // =============================================

  findPriorityTarget() {
    if (!this.config.targetPriority) {
      // Simple: just target HQ
      const enemyHQ = this.game.getHQ(this.enemyTeam);
      return enemyHQ ? enemyHQ.getPosition().clone() : null;
    }

    // Smart targeting: production buildings > resource depots > HQ > anything
    const enemyBuildings = this.game.getBuildings(this.enemyTeam);
    const priorities = ['warfactory', 'airfield', 'barracks', 'resourcedepot', 'headquarters'];

    for (const pType of priorities) {
      const target = enemyBuildings.find(b => b.type === pType && b.alive);
      if (target) {
        return target.getPosition().clone();
      }
    }

    // Fall back to any enemy entity
    const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
    if (enemies.length > 0) {
      return enemies[0].getPosition().clone();
    }

    return null;
  }

  findSecondaryTarget() {
    const enemyBuildings = this.game.getBuildings(this.enemyTeam);
    // Find a target different from the primary
    const depots = enemyBuildings.filter(b => b.type === 'resourcedepot' && b.alive);
    if (depots.length > 0) {
      return depots[0].getPosition().clone();
    }

    const prodBuildings = enemyBuildings.filter(b =>
      (b.type === 'barracks' || b.type === 'warfactory' || b.type === 'airfield') && b.alive
    );
    if (prodBuildings.length > 0) {
      return prodBuildings[prodBuildings.length - 1].getPosition().clone();
    }

    // Fall back to HQ
    const hq = this.game.getHQ(this.enemyTeam);
    return hq ? hq.getPosition().clone() : null;
  }

  launchAttack(units) {
    if (units.length === 0) return;
    this.lastAttackTime = 0;
    this.attackWaveCount++;

    const targetPos = this.findPriorityTarget();
    if (!targetPos) return;

    this.sendUnitsToTarget(units, targetPos);
  }

  launchMultiProngedAttack(units) {
    if (units.length === 0) return;
    this.lastAttackTime = 0;
    this.attackWaveCount++;

    const primaryTarget = this.findPriorityTarget();
    const secondaryTarget = this.findSecondaryTarget();

    if (!primaryTarget) return;

    // Split units into two groups
    const midpoint = Math.floor(units.length * 0.6);
    const mainForce = units.slice(0, midpoint);
    const flankForce = units.slice(midpoint);

    // Main force attacks primary target
    this.sendUnitsToTarget(mainForce, primaryTarget);

    // Flanking force attacks secondary target (or approaches from different angle)
    if (secondaryTarget && flankForce.length >= 2) {
      this.sendUnitsToTarget(flankForce, secondaryTarget);
    } else if (flankForce.length >= 2) {
      // Attack primary from a different angle
      const flankOffset = new THREE.Vector3(
        (Math.random() > 0.5 ? 1 : -1) * 30,
        0,
        (Math.random() > 0.5 ? 1 : -1) * 30
      );
      const flankTarget = primaryTarget.clone().add(flankOffset);
      this.sendUnitsToTarget(flankForce, flankTarget);
    }
  }

  sendUnitsToTarget(units, targetPos) {
    for (const unit of units) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        0,
        (Math.random() - 0.5) * 20
      );
      const attackPos = targetPos.clone().add(offset);

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
  // SCOUTING
  // =============================================
  executeScouting() {
    if (this.scoutSent) return;

    const myUnits = this.game.getUnits(this.team);
    // Prefer drones for scouting, fall back to infantry
    let scout = myUnits.find(u => u.type === 'drone' && !u.attackTarget && !u.moveTarget);
    if (!scout) {
      scout = myUnits.find(u => u.type === 'infantry' && !u.attackTarget && !u.moveTarget);
    }
    if (!scout) return;

    // Scout toward enemy side of map
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    const scoutTarget = new THREE.Vector3(
      mapSize * 0.7 + Math.random() * mapSize * 0.2,
      0,
      mapSize * (0.2 + Math.random() * 0.6)
    );

    if (scout.domain === 'land' && this.game.pathfinding) {
      const path = this.game.pathfinding.findPathForDomain(
        scout.getPosition(), scoutTarget, scout.domain
      );
      if (path && path.length > 1) {
        scout.followPath(path);
      } else {
        scout.moveTo(scoutTarget);
      }
    } else {
      scout.moveTo(scoutTarget);
    }

    this.scoutSent = true;
    this._scoutResetTimer = 60; // Reset after 60 game seconds
  }

  // =============================================
  // MICRO LAYER
  // =============================================
  executeMicro() {
    // Assess attack force - retreat if losing
    this.assessAttackForce();

    // GD-058: Use nation ability
    this.considerNationAbility();

    const myUnits = this.game.getUnits(this.team);

    for (const unit of myUnits) {
      // Use abilities
      if (unit.ability && unit.canUseAbility()) {
        this.tryUseAbility(unit);
      }

      // Retreat critically damaged units
      if (unit.health / unit.maxHealth < 0.2) {
        this.retreatUnit(unit);
        continue;
      }

      // If unit's attack target is dead, find new one
      if (unit.attackTarget && !unit.attackTarget.alive) {
        unit.attackTarget = null;
      }

      // Focus fire: if attacking, check if a better target exists nearby
      if (this.difficulty === 'hard' && unit.attackTarget) {
        this.checkFocusFire(unit);
      }

      // If unit is idle, look for nearby enemies
      if (!unit.attackTarget && !unit.moveTarget) {
        const nearbyEnemy = this.findNearestEnemy(unit, unit.range * 5);
        if (nearbyEnemy) {
          unit.attackEntity(nearbyEnemy);
        }
      }

      // Passive heal near HQ
      const hq = this.game.getHQ(this.team);
      if (hq && unit.health < unit.maxHealth * 0.95) {
        const distToHQ = unit.distanceTo(hq);
        if (distToHQ < 30) {
          unit.health = Math.min(unit.maxHealth, unit.health + 1);
        }
      }
    }
  }

  tryUseAbility(unit) {
    if (!unit.ability || !unit.canUseAbility()) return;

    const abilityId = unit.ability.id;

    switch (abilityId) {
      case 'siege_mode': {
        // Tanks: enter siege mode when near enemies and not moving, exit when no enemies nearby
        if (unit.attackTarget && unit.isInRange(unit.attackTarget)) {
          if (!unit._siegeMode) {
            this.game.combatSystem.executeAbility(unit);
          }
        } else if (unit._siegeMode && !unit.attackTarget) {
          // Exit siege mode to allow movement
          this.game.combatSystem.executeAbility(unit);
        }
        break;
      }

      case 'grenade': {
        // Infantry: throw grenade at clusters of enemies
        if (!unit.attackTarget) break;
        const targetPos = unit.attackTarget.getPosition();
        const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
        // Check if there are multiple enemies near the target
        let nearbyCount = 0;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (enemy.getPosition().distanceTo(targetPos) < 8) nearbyCount++;
        }
        if (nearbyCount >= 2) {
          this.game.combatSystem.executeAbility(unit, targetPos, null);
        }
        break;
      }

      case 'emp': {
        // Drones: use EMP on high-value targets (tanks, planes)
        if (!unit.attackTarget || !unit.attackTarget.alive) break;
        const target = unit.attackTarget;
        if ((target.type === 'tank' || target.type === 'plane' || target.type === 'battleship') && unit.distanceTo(target) <= unit.ability.range * 3) {
          this.game.combatSystem.executeAbility(unit, null, target);
        }
        break;
      }

      case 'bombing_run': {
        // Planes: bombing run on enemy clusters or buildings
        const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
        let bestPos = null;
        let bestCount = 0;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const pos = enemy.getPosition();
          if (unit.getPosition().distanceTo(pos) > unit.ability.range * 3) continue;
          let count = 0;
          for (const other of enemies) {
            if (other.alive && other.getPosition().distanceTo(pos) < 10) count++;
          }
          if (count > bestCount) {
            bestCount = count;
            bestPos = pos.clone();
          }
        }
        if (bestPos && bestCount >= 2) {
          this.game.combatSystem.executeAbility(unit, bestPos, null);
        }
        break;
      }

      case 'barrage': {
        // Battleships: barrage enemy building clusters
        const enemyBuildings = this.game.getBuildings(this.enemyTeam);
        if (enemyBuildings.length > 0) {
          const target = enemyBuildings[0];
          const targetPos = target.getPosition();
          if (unit.getPosition().distanceTo(targetPos) <= unit.ability.range * 3) {
            this.game.combatSystem.executeAbility(unit, targetPos, null);
          }
        }
        break;
      }

      case 'torpedo_salvo': {
        // Submarines: torpedo high-HP naval targets
        if (!unit.attackTarget || !unit.attackTarget.alive) break;
        const target = unit.attackTarget;
        if (target.domain === 'naval' && unit.distanceTo(target) <= unit.ability.range * 3) {
          this.game.combatSystem.executeAbility(unit, null, target);
        }
        break;
      }

      case 'launch_squadron': {
        // Carriers: launch squadron at largest enemy concentration
        const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
        if (enemies.length >= 2) {
          // Target the center of enemy cluster
          let cx = 0, cz = 0, count = 0;
          for (const e of enemies) {
            if (!e.alive) continue;
            const p = e.getPosition();
            cx += p.x; cz += p.z; count++;
          }
          if (count > 0) {
            const targetPos = new THREE.Vector3(cx / count, 0, cz / count);
            if (unit.getPosition().distanceTo(targetPos) <= unit.ability.range * 3) {
              this.game.combatSystem.executeAbility(unit, targetPos, null);
            }
          }
        }
        break;
      }
    }
  }

  checkFocusFire(unit) {
    // Find enemies nearby that are already low HP - focus them down
    const enemies = this.game.getEntitiesByTeam(this.enemyTeam);
    let weakest = null;
    let weakestHPRatio = 1;
    const range = unit.range * 4;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = unit.distanceTo(enemy);
      if (dist > range) continue;

      const hpRatio = enemy.health / enemy.maxHealth;
      if (hpRatio < weakestHPRatio && hpRatio < 0.5) {
        weakestHPRatio = hpRatio;
        weakest = enemy;
      }
    }

    if (weakest && weakest !== unit.attackTarget) {
      unit.attackEntity(weakest);
    }
  }

  retreatUnit(unit) {
    // Try to retreat to nearest friendly defensive building first
    const friendlyBuildings = this.game.getBuildings(this.team);
    const defenses = friendlyBuildings.filter(b =>
      (b.isTurret || b.type === 'bunker') && b.alive
    );
    let retreatPos = null;
    let bestDist = Infinity;

    for (const def of defenses) {
      const dist = unit.distanceTo(def);
      if (dist < bestDist) {
        bestDist = dist;
        retreatPos = def.getPosition().clone();
      }
    }

    // Fall back to HQ if no nearby defenses
    if (!retreatPos || bestDist > 80) {
      const hq = this.game.getHQ(this.team);
      if (hq) retreatPos = hq.getPosition().clone();
    }

    if (retreatPos) {
      retreatPos.x += (Math.random() - 0.5) * 10;
      retreatPos.z += (Math.random() - 0.5) * 10;
      unit.moveTo(retreatPos);
      unit.attackTarget = null;
    }
  }

  // Assess whether an attacking force is losing and should retreat
  assessAttackForce() {
    const myUnits = this.game.getUnits(this.team);
    const inCombat = myUnits.filter(u => u.attackTarget && u.attackTarget.alive);
    if (inCombat.length < 3) return; // too few to assess

    // Calculate total remaining HP ratio of combat units
    let totalHP = 0, totalMaxHP = 0;
    for (const unit of inCombat) {
      totalHP += unit.health;
      totalMaxHP += unit.maxHealth;
    }
    const hpRatio = totalHP / totalMaxHP;

    // If force has lost >40% HP, retreat all combat units
    if (hpRatio < 0.6) {
      for (const unit of inCombat) {
        this.retreatUnit(unit);
      }
      // Reset attack cooldown to enforce full delay before re-attacking
      this.lastAttackTime = 0;
    }
  }

  // Detect if enemy base is undefended for opportunistic raids
  detectOpportunisticRaid() {
    const enemyUnits = this.game.getUnits(this.enemyTeam);
    const enemyHQ = this.game.getHQ(this.enemyTeam);
    if (!enemyHQ) return;

    const hqPos = enemyHQ.getPosition();
    const nearHQ = enemyUnits.filter(u => {
      const dist = u.getPosition().distanceTo(hqPos);
      return dist < 50;
    });

    // If less than 25% of enemy units are near their base, launch opportunistic raid
    if (enemyUnits.length > 3 && nearHQ.length < enemyUnits.length * 0.25) {
      const myIdleUnits = this.game.getUnits(this.team).filter(
        u => !u.attackTarget && !u.moveTarget
      );
      if (myIdleUnits.length >= 3) {
        this.sendUnitsToTarget(myIdleUnits.slice(0, Math.min(5, myIdleUnits.length)), hqPos.clone());
      }
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

  // GD-058: AI uses nation abilities contextually
  considerNationAbility() {
    if (!this.game.nationAbilitySystem) return;
    const nas = this.game.nationAbilitySystem;
    if (!nas.canUse(this.team)) return;

    const ability = nas.getAbility(this.team);
    if (!ability) return;

    const myUnits = this.game.getUnits(this.team);
    const enemyUnits = this.game.getUnits(this.enemyTeam);
    const inCombat = myUnits.filter(u => u.attackTarget && u.attackTarget.alive);

    // Use abilities in appropriate contexts
    switch (ability.id) {
      case 'lend_lease':
        // Use when low on SP and need units
        if (this.game.teams[this.team].sp < 200) {
          nas.activate(this.team);
        }
        break;
      case 'naval_supremacy':
        // Use when we have naval units in combat
        if (inCombat.some(u => u.domain === 'naval')) {
          nas.activate(this.team);
        }
        break;
      case 'resistance_network':
        // Use periodically for scouting
        if (this.gameTime > 120 && this.attackWaveCount > 0) {
          nas.activate(this.team);
        }
        break;
      case 'banzai_charge':
        // Use when attacking with infantry
        if (inCombat.filter(u => u.type === 'infantry').length >= 3) {
          nas.activate(this.team);
        }
        break;
      case 'blitzkrieg':
        // Use when launching an attack with land units
        if (inCombat.filter(u => u.domain === 'land').length >= 4) {
          nas.activate(this.team);
        }
        break;
      case 'war_economy':
        // Use when we have high SP to spend
        if (this.game.teams[this.team].sp > 500 && myUnits.length < GAME_CONFIG.maxUnitsPerTeam - 5) {
          nas.activate(this.team);
        }
        break;
    }
  }

  // GD-059: AI builds and uses superweapons
  considerSuperweapon() {
    if (this.gameTime < 180) return; // Don't build too early

    const myBuildings = this.game.getBuildings(this.team);
    const hasSuperweapon = myBuildings.some(b => b.type === 'superweapon' && b.alive);
    const hasWarFactory = myBuildings.some(b => b.type === 'warfactory' && b.alive);
    const sp = this.game.teams[this.team].sp;

    // Build superweapon facility in late game
    if (!hasSuperweapon && hasWarFactory && sp > 1000) {
      this.tryBuildBuilding('superweapon');
    }

    // Fire superweapon when charged
    if (hasSuperweapon) {
      const sw = myBuildings.find(b => b.type === 'superweapon' && b.alive && b.isCharged);
      if (sw && sw.fire) {
        // Target enemy HQ or largest unit cluster
        const enemyHQ = this.game.getHQ(this.enemyTeam);
        if (enemyHQ) {
          sw.fire(enemyHQ.getPosition().clone());
        } else {
          const target = this.findPriorityTarget();
          if (target) sw.fire(target);
        }
      }
    }
  }

  // GD-060: AI prioritizes building near resource nodes
  considerBuildNearNode() {
    if (!this.game.resourceNodes || this.game.resourceNodes.length === 0) return;
    if (this.gameTime < 60) return;

    const myBuildings = this.game.getBuildings(this.team);
    const sp = this.game.teams[this.team].sp;
    if (sp < 300) return;

    // Check if we already have a depot near each node
    for (const node of this.game.resourceNodes) {
      const hasNearby = myBuildings.some(b =>
        (b.type === 'resourcedepot' || b.type === 'supplydepot') &&
        b.alive && b.getPosition().distanceTo(node.position) < 15
      );
      if (hasNearby) continue;

      // Only build near nodes on our side or in the middle
      const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
      const hq = this.game.getHQ(this.team);
      if (!hq) continue;

      const distToMyHQ = node.position.distanceTo(hq.getPosition());
      const enemyHQ = this.game.getHQ(this.enemyTeam);
      const distToEnemyHQ = enemyHQ ? node.position.distanceTo(enemyHQ.getPosition()) : Infinity;

      if (distToMyHQ < distToEnemyHQ * 1.3) {
        // Build a supply depot near this node
        const buildPos = node.position.clone();
        buildPos.x += (Math.random() - 0.5) * 6;
        buildPos.z += (Math.random() - 0.5) * 6;
        buildPos.x = Math.max(15, Math.min(mapSize - 15, buildPos.x));
        buildPos.z = Math.max(15, Math.min(mapSize - 15, buildPos.z));
        if (this.game.terrain && this.game.terrain.isWalkable(buildPos.x, buildPos.z)) {
          this.game.productionSystem.requestBuilding('supplydepot', this.team, buildPos);
          break; // Only try one per tick
        }
      }
    }
  }
}
