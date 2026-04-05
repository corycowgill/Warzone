import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Bomber extends Unit {
    constructor(team, position) {
        super('bomber', team, position, UNIT_STATS.bomber);
        this.modelRotationOffset = -Math.PI / 2;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3.5);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_bomber', this.team);
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

        // Large fuselage
        const fuselageGeo = new THREE.CylinderGeometry(0.5, 0.4, 5, 8);
        const fuselageMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.rotation.z = Math.PI / 2;
        fuselage.castShadow = true;
        group.add(fuselage);

        // Cockpit (nose)
        const noseGeo = new THREE.SphereGeometry(0.45, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.6 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(2.5, 0, 0);
        group.add(nose);

        // Wide wings
        const wingGeo = new THREE.BoxGeometry(2.0, 0.08, 8);
        const wingMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0, 0);
        wings.castShadow = true;
        group.add(wings);

        // Wing engines (2 per side)
        const engineGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
        const engineMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const enginePositions = [
            { x: 0.3, z: -2 }, { x: 0.3, z: 2 },
            { x: 0.3, z: -3.2 }, { x: 0.3, z: 3.2 }
        ];
        for (const ep of enginePositions) {
            const engine = new THREE.Mesh(engineGeo, engineMat);
            engine.rotation.z = Math.PI / 2;
            engine.position.set(ep.x, -0.2, ep.z);
            group.add(engine);
        }

        // Tail fin (vertical)
        const tailVGeo = new THREE.BoxGeometry(1.0, 1.5, 0.08);
        const tailMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const tailV = new THREE.Mesh(tailVGeo, tailMat);
        tailV.position.set(-2.5, 0.7, 0);
        group.add(tailV);

        // Tail fin (horizontal)
        const tailHGeo = new THREE.BoxGeometry(0.8, 0.08, 2.5);
        const tailH = new THREE.Mesh(tailHGeo, tailMat);
        tailH.position.set(-2.5, 0.5, 0);
        group.add(tailH);

        // Bomb bay (dark underside)
        const bayGeo = new THREE.BoxGeometry(1.5, 0.2, 0.6);
        const bayMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const bay = new THREE.Mesh(bayGeo, bayMat);
        bay.position.set(0, -0.45, 0);
        group.add(bay);

        return group;
    }
}
