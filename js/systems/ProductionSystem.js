import * as THREE from 'three';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE, NATIONS, GAME_CONFIG, CONSTRUCTION_CONFIG, BUILDING_LIMITS } from '../core/Constants.js';
import { LockstepManager } from '../networking/LockstepManager.js';

export class ProductionSystem {
  constructor(game) {
    this.game = game;
  }

  update(delta) {
    const buildings = this.game.entities.filter(e => e.isBuilding && e.alive);

    for (const building of buildings) {
      // Handle construction phase (GD-063)
      if (building._constructing) {
        this._updateConstruction(building, delta);
        continue; // Don't produce while constructing
      }

      if (!building.currentProduction) continue;

      // If timer reached zero, complete production
      if (building.productionTimer <= 0) {
        this.completeProduction(building);
      }
    }
  }

  completeProduction(building) {
    const unitType = building.currentProduction;
    if (!unitType) return;

    const stats = UNIT_STATS[unitType];
    if (!stats) return;

    // Spawn the unit near the building (offset slightly toward rally)
    const buildPos = building.getPosition().clone();
    const rallyPos = building.rallyPoint
      ? building.rallyPoint.clone()
      : buildPos.clone().add(new THREE.Vector3(0, 0, 10));

    // Offset spawn position slightly toward rally (3 units out from building center)
    const dir = rallyPos.clone().sub(buildPos);
    if (dir.lengthSq() > 0.01) {
      dir.normalize().multiplyScalar(3);
    } else {
      dir.set(0, 0, 3);
    }
    const spawnPos = buildPos.clone().add(dir);
    spawnPos.y = 0;

    const unit = this.game.createUnit(unitType, building.team, spawnPos);

    // Apply tier bonuses to the spawned unit
    const tierBonus = building.getTierBonus ? building.getTierBonus() : null;
    if (tierBonus && unit) {
      if (tierBonus.damageBonus && unit.damage) {
        unit.damage = Math.round(unit.damage * tierBonus.damageBonus);
      }
      if (tierBonus.hpBonus && unit.maxHealth) {
        unit.maxHealth = Math.round(unit.maxHealth * tierBonus.hpBonus);
        unit.health = unit.maxHealth;
      }
    }

    // Issue move command to rally point (unit walks there after spawning)
    if (unit && building.rallyPoint) {
      // Check if there's an enemy near the rally point - if so, attack-move
      let enemyNearRally = false;
      const enemies = this.game.entities.filter(
        e => e.alive && e.team !== building.team && e.team !== 'neutral'
      );
      for (const enemy of enemies) {
        const dist = enemy.getPosition().distanceTo(rallyPos);
        if (dist < 15) {
          enemyNearRally = true;
          break;
        }
      }

      unit.moveTo(rallyPos);
      if (enemyNearRally) {
        unit._attackMove = true;
      }
    }

    // Clear production from building
    building.currentProduction = null;
    building.productionTimer = 0;

    this.game.eventBus.emit('production:complete', {
      building,
      unitType,
      unit
    });
  }

