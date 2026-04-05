import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class AAHalfTrack extends Unit {
    constructor(team, position) {
        super('aahalftrack', team, position, UNIT_STATS.aahalftrack);
        this.modelRotationOffset = -Math.PI / 2;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(2.5);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_aahalftrack', this.team);
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

        // Half-track chassis
        const chassisGeo = new THREE.BoxGeometry(3.0, 0.8, 1.6);
        const chassisMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.set(0, 0.6, 0);
        chassis.castShadow = true;
        group.add(chassis);

        // Front wheels
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const frontLeft = new THREE.Mesh(wheelGeo, wheelMat);
        frontLeft.rotation.x = Math.PI / 2;
        frontLeft.position.set(1.1, 0.3, -0.9);
        group.add(frontLeft);
        const frontRight = new THREE.Mesh(wheelGeo, wheelMat);
        frontRight.rotation.x = Math.PI / 2;
        frontRight.position.set(1.1, 0.3, 0.9);
        group.add(frontRight);

        // Rear tracks
        const trackGeo = new THREE.BoxGeometry(1.5, 0.4, 0.3);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(-0.5, 0.3, -0.9);
        group.add(leftTrack);
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(-0.5, 0.3, 0.9);
        group.add(rightTrack);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.0, 0.7, 1.4);
        const cabinMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0.8, 1.3, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // AA gun mount platform
        const platformGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8);
        const platformMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(-0.3, 1.1, 0);
        group.add(platform);

        // AA barrel pointing upward
        const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel1 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel1.position.set(-0.3, 2.0, 0.1);
        barrel1.rotation.x = -0.5; // angled upward
        barrel1.castShadow = true;
        group.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel2.position.set(-0.3, 2.0, -0.1);
        barrel2.rotation.x = -0.5;
        barrel2.castShadow = true;
        group.add(barrel2);

        // Gun shield
        const shieldGeo = new THREE.BoxGeometry(0.05, 0.5, 0.8);
        const shieldMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(-0.05, 1.5, 0);
        group.add(shield);

        return group;
    }
}
