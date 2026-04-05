import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Turret extends Building {
  constructor(team, position, game) {
    super('turret', team, position, BUILDING_STATS.turret);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2.5);
    this.createHealthBar();

    // Combat properties
    this.damage = BUILDING_STATS.turret.damage;
    this.range = BUILDING_STATS.turret.range;
    this.attackRate = BUILDING_STATS.turret.attackRate;
    this.armor = BUILDING_STATS.turret.armor;
    this.attackCooldown = 0;
    this.attackTarget = null;
    this.targetDomain = 'ground';
    this.isTurret = true;
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('bld_turret', this.team);
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

    // Concrete base platform
    const baseGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.6, 8);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.3, 0);
    base.receiveShadow = true;
    base.castShadow = true;
    group.add(base);

    // Sandbag ring around base
    const sandbagGeo = new THREE.TorusGeometry(2.1, 0.25, 4, 12);
    const sandbagMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
    const sandbags = new THREE.Mesh(sandbagGeo, sandbagMat);
    sandbags.rotation.x = -Math.PI / 2;
    sandbags.position.set(0, 0.35, 0);
    sandbags.castShadow = true;
    group.add(sandbags);

    // Central pillar / turret housing
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1.0, 2.0, 6);
    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x556B2F });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(0, 1.6, 0);
    pillar.castShadow = true;
    group.add(pillar);

    // Gun turret head (rotatable part)
    this.turretHead = new THREE.Group();

    const headGeo = new THREE.BoxGeometry(1.4, 0.8, 1.2);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x4a5a2a });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0, 0);
    head.castShadow = true;
    this.turretHead.add(head);

    // Gun barrel
    const barrelGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.5, 6);
    const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 1.5);
    barrel.castShadow = true;
    this.turretHead.add(barrel);

    // Muzzle brake
    const muzzleGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 6);
    const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0, 2.75);
    this.turretHead.add(muzzle);

    this.turretHead.position.set(0, 2.8, 0);
    group.add(this.turretHead);

    // Team marker on top
    const markerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const markerMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.3 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 3.4, 0);
    group.add(marker);

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.alive) return;

    // Tick attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Auto-target enemy ground units
    this.autoTarget();

    // Rotate turret head toward target
    if (this.attackTarget && this.turretHead) {
      const targetPos = this.attackTarget.getPosition();
      const myPos = this.getPosition();
      const dx = targetPos.x - myPos.x;
      const dz = targetPos.z - myPos.z;
      this.turretHead.rotation.y = Math.atan2(dx, dz);
    }
  }

  autoTarget() {
    // Clear dead targets
    if (this.attackTarget && !this.attackTarget.alive) {
      this.attackTarget = null;
    }

    if (this.attackTarget) return;

    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.getEntitiesByTeam(enemyTeam);
    const worldRange = this.range * 3;
    let nearest = null;
    let nearestDist = worldRange;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      // Ground turret targets land units and buildings only
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
}
