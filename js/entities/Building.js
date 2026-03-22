import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BUILDING_STATS, UNIT_STATS } from '../core/Constants.js';

export class Building extends Entity {
  constructor(type, team, position, stats) {
    super(type, team, position);
    this.isBuilding = true;

    const s = stats || BUILDING_STATS[type];
    this.health = s.hp;
    this.maxHealth = s.hp;
    this.cost = s.cost;
    this.produces = s.produces || [];
    this.size = s.size || 2;

    this.productionQueue = [];
    this.productionTimer = 0;
    this.currentProduction = null;
    this.rallyPoint = position.clone().add(new THREE.Vector3(0, 0, 10));
  }

  canProduce(unitType) {
    return this.produces.includes(unitType);
  }

  queueUnit(unitType) {
    if (this.canProduce(unitType)) {
      this.productionQueue.push(unitType);
    }
  }

  update(deltaTime) {
    if (!this.alive) return;

    // Handle production
    if (this.currentProduction) {
      this.productionTimer -= deltaTime;
      // Note: do NOT clear currentProduction here - ProductionSystem handles completion
    } else if (this.productionQueue.length > 0) {
      this.currentProduction = this.productionQueue.shift();
      const stats = UNIT_STATS[this.currentProduction];
      this.productionTimer = stats ? stats.buildTime : 3;
    }
  }

  getProductionProgress() {
    if (!this.currentProduction) return 0;
    const stats = UNIT_STATS[this.currentProduction];
    const totalTime = stats ? stats.buildTime : 3;
    return 1 - (this.productionTimer / totalTime);
  }

  setRallyPoint(position) {
    this.rallyPoint = position.clone();
  }
}
