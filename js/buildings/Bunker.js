import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Bunker extends Building {
  constructor(team, position, game) {
    super('bunker', team, position, BUILDING_STATS.bunker);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2.5);
    this.createHealthBar();

    // Combat properties
    const stats = BUILDING_STATS.bunker;
    this.baseDamage = stats.damage;
    this.damage = stats.damage;
    this.range = stats.range;
    this.attackRate = stats.attackRate;
    this.armor = stats.armor;
    this.attackCooldown = 0;
    this.attackTarget = null;
    this.targetDomain = 'ground';
    this.isTurret = true; // So CombatSystem treats it like a turret

    // Garrison system
    this.garrisonSlots = stats.garrisonSlots || 4;
    this.garrisoned = []; // Array of infantry unit references
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('bld_bunker', this.team);
    if (model) {
      const group = new THREE.Group();
      group.add(model);
      return group;
    }
    return this._createProceduralMesh();
  }

  _createProceduralMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;

    // Heavy concrete base
    const baseGeo = new THREE.BoxGeometry(4.0, 0.4, 3.5);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.2, 0);
    base.receiveShadow = true;
    base.castShadow = true;
    group.add(base);

    // Bunker walls - thick concrete
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x777777 });

    // Back wall
    const backGeo = new THREE.BoxGeometry(4.0, 1.8, 0.5);
    const back = new THREE.Mesh(backGeo, wallMat);
    back.position.set(0, 1.3, -1.5);
    back.castShadow = true;
    group.add(back);

    // Left wall
    const sideGeo = new THREE.BoxGeometry(0.5, 1.8, 3.5);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.position.set(-1.75, 1.3, 0);
    left.castShadow = true;
    group.add(left);

    // Right wall
    const right = new THREE.Mesh(sideGeo, wallMat);
    right.position.set(1.75, 1.3, 0);
    right.castShadow = true;
    group.add(right);

    // Front wall with firing slits
    const frontTopGeo = new THREE.BoxGeometry(4.0, 0.6, 0.5);
    const frontTop = new THREE.Mesh(frontTopGeo, wallMat);
    frontTop.position.set(0, 1.9, 1.5);
    frontTop.castShadow = true;
    group.add(frontTop);

    // Front wall bottom
    const frontBotGeo = new THREE.BoxGeometry(4.0, 0.6, 0.5);
    const frontBot = new THREE.Mesh(frontBotGeo, wallMat);
    frontBot.position.set(0, 0.7, 1.5);
    frontBot.castShadow = true;
    group.add(frontBot);

    // Firing slit openings (dark recesses)
    const slitMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    for (let i = -1; i <= 1; i++) {
      const slitGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.set(i * 1.1, 1.3, 1.5);
      group.add(slit);
    }

    // Roof slab (slightly angled for drainage)
    const roofGeo = new THREE.BoxGeometry(4.2, 0.3, 3.7);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x5a5a5a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.35, 0);
    roof.rotation.x = -0.03;
    roof.castShadow = true;
    group.add(roof);

    // Sandbag reinforcements around base
    const sandbagGeo = new THREE.BoxGeometry(0.6, 0.25, 0.3);
    const sandbagMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
    const sandbagPositions = [
      [-1.8, 0.52, 1.9], [-1.0, 0.52, 1.9], [0, 0.52, 1.9], [1.0, 0.52, 1.9], [1.8, 0.52, 1.9],
      [-2.1, 0.52, 0.5], [-2.1, 0.52, -0.5], [2.1, 0.52, 0.5], [2.1, 0.52, -0.5]
    ];
    for (const [x, y, z] of sandbagPositions) {
      const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
      bag.position.set(x, y, z);
      bag.rotation.y = Math.abs(z) > 1.5 ? 0 : Math.PI / 2;
      bag.castShadow = true;
      group.add(bag);
    }

    // Team flag
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(1.5, 3.0, -1.2);
    group.add(pole);

    const flagGeo = new THREE.BoxGeometry(0.6, 0.35, 0.02);
    const flagMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.3 });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.8, 3.5, -1.2);
    group.add(flag);

    // Garrison indicator dots (show how many slots filled)
    this.garrisonIndicators = [];
    for (let i = 0; i < 4; i++) {
      const dotGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const dotMat = new THREE.MeshPhongMaterial({ color: 0x333333, emissive: 0x333333, emissiveIntensity: 0.2 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(-1.2 + i * 0.8, 2.6, 0);
      group.add(dot);
      this.garrisonIndicators.push(dot);
    }

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.alive) return;

    // Tick attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Remove dead garrisoned units
    this.garrisoned = this.garrisoned.filter(u => u.alive);

    // Update damage based on garrison count
    // Base damage + 10 per garrisoned infantry
    this.damage = this.baseDamage + this.garrisoned.length * 10;

    // Update garrison indicator colors
    this.updateGarrisonIndicators();

    // Auto-target enemy ground units
    this.autoTarget();
  }

  updateGarrisonIndicators() {
    if (!this.garrisonIndicators) return;
    for (let i = 0; i < this.garrisonIndicators.length; i++) {
      const dot = this.garrisonIndicators[i];
      if (i < this.garrisoned.length) {
        dot.material.color.setHex(0x00ff44);
        dot.material.emissive.setHex(0x00ff44);
        dot.material.emissiveIntensity = 0.5;
      } else {
        dot.material.color.setHex(0x333333);
        dot.material.emissive.setHex(0x333333);
        dot.material.emissiveIntensity = 0.2;
      }
    }
  }

  /**
   * Garrison an infantry unit into this bunker.
   * The unit is hidden and its combat is handled by the bunker.
   */
  garrisonUnit(unit) {
    if (!unit || !unit.alive || !unit.isUnit) return false;
    if (unit.type !== 'infantry') return false;
    if (this.garrisoned.length >= this.garrisonSlots) return false;
    if (unit.team !== this.team) return false;

    this.garrisoned.push(unit);

    // Hide the unit mesh and make it non-targetable
    if (unit.mesh) unit.mesh.visible = false;
    unit.isGarrisoned = true;
    unit.garrisonedIn = this;

    // Stop unit movement/combat
    unit.stop();

    return true;
  }

  /**
   * Eject all garrisoned units from the bunker.
   */
  ejectAll() {
    const ejected = [...this.garrisoned];
    for (const unit of ejected) {
      this.ejectUnit(unit);
    }
    return ejected;
  }

  ejectUnit(unit) {
    const idx = this.garrisoned.indexOf(unit);
    if (idx === -1) return false;

    this.garrisoned.splice(idx, 1);

    if (unit.alive) {
      // Place unit near bunker
      const pos = this.getPosition();
      const angle = (idx / this.garrisonSlots) * Math.PI * 2;
      const offset = new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
      const spawnPos = pos.clone().add(offset);

      if (unit.mesh) {
        unit.mesh.position.copy(spawnPos);
        unit.mesh.visible = true;
      }
      unit.isGarrisoned = false;
      unit.garrisonedIn = null;
    }

    return true;
  }

  autoTarget() {
    // Clear dead targets
    if (this.attackTarget && !this.attackTarget.alive) {
      this.attackTarget = null;
    }

    if (this.attackTarget) return;

    // Only attack if bunker has base capability or garrisoned infantry
    if (this.garrisoned.length === 0 && this.baseDamage <= 0) return;

    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.getEntitiesByTeam(enemyTeam);
    const worldRange = this.range * 3;
    let nearest = null;
    let nearestDist = worldRange;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.isUnit && enemy.domain === 'air') continue;

      const dist = this.distanceTo(enemy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (nearest) {
      this.attackTarget = nearest;
    }
  }

  canAttack() {
    return this.attackCooldown <= 0 && this.attackTarget && this.attackTarget.alive;
  }

  isInRange(target) {
    return this.distanceTo(target) <= this.range * 3;
  }

  // Eject garrisoned units when bunker is destroyed
  takeDamage(amount) {
    super.takeDamage(amount);
    if (!this.alive) {
      this.ejectAll();
    }
  }
}
