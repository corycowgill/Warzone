import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class Drone extends Unit {
    constructor(team, position) {
        super('drone', team, position, UNIT_STATS.drone);
        this.rotorAngle = 0;
        this.rotors = [];
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(2);
        this.createHealthBar();
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;

        // Main body - flattened box
        const bodyGeo = new THREE.BoxGeometry(1, 0.3, 1);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 0, 0);
        body.castShadow = true;
        group.add(body);

        // Body detail - top plate
        const topGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
        const topMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.set(0, 0.2, 0);
        top.castShadow = true;
        group.add(top);

        // LED lights on body
        const ledGeo = new THREE.SphereGeometry(0.05, 6, 6);
        const ledMat = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });

        const led1 = new THREE.Mesh(ledGeo, ledMat);
        led1.position.set(0.45, 0.05, 0);
        group.add(led1);

        const led2 = new THREE.Mesh(ledGeo, ledMat);
        led2.position.set(-0.45, 0.05, 0);
        group.add(led2);

        // 4 rotor arms extending diagonally
        const armMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const armPositions = [
            { x: 0.7, z: 0.7, angle: Math.PI / 4 },
            { x: -0.7, z: 0.7, angle: -Math.PI / 4 },
            { x: -0.7, z: -0.7, angle: Math.PI / 4 },
            { x: 0.7, z: -0.7, angle: -Math.PI / 4 }
        ];

        for (const pos of armPositions) {
            // Arm
            const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6);
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = pos.angle;
            arm.position.set(pos.x * 0.5, 0.05, pos.z * 0.5);
            arm.castShadow = true;
            group.add(arm);

            // Motor housing at end of arm
            const motorGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8);
            const motorMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
            const motor = new THREE.Mesh(motorGeo, motorMat);
            motor.position.set(pos.x, 0.1, pos.z);
            group.add(motor);

            // Rotor disc at end of each arm
            const rotorGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.03, 12);
            const rotorMat = new THREE.MeshPhongMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.5
            });
            const rotor = new THREE.Mesh(rotorGeo, rotorMat);
            rotor.position.set(pos.x, 0.18, pos.z);
            group.add(rotor);
            this.rotors.push(rotor);

            // Rotor blade (cross shape for visual when spinning slowly)
            const bladeGeo = new THREE.BoxGeometry(0.6, 0.02, 0.06);
            const bladeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
            blade1.position.set(pos.x, 0.2, pos.z);
            group.add(blade1);
            this.rotors.push(blade1);

            const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
            blade2.rotation.y = Math.PI / 2;
            blade2.position.set(pos.x, 0.2, pos.z);
            group.add(blade2);
            this.rotors.push(blade2);

            // Landing skid under each arm
            const skidGeo = new THREE.BoxGeometry(0.03, 0.2, 0.03);
            const skidMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const skid = new THREE.Mesh(skidGeo, skidMat);
            skid.position.set(pos.x, -0.25, pos.z);
            group.add(skid);
        }

        // Landing skid bars
        const skidBarGeo = new THREE.BoxGeometry(0.03, 0.03, 1.6);
        const skidBarMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

        const skidBar1 = new THREE.Mesh(skidBarGeo, skidBarMat);
        skidBar1.position.set(0.7, -0.35, 0);
        group.add(skidBar1);

        const skidBar2 = new THREE.Mesh(skidBarGeo, skidBarMat);
        skidBar2.position.set(-0.7, -0.35, 0);
        group.add(skidBar2);

        // Camera / gun pod underneath
        const camGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const camMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const cam = new THREE.Mesh(camGeo, camMat);
        cam.position.set(0, -0.25, 0.1);
        cam.castShadow = true;
        group.add(cam);

        // Camera lens
        const lensGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.05, 8);
        const lensMat = new THREE.MeshPhongMaterial({
            color: 0x111133,
            emissive: 0x000044,
            emissiveIntensity: 0.3
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, -0.3, 0.25);
        group.add(lens);

        // Small gun barrel under camera
        const gunGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6);
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(0, -0.3, 0.4);
        group.add(gun);

        return group;
    }

    update(delta) {
        if (super.update) super.update(delta);

        // Spin rotors
        this.rotorAngle += delta * 15;
        for (const rotor of this.rotors) {
            rotor.rotation.y += delta * 15;
        }
    }
}
