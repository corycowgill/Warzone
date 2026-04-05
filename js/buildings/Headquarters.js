import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Headquarters extends Building {
    constructor(team, position, game) {
        super('headquarters', team, position, BUILDING_STATS.headquarters);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_headquarters', this.team);
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
        const darkTeamColor = this.team === 'player' ? 0x1a3366 : 0x661a1a;
        const lighterTeamColor = this.team === 'player' ? 0x4488dd : 0xdd5555;

        // Foundation / base platform
        const foundationGeo = new THREE.BoxGeometry(7, 0.3, 7);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, 0.15, 0);
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main building
        const mainGeo = new THREE.BoxGeometry(6, 4, 6);
        const mainMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.set(0, 2.3, 0);
        main.castShadow = true;
        main.receiveShadow = true;
        group.add(main);

        // Reinforced corners
        const cornerGeo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
        const cornerMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const corners = [
            { x: -2.8, z: -2.8 }, { x: 2.8, z: -2.8 },
            { x: -2.8, z: 2.8 }, { x: 2.8, z: 2.8 }
        ];
        for (const c of corners) {
            const corner = new THREE.Mesh(cornerGeo, cornerMat);
            corner.position.set(c.x, 2.4, c.z);
            corner.castShadow = true;
            group.add(corner);
        }

        // Roof - pyramid shape
        const roofGeo = new THREE.CylinderGeometry(0, 4.5, 2.5, 4);
        const roofMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(0, 5.55, 0);
        roof.castShadow = true;
        group.add(roof);

        // Roof edge trim
        const trimGeo = new THREE.BoxGeometry(6.3, 0.2, 6.3);
        const trimMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(0, 4.35, 0);
        group.add(trim);

        // Flag pole on top of roof
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0, 8.3, 0);
        group.add(pole);

        // Flag
        const flagGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05);
        const flagMat = new THREE.MeshPhongMaterial({
            color: teamColor,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.6, 9.4, 0);
        group.add(flag);

        // Flag detail stripe
        const stripeGeo = new THREE.BoxGeometry(1.15, 0.15, 0.06);
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0.6, 9.4, 0);
        group.add(stripe);

        // Entrance - front face
        const entranceGeo = new THREE.BoxGeometry(1.5, 2.5, 0.1);
        const entranceMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.set(0, 1.55, 3.05);
        group.add(entrance);

        // Entrance arch
        const archGeo = new THREE.BoxGeometry(1.8, 0.3, 0.3);
        const archMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 2.95, 3.05);
        arch.castShadow = true;
        group.add(arch);

        // Entrance pillars
        const pillarGeo = new THREE.BoxGeometry(0.25, 2.5, 0.25);
        const pillarMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-0.9, 1.55, 3.2);
        leftPillar.castShadow = true;
        group.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(0.9, 1.55, 3.2);
        rightPillar.castShadow = true;
        group.add(rightPillar);

        // Steps in front of entrance
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(2.0, 0.15, 0.3);
            const stepMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(0, 0.38 - i * 0.15, 3.4 + i * 0.3);
            step.receiveShadow = true;
            group.add(step);
        }

        // Windows on sides
        const windowGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x224466,
            emissiveIntensity: 0.2
        });

        // Front windows (above entrance)
        for (let x = -2; x <= 2; x += 1.3) {
            const win = new THREE.Mesh(windowGeo, windowMat);
            win.position.set(x, 3.5, 3.05);
            group.add(win);
        }

        // Side windows
        const sideWindowGeo = new THREE.BoxGeometry(0.1, 0.8, 0.6);
        for (let z = -2; z <= 2; z += 1.3) {
            for (let y = 1.8; y <= 3.5; y += 1.7) {
                const leftWin = new THREE.Mesh(sideWindowGeo, windowMat);
                leftWin.position.set(-3.05, y, z);
                group.add(leftWin);

                const rightWin = new THREE.Mesh(sideWindowGeo, windowMat);
                rightWin.position.set(3.05, y, z);
                group.add(rightWin);
            }
        }

        // Sandbags around perimeter
        const sandbagGeo = new THREE.BoxGeometry(0.6, 0.25, 0.3);
        const sandbagMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });

        const sandbagPositions = [];
        // Front sandbags (leaving gap for entrance)
        for (let x = -3.2; x <= -1.5; x += 0.65) {
            sandbagPositions.push({ x, z: 3.8 });
        }
        for (let x = 1.5; x <= 3.2; x += 0.65) {
            sandbagPositions.push({ x, z: 3.8 });
        }
        // Side sandbags
        for (let z = -3; z <= 3; z += 0.65) {
            sandbagPositions.push({ x: -3.8, z });
            sandbagPositions.push({ x: 3.8, z });
        }
        // Back sandbags
        for (let x = -3.2; x <= 3.2; x += 0.65) {
            sandbagPositions.push({ x, z: -3.8 });
        }

        for (const pos of sandbagPositions) {
            const sandbag = new THREE.Mesh(sandbagGeo, sandbagMat);
            sandbag.position.set(pos.x, 0.42, pos.z);
            sandbag.rotation.y = Math.random() * 0.2 - 0.1;
            sandbag.castShadow = true;
            group.add(sandbag);

            // Second layer on some
            if (Math.random() > 0.5) {
                const sandbag2 = new THREE.Mesh(sandbagGeo, sandbagMat);
                sandbag2.position.set(pos.x + 0.1, 0.67, pos.z);
                sandbag2.rotation.y = Math.random() * 0.3;
                sandbag2.castShadow = true;
                group.add(sandbag2);
            }
        }

        // Team emblem on front (simple colored square)
        const emblemGeo = new THREE.BoxGeometry(1.0, 1.0, 0.05);
        const emblemMat = new THREE.MeshPhongMaterial({ color: lighterTeamColor });
        const emblem = new THREE.Mesh(emblemGeo, emblemMat);
        emblem.position.set(0, 3.8, 3.08);
        group.add(emblem);

        // Star on emblem
        const starGeo = new THREE.BoxGeometry(0.5, 0.5, 0.06);
        const starMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const star = new THREE.Mesh(starGeo, starMat);
        star.rotation.z = Math.PI / 4;
        star.position.set(0, 3.8, 3.1);
        group.add(star);

        // Radio antenna on roof
        const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.0, 4);
        const antennaMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.set(-2, 6.0, -2);
        group.add(antenna);

        // Satellite dish
        const dishGeo = new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const dishMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.rotation.x = -0.5;
        dish.position.set(2, 5.5, -2);
        group.add(dish);

        return group;
    }
}
