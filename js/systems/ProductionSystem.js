import * as THREE from 'three';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE } from '../core/Constants.js';

export class ProductionSystem {
  constructor(game) {
    this.game = game;
  }

  update(delta) {
    const buildings = this.game.entities.filter(e => e.isBuilding && e.alive);

    for (const building of buildings) {
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

    // Spawn the unit at the rally point
    const spawnPos = building.rallyPoint
      ? building.rallyPoint.clone()
      : building.getPosition().clone().add(new THREE.Vector3(0, 0, 10));

    const unit = this.game.createUnit(unitType, building.team, spawnPos);

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

    // Validate building can produce this unit type
    if (!building.canProduce(unitType)) {
      this.game.eventBus.emit('production:error', {
        message: `${building.type} cannot produce ${unitType}`
      });
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

    // Check cost
    const stats = UNIT_STATS[unitType];
    if (!stats) return false;

    const cost = stats.cost;
    if (!this.game.resourceSystem.canAfford(building.team, cost)) {
      this.game.eventBus.emit('production:error', {
        message: `Not enough SP (need ${cost})`
      });
      if (this.game.soundManager) this.game.soundManager.play('error');
      return false;
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

  requestBuilding(type, team, position) {
    const stats = BUILDING_STATS[type];
    if (!stats) return false;

    const cost = stats.cost;

    // Check if team can afford
    if (!this.game.resourceSystem.canAfford(team, cost)) {
      this.game.eventBus.emit('production:error', {
        message: `Not enough SP (need ${cost})`
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
}
