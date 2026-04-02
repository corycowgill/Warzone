import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS, UNIT_ABILITIES } from '../core/Constants.js';

export class SPG extends Unit {
    constructor(team, position) {
        super('spg', team, position, UNIT_STATS.spg);
        this.modelRotationOffset = -Math.PI / 2;
        this._deployed = false;
        this._preDeploySpeed = this.speed;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
    }

    toggleDeploy() {
        if (this._deployed) {
            // Undeploy
            this._deployed = false;
            this.abilityActive = false;
            this.speed = this._preDeploySpeed;
            this.abilityCooldown = 1;
        } else {
            // Deploy
            this._deployed = true;
            this.abilityActive = true;
            this._preDeploySpeed = this.speed;
            this.speed = 0;
            this.moveTarget = null;
            this.waypoints = [];
            this.isMoving = false;
            this.abilityCooldown = 1;
        }
    }

    canAttack() {
        if (this.empDisabledTimer > 0) return false;
        if (!this._deployed) return false; // Must be deployed to fire
        return this.attackCooldown <= 0;
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x1a3366 : 0x661a1a;

        // Tracked chassis
        const trackGeo = new THREE.BoxGeometry(3.2, 0.5, 0.3);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(0, 0.25, -1.1);
        group.add(leftTrack);
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(0, 0.25, 1.1);
        group.add(rightTrack);

        // Low hull
        const hullGeo = new THREE.BoxGeometry(3.0, 0.8, 2.0);
        const hullMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0.9, 0);
        hull.castShadow = true;
        group.add(hull);

        // Open-topped fighting compartment
        const compartGeo = new THREE.BoxGeometry(1.5, 0.6, 1.8);
        const compartMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const compart = new THREE.Mesh(compartGeo, compartMat);
        compart.position.set(-0.5, 1.6, 0);
        compart.castShadow = true;
        group.add(compart);

        // Long artillery barrel
        const barrelGeo = new THREE.CylinderGeometry(0.1, 0.12, 3.5, 8);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(2.0, 1.6, 0);
        barrel.castShadow = true;
        group.add(barrel);

        // Muzzle brake
        const muzzleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.15, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
        muzzle.rotation.z = Math.PI / 2;
        muzzle.position.set(3.8, 1.6, 0);
        group.add(muzzle);

        // Recoil mechanism
        const recoilGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
        const recoilMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const recoil = new THREE.Mesh(recoilGeo, recoilMat);
        recoil.rotation.z = Math.PI / 2;
        recoil.position.set(0.5, 1.8, 0.4);
        group.add(recoil);

        return group;
    }
}
