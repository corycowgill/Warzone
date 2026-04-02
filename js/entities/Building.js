import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BUILDING_STATS, UNIT_STATS, NATIONS } from '../core/Constants.js';

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

    // Nation reference for production speed bonus (set externally)
    this.nation = null;
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
      let buildTime = stats ? stats.buildTime : 3;

      // Apply nation production speed bonus (higher = faster, so divide)
      if (this.nation) {
        const nationData = NATIONS[this.nation];
        if (nationData && nationData.bonuses && nationData.bonuses.productionSpeed > 1) {
          buildTime = buildTime / nationData.bonuses.productionSpeed;
        }
      }

      this.productionTimer = buildTime;
    }
  }

  getProductionProgress() {
    if (!this.currentProduction) return 0;
    const stats = UNIT_STATS[this.currentProduction];
    const totalTime = stats ? stats.buildTime : 3;
    return 1 - (this.productionTimer / totalTime);
  }

  /**
   * Cancel a queued item at the given index. Returns the unit type cancelled, or null.
   * Index 0 means cancel the currently building item; index >= 1 means cancel from the queue.
   */
  cancelQueueItem(index) {
    if (index === 0 && this.currentProduction) {
      const cancelled = this.currentProduction;
      this.currentProduction = null;
      this.productionTimer = 0;
      return cancelled;
    } else if (index >= 1) {
      // Queue indices are shifted by 1 (index 0 is currentProduction)
      const queueIdx = index - 1;
      if (queueIdx < this.productionQueue.length) {
        const cancelled = this.productionQueue.splice(queueIdx, 1)[0];
        return cancelled;
      }
    }
    return null;
  }

  /**
   * Get the full production list: current item + queue.
   */
  getFullQueue() {
    const result = [];
    if (this.currentProduction) {
      result.push({ type: this.currentProduction, progress: this.getProductionProgress(), isCurrent: true });
    }
    for (const unitType of this.productionQueue) {
      result.push({ type: unitType, progress: 0, isCurrent: false });
    }
    return result;
  }

  setRallyPoint(position) {
    this.rallyPoint = position.clone();
  }
}
