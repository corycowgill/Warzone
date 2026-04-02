import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';

export class AATurret extends Building {
  constructor(team, position, game) {
    super('aaturret', team, position, BUILDING_STATS.aaturret);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2.5);
    this.createHealthBar();

    // Combat properties
    this.damage = BUILDING_STATS.aaturret.damage;
    this.range = BUILDING_STATS.aaturret.range;
    this.attackRate = BUILDING_STATS.aaturret.attackRate;
    this.armor = BUILDING_STATS.aaturret.armor;
    this.attackCooldown = 0;
    this.attackTarget = null;
    this.targetDomain = 'air';
    this.isTurret = true;
  }

  createMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;

    // Concrete base
    const baseGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.5, 8);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.25, 0);
    base.receiveShadow = true;
    base.castShadow = true;
    group.add(base);

    // Central support column
    const colGeo = new THREE.CylinderGeometry(0.6, 0.8, 2.5, 6);
    const colMat = new THREE.MeshPhongMaterial({ color: 0x4a5a3a });
    const column = new THREE.Mesh(colGeo, colMat);
    column.position.set(0, 1.75, 0);
    column.castShadow = true;
    group.add(column);

    // AA gun mount (rotatable)
    this.turretHead = new THREE.Group();

    // Mount platform
    const mountGeo = new THREE.BoxGeometry(1.0, 0.4, 1.0);
    const mountMat = new THREE.MeshPhongMaterial({ color: 0x555544 });
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(0, 0, 0);
    this.turretHead.add(mount);

    // Dual barrels angled upward
    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5);
    const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const barrel1 = new THREE.Mesh(barrelGeo, barrelMat);
    barrel1.rotation.x = Math.PI / 2 - 0.5; // Angled up
    barrel1.position.set(-0.2, 0.4, 1.0);
    barrel1.castShadow = true;
    this.turretHead.add(barrel1);

    const barrel2 = new THREE.Mesh(barrelGeo, barrelMat);
    barrel2.rotation.x = Math.PI / 2 - 0.5;
    barrel2.position.set(0.2, 0.4, 1.0);
    barrel2.castShadow = true;
    this.turretHead.add(barrel2);

    // Ammo magazine on side
    const magGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const magMat = new THREE.MeshPhongMaterial({ color: 0x3B4B23 });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(-0.5, 0.1, -0.2);
    this.turretHead.add(mag);

    this.turretHead.position.set(0, 3.2, 0);
    group.add(this.turretHead);

    // Radar dish on top
    const dishGeo = new THREE.CircleGeometry(0.6, 8);
    const dishMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0.6, 3.8, 0);
    dish.rotation.y = Math.PI / 4;
    group.add(dish);

    // Dish support
    const dishPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4);
    const dishPole = new THREE.Mesh(dishPoleGeo, new THREE.MeshPhongMaterial({ color: 0x888888 }));
    dishPole.position.set(0.6, 3.4, 0);
    group.add(dishPole);

    // Team marker light
    const markerGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const markerMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.5 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 4.0, 0);
    group.add(marker);

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.alive) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

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
      // AA turret targets air units only
      if (!enemy.isUnit || enemy.domain !== 'air') continue;

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
