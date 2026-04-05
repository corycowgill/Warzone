import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class TechLab extends Building {
    constructor(team, position, game) {
        super('techlab', team, position, BUILDING_STATS.techlab);
        this.game = game;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(this.size * 2);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('bld_techlab', this.team);
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
        const foundationGeo = new THREE.BoxGeometry(4.5, 0.15, 4.0);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, 0.075, 0);
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main lab building
        const mainGeo = new THREE.BoxGeometry(4.0, 3.0, 3.5);
        const mainMat = new THREE.MeshPhongMaterial({ color: 0x445566 });
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.set(0, 1.65, 0);
        main.castShadow = true;
        main.receiveShadow = true;
        group.add(main);

        // Team-colored stripe
        const stripeGeo = new THREE.BoxGeometry(4.05, 0.4, 3.55);
        const stripeMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 2.8, 0);
        group.add(stripe);

        // Satellite dish on roof
        const dishGeo = new THREE.CylinderGeometry(0.05, 0.8, 0.3, 12);
        const dishMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(-0.8, 3.5, 0.5);
        dish.rotation.x = 0.3;
        dish.castShadow = true;
        group.add(dish);

        // Dish support pole
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(-0.8, 3.5, 0.5);
        group.add(pole);

        // Antenna array
        const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4);
        const antennaMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const antenna1 = new THREE.Mesh(antennaGeo, antennaMat);
        antenna1.position.set(1.2, 3.9, -0.8);
        group.add(antenna1);
        const antenna2 = new THREE.Mesh(antennaGeo, antennaMat);
        antenna2.position.set(1.2, 3.9, 0.8);
        group.add(antenna2);

        // Lab windows (glowing)
        const windowGeo = new THREE.BoxGeometry(0.05, 0.6, 0.8);
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x00ddff,
            emissive: 0x00aacc,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.7
        });
        const win1 = new THREE.Mesh(windowGeo, windowMat);
        win1.position.set(2.05, 2.0, -0.5);
        group.add(win1);
        const win2 = new THREE.Mesh(windowGeo, windowMat);
        win2.position.set(2.05, 2.0, 0.5);
        group.add(win2);

        // Entrance door
        const doorGeo = new THREE.BoxGeometry(0.05, 1.5, 1.0);
        const doorMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(2.05, 0.9, 0);
        group.add(door);

        // Tech symbol on side (gear-like circle)
        const gearGeo = new THREE.TorusGeometry(0.4, 0.08, 6, 8);
        const gearMat = new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: 0x886600, emissiveIntensity: 0.3 });
        const gear = new THREE.Mesh(gearGeo, gearMat);
        gear.position.set(-2.05, 2.0, 0);
        gear.rotation.y = Math.PI / 2;
        group.add(gear);

        return group;
    }
}
