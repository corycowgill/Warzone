import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class MortarTeam extends Unit {
    constructor(team, position) {
        super('mortar', team, position, UNIT_STATS.mortar);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_mortarteam', this.team);
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

        // Small box body (base plate)
        const baseGeo = new THREE.BoxGeometry(1.0, 0.3, 0.8);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x4a4a3a });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.15, 0);
        base.castShadow = true;
        group.add(base);

        // Bipod legs
        const legMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.3, 0.4, 0.3);
        leftLeg.rotation.x = -0.3;
        leftLeg.rotation.z = 0.2;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.3, 0.4, 0.3);
        rightLeg.rotation.x = -0.3;
        rightLeg.rotation.z = -0.2;
        group.add(rightLeg);

        // Mortar tube (cylinder angled upward)
        const tubeGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8);
        const tubeMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0, 0.9, 0.1);
        tube.rotation.x = -0.3; // angled
        tube.castShadow = true;
        group.add(tube);

        // Tube opening ring
        const ringGeo = new THREE.TorusGeometry(0.13, 0.03, 8, 12);
        const ring = new THREE.Mesh(ringGeo, tubeMat);
        ring.position.set(0, 1.45, -0.08);
        ring.rotation.x = Math.PI / 2 - 0.3;
        group.add(ring);

        // Operator figure (simplified soldier)
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.9, 0.3);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(-0.5, 0.75, -0.2);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(-0.5, 1.35, -0.2);
        group.add(head);

        // Helmet
        const helmetGeo = new THREE.SphereGeometry(0.17, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const helmetMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(-0.5, 1.4, -0.2);
        group.add(helmet);

        // Ammo box next to mortar
        const ammoGeo = new THREE.BoxGeometry(0.3, 0.25, 0.2);
        const ammoMat = new THREE.MeshPhongMaterial({ color: 0x5a5a3a });
        const ammo = new THREE.Mesh(ammoGeo, ammoMat);
        ammo.position.set(0.5, 0.125, -0.2);
        group.add(ammo);

        return group;
    }
}
