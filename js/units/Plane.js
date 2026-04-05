import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Plane extends Unit {
    constructor(team, position) {
        super('plane', team, position, UNIT_STATS.plane);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_plane', this.team);
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
        const lighterTeamColor = this.team === 'player' ? 0x4488dd : 0xdd5555;

        // Fuselage - main body
        const fuselageGeo = new THREE.BoxGeometry(3.5, 0.6, 0.8);
        const fuselageMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.position.set(0, 0, 0);
        fuselage.castShadow = true;
        group.add(fuselage);

        // Nose cone - tapered front
        const noseGeo = new THREE.BoxGeometry(0.8, 0.45, 0.6);
        const noseMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(2.0, -0.05, 0);
        nose.castShadow = true;
        group.add(nose);

        // Nose tip
        const tipGeo = new THREE.CylinderGeometry(0, 0.2, 0.5, 8);
        const tipMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.z = -Math.PI / 2;
        tip.position.set(2.6, 0, 0);
        tip.castShadow = true;
        group.add(tip);

        // Cockpit canopy
        const cockpitGeo = new THREE.SphereGeometry(0.25, 8, 6);
        const cockpitMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.7,
            emissive: 0x224466,
            emissiveIntensity: 0.2
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.scale.set(1.5, 1, 1);
        cockpit.position.set(1.0, 0.35, 0);
        group.add(cockpit);

        // Main wings
        const wingGeo = new THREE.BoxGeometry(1.0, 0.08, 5.0);
        const wingMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(-0.2, -0.05, 0);
        wings.castShadow = true;
        group.add(wings);

        // Wing tips (angled up slightly)
        const wingTipGeo = new THREE.BoxGeometry(0.3, 0.25, 0.08);
        const wingTipMat = new THREE.MeshPhongMaterial({ color: lighterTeamColor });

        const leftWingTip = new THREE.Mesh(wingTipGeo, wingTipMat);
        leftWingTip.position.set(-0.2, 0.1, -2.54);
        group.add(leftWingTip);

        const rightWingTip = new THREE.Mesh(wingTipGeo, wingTipMat);
        rightWingTip.position.set(-0.2, 0.1, 2.54);
        group.add(rightWingTip);

        // Wing pylons (for missiles/bombs)
        const pylonGeo = new THREE.BoxGeometry(0.3, 0.15, 0.08);
        const pylonMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

        for (const zOff of [-1.5, -0.8, 0.8, 1.5]) {
            const pylon = new THREE.Mesh(pylonGeo, pylonMat);
            pylon.position.set(-0.2, -0.2, zOff);
            group.add(pylon);

            // Missile/bomb under pylon
            const missileGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
            const missileMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
            const missile = new THREE.Mesh(missileGeo, missileMat);
            missile.rotation.z = Math.PI / 2;
            missile.position.set(-0.2, -0.32, zOff);
            group.add(missile);
        }

        // Tail horizontal stabilizer
        const tailWingGeo = new THREE.BoxGeometry(0.5, 0.06, 2.0);
        const tailWingMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const tailWing = new THREE.Mesh(tailWingGeo, tailWingMat);
        tailWing.position.set(-1.7, 0.1, 0);
        tailWing.castShadow = true;
        group.add(tailWing);

        // Tail vertical stabilizer (fin)
        const tailFinGeo = new THREE.BoxGeometry(0.6, 0.8, 0.06);
        const tailFinMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const tailFin = new THREE.Mesh(tailFinGeo, tailFinMat);
        tailFin.position.set(-1.6, 0.6, 0);
        tailFin.castShadow = true;
        group.add(tailFin);

        // Tail fin top
        const finTopGeo = new THREE.BoxGeometry(0.3, 0.3, 0.06);
        const finTop = new THREE.Mesh(finTopGeo, wingTipMat);
        finTop.position.set(-1.45, 1.05, 0);
        group.add(finTop);

        // Engine intakes on sides
        const intakeGeo = new THREE.BoxGeometry(0.6, 0.3, 0.15);
        const intakeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

        const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
        leftIntake.position.set(0.3, -0.15, -0.5);
        group.add(leftIntake);

        const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
        rightIntake.position.set(0.3, -0.15, 0.5);
        group.add(rightIntake);

        // Exhaust nozzle at back
        const exhaustGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
        const exhaustMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
        exhaust.rotation.z = Math.PI / 2;
        exhaust.position.set(-1.9, 0, 0);
        group.add(exhaust);

        // Team marking on tail
        const markGeo = new THREE.BoxGeometry(0.02, 0.3, 0.3);
        const markMat = new THREE.MeshPhongMaterial({ color: lighterTeamColor });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.set(-0.5, 0.35, 0);
        group.add(mark);

        return group;
    }
}
