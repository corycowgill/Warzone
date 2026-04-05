import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Battleship extends Unit {
    constructor(team, position) {
        super('battleship', team, position, UNIT_STATS.battleship);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(4);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_battleship', this.team);
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

        // Hull - main body
        const hullGeo = new THREE.BoxGeometry(6, 1.5, 2.5);
        const hullMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0.45, 0);
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Hull bow (pointed front)
        const bowGeo = new THREE.BoxGeometry(1.5, 1.2, 2.0);
        const bowMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(3.5, 0.3, 0);
        bow.castShadow = true;
        group.add(bow);

        // Bow point
        const bowPointGeo = new THREE.BoxGeometry(0.8, 0.8, 1.0);
        const bowPoint = new THREE.Mesh(bowPointGeo, bowMat);
        bowPoint.position.set(4.2, 0.2, 0);
        bowPoint.castShadow = true;
        group.add(bowPoint);

        // Stern
        const sternGeo = new THREE.BoxGeometry(0.8, 1.0, 2.2);
        const sternMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
        const stern = new THREE.Mesh(sternGeo, sternMat);
        stern.position.set(-3.2, 0.3, 0);
        stern.castShadow = true;
        group.add(stern);

        // Deck - team colored
        const deckGeo = new THREE.BoxGeometry(6.5, 0.15, 2.6);
        const deckMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(0, 1.25, 0);
        deck.receiveShadow = true;
        group.add(deck);

        // Deck detail lines
        const lineGeo = new THREE.BoxGeometry(6.0, 0.02, 0.05);
        const lineMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
        for (let z = -0.8; z <= 0.8; z += 0.4) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, 1.35, z);
            group.add(line);
        }

        // Bridge / command tower
        const bridgeGeo = new THREE.BoxGeometry(1.2, 2.0, 1.4);
        const bridgeMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(0, 2.3, 0);
        bridge.castShadow = true;
        group.add(bridge);

        // Bridge windows
        const windowGeo = new THREE.BoxGeometry(0.02, 0.2, 1.0);
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x224466,
            emissiveIntensity: 0.3
        });
        const bridgeWindow = new THREE.Mesh(windowGeo, windowMat);
        bridgeWindow.position.set(0.62, 2.8, 0);
        group.add(bridgeWindow);

        // Bridge upper deck
        const bridgeTopGeo = new THREE.BoxGeometry(0.9, 0.5, 1.0);
        const bridgeTopMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const bridgeTop = new THREE.Mesh(bridgeTopGeo, bridgeTopMat);
        bridgeTop.position.set(0, 3.55, 0);
        bridgeTop.castShadow = true;
        group.add(bridgeTop);

        // Radar/antenna mast
        const mastGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
        const mastMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(0, 4.5, 0);
        group.add(mast);

        // Radar dish
        const radarGeo = new THREE.BoxGeometry(0.05, 0.4, 0.8);
        const radarMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
        const radar = new THREE.Mesh(radarGeo, radarMat);
        radar.position.set(0, 5.0, 0);
        group.add(radar);

        // Smokestack / funnel
        const funnelGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8);
        const funnelMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const funnel = new THREE.Mesh(funnelGeo, funnelMat);
        funnel.position.set(-0.8, 2.5, 0);
        funnel.castShadow = true;
        group.add(funnel);

        // Main turret at front
        const mainTurretBaseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 10);
        const turretMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const mainTurretBase = new THREE.Mesh(mainTurretBaseGeo, turretMat);
        mainTurretBase.position.set(2.0, 1.5, 0);
        group.add(mainTurretBase);

        const mainTurretGeo = new THREE.BoxGeometry(0.8, 0.5, 1.0);
        const mainTurret = new THREE.Mesh(mainTurretGeo, turretMat);
        mainTurret.position.set(2.0, 1.9, 0);
        mainTurret.castShadow = true;
        group.add(mainTurret);

        // Main turret barrels (triple)
        const mainBarrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 6);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

        for (let z = -0.25; z <= 0.25; z += 0.25) {
            const barrel = new THREE.Mesh(mainBarrelGeo, barrelMat);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.set(3.2, 1.9, z);
            barrel.castShadow = true;
            group.add(barrel);
        }

        // Secondary turret at back
        const secTurretBaseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 10);
        const secTurretBase = new THREE.Mesh(secTurretBaseGeo, turretMat);
        secTurretBase.position.set(-1.8, 1.5, 0);
        group.add(secTurretBase);

        const secTurretGeo = new THREE.BoxGeometry(0.6, 0.4, 0.8);
        const secTurret = new THREE.Mesh(secTurretGeo, turretMat);
        secTurret.position.set(-1.8, 1.8, 0);
        secTurret.castShadow = true;
        group.add(secTurret);

        // Secondary turret barrels (double)
        for (let z = -0.15; z <= 0.15; z += 0.3) {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6),
                barrelMat
            );
            barrel.rotation.z = Math.PI / 2;
            barrel.position.set(-2.8, 1.8, z);
            barrel.castShadow = true;
            group.add(barrel);
        }

        // Anti-aircraft guns on sides
        const aaGunGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
        const aaPositions = [
            { x: 0.8, z: 1.2 }, { x: 0.8, z: -1.2 },
            { x: -0.5, z: 1.2 }, { x: -0.5, z: -1.2 }
        ];

        for (const pos of aaPositions) {
            const aaGun = new THREE.Mesh(aaGunGeo, barrelMat);
            aaGun.rotation.z = Math.PI / 2;
            aaGun.position.set(pos.x + 0.3, 1.6, pos.z);
            group.add(aaGun);

            const aaBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 0.15, 6),
                turretMat
            );
            aaBase.position.set(pos.x, 1.45, pos.z);
            group.add(aaBase);
        }

        // Anchor at bow
        const anchorGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const anchorMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const anchor = new THREE.Mesh(anchorGeo, anchorMat);
        anchor.position.set(3.8, 0.6, 1.0);
        group.add(anchor);

        // Position at water level
        group.position.y = -0.3;

        return group;
    }
}
