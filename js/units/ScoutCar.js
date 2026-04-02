import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class ScoutCar extends Unit {
    constructor(team, position) {
        super('scoutcar', team, position, UNIT_STATS.scoutcar);
        this.modelRotationOffset = -Math.PI / 2;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(2.5);
        this.createHealthBar();
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

        // Low flat body
        const bodyGeo = new THREE.BoxGeometry(2.5, 0.6, 1.4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 0.7, 0);
        body.castShadow = true;
        group.add(body);

        // Windshield/cabin (slightly raised)
        const cabinGeo = new THREE.BoxGeometry(0.8, 0.5, 1.2);
        const cabinMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(-0.3, 1.2, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // Windshield glass
        const glassGeo = new THREE.BoxGeometry(0.05, 0.35, 1.0);
        const glassMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.6 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0.15, 1.2, 0);
        group.add(glass);

        // 4 wheels (cylinders)
        const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

        const wheelPositions = [
            { x: 0.8, z: -0.8 },
            { x: 0.8, z: 0.8 },
            { x: -0.8, z: -0.8 },
            { x: -0.8, z: 0.8 }
        ];

        for (const wp of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wp.x, 0.25, wp.z);
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Antenna on roof
        const antennaGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4);
        const antennaMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.set(-0.6, 1.8, 0.4);
        group.add(antenna);

        // Headlights
        const lightGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const lightMat = new THREE.MeshPhongMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 0.3 });
        const light1 = new THREE.Mesh(lightGeo, lightMat);
        light1.position.set(1.3, 0.7, 0.4);
        group.add(light1);
        const light2 = new THREE.Mesh(lightGeo, lightMat);
        light2.position.set(1.3, 0.7, -0.4);
        group.add(light2);

        return group;
    }
}
