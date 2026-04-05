import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class APC extends Unit {
    constructor(team, position) {
        super('apc', team, position, UNIT_STATS.apc);
        this.modelRotationOffset = -Math.PI / 2;
        this.garrisonSlots = 4;
        this.garrisoned = [];
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
    }

    canGarrison(unit) {
        if (!unit || !unit.isUnit || unit.type !== 'infantry') return false;
        if (unit.team !== this.team) return false;
        if (this.garrisoned.length >= this.garrisonSlots) return false;
        if (unit.isGarrisoned) return false;
        return true;
    }

    garrison(unit) {
        if (!this.canGarrison(unit)) return false;
        unit.isGarrisoned = true;
        unit.garrisonedIn = this;
        if (unit.mesh) unit.mesh.visible = false;
        if (unit.selectionRing) unit.selectionRing.visible = false;
        if (unit.healthBar) unit.healthBar.visible = false;
        unit.attackTarget = null;
        unit.moveTarget = null;
        unit.isMoving = false;
        this.garrisoned.push(unit);
        return true;
    }

    ejectAll() {
        const pos = this.getPosition();
        for (let i = 0; i < this.garrisoned.length; i++) {
            const unit = this.garrisoned[i];
            if (!unit.alive) continue;
            unit.isGarrisoned = false;
            unit.garrisonedIn = null;
            if (unit.mesh) {
                unit.mesh.visible = true;
                const angle = (i / this.garrisoned.length) * Math.PI * 2;
                const offset = 4;
                unit.mesh.position.set(
                    pos.x + Math.cos(angle) * offset,
                    pos.y,
                    pos.z + Math.sin(angle) * offset
                );
            }
            if (unit.selectionRing) unit.selectionRing.visible = true;
            if (unit.healthBar) unit.healthBar.visible = true;
        }
        this.garrisoned = [];
    }

    // Override takeDamage to kill garrisoned units when APC dies
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            // Kill all garrisoned units
            for (const unit of this.garrisoned) {
                if (unit.alive) {
                    unit.health = 0;
                    unit.alive = false;
                    unit.isGarrisoned = false;
                }
            }
            this.garrisoned = [];
        }
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_apc', this.team);
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

        // Elongated hull
        const hullGeo = new THREE.BoxGeometry(3.5, 1.0, 1.8);
        const hullMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0.8, 0);
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Upper hull (sloped armor)
        const upperGeo = new THREE.BoxGeometry(3.0, 0.5, 1.6);
        const upperMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const upper = new THREE.Mesh(upperGeo, upperMat);
        upper.position.set(0, 1.5, 0);
        upper.castShadow = true;
        group.add(upper);

        // Hatch on top
        const hatchGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
        const hatchMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const hatch = new THREE.Mesh(hatchGeo, hatchMat);
        hatch.position.set(-0.3, 1.8, 0);
        group.add(hatch);

        // Front windshield
        const glassGeo = new THREE.BoxGeometry(0.05, 0.35, 1.2);
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(1.5, 1.5, 0);
        group.add(glass);

        // Tracks
        const trackGeo = new THREE.BoxGeometry(3.6, 0.4, 0.3);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(0, 0.2, -1.0);
        group.add(leftTrack);
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(0, 0.2, 1.0);
        group.add(rightTrack);

        // Rear door
        const doorGeo = new THREE.BoxGeometry(0.1, 0.7, 1.2);
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(-1.8, 1.0, 0);
        group.add(door);

        // Small gun on top
        const gunGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.rotation.z = Math.PI / 2;
        gun.position.set(0.5, 1.85, 0);
        group.add(gun);

        return group;
    }
}