  requestProduction(building, unitType) {
    if (!building || !building.alive) return false;

    // In multiplayer lockstep, queue the produce command instead of executing directly.
    // Skip if we're already executing a lockstep turn (to avoid re-queuing).
    if (this.game.isMultiplayer && this.game.lockstepManager?.enabled && !this.game._executingLockstepTurn) {
      // Validate locally for instant feedback
      if (!this._canRequestProduction(building, unitType)) return false;
      // Queue through lockstep - actual execution happens on confirmed turn
      this.game.lockstepManager.queueCommand(
        LockstepManager.produceCommand(building.id, unitType)
      );
      return true;
    }

    // Validate building can produce this unit type
    if (!building.canProduce(unitType)) {
      this.game.eventBus.emit('production:error', {
        message: `${building.type} cannot produce ${unitType}`
      });
      return false;
    }

    // Check queue limit (max 5 total: current + queued)
    const totalQueued = (building.currentProduction ? 1 : 0) + building.productionQueue.length;
    if (totalQueued >= 5) {
      this.game.eventBus.emit('production:error', {
        message: 'Production queue full (max 5)'
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check tech tree requirements
    if (!this.hasTechRequirements(building.team, unitType)) {
      const techReq = TECH_TREE[unitType];
      if (techReq && techReq.requires.length > 0) {
        this.game.eventBus.emit('production:error', {
          message: `Requires: ${techReq.requires.join(', ')}`
        });
      }
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check population cap
    const currentUnits = this.game.getUnits(building.team).length;
    if (currentUnits >= GAME_CONFIG.maxUnitsPerTeam) {
      this.game.eventBus.emit('production:error', {
        message: `Population cap reached!`,
        reason: 'popcap'
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check cost (with nation cost reduction)
    const stats = UNIT_STATS[unitType];
    if (!stats) return false;

    let cost = stats.cost;
    const nationKey = this.game.teams[building.team]?.nation;
    if (nationKey) {
      const nationData = NATIONS[nationKey];
      if (nationData && nationData.bonuses && nationData.bonuses.costReduction) {
        cost = Math.round(cost * nationData.bonuses.costReduction);
      }
    }
    // War Economy nation ability cost reduction
    if (this.game.nationAbilitySystem) {
      cost = Math.round(cost * this.game.nationAbilitySystem.getCostMultiplier(building.team));
    }

    if (!this.game.resourceSystem.canAfford(building.team, cost)) {
      this.game.eventBus.emit('production:error', {
        message: `Not enough SP (need ${cost})`,
        reason: 'cost'
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check MU cost for advanced units (plane, battleship, carrier, submarine, commander, etc.)
    const muCost = unitType === 'commander' ? 200 : (stats.muCost || 0);
    if (muCost > 0) {
      if (!this.game.resourceSystem.canAffordMU(building.team, muCost)) {
        this.game.eventBus.emit('production:error', {
          message: `Not enough MU (need ${muCost})`,
          reason: 'cost'
        });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    // GD-111: Commander limit check
    if (unitType === 'commander') {
      const hasCommander = this.game.entities.some(e => e.isUnit && e.type === 'commander' && e.team === building.team && e.alive);
      if (hasCommander) {
        this.game.eventBus.emit('production:error', { message: 'Commander already exists!' });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    // Deduct MU cost if applicable
    if (muCost > 0) {
      this.game.resourceSystem.spendMU(building.team, muCost);
    }

    // Spend resources immediately
    this.game.resourceSystem.spend(building.team, cost);

    // Queue the unit in the building
    building.queueUnit(unitType);

    this.game.eventBus.emit('production:started', {
      building,
      unitType,
      cost
    });

    return true;
  }

  /**
   * Validation-only check for unit production (used by multiplayer lockstep).
   * Returns true if the unit CAN be produced; does not spend resources or queue it.
   */
  _canRequestProduction(building, unitType) {
    if (!building || !building.alive) return false;
    if (!building.canProduce(unitType)) {
      this.game.eventBus.emit('production:error', { message: `${building.type} cannot produce ${unitType}` });
      return false;
    }
    const totalQueued = (building.currentProduction ? 1 : 0) + building.productionQueue.length;
    if (totalQueued >= 5) {
      this.game.eventBus.emit('production:error', { message: 'Production queue full (max 5)' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }
    if (!this.hasTechRequirements(building.team, unitType)) {
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }
    const currentUnits = this.game.getUnits(building.team).length;
    if (currentUnits >= GAME_CONFIG.maxUnitsPerTeam) {
      this.game.eventBus.emit('production:error', { message: 'Population cap reached!', reason: 'popcap' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }
    const stats = UNIT_STATS[unitType];
    if (!stats) return false;
    let cost = stats.cost;
    const nationKey = this.game.teams[building.team]?.nation;
    if (nationKey) {
      const nationData = NATIONS[nationKey];
      if (nationData?.bonuses?.costReduction) cost = Math.round(cost * nationData.bonuses.costReduction);
    }
    if (this.game.nationAbilitySystem) {
      cost = Math.round(cost * this.game.nationAbilitySystem.getCostMultiplier(building.team));
    }
    if (!this.game.resourceSystem.canAfford(building.team, cost)) {
      this.game.eventBus.emit('production:error', { message: `Not enough SP (need ${cost})`, reason: 'cost' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }
    const muCost = unitType === 'commander' ? 200 : (stats.muCost || 0);
    if (muCost > 0 && !this.game.resourceSystem.canAffordMU(building.team, muCost)) {
      this.game.eventBus.emit('production:error', { message: `Not enough MU (need ${muCost})`, reason: 'cost' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }
    if (unitType === 'commander') {
      const hasCommander = this.game.entities.some(e => e.isUnit && e.type === 'commander' && e.team === building.team && e.alive);
      if (hasCommander) {
        this.game.eventBus.emit('production:error', { message: 'Commander already exists!' });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }
    return true;
  }

  requestBuilding(type, team, position) {
    const stats = BUILDING_STATS[type];
    if (!stats) return false;

    // Spec 003: Austria Imperial Engineering - buildings cost 10% less
    let cost = stats.cost;
    const nationKey = this.game.teams[team]?.nation;
    if (nationKey) {
      const nationData = NATIONS[nationKey];
      if (nationData && nationData.bonuses && nationData.bonuses.buildingCostReduction) {
        cost = Math.round(cost * nationData.bonuses.buildingCostReduction);
      }
    }

    // Check if team can afford
    if (!this.game.resourceSystem.canAfford(team, cost)) {
      this.game.eventBus.emit('production:error', {
        message: `Not enough SP (need ${cost})`,
        reason: 'cost'
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check tech tree: does the team have required buildings?
    if (stats.requires && stats.requires.length > 0) {
      const teamBuildings = this.game.getBuildings(team);
      for (const req of stats.requires) {
        const hasReq = teamBuildings.some(b => b.type === req && b.alive);
        if (!hasReq) {
          const reqName = req.charAt(0).toUpperCase() + req.slice(1);
          this.game.eventBus.emit('production:error', {
            message: `Requires ${reqName} first`
          });
          if (this.game.soundManager) this.game.soundManager.play('error');
          return false;
        }
      }
    }

    // GD-079: Check building limits
    const limit = BUILDING_LIMITS[type];
    if (limit !== undefined) {
      const existingCount = this.game.getBuildings(team).filter(b => b.type === type).length;
      if (existingCount >= limit) {
        this.game.eventBus.emit('production:error', {
          message: `Building limit reached (${existingCount}/${limit})`
        });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    // Check terrain walkability at build location
    if (this.game.terrain && !this.game.terrain.isWalkable(position.x, position.z)) {
      this.game.eventBus.emit('production:error', {
        message: 'Cannot build here - terrain not suitable'
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    // Check for overlapping buildings
    const allBuildings = this.game.entities.filter(e => e.isBuilding && e.alive);
    const buildSize = (stats.size || 2) * 5;
    for (const existing of allBuildings) {
      const dist = existing.getPosition().distanceTo(position);
      const existingSize = (BUILDING_STATS[existing.type]?.size || 2) * 5;
      if (dist < (buildSize + existingSize) / 2) {
        this.game.eventBus.emit('production:error', {
          message: 'Too close to another building'
        });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    // Spend resources
    this.game.resourceSystem.spend(team, cost);

    // Create the building
    const building = this.game.createBuilding(type, team, position);

    // GD-063: Building construction phase
    if (building && !CONSTRUCTION_CONFIG.preBuiltTypes.includes(type)) {
      this._startConstruction(building);
    }

    if (this.game.soundManager) {
      this.game.soundManager.play('build');
    }

    this.game.eventBus.emit('building:placed', {
      building,
      type,
      cost
    });

    return building;
  }

  /**
   * Validation-only check for building placement (used by multiplayer lockstep).
   * Returns true if the building CAN be placed; does not spend resources or create it.
   */
  canRequestBuilding(type, team, position) {
    const stats = BUILDING_STATS[type];
    if (!stats) return false;

    let cost = stats.cost;
    const nationKey = this.game.teams[team]?.nation;
    if (nationKey) {
      const nationData = NATIONS[nationKey];
      if (nationData?.bonuses?.buildingCostReduction) {
        cost = Math.round(cost * nationData.bonuses.buildingCostReduction);
      }
    }

    if (!this.game.resourceSystem.canAfford(team, cost)) {
      this.game.eventBus.emit('production:error', { message: `Not enough SP (need ${cost})`, reason: 'cost' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    if (stats.requires && stats.requires.length > 0) {
      const teamBuildings = this.game.getBuildings(team);
      for (const req of stats.requires) {
        if (!teamBuildings.some(b => b.type === req && b.alive)) {
          this.game.eventBus.emit('production:error', { message: `Requires ${req.charAt(0).toUpperCase() + req.slice(1)} first` });
          if (this.game.soundManager) this.game.soundManager.play('error');
          return false;
        }
      }
    }

    const limit = BUILDING_LIMITS[type];
    if (limit !== undefined) {
      if (this.game.getBuildings(team).filter(b => b.type === type).length >= limit) {
        this.game.eventBus.emit('production:error', { message: 'Building limit reached' });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    if (this.game.terrain && !this.game.terrain.isWalkable(position.x, position.z)) {
      this.game.eventBus.emit('production:error', { message: 'Cannot build here' });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
    }

    const allBuildings = this.game.entities.filter(e => e.isBuilding && e.alive);
    const buildSize = (stats.size || 2) * 5;
    for (const existing of allBuildings) {
      const dist = existing.getPosition().distanceTo(position);
      const existingSize = (BUILDING_STATS[existing.type]?.size || 2) * 5;
      if (dist < (buildSize + existingSize) / 2) {
        this.game.eventBus.emit('production:error', { message: 'Too close to another building' });
        if (this.game.soundManager) this.game.soundManager.play('error');
        return false;
      }
    }

    return true;
  }

  // Check if a team has the required buildings for a unit type
  hasTechRequirements(team, unitType) {
    const techReq = TECH_TREE[unitType];
    if (!techReq || !techReq.requires || techReq.requires.length === 0) return true;

    const teamBuildings = this.game.getBuildings(team);
    for (const req of techReq.requires) {
      const hasReq = teamBuildings.some(b => b.type === req && b.alive);
      if (!hasReq) return false;
    }
    return true;
  }

  /**
   * Cancel a production queue item and refund the cost.
   * @param {Building} building
   * @param {number} index - 0 = current production, 1+ = queue index
   * @returns {boolean} true if cancelled successfully
   */
  cancelProduction(building, index) {
    if (!building || !building.alive) return false;

    // In multiplayer, queue cancel through lockstep (skip if executing a lockstep turn)
    if (this.game.isMultiplayer && this.game.lockstepManager?.enabled && !this.game._executingLockstepTurn) {
      this.game.lockstepManager.queueCommand({
        type: 'CANCEL_PRODUCE',
        entityIds: [building.id],
      });
      return true;
    }

    const cancelled = building.cancelQueueItem(index);
    if (!cancelled) return false;

    // Refund full cost (SP + MU)
    const stats = UNIT_STATS[cancelled];
    if (stats) {
      this.game.resourceSystem.addIncome(building.team, stats.cost);
      // Refund MU cost if applicable
      const muRefund = cancelled === 'commander' ? 200 : (stats.muCost || 0);
      if (muRefund > 0) {
        this.game.resourceSystem.addMUIncome(building.team, muRefund);
      }
      this.game.eventBus.emit('resource:changed', {
        player: this.game.teams.player.sp,
        enemy: this.game.teams.enemy.sp,
        playerMU: this.game.teams.player.mu,
        enemyMU: this.game.teams.enemy.mu
      });
    }

    this.game.eventBus.emit('production:cancelled', {
      building,
      unitType: cancelled,
      refund: stats ? stats.cost : 0
    });

    return true;
  }

  // Get what a building is currently producing and progress
  getProductionInfo(building) {
    if (!building || !building.currentProduction) return null;

    return {
      unitType: building.currentProduction,
      progress: building.getProductionProgress(),
      queueLength: building.productionQueue.length
    };
  }

  // Get all available building types for a team (based on tech tree)
  getAvailableBuildings(team) {
    const teamBuildings = this.game.getBuildings(team);
    const available = [];

    for (const [type, stats] of Object.entries(BUILDING_STATS)) {
      if (type === 'headquarters' || type === 'ditch') continue;

      const requires = stats.requires || [];
      const hasAllReqs = requires.every(req =>
        teamBuildings.some(b => b.type === req && b.alive)
      );

      available.push({
        type,
        stats,
        available: hasAllReqs,
        missingReqs: requires.filter(req =>
          !teamBuildings.some(b => b.type === req && b.alive)
        )
      });
    }

    return available;
  }

  // GD-063: Building Construction Phase
  _startConstruction(building) {
    const stats = BUILDING_STATS[building.type];
    if (!stats) return;

    building._constructing = true;
    building._constructionTime = (stats.cost || 200) / 50; // ~4s for 200 cost, ~16s for 800 cost
    building._constructionElapsed = 0;
    building._constructionMaxHP = building.maxHealth;

    // Start at 10% HP
    building.health = Math.round(building.maxHealth * CONSTRUCTION_CONFIG.startHPPercent);

    // Semi-transparent during construction
    if (building.mesh) {
      building.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          if (!child.material._origOpacity) {
            child.material._origOpacity = child.material.opacity;
            child.material._origTransparent = child.material.transparent;
          }
          child.material.transparent = true;
          child.material.opacity = 0.4;
        }
      });
      // Scale down
      building.mesh.scale.set(0.5, 0.5, 0.5);
    }
  }

  _updateConstruction(building, delta) {
    building._constructionElapsed += delta;
    const progress = Math.min(1, building._constructionElapsed / building._constructionTime);

    // Gain HP proportionally
    const targetHP = Math.round(
      building._constructionMaxHP * (CONSTRUCTION_CONFIG.startHPPercent + (1 - CONSTRUCTION_CONFIG.startHPPercent) * progress)
    );
    building.health = Math.min(targetHP, building._constructionMaxHP);

    // Scale up
    if (building.mesh) {
      const scale = 0.5 + 0.5 * progress;
      building.mesh.scale.set(scale, scale, scale);
    }

    // Construction spark timer: every 0.5s spawn welding sparks
    if (!building._constructionSparkTimer) building._constructionSparkTimer = 0;
    building._constructionSparkTimer += delta;
    if (building._constructionSparkTimer >= 0.5 && progress < 1) {
      building._constructionSparkTimer = 0;
      if (this.game.effectsManager) {
        this.game.effectsManager.createConstructionSparks(building.getPosition());
      }
    }

    // Construction complete
    if (progress >= 1) {
      building._constructing = false;
      building.health = building._constructionMaxHP;
      delete building._constructionSparkTimer;

      // Restore materials
      if (building.mesh) {
        building.mesh.scale.set(1, 1, 1);
        building.mesh.traverse(child => {
          if (child.isMesh && child.material && child.material._origOpacity !== undefined) {
            child.material.opacity = child.material._origOpacity;
            child.material.transparent = child.material._origTransparent;
            delete child.material._origOpacity;
            delete child.material._origTransparent;
          }
        });
      }

      // Dust puff on completion
      if (this.game.effectsManager) {
        this.game.effectsManager.createConstructionDust(building.getPosition());
      }

      if (building.team === 'player' && this.game.uiManager?.hud) {
        this.game.uiManager.hud.showNotification(
          `${building.type.charAt(0).toUpperCase() + building.type.slice(1)} construction complete!`,
          '#00ff88'
        );
      }
    }
  }

  cancelConstruction(building) {
    if (!building || !building._constructing) return false;
    const stats = BUILDING_STATS[building.type];
    if (!stats) return false;

    // Refund 75%
    const refund = Math.round(stats.cost * CONSTRUCTION_CONFIG.cancelRefundPercent);
    this.game.resourceSystem.addIncome(building.team, refund);
    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp,
      playerMU: this.game.teams.player.mu,
      enemyMU: this.game.teams.enemy.mu
    });

    // Remove building
    building.alive = false;
    this.game.removeEntity(building);
    if (building.mesh) {
      this.game.sceneManager.scene.remove(building.mesh);
    }

    if (building.team === 'player' && this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(`Construction cancelled. Refund: ${refund} SP`, '#ffcc00');
    }

    return true;
  }
}
