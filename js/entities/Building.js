import * as THREE from 'three';
import { Entity } from './Entity.js';
import { BUILDING_STATS, UNIT_STATS, NATIONS, BUILDING_UPGRADES } from '../core/Constants.js';

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

    this.tier = 1;

    // Construction phase state (set by ProductionSystem._startConstruction)
    this._constructing = false;

    // Nation reference for production speed bonus (set externally)
    this.nation = null;

    // Footprint outline (created on first select)
    this._footprintOutline = null;
  }

  // Apply nation-specific bonuses to defensive buildings (Britain: +25% HP, +15% range)
  applyNationBonuses(nationKey) {
    this.nation = nationKey;
    const nationData = NATIONS[nationKey];
    if (!nationData || !nationData.bonuses) return;

    const b = nationData.bonuses;
    const defensiveTypes = ['ditch', 'turret', 'aaturret', 'bunker'];

    if (defensiveTypes.includes(this.type)) {
      // Britain Fortified Positions: +25% HP for defensive buildings
      if (b.defensiveBuildingHP && b.defensiveBuildingHP !== 1.0) {
        this.maxHealth = Math.round(this.maxHealth * b.defensiveBuildingHP);
        this.health = this.maxHealth;
      }
      // Britain Fortified Positions: +15% range for defensive buildings
      if (b.defensiveBuildingRange && b.defensiveBuildingRange !== 1.0 && this.range) {
        this.range = Math.round(this.range * b.defensiveBuildingRange * 100) / 100;
      }
    }
  }

  setSelected(selected) {
    super.setSelected(selected);

    // Show/hide footprint outline on the ground
    if (selected && !this._footprintOutline && this.mesh) {
      this._createFootprintOutline();
    }
    if (this._footprintOutline) {
      this._footprintOutline.visible = selected;
    }
  }

  _createFootprintOutline() {
    if (!this.mesh) return;
    const halfSize = this.size * 1.2; // slightly larger than actual footprint
    // Create a square outline on the ground using EdgesGeometry of a PlaneGeometry
    const planeGeo = new THREE.PlaneGeometry(halfSize * 2, halfSize * 2);
    const edges = new THREE.EdgesGeometry(planeGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: this.team === 'player' ? 0x44ff44 : 0xff4444,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    const outline = new THREE.LineSegments(edges, lineMat);
    outline.rotation.x = -Math.PI / 2; // Lay flat on ground
    outline.position.y = 0.25; // Slightly above ground to avoid z-fighting
    outline.visible = false;
    planeGeo.dispose(); // EdgesGeometry creates its own buffer
    this.mesh.add(outline);
    this._footprintOutline = outline;
  }

  canProduce(unitType) {
    return this.produces.includes(unitType);
  }

  queueUnit(unitType) {
    if (!this.canProduce(unitType)) return false;

    // Queue limit: max 5 total (current production + queued)
    const totalQueued = (this.currentProduction ? 1 : 0) + this.productionQueue.length;
    if (totalQueued >= 5) return false;

    this.productionQueue.push(unitType);
    return true;
  }

  update(deltaTime) {
    if (!this.alive) return;

    // Skip production during construction phase (GD-063)
    if (this._constructing) return;

    // GD-111: Skip production while sabotaged by enemy commander
    if (this._sabotaged) return;

    // GD-076: Building damage states visual
    this._updateDamageState(deltaTime);

    // GD-108: Chimney smoke while producing
    if (this.currentProduction && this.game && this.game.effectsManager) {
      this._smokeEmitTimer = (this._smokeEmitTimer || 0) + deltaTime;
      if (this._smokeEmitTimer > 1.5) {
        this._smokeEmitTimer = 0;
        const pos = this.getPosition().clone();
        pos.y += 8; // Above building roof
        pos.x += (Math.random() - 0.5) * 2;
        this.game.effectsManager.createSmoke(pos);
      }
    }

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

      // Apply tier production speed bonus
      const tierBonus = this.getTierBonus();
      if (tierBonus && tierBonus.productionSpeed > 1) {
        buildTime = buildTime / tierBonus.productionSpeed;
      }

      // Apply blitz_training research bonus
      if (this.game && this.game.hasResearch && this.game.hasResearch(this.team, 'blitz_training')) {
        buildTime /= 1.15;
      }

      // GD-091: Neutral abandoned factory production bonus
      if (this.game && this.game.neutralStructures) {
        const factoryBonus = this.game.neutralStructures.getProductionBonus(this.team);
        if (factoryBonus > 0) {
          buildTime /= (1 + factoryBonus);
        }
      }

      this.productionTimer = buildTime;
      this._productionTotalTime = buildTime;
    }
  }

  getProductionProgress() {
    if (!this.currentProduction) return 0;
    const totalTime = this._productionTotalTime || (UNIT_STATS[this.currentProduction]?.buildTime ?? 3);
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

  getTotalQueueCost() {
    let total = 0;
    const queue = this.getFullQueue();
    for (const item of queue) {
      const stats = UNIT_STATS[item.type];
      if (stats) total += stats.cost;
    }
    return total;
  }

  getTotalQueueTime() {
    let total = 0;
    // Current production: use remaining timer directly
    if (this.currentProduction) {
      total += Math.max(0, this.productionTimer);
    }
    // Queued items: calculate adjusted build times
    for (const unitType of this.productionQueue) {
      const stats = UNIT_STATS[unitType];
      if (stats) {
        let buildTime = stats.buildTime;
        // Apply nation production speed bonus
        const nationSpeed = this.nation && NATIONS[this.nation]?.bonuses?.productionSpeed;
        if (nationSpeed && nationSpeed > 0) {
          buildTime /= nationSpeed;
        }
        // Apply tier production speed bonus
        const tierBonus = this.getTierBonus();
        if (tierBonus && tierBonus.productionSpeed > 1) {
          buildTime /= tierBonus.productionSpeed;
        }
        // Apply blitz_training research bonus
        if (this.game && this.game.hasResearch && this.game.hasResearch(this.team, 'blitz_training')) {
          buildTime /= 1.15;
        }
        total += buildTime;
      }
    }
    return Math.max(0, total);
  }

  getRemainingTime() {
    if (!this.currentProduction) return 0;
    return Math.max(0, this.productionTimer);
  }

  upgrade() {
    const upgradeConfig = BUILDING_UPGRADES[this.type];
    if (!upgradeConfig) return false;
    if (this.tier >= upgradeConfig.maxTier) return false;

    const nextTier = this.tier + 1;
    this.tier = nextTier;
    return true;
  }

  canUpgrade() {
    const upgradeConfig = BUILDING_UPGRADES[this.type];
    if (!upgradeConfig) return false;
    return this.tier < upgradeConfig.maxTier;
  }

  getUpgradeCost() {
    const upgradeConfig = BUILDING_UPGRADES[this.type];
    if (!upgradeConfig || this.tier >= upgradeConfig.maxTier) return 0;
    return upgradeConfig.costs[this.tier];
  }

  getUpgradeMUCost() {
    const upgradeConfig = BUILDING_UPGRADES[this.type];
    if (!upgradeConfig || this.tier >= upgradeConfig.maxTier) return 0;
    return (upgradeConfig.muCosts && upgradeConfig.muCosts[this.tier]) || 0;
  }

  getTierBonus() {
    const upgradeConfig = BUILDING_UPGRADES[this.type];
    if (!upgradeConfig) return null;
    return upgradeConfig.bonuses[this.tier];
  }

  setRallyPoint(position) {
    this.rallyPoint = position.clone();
  }

  // GD-076: Building damage state visuals
  _updateDamageState(deltaTime) {
    if (!this.mesh) return;
    const hpRatio = this.health / this.maxHealth;

    // Determine damage state: 0=healthy, 1=damaged(66%), 2=critical(33%)
    let newState = 0;
    if (hpRatio <= 0.33) newState = 2;
    else if (hpRatio <= 0.66) newState = 1;

    if (newState === this._damageState) {
      // Update existing particle timers
      if (this._damageParticleTimer !== undefined) {
        this._damageParticleTimer -= deltaTime;
        if (this._damageParticleTimer <= 0) {
          this._damageParticleTimer = 0.4;
          if (this.game && this.game.effectsManager) {
            const pos = this.getPosition().clone();
            pos.y += 4 + Math.random() * 3;
            if (newState >= 1) {
              this.game.effectsManager.createSmoke(pos);
            }
            if (newState >= 2) {
              // Spec 009: Dedicated fire effect on critically damaged buildings
              pos.x += (Math.random() - 0.5) * 3;
              pos.z += (Math.random() - 0.5) * 3;
              this.game.effectsManager.createFireEffect(pos);
            }
          }
        }
      }
      return;
    }

    // State changed
    const prevState = this._damageState || 0;
    this._damageState = newState;

    if (newState === 0) {
      // Restored above 66%: clear damage visuals
      this._restoreBuildingMaterials();
      this._damageParticleTimer = undefined;
    } else if (newState === 1) {
      // At 66%: darken by 30%
      this._darkenBuildingMaterials(0.7);
      this._damageParticleTimer = 0;
    } else if (newState === 2) {
      // At 33%: darken further
      this._darkenBuildingMaterials(0.4);
      this._damageParticleTimer = 0;
    }
  }

  _darkenBuildingMaterials(factor) {
    if (!this.mesh) return;
    const healthBarGroup = this.healthBar;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material &&
          !(healthBarGroup && child.parent === healthBarGroup) &&
          child !== this.selectionRing) {
        if (!child.material._origColor) {
          child.material._origColor = child.material.color.getHex();
        }
        const orig = child.material._origColor;
        const r = ((orig >> 16) & 0xff) / 255 * factor;
        const g = ((orig >> 8) & 0xff) / 255 * factor;
        const b = (orig & 0xff) / 255 * factor;
        child.material.color.setRGB(r, g, b);
      }
    });
  }

  _restoreBuildingMaterials() {
    if (!this.mesh) return;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material._origColor !== undefined) {
        child.material.color.setHex(child.material._origColor);
        delete child.material._origColor;
      }
    });
  }
}
