import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class PatrolBoat extends Unit {
    constructor(team, position) {
        super('patrolboat', team, position, UNIT_STATS.patrolboat);
        this.modelRotationOffset = -Math.PI / 2;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(2.5);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_patrolboat', this.team);
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

        // Small flat hull
        const hullGeo = new THREE.BoxGeometry(3.0, 0.6, 1.2);
        const hullMat = new THREE.MeshPhongMaterial({ color: 0x556666 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0.15, 0);
        hull.castShadow = true;
        group.add(hull);

        // Bow (front taper)
        const bowGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
        const bow = new THREE.Mesh(bowGeo, hullMat);
        bow.position.set(1.7, 0.1, 0);
        group.add(bow);

        // Small cabin/wheelhouse
        const cabinGeo = new THREE.BoxGeometry(0.8, 0.7, 0.9);
        const cabinMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(-0.3, 0.8, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // Windshield
        const glassGeo = new THREE.BoxGeometry(0.04, 0.4, 0.7);
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0.15, 0.85, 0);
        group.add(glass);

        // Forward gun turret
        const turretGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8);
        const turretMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.set(0.8, 0.6, 0);
        group.add(turret);

        // Gun barrel
        const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(1.3, 0.7, 0);
        group.add(barrel);

        // Antenna mast
        const mastGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
        const mastMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(-0.3, 1.5, 0);
        group.add(mast);

        // Depth charge rack (rear)
        const rackGeo = new THREE.BoxGeometry(0.4, 0.25, 0.6);
        const rackMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(-1.2, 0.55, 0);
        group.add(rack);

        return group;
    }
}
