import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Ditch extends Building {
    constructor(team, position, game) {
        super('ditch', team, position, BUILDING_STATS.ditch);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_ditch', this.team);
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

        // Earth mound base - low profile
        const moundGeo = new THREE.BoxGeometry(2, 0.5, 2);
        const moundMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        const mound = new THREE.Mesh(moundGeo, moundMat);
        mound.position.set(0, 0.25, 0);
        mound.receiveShadow = true;
        group.add(mound);

        // Dug out center (darker, lower)
        const dugoutGeo = new THREE.BoxGeometry(1.4, 0.35, 1.4);
        const dugoutMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a });
        const dugout = new THREE.Mesh(dugoutGeo, dugoutMat);
        dugout.position.set(0, 0.15, 0);
        dugout.receiveShadow = true;
        group.add(dugout);

        // Earth ridges around edges (dug-up dirt)
        const ridgeGeo = new THREE.BoxGeometry(2.2, 0.2, 0.25);
        const ridgeMat = new THREE.MeshPhongMaterial({ color: 0x7a6345 });

        // Back ridge (higher for protection)
        const backRidge = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.35, 0.3),
            ridgeMat
        );
        backRidge.position.set(0, 0.55, -1.05);
        backRidge.castShadow = true;
        group.add(backRidge);

        // Side ridges
        const sideRidgeGeo = new THREE.BoxGeometry(0.25, 0.25, 1.8);

        const leftRidge = new THREE.Mesh(sideRidgeGeo, ridgeMat);
        leftRidge.position.set(-1.05, 0.5, 0.1);
        leftRidge.castShadow = true;
        group.add(leftRidge);

        const rightRidge = new THREE.Mesh(sideRidgeGeo, ridgeMat);
        rightRidge.position.set(1.05, 0.5, 0.1);
        rightRidge.castShadow = true;
        group.add(rightRidge);

        // Sandbag walls - U-shape arrangement
        const sandbagGeo = new THREE.BoxGeometry(0.35, 0.15, 0.2);
        const sandbagMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });

        // Back wall sandbags (two rows)
        for (let x = -0.9; x <= 0.9; x += 0.38) {
            // Bottom row
            const sb1 = new THREE.Mesh(sandbagGeo, sandbagMat);
            sb1.position.set(x, 0.58, -0.85);
            sb1.rotation.y = Math.random() * 0.15 - 0.075;
            sb1.castShadow = true;
            group.add(sb1);

            // Top row (offset)
            const sb2 = new THREE.Mesh(sandbagGeo, sandbagMat);
            sb2.position.set(x + 0.1, 0.73, -0.85);
            sb2.rotation.y = Math.random() * 0.15 - 0.075;
            sb2.castShadow = true;
            group.add(sb2);

            // Third row in center for extra protection
            if (x > -0.5 && x < 0.5) {
                const sb3 = new THREE.Mesh(sandbagGeo, sandbagMat);
                sb3.position.set(x + 0.05, 0.88, -0.85);
                sb3.rotation.y = Math.random() * 0.1;
                sb3.castShadow = true;
                group.add(sb3);
            }
        }

        // Left wall sandbags
        const sideSandbagGeo = new THREE.BoxGeometry(0.2, 0.15, 0.35);
        for (let z = -0.7; z <= 0.3; z += 0.38) {
            const sb = new THREE.Mesh(sideSandbagGeo, sandbagMat);
            sb.position.set(-0.85, 0.58, z);
            sb.rotation.y = Math.random() * 0.1;
            sb.castShadow = true;
            group.add(sb);

            const sb2 = new THREE.Mesh(sideSandbagGeo, sandbagMat);
            sb2.position.set(-0.85, 0.73, z + 0.1);
            sb2.rotation.y = Math.random() * 0.1;
            sb2.castShadow = true;
            group.add(sb2);
        }

        // Right wall sandbags
        for (let z = -0.7; z <= 0.3; z += 0.38) {
            const sb = new THREE.Mesh(sideSandbagGeo, sandbagMat);
            sb.position.set(0.85, 0.58, z);
            sb.rotation.y = Math.random() * 0.1;
            sb.castShadow = true;
            group.add(sb);

            const sb2 = new THREE.Mesh(sideSandbagGeo, sandbagMat);
            sb2.position.set(0.85, 0.73, z + 0.1);
            sb2.rotation.y = Math.random() * 0.1;
            sb2.castShadow = true;
            group.add(sb2);
        }

        // Wooden support stakes in corners
        const stakeGeo = new THREE.BoxGeometry(0.06, 0.6, 0.06);
        const stakeMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });

        const stakePositions = [
            { x: -0.85, z: -0.85 },
            { x: 0.85, z: -0.85 },
            { x: -0.85, z: 0.4 },
            { x: 0.85, z: 0.4 }
        ];

        for (const pos of stakePositions) {
            const stake = new THREE.Mesh(stakeGeo, stakeMat);
            stake.position.set(pos.x, 0.6, pos.z);
            stake.castShadow = true;
            group.add(stake);
        }

        // Wooden planks as floor inside trench
        const plankGeo = new THREE.BoxGeometry(1.2, 0.04, 0.15);
        const plankMat = new THREE.MeshPhongMaterial({ color: 0x6B5B3B });

        for (let z = -0.5; z <= 0.5; z += 0.2) {
            const plank = new THREE.Mesh(plankGeo, plankMat);
            plank.position.set(0, 0.12, z);
            plank.rotation.y = Math.random() * 0.05;
            group.add(plank);
        }

        // Small team flag marker
        const markerPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
        const markerPoleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const markerPole = new THREE.Mesh(markerPoleGeo, markerPoleMat);
        markerPole.position.set(-0.7, 0.8, -0.7);
        group.add(markerPole);

        const markerFlagGeo = new THREE.BoxGeometry(0.3, 0.2, 0.03);
        const markerFlagMat = new THREE.MeshPhongMaterial({
            color: teamColor,
            side: THREE.DoubleSide
        });
        const markerFlag = new THREE.Mesh(markerFlagGeo, markerFlagMat);
        markerFlag.position.set(-0.55, 1.1, -0.7);
        group.add(markerFlag);

        // Spent shell casings (tiny details)
        const casingGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 4);
        const casingMat = new THREE.MeshPhongMaterial({ color: 0xCC9933 });

        for (let i = 0; i < 6; i++) {
            const casing = new THREE.Mesh(casingGeo, casingMat);
            casing.position.set(
                (Math.random() - 0.5) * 1.0,
                0.14,
                (Math.random() - 0.5) * 1.0
            );
            casing.rotation.z = Math.random() * Math.PI;
            casing.rotation.x = Math.PI / 2;
            group.add(casing);
        }

        // Ammo box inside trench
        const ammoGeo = new THREE.BoxGeometry(0.25, 0.15, 0.15);
        const ammoMat = new THREE.MeshPhongMaterial({ color: 0x3B4B23 });
        const ammo = new THREE.Mesh(ammoGeo, ammoMat);
        ammo.position.set(0.5, 0.2, -0.3);
        ammo.castShadow = true;
        group.add(ammo);

        // Second ammo box
        const ammo2 = new THREE.Mesh(ammoGeo, ammoMat);
        ammo2.position.set(0.3, 0.2, -0.5);
        ammo2.rotation.y = 0.4;
        ammo2.castShadow = true;
        group.add(ammo2);

        // Dirt mound scattered bits (irregular terrain)
        const dirtGeo = new THREE.BoxGeometry(0.3, 0.1, 0.2);
        const dirtMat = new THREE.MeshPhongMaterial({ color: 0x7a6a45 });

        const dirt1 = new THREE.Mesh(dirtGeo, dirtMat);
        dirt1.position.set(0.4, 0.35, 1.0);
        dirt1.rotation.y = 0.5;
        group.add(dirt1);

        const dirt2 = new THREE.Mesh(dirtGeo, dirtMat);
        dirt2.position.set(-0.6, 0.35, 0.9);
        dirt2.rotation.y = -0.3;
        group.add(dirt2);

        const dirt3 = new THREE.Mesh(dirtGeo, dirtMat);
        dirt3.position.set(1.1, 0.35, -0.3);
        dirt3.rotation.y = 1.2;
        group.add(dirt3);

        return group;
    }
}
