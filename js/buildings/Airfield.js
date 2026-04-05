import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Airfield extends Building {
    constructor(team, position, game) {
        super('airfield', team, position, BUILDING_STATS.airfield);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_airfield', this.team);
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

        // Hangar - half-cylinder approximation using stacked boxes
        const hangarBaseGeo = new THREE.BoxGeometry(5, 2.0, 4);
        const hangarMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const hangarBase = new THREE.Mesh(hangarBaseGeo, hangarMat);
        hangarBase.position.set(0, 1.0, 0);
        hangarBase.castShadow = true;
        hangarBase.receiveShadow = true;
        group.add(hangarBase);

        // Hangar curved top - layered boxes to approximate arch
        const archLayers = [
            { width: 4.8, height: 0.4, yPos: 2.2 },
            { width: 4.4, height: 0.35, yPos: 2.55 },
            { width: 3.8, height: 0.3, yPos: 2.85 },
            { width: 3.0, height: 0.25, yPos: 3.08 },
            { width: 2.0, height: 0.2, yPos: 3.25 }
        ];

        for (const layer of archLayers) {
            const layerGeo = new THREE.BoxGeometry(layer.width, layer.height, 4.1);
            const layerMesh = new THREE.Mesh(layerGeo, hangarMat);
            layerMesh.position.set(0, layer.yPos, 0);
            layerMesh.castShadow = true;
            group.add(layerMesh);
        }

        // Hangar front face
        const frontGeo = new THREE.BoxGeometry(5.1, 3.2, 0.1);
        const frontMat = new THREE.MeshPhongMaterial({ color: 0x5a5a5a });
        const front = new THREE.Mesh(frontGeo, frontMat);
        front.position.set(0, 1.6, 2.05);
        group.add(front);

        // Hangar door opening (large)
        const doorGeo = new THREE.BoxGeometry(3.5, 2.5, 0.12);
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.25, 2.06);
        group.add(door);

        // Door tracks
        const trackGeo = new THREE.BoxGeometry(3.7, 0.06, 0.08);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const topTrack = new THREE.Mesh(trackGeo, trackMat);
        topTrack.position.set(0, 2.55, 2.1);
        group.add(topTrack);

        // Team colored hangar stripe
        const stripeGeo = new THREE.BoxGeometry(5.15, 0.4, 0.05);
        const stripeMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 2.6, 2.1);
        group.add(stripe);

        // Team colored side elements
        const sideStripeGeo = new THREE.BoxGeometry(0.05, 0.4, 4.1);
        const sideStripe1 = new THREE.Mesh(sideStripeGeo, stripeMat);
        sideStripe1.position.set(-2.55, 1.8, 0);
        group.add(sideStripe1);

        const sideStripe2 = new THREE.Mesh(sideStripeGeo, stripeMat);
        sideStripe2.position.set(2.55, 1.8, 0);
        group.add(sideStripe2);

        // Runway - extending forward from hangar
        const runwayGeo = new THREE.BoxGeometry(8, 0.1, 2);
        const runwayMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const runway = new THREE.Mesh(runwayGeo, runwayMat);
        runway.position.set(0, 0.05, 6.0);
        runway.receiveShadow = true;
        group.add(runway);

        // Runway edge markings (white)
        const edgeGeo = new THREE.BoxGeometry(8, 0.02, 0.08);
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

        const leftEdge = new THREE.Mesh(edgeGeo, whiteMat);
        leftEdge.position.set(0, 0.12, 5.05);
        group.add(leftEdge);

        const rightEdge = new THREE.Mesh(edgeGeo, whiteMat);
        rightEdge.position.set(0, 0.12, 6.95);
        group.add(rightEdge);

        // Runway center line (dashed white)
        for (let x = -3.5; x <= 3.5; x += 1.0) {
            const dashGeo = new THREE.BoxGeometry(0.6, 0.02, 0.1);
            const dash = new THREE.Mesh(dashGeo, whiteMat);
            dash.position.set(x, 0.12, 6.0);
            group.add(dash);
        }

        // Runway threshold markings
        for (let z = 5.3; z <= 6.7; z += 0.2) {
            const threshGeo = new THREE.BoxGeometry(0.8, 0.02, 0.08);
            const thresh = new THREE.Mesh(threshGeo, whiteMat);
            thresh.position.set(-3.6, 0.12, z);
            group.add(thresh);
        }

        // Runway numbers (simplified as blocks)
        const numGeo = new THREE.BoxGeometry(0.3, 0.02, 0.5);
        const num1 = new THREE.Mesh(numGeo, whiteMat);
        num1.position.set(3.0, 0.12, 5.8);
        group.add(num1);

        const num2 = new THREE.Mesh(numGeo, whiteMat);
        num2.position.set(3.0, 0.12, 6.4);
        group.add(num2);

        // Taxiway connecting hangar to runway
        const taxiGeo = new THREE.BoxGeometry(2.5, 0.08, 2.5);
        const taxiMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const taxi = new THREE.Mesh(taxiGeo, taxiMat);
        taxi.position.set(0, 0.04, 3.8);
        taxi.receiveShadow = true;
        group.add(taxi);

        // Taxiway yellow center line
        const taxiLineGeo = new THREE.BoxGeometry(0.06, 0.02, 2.5);
        const yellowMat = new THREE.MeshPhongMaterial({ color: 0xffcc00 });
        const taxiLine = new THREE.Mesh(taxiLineGeo, yellowMat);
        taxiLine.position.set(0, 0.1, 3.8);
        group.add(taxiLine);

        // Wind sock pole
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(4.5, 1.5, 5.0);
        pole.castShadow = true;
        group.add(pole);

        // Wind sock arm
        const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(4.75, 3.0, 5.0);
        group.add(arm);

        // Wind sock (cone shape)
        const sockGeo = new THREE.CylinderGeometry(0.02, 0.15, 0.6, 6);
        const sockMat = new THREE.MeshPhongMaterial({
            color: 0xff6600,
            side: THREE.DoubleSide
        });
        const sock = new THREE.Mesh(sockGeo, sockMat);
        sock.rotation.z = Math.PI / 2 + 0.3;
        sock.position.set(5.2, 2.85, 5.0);
        group.add(sock);

        // Wind sock stripes
        const sockStripeGeo = new THREE.CylinderGeometry(0.025, 0.12, 0.15, 6);
        const sockStripeMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const sockStripe = new THREE.Mesh(sockStripeGeo, sockStripeMat);
        sockStripe.rotation.z = Math.PI / 2 + 0.3;
        sockStripe.position.set(5.1, 2.88, 5.0);
        group.add(sockStripe);

        // Runway lights (small spheres along edges)
        const lightGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const lightMat = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });

        for (let x = -3.5; x <= 3.5; x += 1.4) {
            const light1 = new THREE.Mesh(lightGeo, lightMat);
            light1.position.set(x, 0.15, 5.0);
            group.add(light1);

            const light2 = new THREE.Mesh(lightGeo, lightMat);
            light2.position.set(x, 0.15, 7.0);
            group.add(light2);
        }

        // Approach lights (red at threshold)
        const redLightMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });

        for (let z = 5.2; z <= 6.8; z += 0.5) {
            const rLight = new THREE.Mesh(lightGeo, redLightMat);
            rLight.position.set(-4.2, 0.15, z);
            group.add(rLight);
        }

        // Fuel truck (simplified) near hangar
        const truckBodyGeo = new THREE.BoxGeometry(0.8, 0.4, 0.5);
        const truckMat = new THREE.MeshPhongMaterial({ color: 0x556B2F });
        const truckBody = new THREE.Mesh(truckBodyGeo, truckMat);
        truckBody.position.set(-3.0, 0.4, 1.0);
        truckBody.castShadow = true;
        group.add(truckBody);

        const truckTankGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8);
        const truckTankMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const truckTank = new THREE.Mesh(truckTankGeo, truckTankMat);
        truckTank.rotation.z = Math.PI / 2;
        truckTank.position.set(-3.0, 0.55, 1.0);
        truckTank.castShadow = true;
        group.add(truckTank);

        // Control tower (small)
        const towerGeo = new THREE.BoxGeometry(1.0, 2.5, 1.0);
        const towerMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(-3.5, 1.25, -1.0);
        tower.castShadow = true;
        group.add(tower);

        // Tower cab
        const cabGeo = new THREE.BoxGeometry(1.3, 0.8, 1.3);
        const cabMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.set(-3.5, 2.9, -1.0);
        cab.castShadow = true;
        group.add(cab);

        // Tower windows
        const towerWinGeo = new THREE.BoxGeometry(1.35, 0.3, 1.35);
        const towerWinMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x224466,
            emissiveIntensity: 0.3
        });
        const towerWin = new THREE.Mesh(towerWinGeo, towerWinMat);
        towerWin.position.set(-3.5, 3.0, -1.0);
        group.add(towerWin);

        return group;
    }
}
