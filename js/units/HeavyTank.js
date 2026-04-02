import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class HeavyTank extends Unit {
    constructor(team, position) {
        super('heavytank', team, position, UNIT_STATS.heavytank);
        this.modelRotationOffset = -Math.PI / 2;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3.5);
        this.createHealthBar();
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x1a3366 : 0x661a1a;
        const lighterTeamColor = this.team === 'player' ? 0x4477cc : 0xcc4444;

        // Wide heavy tracks
        const trackGeo = new THREE.BoxGeometry(4.0, 0.6, 0.5);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(0, 0.3, -1.5);
        leftTrack.castShadow = true;
        group.add(leftTrack);
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(0, 0.3, 1.5);
        rightTrack.castShadow = true;
        group.add(rightTrack);

        // Track fenders
        const fenderGeo = new THREE.BoxGeometry(4.2, 0.1, 0.6);
        const fenderMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const leftFender = new THREE.Mesh(fenderGeo, fenderMat);
        leftFender.position.set(0, 0.65, -1.5);
        group.add(leftFender);
        const rightFender = new THREE.Mesh(fenderGeo, fenderMat);
        rightFender.position.set(0, 0.65, 1.5);
        group.add(rightFender);

        // Massive hull
        const hullGeo = new THREE.BoxGeometry(3.8, 1.3, 2.8);
        const hullMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 1.3, 0);
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Frontal armor slope
        const frontGeo = new THREE.BoxGeometry(1.0, 0.8, 2.5);
        const front = new THREE.Mesh(frontGeo, hullMat);
        front.position.set(2.1, 1.0, 0);
        front.rotation.z = -0.4;
        front.castShadow = true;
        group.add(front);

        // Side skirts
        const skirtGeo = new THREE.BoxGeometry(3.5, 0.5, 0.08);
        const skirtMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const leftSkirt = new THREE.Mesh(skirtGeo, skirtMat);
        leftSkirt.position.set(0, 0.6, -1.8);
        group.add(leftSkirt);
        const rightSkirt = new THREE.Mesh(skirtGeo, skirtMat);
        rightSkirt.position.set(0, 0.6, 1.8);
        group.add(rightSkirt);

        // Turret base
        const turretBaseGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.2, 12);
        const turretBaseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const turretBase = new THREE.Mesh(turretBaseGeo, turretBaseMat);
        turretBase.position.set(0, 2.0, 0);
        group.add(turretBase);

        // Large turret
        const turretGeo = new THREE.BoxGeometry(2.0, 0.9, 1.6);
        const turretMat = new THREE.MeshPhongMaterial({ color: lighterTeamColor });
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.set(0.2, 2.5, 0);
        turret.castShadow = true;
        group.add(turret);

        // Massive main gun
        const barrelGeo = new THREE.CylinderGeometry(0.16, 0.16, 3.0, 8);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(2.5, 2.5, 0);
        barrel.castShadow = true;
        group.add(barrel);

        // Muzzle brake
        const muzzleGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
        muzzle.rotation.z = Math.PI / 2;
        muzzle.position.set(4.1, 2.5, 0);
        group.add(muzzle);

        // Commander hatch
        const hatchGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8);
        const hatchMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const hatch = new THREE.Mesh(hatchGeo, hatchMat);
        hatch.position.set(-0.4, 3.0, 0);
        group.add(hatch);

        // Exhaust pipes
        const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
        const exhaustMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
        const exhaust1 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exhaust1.position.set(-1.8, 2.2, 0.8);
        group.add(exhaust1);
        const exhaust2 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exhaust2.position.set(-1.8, 2.2, -0.8);
        group.add(exhaust2);

        return group;
    }
}
