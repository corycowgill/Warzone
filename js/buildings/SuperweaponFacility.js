import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS, SUPERWEAPON_CONFIG } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class SuperweaponFacility extends Building {
  constructor(team, position, game) {
    super('superweapon', team, position, BUILDING_STATS.superweapon);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2.5);
    this.createHealthBar();

    // Superweapon charge state
    const nationKey = game.teams[team]?.nation || 'america';
    this.weaponConfig = SUPERWEAPON_CONFIG.weapons[nationKey] || SUPERWEAPON_CONFIG.weapons.america;
    this.chargeTime = this.weaponConfig.chargeTime;
    this.chargeProgress = 0;
    this.isCharged = false;
    this.isFiring = false;

    // Charge bar visual
    this._chargeBar = null;
    this._createChargeBar();
  }

  _createChargeBar() {
    const barGroup = new THREE.Group();

    const bgGeo = new THREE.PlaneGeometry(4, 0.4);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    barGroup.add(bg);

    const fgGeo = new THREE.PlaneGeometry(4, 0.4);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0xff8800, side: THREE.DoubleSide });
    const fg = new THREE.Mesh(fgGeo, fgMat);
    fg.name = 'chargeFill';
    fg.scale.x = 0.001;
    fg.position.x = -2;
    barGroup.add(fg);

    barGroup.position.y = 10;
    this.mesh.add(barGroup);
    this._chargeBar = barGroup;
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('bld_superweapon', this.team);
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

    // Large base platform
    const baseGeo = new THREE.BoxGeometry(8, 1, 8);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Central silo
    const siloGeo = new THREE.CylinderGeometry(1.5, 2, 6, 8);
    const siloMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const silo = new THREE.Mesh(siloGeo, siloMat);
    silo.position.y = 4;
    silo.castShadow = true;
    group.add(silo);

    // Warning stripes
    const stripeGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 8);
    const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 2 + i * 2;
      group.add(stripe);
    }

    // Dome top
    const domeGeo = new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.2 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 7;
    dome.castShadow = true;
    group.add(dome);

    // Support buildings
    const auxGeo = new THREE.BoxGeometry(2, 2, 2);
    const auxMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const positions = [
      { x: -3, z: -3 }, { x: 3, z: -3 },
      { x: -3, z: 3 }, { x: 3, z: 3 }
    ];
    for (const pos of positions) {
      const aux = new THREE.Mesh(auxGeo, auxMat);
      aux.position.set(pos.x, 1.5, pos.z);
      aux.castShadow = true;
      group.add(aux);
    }

    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 4);
    const antennaMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 9;
    group.add(antenna);

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (!this.alive) return;

    // Don't charge during construction
    if (this._constructing) return;

    // Charge the weapon (requires MU - consumes 1 MU/s while charging)
    if (!this.isCharged && !this.isFiring) {
      const muAvailable = this.game?.teams?.[this.team]?.mu || 0;
      if (muAvailable < 1) {
        // Not enough MU - stall charging
        return;
      }
      // Consume MU while charging
      if (this.game?.teams?.[this.team]) {
        this.game.teams[this.team].mu -= deltaTime;
      }
      this.chargeProgress += deltaTime;
      if (this.chargeProgress >= this.chargeTime) {
        this.chargeProgress = this.chargeTime;
        this.isCharged = true;
        if (this.team === 'player' && this.game?.uiManager?.hud) {
          this.game.uiManager.hud.showNotification(
            `${this.weaponConfig.name} ready to fire!`, '#ff8800'
          );
        }
        if (this.game?.soundManager) {
          this.game.soundManager.play('produce');
        }
      }
    }

    // Update charge bar visual
    if (this._chargeBar) {
      const fill = this._chargeBar.getObjectByName('chargeFill');
      if (fill) {
        const ratio = this.chargeProgress / this.chargeTime;
        fill.scale.x = Math.max(0.001, ratio);
        fill.position.x = -2 + ratio * 2;
        fill.material.color.setHex(this.isCharged ? 0x00ff44 : 0xff8800);
      }
      // Billboard
      if (this.game?.sceneManager?.camera) {
        this._chargeBar.quaternion.copy(this.game.sceneManager.camera.quaternion);
      }
    }
  }

  getChargePercent() {
    return Math.min(1, this.chargeProgress / this.chargeTime);
  }

  fire(targetPos) {
    if (!this.isCharged || this.isFiring) return false;
    this.isFiring = true;
    this.isCharged = false;

    const weapon = this.weaponConfig;
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';

    // Warning siren
    if (this.game?.soundManager) {
      this.game.soundManager.play('explosion');
    }

    // Delay before impact
    setTimeout(() => {
      if (!this.alive || !this.game || this.game.state !== 'PLAYING') return;

      const enemies = this.game.getEntitiesByTeam(enemyTeam);
      const allEntities = [...enemies];

      // Apply damage based on weapon type
      if (weapon.type === 'carpet') {
        // Rectangular area
        const dir = targetPos.clone().sub(this.getPosition()).normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
        const halfW = (weapon.width || 10) / 2;
        const halfL = (weapon.length || 30) / 2;

        for (const entity of allEntities) {
          if (!entity.alive) continue;
          const ePos = entity.getPosition();
          const diff = ePos.clone().sub(targetPos);
          const along = diff.dot(dir);
          const across = diff.dot(perp);
          if (Math.abs(along) < halfL && Math.abs(across) < halfW) {
            const falloff = 1 - (Math.abs(along) / halfL) * 0.5;
            entity.takeDamage(weapon.damage * falloff);
            if (!entity.alive) {
              this.game.eventBus.emit('combat:kill', { attacker: this, defender: entity });
            }
          }
        }

        // Visual - explosions along the line
        for (let i = -3; i <= 3; i++) {
          const pos = targetPos.clone().add(dir.clone().multiplyScalar(i * 4));
          if (this.game.effectsManager) {
            this.game.effectsManager.createExplosion(pos);
          }
        }
      } else {
        // Circular AOE (nuke or rocket)
        for (const entity of allEntities) {
          if (!entity.alive) continue;
          const dist = entity.getPosition().distanceTo(targetPos);
          if (dist <= weapon.radius) {
            const falloff = 1 - (dist / weapon.radius) * 0.5;
            entity.takeDamage(weapon.damage * falloff);
            if (!entity.alive) {
              this.game.eventBus.emit('combat:kill', { attacker: this, defender: entity });
            }
          }
        }

        // Visual - big explosion
        if (this.game.effectsManager) {
          for (let i = 0; i < 5; i++) {
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * weapon.radius * 0.5,
              0,
              (Math.random() - 0.5) * weapon.radius * 0.5
            );
            this.game.effectsManager.createExplosion(targetPos.clone().add(offset));
          }
        }
      }

      // Camera shake
      if (this.game.cameraController) {
        this.game.cameraController.shake(3.0);
      }

      if (this.game.soundManager) {
        this.game.soundManager.play('explosion');
      }

      // Reset charge
      this.chargeProgress = 0;
      this.isFiring = false;
    }, 2000); // 2 second delay after fire command

    return true;
  }
}
