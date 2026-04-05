import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Engineer extends Unit {
  constructor(team, position) {
    super('engineer', team, position, UNIT_STATS.engineer);
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(1.5);
    this.createHealthBar();

    // Engineer-specific state
    this._captureTarget = null;
    this._captureProgress = 0;
    this._captureTime = 10; // seconds to capture
    this._repairTarget = null;
    this._repairRate = 5; // HP per second
    this._mines = []; // placed mines tracked by game
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('unit_engineer', this.team);
    if (model) {
      const group = new THREE.Group();
      group.add(model);
      this._hasGLBModel = true;
      return group;
    }
    this._hasGLBModel = false;
    return this._createProceduralMesh();
  }

  _createProceduralMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
    const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

    // Legs
    const legMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.24, 0.15, 0.3);
    const bootMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.15, 0.075, 0.05);
    group.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.15, 0.075, 0.05);
    group.add(rightBoot);

    // Body - distinct yellow/orange vest over team color
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.4, 0.4);
    const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = true;
    group.add(body);

    // Safety vest (distinctive from infantry)
    const vestGeo = new THREE.BoxGeometry(0.64, 0.8, 0.44);
    const vestMat = new THREE.MeshPhongMaterial({ color: 0xccaa22, emissive: 0x554400, emissiveIntensity: 0.2 });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.set(0, 1.5, 0);
    vest.castShadow = true;
    group.add(vest);

    // Tool belt
    const beltGeo = new THREE.BoxGeometry(0.62, 0.15, 0.42);
    const beltMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.75, 0);
    group.add(belt);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.9, 0.18);
    const armMat = new THREE.MeshPhongMaterial({ color: teamColor });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4, 1.35, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.4, 1.35, 0.1);
    rightArm.rotation.x = -0.4;
    rightArm.castShadow = true;
    group.add(rightArm);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.25, 0);
    head.castShadow = true;
    group.add(head);

    // Hard hat (yellow - distinctive from infantry helmet)
    const hatGeo = new THREE.CylinderGeometry(0.15, 0.3, 0.2, 8);
    const hatMat = new THREE.MeshPhongMaterial({ color: 0xddcc00 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.set(0, 2.45, 0);
    hat.castShadow = true;
    group.add(hat);

    // Wrench tool (held in right hand - distinct visual)
    const wrenchHandle = new THREE.BoxGeometry(0.06, 0.5, 0.06);
    const toolMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const handle = new THREE.Mesh(wrenchHandle, toolMat);
    handle.position.set(0.4, 1.0, 0.35);
    handle.rotation.x = -0.5;
    handle.castShadow = true;
    group.add(handle);

    // Wrench head (C-shape using box)
    const wrenchHead = new THREE.BoxGeometry(0.15, 0.08, 0.15);
    const wrenchHeadMesh = new THREE.Mesh(wrenchHead, toolMat);
    wrenchHeadMesh.position.set(0.4, 0.75, 0.5);
    group.add(wrenchHeadMesh);

    // Shoulder patches (team color markers)
    const patchGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    const patchMat = new THREE.MeshPhongMaterial({ color: darkTeamColor, emissive: darkTeamColor, emissiveIntensity: 0.3 });
    const leftPatch = new THREE.Mesh(patchGeo, patchMat);
    leftPatch.position.set(-0.35, 1.85, 0.21);
    group.add(leftPatch);
    const rightPatch = new THREE.Mesh(patchGeo, patchMat);
    rightPatch.position.set(0.35, 1.85, 0.21);
    group.add(rightPatch);

    return group;
  }

  update(delta) {
    super.update(delta);
    if (!this.alive) return;

    // Handle capture in progress
    if (this._captureTarget) {
      this._updateCapture(delta);
    }

    // Handle repair in progress
    if (this._repairTarget) {
      this._updateRepair(delta);
    }
  }

  // Start capturing an enemy building
  startCapture(building) {
    if (!building || !building.alive || !building.isBuilding) return false;
    if (building.team === this.team) return false;

    // Must be below 50% HP
    if (building.health > building.maxHealth * 0.5) return false;

    // Must be adjacent (within 8 units)
    if (this.distanceTo(building) > 8) return false;

    this._captureTarget = building;
    this._captureProgress = 0;
    this.moveTarget = null;
    this.attackTarget = null;
    this.isMoving = false;
    return true;
  }

  _updateCapture(delta) {
    const target = this._captureTarget;
    if (!target || !target.alive || target.team === this.team) {
      this._captureTarget = null;
      this._captureProgress = 0;
      return;
    }

    // Check still adjacent
    if (this.distanceTo(target) > 10) {
      this._captureTarget = null;
      this._captureProgress = 0;
      return;
    }

    this._captureProgress += delta;

    // Emit progress event for UI
    if (this.game?.eventBus) {
      this.game.eventBus.emit('engineer:captureProgress', {
        engineer: this,
        building: target,
        progress: this._captureProgress / this._captureTime
      });
    }

    if (this._captureProgress >= this._captureTime) {
      // Capture complete - switch building team
      const oldTeam = target.team;
      target.team = this.team;

      // Update visual
      if (target.mesh) {
        const newColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        target.mesh.traverse(child => {
          if (child.isMesh && child.material && child.material.color) {
            // Only recolor team-colored parts (not grey/neutral)
            const hex = child.material.color.getHex();
            if (hex === 0xff3333 || hex === 0x3366ff || hex === 0xaa2222 || hex === 0x224499) {
              child.material.color.setHex(newColor);
            }
          }
        });
      }

      if (this.game?.eventBus) {
        this.game.eventBus.emit('building:captured', {
          building: target,
          engineer: this,
          oldTeam,
          newTeam: this.team
        });
      }

      if (this.game?.uiManager?.hud && this.team === 'player') {
        this.game.uiManager.hud.showNotification(
          `Building captured: ${target.type}!`, '#ffcc00'
        );
      }
      if (this.game?.soundManager) {
        this.game.soundManager.play('produce');
      }

      this._captureTarget = null;
      this._captureProgress = 0;
    }
  }

  // Start repairing a friendly building
  startRepair(building) {
    if (!building || !building.alive || !building.isBuilding) return false;
    if (building.team !== this.team) return false;
    if (building.health >= building.maxHealth) return false;

    this._repairTarget = building;
    return true;
  }

  _updateRepair(delta) {
    const target = this._repairTarget;
    if (!target || !target.alive || target.team !== this.team) {
      this._repairTarget = null;
      return;
    }

    // Check still adjacent
    if (this.distanceTo(target) > 8) {
      this._repairTarget = null;
      return;
    }

    // Heal the building
    if (target.health < target.maxHealth) {
      target.health = Math.min(target.maxHealth, target.health + this._repairRate * delta);
    } else {
      this._repairTarget = null; // fully repaired
    }
  }

  // Plant a mine at the current position
  plantMine() {
    if (!this.game) return false;

    // Check and deduct MU cost (50 MU per mine)
    const muCost = 50;
    if (this.game.resourceSystem && !this.game.resourceSystem.canAffordMU(this.team, muCost)) {
      if (this.game.uiManager?.hud && this.team === 'player') {
        this.game.uiManager.hud.showNotification(`Not enough MU to plant mine (need ${muCost})`, '#ff4444');
      }
      return false;
    }
    if (this.game.resourceSystem) {
      this.game.resourceSystem.spendMU(this.team, muCost);
    }

    const pos = this.getPosition().clone();

    // Create mine entity (invisible until triggered)
    const mineGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 8);
    const mineMat = new THREE.MeshPhongMaterial({
      color: 0x4a4a3a,
      transparent: true,
      opacity: this.team === 'player' ? 0.3 : 0.0 // semi-visible to owner
    });
    const mineMesh = new THREE.Mesh(mineGeo, mineMat);
    mineMesh.position.copy(pos);
    if (this.game.terrain) {
      mineMesh.position.y = this.game.terrain.getHeightAt(pos.x, pos.z) + 0.15;
    }
    this.game.sceneManager.scene.add(mineMesh);

    const mine = {
      mesh: mineMesh,
      position: pos,
      team: this.team,
      damage: 150,
      radius: 6,
      alive: true,
      triggerRadius: 3
    };

    if (!this.game._mines) this.game._mines = [];
    this.game._mines.push(mine);

    return true;
  }
}
