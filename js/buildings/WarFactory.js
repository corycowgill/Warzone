import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class WarFactory extends Building {
    constructor(team, position, game) {
        super('warfactory', team, position, BUILDING_STATS.warfactory);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_warfactory', this.team);
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
        const foundationGeo = new THREE.BoxGeometry(5.5, 0.2, 4.5);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, 0.1, 0);
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main industrial building
        const mainGeo = new THREE.BoxGeometry(5, 3, 4);
        const mainMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.set(0, 1.7, 0);
        main.castShadow = true;
        main.receiveShadow = true;
        group.add(main);

        // Roof
        const roofGeo = new THREE.BoxGeometry(5.2, 0.15, 4.2);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 3.25, 0);
        roof.castShadow = true;
        group.add(roof);

        // Roof supports / beams visible
        const beamGeo = new THREE.BoxGeometry(5.1, 0.15, 0.1);
        const beamMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        for (let z = -1.5; z <= 1.5; z += 1.0) {
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(0, 3.35, z);
            group.add(beam);
        }

        // Large garage door opening - front face
        const garageDoorGeo = new THREE.BoxGeometry(3.0, 2.5, 0.1);
        const garageDoorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const garageDoor = new THREE.Mesh(garageDoorGeo, garageDoorMat);
        garageDoor.position.set(0, 1.45, 2.05);
        group.add(garageDoor);

        // Garage door frame
        const frameTopGeo = new THREE.BoxGeometry(3.3, 0.2, 0.2);
        const frameMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
        frameTop.position.set(0, 2.8, 2.05);
        group.add(frameTop);

        const frameSideGeo = new THREE.BoxGeometry(0.15, 2.6, 0.2);
        const frameLeft = new THREE.Mesh(frameSideGeo, frameMat);
        frameLeft.position.set(-1.55, 1.5, 2.05);
        group.add(frameLeft);

        const frameRight = new THREE.Mesh(frameSideGeo, frameMat);
        frameRight.position.set(1.55, 1.5, 2.05);
        group.add(frameRight);

        // Garage door horizontal lines (panel lines)
        const panelGeo = new THREE.BoxGeometry(2.9, 0.03, 0.02);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        for (let y = 0.7; y <= 2.5; y += 0.5) {
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(0, y, 2.12);
            group.add(panel);
        }

        // Ramp leading to garage
        const rampGeo = new THREE.BoxGeometry(3.2, 0.1, 1.5);
        const rampMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const ramp = new THREE.Mesh(rampGeo, rampMat);
        ramp.position.set(0, 0.15, 2.8);
        ramp.rotation.x = 0.05;
        ramp.receiveShadow = true;
        group.add(ramp);

        // Chimney / smokestack
        const chimneyGeo = new THREE.CylinderGeometry(0.25, 0.3, 2.5, 8);
        const chimneyMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(-1.8, 4.5, -1.2);
        chimney.castShadow = true;
        group.add(chimney);

        // Chimney cap
        const capGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.15, 8);
        const capMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(-1.8, 5.8, -1.2);
        group.add(cap);

        // Smoke effect ring at top
        const smokeRingGeo = new THREE.TorusGeometry(0.2, 0.05, 6, 8);
        const smokeRingMat = new THREE.MeshPhongMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.5
        });
        const smokeRing = new THREE.Mesh(smokeRingGeo, smokeRingMat);
        smokeRing.rotation.x = Math.PI / 2;
        smokeRing.position.set(-1.8, 5.9, -1.2);
        group.add(smokeRing);

        // Crane base
        const craneBaseGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const craneMat = new THREE.MeshPhongMaterial({ color: 0xFFCC00 });
        const craneBase = new THREE.Mesh(craneBaseGeo, craneMat);
        craneBase.position.set(2.0, 3.45, -1.0);
        group.add(craneBase);

        // Crane vertical mast
        const craneMastGeo = new THREE.BoxGeometry(0.2, 3.0, 0.2);
        const craneMast = new THREE.Mesh(craneMastGeo, craneMat);
        craneMast.position.set(2.0, 4.9, -1.0);
        craneMast.castShadow = true;
        group.add(craneMast);

        // Crane arm - horizontal extending forward
        const craneArmGeo = new THREE.BoxGeometry(4.0, 0.15, 0.15);
        const craneArm = new THREE.Mesh(craneArmGeo, craneMat);
        craneArm.position.set(0.5, 6.3, -1.0);
        craneArm.castShadow = true;
        group.add(craneArm);

        // Crane counter-weight arm (shorter, extending back)
        const counterGeo = new THREE.BoxGeometry(1.5, 0.15, 0.15);
        const counter = new THREE.Mesh(counterGeo, craneMat);
        counter.position.set(3.2, 6.3, -1.0);
        group.add(counter);

        // Crane cable
        const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4);
        const cableMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const cable = new THREE.Mesh(cableGeo, cableMat);
        cable.position.set(-0.8, 5.0, -1.0);
        group.add(cable);

        // Crane hook
        const hookGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 8, Math.PI);
        const hookMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const hook = new THREE.Mesh(hookGeo, hookMat);
        hook.position.set(-0.8, 3.8, -1.0);
        group.add(hook);

        // Crane counterweight block
        const weightGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
        const weightMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const weight = new THREE.Mesh(weightGeo, weightMat);
        weight.position.set(3.5, 6.0, -1.0);
        weight.castShadow = true;
        group.add(weight);

        // Team-colored stripe on side
        const stripeGeo = new THREE.BoxGeometry(0.05, 0.5, 3.8);
        const stripeMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const stripeLeft = new THREE.Mesh(stripeGeo, stripeMat);
        stripeLeft.position.set(-2.53, 2.5, 0);
        group.add(stripeLeft);

        const stripeRight = new THREE.Mesh(stripeGeo, stripeMat);
        stripeRight.position.set(2.53, 2.5, 0);
        group.add(stripeRight);

        // Team emblem on side
        const emblemGeo = new THREE.BoxGeometry(0.06, 1.0, 1.0);
        const emblemMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const emblem = new THREE.Mesh(emblemGeo, emblemMat);
        emblem.position.set(-2.55, 1.8, 0);
        group.add(emblem);

        // Industrial windows (high up on sides)
        const indWinGeo = new THREE.BoxGeometry(0.08, 0.6, 0.4);
        const indWinMat = new THREE.MeshPhongMaterial({
            color: 0xaabb99,
            emissive: 0x334422,
            emissiveIntensity: 0.15
        });

        for (let z = -1.2; z <= 1.2; z += 0.8) {
            const rWin = new THREE.Mesh(indWinGeo, indWinMat);
            rWin.position.set(2.55, 2.8, z);
            group.add(rWin);
        }

        // Ventilation units on roof
        const ventGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        const ventMat = new THREE.MeshPhongMaterial({ color: 0x555555 });

        const vent1 = new THREE.Mesh(ventGeo, ventMat);
        vent1.position.set(1.0, 3.5, 0.5);
        vent1.castShadow = true;
        group.add(vent1);

        const vent2 = new THREE.Mesh(ventGeo, ventMat);
        vent2.position.set(-0.5, 3.5, 1.0);
        vent2.castShadow = true;
        group.add(vent2);

        // Oil drums near factory
        const drumGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
        const drumMat = new THREE.MeshPhongMaterial({ color: 0x333366 });

        const drum1 = new THREE.Mesh(drumGeo, drumMat);
        drum1.position.set(-2.8, 0.45, 1.5);
        drum1.castShadow = true;
        group.add(drum1);

        const drum2 = new THREE.Mesh(drumGeo, drumMat);
        drum2.position.set(-3.1, 0.45, 1.2);
        drum2.castShadow = true;
        group.add(drum2);

        const drum3 = new THREE.Mesh(drumGeo, drumMat);
        drum3.position.set(-2.9, 0.45, 0.8);
        drum3.castShadow = true;
        group.add(drum3);

        return group;
    }
}
