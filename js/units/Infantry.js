import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Infantry extends Unit {
    constructor(team, position) {
        super('infantry', team, position, UNIT_STATS.infantry);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(1.5);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_infantry', this.team);
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
        leftBoot.castShadow = true;
        group.add(leftBoot);

        const rightBoot = new THREE.Mesh(bootGeo, bootMat);
        rightBoot.position.set(0.15, 0.075, 0.05);
        rightBoot.castShadow = true;
        group.add(rightBoot);

        // Body / torso
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.4, 0.4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 1.3, 0);
        body.castShadow = true;
        group.add(body);

        // Belt
        const beltGeo = new THREE.BoxGeometry(0.62, 0.12, 0.42);
        const beltMat = new THREE.MeshPhongMaterial({ color: 0x3a2a1a });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(0, 0.75, 0);
        belt.castShadow = true;
        group.add(belt);

        // Shoulders / epaulettes
        const shoulderGeo = new THREE.BoxGeometry(0.2, 0.1, 0.45);
        const shoulderMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });

        const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        leftShoulder.position.set(-0.35, 1.9, 0);
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        rightShoulder.position.set(0.35, 1.9, 0);
        rightShoulder.castShadow = true;
        group.add(rightShoulder);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.18, 0.9, 0.18);
        const armMat = new THREE.MeshPhongMaterial({ color: teamColor });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.4, 1.35, 0);
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.4, 1.35, 0.15);
        rightArm.rotation.x = -0.3;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Head
        const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 2.25, 0);
        head.castShadow = true;
        group.add(head);

        // Helmet
        const helmetGeo = new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const helmetMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 2.3, 0);
        helmet.castShadow = true;
        group.add(helmet);

        // Gun - differs by team
        if (this.team === 'player') {
            // M16 style - longer, thinner
            const gunBodyGeo = new THREE.BoxGeometry(0.08, 0.08, 1.2);
            const gunMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);
            gunBody.position.set(0.35, 1.3, 0.7);
            gunBody.castShadow = true;
            group.add(gunBody);

            // Stock
            const stockGeo = new THREE.BoxGeometry(0.06, 0.12, 0.35);
            const stock = new THREE.Mesh(stockGeo, gunMat);
            stock.position.set(0.35, 1.3, 0.0);
            stock.castShadow = true;
            group.add(stock);

            // Barrel
            const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
            const barrel = new THREE.Mesh(barrelGeo, gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0.35, 1.32, 1.45);
            barrel.castShadow = true;
            group.add(barrel);

            // Magazine
            const magGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
            const mag = new THREE.Mesh(magGeo, gunMat);
            mag.position.set(0.35, 1.15, 0.55);
            mag.castShadow = true;
            group.add(mag);
        } else {
            // AK-47 style - shorter, thicker with curved magazine
            const gunBodyGeo = new THREE.BoxGeometry(0.1, 0.1, 1.0);
            const gunMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);
            gunBody.position.set(0.35, 1.3, 0.6);
            gunBody.castShadow = true;
            group.add(gunBody);

            // Wooden stock
            const stockGeo = new THREE.BoxGeometry(0.08, 0.1, 0.3);
            const stockMat = new THREE.MeshPhongMaterial({ color: 0x5C3A1E });
            const stock = new THREE.Mesh(stockGeo, stockMat);
            stock.position.set(0.35, 1.28, 0.0);
            stock.castShadow = true;
            group.add(stock);

            // Curved magazine
            const magGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
            const mag = new THREE.Mesh(magGeo, gunMat);
            mag.position.set(0.35, 1.1, 0.5);
            mag.rotation.x = 0.2;
            mag.castShadow = true;
            group.add(mag);

            // Barrel tip
            const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6);
            const barrel = new THREE.Mesh(barrelGeo, gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0.35, 1.32, 1.2);
            barrel.castShadow = true;
            group.add(barrel);
        }

        return group;
    }
}
