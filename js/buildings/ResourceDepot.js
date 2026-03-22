import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';

export class ResourceDepot extends Building {
    constructor(team, position, game) {
        super('resourcedepot', team, position, BUILDING_STATS.resourcedepot);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

        // Foundation
        const foundationGeo = new THREE.BoxGeometry(3.5, 0.12, 3.5);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, 0.06, 0);
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main warehouse building
        const warehouseGeo = new THREE.BoxGeometry(3, 2, 3);
        const warehouseMat = new THREE.MeshPhongMaterial({ color: 0x9B8B6B });
        const warehouse = new THREE.Mesh(warehouseGeo, warehouseMat);
        warehouse.position.set(0, 1.1, 0);
        warehouse.castShadow = true;
        warehouse.receiveShadow = true;
        group.add(warehouse);

        // Roof
        const roofGeo = new THREE.BoxGeometry(3.2, 0.15, 3.2);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x7a6a4a });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 2.15, 0);
        roof.castShadow = true;
        group.add(roof);

        // Roof peak
        const peakGeo = new THREE.CylinderGeometry(0, 2.3, 1.0, 4);
        const peakMat = new THREE.MeshPhongMaterial({ color: 0x6a5a3a });
        const peak = new THREE.Mesh(peakGeo, peakMat);
        peak.rotation.y = Math.PI / 4;
        peak.position.set(0, 2.7, 0);
        peak.castShadow = true;
        group.add(peak);

        // Loading dock / door
        const dockGeo = new THREE.BoxGeometry(1.5, 1.5, 0.1);
        const dockMat = new THREE.MeshPhongMaterial({ color: 0x3a2a1a });
        const dock = new THREE.Mesh(dockGeo, dockMat);
        dock.position.set(0, 0.85, 1.55);
        group.add(dock);

        // Loading dock frame
        const dockFrameGeo = new THREE.BoxGeometry(1.7, 1.7, 0.12);
        const dockFrameMat = new THREE.MeshPhongMaterial({ color: 0x6a5a3a });
        const dockFrame = new THREE.Mesh(dockFrameGeo, dockFrameMat);
        dockFrame.position.set(0, 0.95, 1.55);
        group.add(dockFrame);

        // Loading dock platform
        const platGeo = new THREE.BoxGeometry(2.5, 0.2, 1.5);
        const platMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(0, 0.2, 2.3);
        plat.receiveShadow = true;
        group.add(plat);

        // Platform ramp
        const rampGeo = new THREE.BoxGeometry(2.5, 0.1, 0.8);
        const ramp = new THREE.Mesh(rampGeo, platMat);
        ramp.rotation.x = 0.12;
        ramp.position.set(0, 0.1, 3.2);
        ramp.receiveShadow = true;
        group.add(ramp);

        // Windows on sides
        const winGeo = new THREE.BoxGeometry(0.1, 0.4, 0.5);
        const winMat = new THREE.MeshPhongMaterial({
            color: 0x88aacc,
            emissive: 0x223344,
            emissiveIntensity: 0.15
        });

        for (let z = -0.8; z <= 0.8; z += 0.8) {
            const leftWin = new THREE.Mesh(winGeo, winMat);
            leftWin.position.set(-1.55, 1.6, z);
            group.add(leftWin);

            const rightWin = new THREE.Mesh(winGeo, winMat);
            rightWin.position.set(1.55, 1.6, z);
            group.add(rightWin);
        }

        // Team-colored sign on front
        const signGeo = new THREE.BoxGeometry(1.0, 0.5, 0.08);
        const signMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 1.9, 1.58);
        group.add(sign);

        // Sign border
        const borderGeo = new THREE.BoxGeometry(1.1, 0.6, 0.07);
        const borderMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.set(0, 1.9, 1.57);
        group.add(border);

        // Supply crates scattered nearby - green military crates
        const crateGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
        const greenCrateMat = new THREE.MeshPhongMaterial({ color: 0x3B5323 });

        const crate1 = new THREE.Mesh(crateGeo, greenCrateMat);
        crate1.position.set(2.2, 0.32, 0.5);
        crate1.rotation.y = 0.3;
        crate1.castShadow = true;
        group.add(crate1);

        const crate2 = new THREE.Mesh(crateGeo, greenCrateMat);
        crate2.position.set(2.0, 0.32, -0.1);
        crate2.rotation.y = -0.15;
        crate2.castShadow = true;
        group.add(crate2);

        const crate3 = new THREE.Mesh(crateGeo, greenCrateMat);
        crate3.position.set(2.3, 0.32, -0.6);
        crate3.castShadow = true;
        group.add(crate3);

        // Stacked crate on top
        const crate4 = new THREE.Mesh(crateGeo, greenCrateMat);
        crate4.position.set(2.1, 0.72, 0.2);
        crate4.rotation.y = 0.5;
        crate4.castShadow = true;
        group.add(crate4);

        // Brown wooden crates
        const brownCrateGeo = new THREE.BoxGeometry(0.45, 0.35, 0.35);
        const brownCrateMat = new THREE.MeshPhongMaterial({ color: 0x8B6B42 });

        const bCrate1 = new THREE.Mesh(brownCrateGeo, brownCrateMat);
        bCrate1.position.set(-2.0, 0.29, 1.0);
        bCrate1.rotation.y = 0.2;
        bCrate1.castShadow = true;
        group.add(bCrate1);

        const bCrate2 = new THREE.Mesh(brownCrateGeo, brownCrateMat);
        bCrate2.position.set(-2.3, 0.29, 0.5);
        bCrate2.rotation.y = -0.4;
        bCrate2.castShadow = true;
        group.add(bCrate2);

        const bCrate3 = new THREE.Mesh(brownCrateGeo, brownCrateMat);
        bCrate3.position.set(-2.1, 0.29, 0.0);
        bCrate3.castShadow = true;
        group.add(bCrate3);

        const bCrate4 = new THREE.Mesh(brownCrateGeo, brownCrateMat);
        bCrate4.position.set(-2.15, 0.64, 0.5);
        bCrate4.rotation.y = 0.1;
        bCrate4.castShadow = true;
        group.add(bCrate4);

        const bCrate5 = new THREE.Mesh(brownCrateGeo, brownCrateMat);
        bCrate5.position.set(-2.15, 0.64, 0.0);
        bCrate5.rotation.y = -0.2;
        bCrate5.castShadow = true;
        group.add(bCrate5);

        // Barrel / oil drums near crates
        const barrelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x336633 });

        const barrel1 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel1.position.set(2.5, 0.37, 1.2);
        barrel1.castShadow = true;
        group.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, barrelMat);
        barrel2.position.set(2.2, 0.37, 1.4);
        barrel2.castShadow = true;
        group.add(barrel2);

        // Pallet under crates on loading dock
        const palletGeo = new THREE.BoxGeometry(1.2, 0.08, 0.8);
        const palletMat = new THREE.MeshPhongMaterial({ color: 0x9B8B6B });
        const pallet = new THREE.Mesh(palletGeo, palletMat);
        pallet.position.set(0.5, 0.34, 2.3);
        group.add(pallet);

        // Crates on pallet
        const palletCrate1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.35, 0.35),
            brownCrateMat
        );
        palletCrate1.position.set(0.3, 0.55, 2.3);
        palletCrate1.castShadow = true;
        group.add(palletCrate1);

        const palletCrate2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.35, 0.35),
            greenCrateMat
        );
        palletCrate2.position.set(0.8, 0.55, 2.3);
        palletCrate2.castShadow = true;
        group.add(palletCrate2);

        // Hand truck / dolly
        const dollyHandleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
        const dollyMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const dollyHandle = new THREE.Mesh(dollyHandleGeo, dollyMat);
        dollyHandle.rotation.z = 0.3;
        dollyHandle.position.set(-0.8, 0.5, 2.8);
        group.add(dollyHandle);

        const dollyBaseGeo = new THREE.BoxGeometry(0.3, 0.04, 0.4);
        const dollyBase = new THREE.Mesh(dollyBaseGeo, dollyMat);
        dollyBase.position.set(-0.65, 0.14, 2.8);
        group.add(dollyBase);

        // Light above loading dock
        const lightArmGeo = new THREE.BoxGeometry(0.5, 0.04, 0.04);
        const lightArmMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const lightArm = new THREE.Mesh(lightArmGeo, lightArmMat);
        lightArm.position.set(0, 2.0, 1.8);
        group.add(lightArm);

        const bulbGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const bulbMat = new THREE.MeshPhongMaterial({
            color: 0xffeeaa,
            emissive: 0xffdd88,
            emissiveIntensity: 0.4
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(0.25, 1.95, 1.8);
        group.add(bulb);

        return group;
    }
}
