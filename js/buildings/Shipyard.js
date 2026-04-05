import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Shipyard extends Building {
    constructor(team, position, game) {
        super('shipyard', team, position, BUILDING_STATS.shipyard);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_shipyard', this.team);
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
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

        // Main dock structure
        const dockGeo = new THREE.BoxGeometry(4, 2, 5);
        const dockMat = new THREE.MeshPhongMaterial({ color: 0x8B6B42 });
        const dock = new THREE.Mesh(dockGeo, dockMat);
        dock.position.set(0, 1.0, 0);
        dock.castShadow = true;
        dock.receiveShadow = true;
        group.add(dock);

        // Dock roof
        const roofGeo = new THREE.BoxGeometry(4.2, 0.15, 5.2);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x6B5232 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 2.1, 0);
        roof.castShadow = true;
        group.add(roof);

        // Roof ridge
        const ridgeGeo = new THREE.BoxGeometry(0.3, 0.6, 5.3);
        const ridgeMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a });
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.position.set(0, 2.4, 0);
        ridge.castShadow = true;
        group.add(ridge);

        // Dock front opening (facing water)
        const openingGeo = new THREE.BoxGeometry(2.5, 1.5, 0.1);
        const openingMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const opening = new THREE.Mesh(openingGeo, openingMat);
        opening.position.set(0, 0.95, 2.55);
        group.add(opening);

        // Windows on side
        const winGeo = new THREE.BoxGeometry(0.1, 0.4, 0.5);
        const winMat = new THREE.MeshPhongMaterial({
            color: 0x88aacc,
            emissive: 0x223344,
            emissiveIntensity: 0.15
        });

        for (let z = -1.5; z <= 1.5; z += 1.5) {
            const leftWin = new THREE.Mesh(winGeo, winMat);
            leftWin.position.set(-2.05, 1.5, z);
            group.add(leftWin);

            const rightWin = new THREE.Mesh(winGeo, winMat);
            rightWin.position.set(2.05, 1.5, z);
            group.add(rightWin);
        }

        // Pier / platform extending out into water
        const pierGeo = new THREE.BoxGeometry(5, 0.3, 3);
        const pierMat = new THREE.MeshPhongMaterial({ color: 0x7a6a3a });
        const pier = new THREE.Mesh(pierGeo, pierMat);
        pier.position.set(0, 0.15, 4.5);
        pier.receiveShadow = true;
        group.add(pier);

        // Pier support posts
        const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 6);
        const postMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a });
        const postPositions = [
            { x: -2.2, z: 3.5 }, { x: 2.2, z: 3.5 },
            { x: -2.2, z: 5.5 }, { x: 2.2, z: 5.5 },
            { x: 0, z: 5.5 }
        ];

        for (const pos of postPositions) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(pos.x, -0.5, pos.z);
            post.castShadow = true;
            group.add(post);
        }

        // Pier bollards (for tying ships)
        const bollardGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 6);
        const bollardMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

        for (let x = -2; x <= 2; x += 2) {
            const bollard = new THREE.Mesh(bollardGeo, bollardMat);
            bollard.position.set(x, 0.42, 5.8);
            group.add(bollard);
        }

        // Crane - tall structure with arm
        const craneBasePlatGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
        const craneMat = new THREE.MeshPhongMaterial({ color: 0xFFCC00 });
        const craneBasePlat = new THREE.Mesh(craneBasePlatGeo, craneMat);
        craneBasePlat.position.set(2.5, 2.2, -1.5);
        group.add(craneBasePlat);

        // Crane tower (lattice-like structure)
        const craneTowerGeo = new THREE.BoxGeometry(0.3, 5.0, 0.3);
        const craneTower = new THREE.Mesh(craneTowerGeo, craneMat);
        craneTower.position.set(2.5, 4.8, -1.5);
        craneTower.castShadow = true;
        group.add(craneTower);

        // Crane lattice details
        const latticeGeo = new THREE.BoxGeometry(0.05, 0.6, 0.35);
        for (let y = 2.5; y <= 6.5; y += 0.8) {
            const lattice = new THREE.Mesh(latticeGeo, craneMat);
            lattice.rotation.z = 0.8;
            lattice.position.set(2.5, y, -1.5);
            group.add(lattice);
        }

        // Crane arm - horizontal
        const craneArmGeo = new THREE.BoxGeometry(5.0, 0.2, 0.2);
        const craneArm = new THREE.Mesh(craneArmGeo, craneMat);
        craneArm.position.set(0.5, 7.3, -1.5);
        craneArm.castShadow = true;
        group.add(craneArm);

        // Crane arm support cables (diagonal)
        const cable1Geo = new THREE.CylinderGeometry(0.02, 0.02, 3.5, 4);
        const cableMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const cable1 = new THREE.Mesh(cable1Geo, cableMat);
        cable1.rotation.z = 0.6;
        cable1.position.set(1.0, 6.2, -1.5);
        group.add(cable1);

        const cable2 = new THREE.Mesh(cable1Geo, cableMat);
        cable2.rotation.z = -0.6;
        cable2.position.set(3.5, 6.2, -1.5);
        group.add(cable2);

        // Crane hook cable
        const hookCableGeo = new THREE.CylinderGeometry(0.015, 0.015, 3.0, 4);
        const hookCable = new THREE.Mesh(hookCableGeo, cableMat);
        hookCable.position.set(-0.5, 5.8, -1.5);
        group.add(hookCable);

        // Crane hook
        const hookGeo = new THREE.TorusGeometry(0.1, 0.025, 6, 8, Math.PI);
        const hookMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const hook = new THREE.Mesh(hookGeo, hookMat);
        hook.position.set(-0.5, 4.3, -1.5);
        group.add(hook);

        // Crane cab
        const cabGeo = new THREE.BoxGeometry(0.6, 0.5, 0.5);
        const cabMat = new THREE.MeshPhongMaterial({ color: 0xDDAA00 });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.set(2.5, 7.0, -1.5);
        cab.castShadow = true;
        group.add(cab);

        // Team-colored flags on poles
        const flagPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.0, 4);
        const flagPoleMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });

        const flagPole1 = new THREE.Mesh(flagPoleGeo, flagPoleMat);
        flagPole1.position.set(-2.3, 1.8, 5.8);
        group.add(flagPole1);

        const flag1Geo = new THREE.BoxGeometry(0.6, 0.4, 0.05);
        const flagMat = new THREE.MeshPhongMaterial({
            color: teamColor,
            side: THREE.DoubleSide
        });
        const flag1 = new THREE.Mesh(flag1Geo, flagMat);
        flag1.position.set(-2.0, 2.6, 5.8);
        group.add(flag1);

        const flagPole2 = new THREE.Mesh(flagPoleGeo, flagPoleMat);
        flagPole2.position.set(2.3, 1.8, 5.8);
        group.add(flagPole2);

        const flag2 = new THREE.Mesh(flag1Geo, flagMat);
        flag2.position.set(2.6, 2.6, 5.8);
        group.add(flag2);

        // Team stripe on building
        const stripeGeo = new THREE.BoxGeometry(4.05, 0.4, 0.05);
        const stripeMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const stripeBack = new THREE.Mesh(stripeGeo, stripeMat);
        stripeBack.position.set(0, 1.8, -2.55);
        group.add(stripeBack);

        // Supply crates on pier
        const crateGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const crateMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a });

        for (let i = 0; i < 4; i++) {
            const crate = new THREE.Mesh(crateGeo, crateMat);
            crate.position.set(-1.8 + i * 0.5, 0.45, 4.0 + Math.random() * 0.5);
            crate.rotation.y = Math.random() * 0.5;
            crate.castShadow = true;
            group.add(crate);
        }

        // Coiled ropes on pier
        const ropeGeo = new THREE.TorusGeometry(0.15, 0.04, 6, 12);
        const ropeMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        const rope1 = new THREE.Mesh(ropeGeo, ropeMat);
        rope1.rotation.x = Math.PI / 2;
        rope1.position.set(1.5, 0.35, 5.0);
        group.add(rope1);

        const rope2 = new THREE.Mesh(ropeGeo, ropeMat);
        rope2.rotation.x = Math.PI / 2;
        rope2.position.set(-1.5, 0.35, 5.2);
        group.add(rope2);

        // Dock light
        const lightPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4);
        const lightPoleMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const lightPole = new THREE.Mesh(lightPoleGeo, lightPoleMat);
        lightPole.position.set(0, 1.0, 5.8);
        group.add(lightPole);

        const lampGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const lampMat = new THREE.MeshPhongMaterial({
            color: 0xffeeaa,
            emissive: 0xffdd88,
            emissiveIntensity: 0.4
        });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(0, 1.85, 5.8);
        group.add(lamp);

        return group;
    }
}
