import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Barracks extends Building {
    constructor(team, position, game) {
        super('barracks', team, position, BUILDING_STATS.barracks);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_barracks', this.team);
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

        // Foundation
        const foundationGeo = new THREE.BoxGeometry(4.5, 0.15, 3.5);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, 0.075, 0);
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main structure - olive drab military building
        const mainGeo = new THREE.BoxGeometry(4, 2.5, 3);
        const mainMat = new THREE.MeshPhongMaterial({ color: 0x6B6B3B });
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.set(0, 1.4, 0);
        main.castShadow = true;
        main.receiveShadow = true;
        group.add(main);

        // Roof - slightly slanted (higher on one side)
        const roofGeo = new THREE.BoxGeometry(4.3, 0.2, 3.3);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x4a4a2a });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 2.75, 0);
        roof.rotation.z = 0.08;
        roof.castShadow = true;
        group.add(roof);

        // Roof ridge cap
        const ridgeGeo = new THREE.BoxGeometry(4.3, 0.15, 0.3);
        const ridgeMat = new THREE.MeshPhongMaterial({ color: 0x555544 });
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.position.set(0, 2.9, 0);
        group.add(ridge);

        // Door - front face
        const doorGeo = new THREE.BoxGeometry(1.0, 2.0, 0.1);
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x2a2a1a });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.15, 1.55);
        group.add(door);

        // Door frame
        const doorFrameGeo = new THREE.BoxGeometry(1.2, 2.2, 0.15);
        const doorFrameMat = new THREE.MeshPhongMaterial({ color: 0x555544 });
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(0, 1.25, 1.55);
        group.add(doorFrame);

        // Door handle
        const handleGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
        const handleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0.35, 1.15, 1.65);
        group.add(handle);

        // Windows - front face (small, military style)
        const windowGeo = new THREE.BoxGeometry(0.5, 0.4, 0.1);
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x88aacc,
            emissive: 0x223344,
            emissiveIntensity: 0.15
        });

        const frontWin1 = new THREE.Mesh(windowGeo, windowMat);
        frontWin1.position.set(-1.3, 2.0, 1.55);
        group.add(frontWin1);

        const frontWin2 = new THREE.Mesh(windowGeo, windowMat);
        frontWin2.position.set(1.3, 2.0, 1.55);
        group.add(frontWin2);

        // Window frames
        const frameGeo = new THREE.BoxGeometry(0.55, 0.45, 0.12);
        const frameMat = new THREE.MeshPhongMaterial({ color: 0x555544 });

        const frame1 = new THREE.Mesh(frameGeo, frameMat);
        frame1.position.set(-1.3, 2.0, 1.55);
        group.add(frame1);

        const frame2 = new THREE.Mesh(frameGeo, frameMat);
        frame2.position.set(1.3, 2.0, 1.55);
        group.add(frame2);

        // Side windows
        const sideWinGeo = new THREE.BoxGeometry(0.1, 0.4, 0.5);
        const sideFrameGeo = new THREE.BoxGeometry(0.12, 0.45, 0.55);

        for (let z = -0.8; z <= 0.8; z += 0.8) {
            // Left side
            const leftWin = new THREE.Mesh(sideWinGeo, windowMat);
            leftWin.position.set(-2.05, 2.0, z);
            group.add(leftWin);

            const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
            leftFrame.position.set(-2.05, 2.0, z);
            group.add(leftFrame);

            // Right side
            const rightWin = new THREE.Mesh(sideWinGeo, windowMat);
            rightWin.position.set(2.05, 2.0, z);
            group.add(rightWin);

            const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
            rightFrame.position.set(2.05, 2.0, z);
            group.add(rightFrame);
        }

        // Team-colored banner on right side
        const bannerGeo = new THREE.BoxGeometry(0.1, 1.2, 0.8);
        const bannerMat = new THREE.MeshPhongMaterial({
            color: teamColor,
            side: THREE.DoubleSide
        });
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(2.08, 1.8, -1.0);
        group.add(banner);

        // Banner emblem
        const emblemGeo = new THREE.BoxGeometry(0.12, 0.4, 0.4);
        const emblemMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const emblem = new THREE.Mesh(emblemGeo, emblemMat);
        emblem.position.set(2.1, 2.0, -1.0);
        group.add(emblem);

        // Training equipment outside - pull-up bar
        const barPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
        const barMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

        const leftPole = new THREE.Mesh(barPoleGeo, barMat);
        leftPole.position.set(-1.5, 0.9, -2.0);
        leftPole.castShadow = true;
        group.add(leftPole);

        const rightPole = new THREE.Mesh(barPoleGeo, barMat);
        rightPole.position.set(-0.5, 0.9, -2.0);
        rightPole.castShadow = true;
        group.add(rightPole);

        const crossBar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
            barMat
        );
        crossBar.rotation.z = Math.PI / 2;
        crossBar.position.set(-1.0, 1.8, -2.0);
        group.add(crossBar);

        // Sandbags near door
        const sandbagGeo = new THREE.BoxGeometry(0.5, 0.2, 0.25);
        const sandbagMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });

        for (let i = 0; i < 3; i++) {
            const sb = new THREE.Mesh(sandbagGeo, sandbagMat);
            sb.position.set(-1.8 + i * 0.55, 0.25, 2.0);
            sb.rotation.y = Math.random() * 0.2;
            sb.castShadow = true;
            group.add(sb);
        }

        // Ammo crates near side
        const crateGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const crateMat = new THREE.MeshPhongMaterial({ color: 0x556B2F });

        const crate1 = new THREE.Mesh(crateGeo, crateMat);
        crate1.position.set(2.5, 0.3, 0.5);
        crate1.castShadow = true;
        group.add(crate1);

        const crate2 = new THREE.Mesh(crateGeo, crateMat);
        crate2.position.set(2.5, 0.3, 0);
        crate2.rotation.y = 0.3;
        crate2.castShadow = true;
        group.add(crate2);

        const crate3 = new THREE.Mesh(crateGeo, crateMat);
        crate3.position.set(2.55, 0.6, 0.25);
        crate3.rotation.y = -0.2;
        crate3.castShadow = true;
        group.add(crate3);

        // Chimney / ventilation
        const chimneyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6);
        const chimneyMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(1.2, 3.1, -0.8);
        chimney.castShadow = true;
        group.add(chimney);

        return group;
    }
}
