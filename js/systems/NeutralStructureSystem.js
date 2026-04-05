import * as THREE from 'three';
import { GAME_CONFIG, NEUTRAL_STRUCTURES } from '../core/Constants.js';

/**
 * GD-091: Neutral Map Structures
 * Places capturable structures on the map that provide bonuses when held.
 * Infantry units near a neutral structure capture it over time.
 */

const CAPTURE_RADIUS = 12;
const CAPTURE_TIME = 8; // seconds to capture
const STRUCTURE_COUNT_MIN = 3;
const STRUCTURE_COUNT_MAX = 5;

const STRUCTURE_TYPES = Object.keys(NEUTRAL_STRUCTURES);

export class NeutralStructureSystem {
  constructor(game) {
    this.game = game;
    this.structures = [];
    this.placeStructures();
  }

  placeStructures() {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    const count = STRUCTURE_COUNT_MIN + Math.floor(this.game.rng.next() * (STRUCTURE_COUNT_MAX - STRUCTURE_COUNT_MIN + 1));
    const margin = 60;
    const minDist = 40; // minimum distance between structures

    const placed = [];

    for (let i = 0; i < count; i++) {
      const structType = STRUCTURE_TYPES[i % STRUCTURE_TYPES.length];
      const config = NEUTRAL_STRUCTURES[structType];
      let x, z, attempts = 0;
      let valid = false;

      do {
        // Bias toward center of map (contested area)
        x = mapSize * 0.2 + this.game.rng.next() * mapSize * 0.6;
        z = mapSize * 0.15 + this.game.rng.next() * mapSize * 0.7;
        attempts++;

        // Check terrain
        if (this.game.terrain) {
          if (this.game.terrain.isWater(x, z) || !this.game.terrain.isWalkable(x, z)) continue;
        }

        // Check distance from other structures
        valid = true;
        for (const p of placed) {
          const dx = p.x - x;
          const dz = p.z - z;
          if (Math.sqrt(dx * dx + dz * dz) < minDist) {
            valid = false;
            break;
          }
        }
      } while (!valid && attempts < 30);

      if (attempts >= 30) continue;

      placed.push({ x, z });
      this._createStructure(structType, config, x, z);
    }
  }

