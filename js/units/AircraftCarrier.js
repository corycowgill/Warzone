import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class AircraftCarrier extends Unit {
    constructor(team, position) {
        super('carrier', team, position, UNIT_STATS.carrier);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(5);
        this.createHealthBar();
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

        // Hull - very long
        const hullGeo = new THREE.BoxGeometry(8, 1.5, 3);
        const hullMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0.45, 0);
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Hull bow taper
        const bowGeo = new THREE.BoxGeometry(1.5, 1.2, 2.4);
        const bow = new THREE.Mesh(bowGeo, hullMat);
        bow.position.set(4.5, 0.3, 0);
        bow.castShadow = true;
        group.add(bow);

        // Bow point
        const bowTipGeo = new THREE.BoxGeometry(1.0, 0.8, 1.5);
        const bowTip = new THREE.Mesh(bowTipGeo, hullMat);
        bowTip.position.set(5.3, 0.2, 0);
        bowTip.castShadow = true;
        group.add(bowTip);

        // Stern
        const sternGeo = new THREE.BoxGeometry(0.6, 1.2, 2.8);
        const sternMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const stern = new THREE.Mesh(sternGeo, sternMat);
        stern.position.set(-4.2, 0.3, 0);
        stern.castShadow = true;
        group.add(stern);

        // Flight deck - wide flat top
        const deckGeo = new THREE.BoxGeometry(8, 0.2, 3.5);
        const deckMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(0.2, 1.3, 0);
        deck.receiveShadow = true;
        group.add(deck);

        // Flight deck extension at bow (angled deck)
        const deckExtGeo = new THREE.BoxGeometry(2.0, 0.2, 3.2);
        const deckExt = new THREE.Mesh(deckExtGeo, deckMat);
        deckExt.position.set(4.8, 1.3, 0);
        deckExt.receiveShadow = true;
        group.add(deckExt);

        // Runway markings - center line
        const centerLineGeo = new THREE.BoxGeometry(7.0, 0.02, 0.08);
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const centerLine = new THREE.Mesh(centerLineGeo, whiteMat);
        centerLine.position.set(0.5, 1.42, 0);
        group.add(centerLine);

        // Runway dashed side lines
        for (let i = -3; i <= 3; i++) {
            const dashGeo = new THREE.BoxGeometry(0.6, 0.02, 0.05);

            const leftDash = new THREE.Mesh(dashGeo, whiteMat);
            leftDash.position.set(i * 1.1, 1.42, -1.2);
            group.add(leftDash);

            const rightDash = new THREE.Mesh(dashGeo, whiteMat);
            rightDash.position.set(i * 1.1, 1.42, 1.2);
            group.add(rightDash);
        }

        // Angled landing area markings
        for (let i = 0; i < 4; i++) {
            const markGeo = new THREE.BoxGeometry(2.0, 0.02, 0.06);
            const mark = new THREE.Mesh(markGeo, whiteMat);
            mark.rotation.y = 0.15;
            mark.position.set(-1.5 + i * 0.3, 1.42, -0.5 + i * 0.3);
            group.add(mark);
        }

        // Catapult track markings
        const catGeo = new THREE.BoxGeometry(4.0, 0.02, 0.04);
        const yellowMat = new THREE.MeshPhongMaterial({ color: 0xffcc00 });

        const cat1 = new THREE.Mesh(catGeo, yellowMat);
        cat1.position.set(2.5, 1.42, -0.6);
        group.add(cat1);

        const cat2 = new THREE.Mesh(catGeo, yellowMat);
        cat2.position.set(2.5, 1.42, 0.6);
        group.add(cat2);

        // Island / bridge structure - offset to starboard (right) side
        const islandBaseGeo = new THREE.BoxGeometry(1.8, 1.5, 1.0);
        const islandMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const islandBase = new THREE.Mesh(islandBaseGeo, islandMat);
        islandBase.position.set(0.5, 2.15, 1.6);
        islandBase.castShadow = true;
        group.add(islandBase);

        // Island upper level
        const islandUpperGeo = new THREE.BoxGeometry(1.4, 1.0, 0.8);
        const islandUpperMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const islandUpper = new THREE.Mesh(islandUpperGeo, islandUpperMat);
        islandUpper.position.set(0.5, 3.4, 1.6);
        islandUpper.castShadow = true;
        group.add(islandUpper);

        // Island windows
        const windowGeo = new THREE.BoxGeometry(1.2, 0.2, 0.02);
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x224466,
            emissiveIntensity: 0.3
        });
        const windows = new THREE.Mesh(windowGeo, windowMat);
        windows.position.set(0.5, 3.6, 1.18);
        group.add(windows);

        // Island top deck
        const islandTopGeo = new THREE.BoxGeometry(1.0, 0.3, 0.6);
        const islandTop = new THREE.Mesh(islandTopGeo, islandMat);
        islandTop.position.set(0.5, 4.1, 1.6);
        group.add(islandTop);

        // Radar mast on island
        const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);
        const mastMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(0.5, 5.0, 1.6);
        group.add(mast);

        // Radar array
        const radarGeo = new THREE.BoxGeometry(0.04, 0.5, 0.8);
        const radarMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
        const radar = new THREE.Mesh(radarGeo, radarMat);
        radar.position.set(0.5, 5.5, 1.6);
        group.add(radar);

        // Secondary radar
        const radar2Geo = new THREE.BoxGeometry(0.04, 0.3, 0.5);
        const radar2 = new THREE.Mesh(radar2Geo, radarMat);
        radar2.rotation.y = Math.PI / 4;
        radar2.position.set(0.5, 5.9, 1.6);
        group.add(radar2);

        // Antenna array
        const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
        const antenna = new THREE.Mesh(antennaGeo, mastMat);
        antenna.position.set(0.5, 6.6, 1.6);
        group.add(antenna);

        // Smokestack behind island
        const stackGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
        const stackMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const stack = new THREE.Mesh(stackGeo, stackMat);
        stack.position.set(-0.5, 2.5, 1.6);
        stack.castShadow = true;
        group.add(stack);

        // Elevator platforms (for aircraft)
        const elevGeo = new THREE.BoxGeometry(1.2, 0.05, 1.5);
        const elevMat = new THREE.MeshPhongMaterial({ color: 0x999999 });

        const elev1 = new THREE.Mesh(elevGeo, elevMat);
        elev1.position.set(2.5, 1.38, -1.2);
        group.add(elev1);

        const elev2 = new THREE.Mesh(elevGeo, elevMat);
        elev2.position.set(-2.0, 1.38, -1.2);
        group.add(elev2);

        // Defensive gun positions
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const gunPositions = [
            { x: 3.5, z: 1.5 }, { x: 3.5, z: -1.5 },
            { x: -3.0, z: 1.5 }, { x: -3.0, z: -1.5 }
        ];

        for (const pos of gunPositions) {
            const gunBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8),
                gunMat
            );
            gunBase.position.set(pos.x, 1.45, pos.z);
            group.add(gunBase);

            const gunBarrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
                gunMat
            );
            gunBarrel.rotation.z = Math.PI / 4;
            gunBarrel.position.set(pos.x + 0.15, 1.7, pos.z);
            group.add(gunBarrel);
        }

        // Position at water level
        group.position.y = -0.3;

        return group;
    }
}