  _createStructure(type, config, x, z) {
    const y = this.game.terrain ? this.game.terrain.getHeightAt(x, z) : 0;
    const group = new THREE.Group();

    // Base platform
    const baseGeo = new THREE.CylinderGeometry(4, 4.5, 0.5, 8);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // Structure-specific model
    let mainColor = 0x888888;
    switch (type) {
      case 'watchtower': {
        // Tall tower
        const towerGeo = new THREE.CylinderGeometry(0.8, 1.2, 6, 6);
        const towerMat = new THREE.MeshPhongMaterial({ color: 0x776655 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 3.5;
        tower.castShadow = true;
        group.add(tower);
        // Observation platform
        const platGeo = new THREE.CylinderGeometry(2, 1.5, 0.4, 6);
        const platMat = new THREE.MeshPhongMaterial({ color: 0x665544 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.y = 6.7;
        group.add(plat);
        // Railing posts
        for (let a = 0; a < 6; a++) {
          const angle = (a / 6) * Math.PI * 2;
          const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 4);
          const postMat = new THREE.MeshPhongMaterial({ color: 0x554433 });
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(Math.cos(angle) * 1.8, 7.4, Math.sin(angle) * 1.8);
          group.add(post);
        }
        mainColor = 0x776655;
        break;
      }
      case 'abandoned_factory': {
        // Industrial building
        const wallGeo = new THREE.BoxGeometry(5, 3, 4);
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 2;
        wall.castShadow = true;
        group.add(wall);
        // Roof
        const roofGeo = new THREE.BoxGeometry(5.5, 0.3, 4.5);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 3.65;
        group.add(roof);
        // Chimney
        const chimGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
        const chimMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const chim = new THREE.Mesh(chimGeo, chimMat);
        chim.position.set(1.5, 4.8, 1);
        group.add(chim);
        mainColor = 0x777777;
        break;
      }
      case 'supply_depot': {
        // Warehouse with crates
        const wareGeo = new THREE.BoxGeometry(4, 2.5, 3);
        const wareMat = new THREE.MeshPhongMaterial({ color: 0x887766 });
        const ware = new THREE.Mesh(wareGeo, wareMat);
        ware.position.y = 1.75;
        ware.castShadow = true;
        group.add(ware);
        // Crates outside
        for (let c = 0; c < 3; c++) {
          const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
          const crateMat = new THREE.MeshPhongMaterial({ color: 0xaa8855 });
          const crate = new THREE.Mesh(crateGeo, crateMat);
          crate.position.set(-2.5 + c * 0.9, 0.9, 2);
          group.add(crate);
        }
        mainColor = 0x887766;
        break;
      }
      case 'comm_relay': {
        // Antenna tower
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 7, 4);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4;
        pole.castShadow = true;
        group.add(pole);
        // Dish
        const dishGeo = new THREE.SphereGeometry(1.2, 8, 6, 0, Math.PI);
        const dishMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(0, 7, 0);
        dish.rotation.x = -Math.PI / 4;
        group.add(dish);
        // Equipment box at base
        const eqGeo = new THREE.BoxGeometry(1.5, 1, 1);
        const eqMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const eq = new THREE.Mesh(eqGeo, eqMat);
        eq.position.set(1.5, 1, 0);
        group.add(eq);
        mainColor = 0x999999;
        break;
      }
      case 'repair_bay': {
        // Open garage structure
        const frameGeo = new THREE.BoxGeometry(4, 2.5, 0.3);
        const frameMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        // Back wall
        const back = new THREE.Mesh(frameGeo, frameMat);
        back.position.set(0, 1.75, -1.5);
        back.castShadow = true;
        group.add(back);
        // Side walls
        const sideGeo = new THREE.BoxGeometry(0.3, 2.5, 3);
        for (let s = -1; s <= 1; s += 2) {
          const side = new THREE.Mesh(sideGeo, frameMat);
          side.position.set(s * 2, 1.75, 0);
          group.add(side);
        }
        // Roof
        const bayRoofGeo = new THREE.BoxGeometry(4.5, 0.2, 3.5);
        const bayRoof = new THREE.Mesh(bayRoofGeo, frameMat);
        bayRoof.position.y = 3.1;
        group.add(bayRoof);
        // Wrench symbol (green cross)
        const crossGeo1 = new THREE.BoxGeometry(1.5, 0.3, 0.1);
        const crossMat = new THREE.MeshBasicMaterial({ color: 0x00cc44 });
        const cross1 = new THREE.Mesh(crossGeo1, crossMat);
        cross1.position.set(0, 2, -1.3);
        group.add(cross1);
        const crossGeo2 = new THREE.BoxGeometry(0.3, 1.5, 0.1);
        const cross2 = new THREE.Mesh(crossGeo2, crossMat);
        cross2.position.set(0, 2, -1.3);
        group.add(cross2);
        mainColor = 0x666666;
        break;
      }
    }

    // Capture ring indicator (changes color with ownership)
    const ringGeo = new THREE.RingGeometry(CAPTURE_RADIUS - 0.5, CAPTURE_RADIUS, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.15;
    group.add(ring);

    // Label beacon (floating diamond above structure)
    const beaconGeo = new THREE.OctahedronGeometry(0.6, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 9;
    group.add(beacon);

    group.position.set(x, y, z);
    this.game.sceneManager.scene.add(group);

    const structure = {
      id: Date.now() + Math.floor(this.game.rng.next() * 100000),
      structureType: type,
      config,
      team: 'neutral',
      mesh: group,
      ring,
      ringMat,
      beacon,
      beaconMat,
      position: new THREE.Vector3(x, y, z),
      health: config.hp,
      maxHealth: config.hp,
      alive: true,
      captureProgress: 0,
      capturingTeam: null,
      _beaconPhase: this.game.rng.next() * Math.PI * 2
    };

    this.structures.push(structure);
    return structure;
  }

  update(delta) {
    if (this.game.state !== 'PLAYING') return;

    for (const struct of this.structures) {
      if (!struct.alive) continue;

      // Animate beacon
      struct._beaconPhase += delta * 2;
      struct.beacon.position.y = 9 + Math.sin(struct._beaconPhase) * 0.5;
      struct.beacon.rotation.y += delta;

      // Count infantry from each team near the structure
      let playerInf = 0;
      let enemyInf = 0;

      for (const entity of this.game.entities) {
        if (!entity.alive || !entity.isUnit) continue;
        // Only infantry and engineers can capture
        if (entity.type !== 'infantry' && entity.type !== 'engineer') continue;
        const dist = entity.getPosition().distanceTo(struct.position);
        if (dist > CAPTURE_RADIUS) continue;
        if (entity.team === 'player') playerInf++;
        else if (entity.team === 'enemy') enemyInf++;
      }

      // Determine capturing team (need numerical advantage)
      if (playerInf > enemyInf && struct.team !== 'player') {
        if (struct.capturingTeam === 'player') {
          struct.captureProgress += delta * (playerInf - enemyInf);
        } else {
          // Reset progress if switching capture direction
          struct.captureProgress = delta;
          struct.capturingTeam = 'player';
        }
      } else if (enemyInf > playerInf && struct.team !== 'enemy') {
        if (struct.capturingTeam === 'enemy') {
          struct.captureProgress += delta * (enemyInf - playerInf);
        } else {
          struct.captureProgress = delta;
          struct.capturingTeam = 'enemy';
        }
      } else if (playerInf === enemyInf || (playerInf === 0 && enemyInf === 0)) {
        // Contested or empty: slowly decay capture progress
        struct.captureProgress = Math.max(0, struct.captureProgress - delta * 0.5);
        if (struct.captureProgress <= 0) struct.capturingTeam = null;
      }

      // Complete capture
      if (struct.captureProgress >= CAPTURE_TIME && struct.capturingTeam) {
        this._captureStructure(struct, struct.capturingTeam);
        struct.captureProgress = 0;
        struct.capturingTeam = null;
      }

      // Apply repair bay healing
      if (struct.structureType === 'repair_bay' && struct.team !== 'neutral') {
        const healRate = struct.config.healRate;
        const healRadius = struct.config.healRadius;
        for (const entity of this.game.entities) {
          if (!entity.alive || entity.team !== struct.team) continue;
          if (entity.health >= entity.maxHealth) continue;
          const dist = entity.getPosition().distanceTo(struct.position);
          if (dist <= healRadius) {
            entity.health = Math.min(entity.maxHealth, entity.health + healRate * delta);
          }
        }
      }
    }
  }

  _captureStructure(struct, team) {
    const prevTeam = struct.team;
    struct.team = team;

    // Update visuals
    const teamColor = team === 'player' ? 0x4488ff : (team === 'enemy' ? 0xff4444 : 0x888888);
    struct.ringMat.color.setHex(teamColor);
    struct.ringMat.opacity = 0.25;
    struct.beaconMat.color.setHex(teamColor);

    // Remove bonus from previous team
    if (prevTeam !== 'neutral') {
      this._removeBonus(struct, prevTeam);
    }

    // Apply bonus to new team
    this._applyBonus(struct, team);

    // Notifications
    const label = struct.config.label;
    if (team === 'player') {
      if (this.game.uiManager?.hud) {
        this.game.uiManager.hud.showNotification(
          `${label} captured! ${struct.config.description}`, '#4488ff'
        );
      }
      if (this.game.soundManager) this.game.soundManager.play('produce');
    }

    this.game.eventBus.emit('structure:captured', {
      structure: struct,
      team,
      type: struct.structureType
    });
  }

  _applyBonus(struct, team) {
    const type = struct.structureType;
    const config = struct.config;

    switch (type) {
      case 'watchtower':
        // Mark that this team has a watchtower bonus
        if (!this.game._watchtowerBonus) this.game._watchtowerBonus = {};
        this.game._watchtowerBonus[team] = (this.game._watchtowerBonus[team] || 0) + config.visionBonus;
        // Apply vision bonus to all existing units
        for (const entity of this.game.entities) {
          if (entity.alive && entity.team === team && entity.isUnit) {
            entity._watchtowerVision = (entity._watchtowerVision || 0) + config.visionBonus;
          }
        }
        break;

      case 'abandoned_factory':
        // Production speed bonus stored on team
        if (!this.game._factoryBonus) this.game._factoryBonus = {};
        this.game._factoryBonus[team] = (this.game._factoryBonus[team] || 0) + config.productionBonus;
        break;

      case 'supply_depot':
        // Income bonus
        if (!this.game._depotIncomeBonus) this.game._depotIncomeBonus = {};
        this.game._depotIncomeBonus[team] = (this.game._depotIncomeBonus[team] || 0) + config.incomeBonus;
        break;

      case 'comm_relay':
        // Minimap reveal for the team
        if (!this.game._commRelayTeams) this.game._commRelayTeams = {};
        this.game._commRelayTeams[team] = true;
        break;

      case 'repair_bay':
        // Healing is applied in update() directly
        break;
    }
  }

  _removeBonus(struct, team) {
    const type = struct.structureType;
    const config = struct.config;

    switch (type) {
      case 'watchtower':
        if (this.game._watchtowerBonus && this.game._watchtowerBonus[team]) {
          this.game._watchtowerBonus[team] -= config.visionBonus;
          for (const entity of this.game.entities) {
            if (entity.alive && entity.team === team && entity.isUnit) {
              entity._watchtowerVision = Math.max(0, (entity._watchtowerVision || 0) - config.visionBonus);
            }
          }
        }
        break;

      case 'abandoned_factory':
        if (this.game._factoryBonus && this.game._factoryBonus[team]) {
          this.game._factoryBonus[team] -= config.productionBonus;
        }
        break;

      case 'supply_depot':
        if (this.game._depotIncomeBonus && this.game._depotIncomeBonus[team]) {
          this.game._depotIncomeBonus[team] -= config.incomeBonus;
        }
        break;

      case 'comm_relay':
        if (this.game._commRelayTeams) {
          // Only remove if no other relays owned
          const otherRelays = this.structures.filter(s =>
            s !== struct && s.structureType === 'comm_relay' && s.team === team
          );
          if (otherRelays.length === 0) {
            this.game._commRelayTeams[team] = false;
          }
        }
        break;

      case 'repair_bay':
        // No cleanup needed; healing stops naturally
        break;
    }
  }

  /**
   * Get structures owned by a given team.
   */
  getStructuresByTeam(team) {
    return this.structures.filter(s => s.team === team);
  }

  /**
   * Get the production speed bonus for a team from abandoned factories.
   */
  getProductionBonus(team) {
    return this.game._factoryBonus?.[team] || 0;
  }

  /**
   * Get the income bonus for a team from supply depots.
   */
  getIncomeBonus(team) {
    return this.game._depotIncomeBonus?.[team] || 0;
  }

  /**
   * Check if a team has comm relay (minimap reveal).
   */
  hasCommRelay(team) {
    return this.game._commRelayTeams?.[team] || false;
  }

  destroy() {
    // Remove all structure meshes
    for (const struct of this.structures) {
      if (struct.mesh) {
        this.game.sceneManager.scene.remove(struct.mesh);
        struct.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
    }
    this.structures = [];

    // Clean up game-level bonus tracking
    this.game._watchtowerBonus = null;
    this.game._factoryBonus = null;
    this.game._depotIncomeBonus = null;
    this.game._commRelayTeams = null;
  }
}
