import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Tank extends Unit {
    constructor(team, position) {
        super('tank', team, position, UNIT_STATS.tank);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_tank', this.team);
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
        const darkTeamColor = this.team === 'player' ? 0x1a3366 : 0x661a1a;
        const lighterTeamColor = this.team === 'player' ? 0x4477cc : 0xcc4444;

        // Tracks - left side
        const trackGeo = new THREE.BoxGeometry(3.2, 0.5, 0.3);
        const trackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(0, 0.25, -1.15);
        leftTrack.castShadow = true;
        group.add(leftTrack);

        // Tracks - right side
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(0, 0.25, 1.15);
        rightTrack.castShadow = true;
        group.add(rightTrack);

        // Track wheels (decorative circles on tracks)
        const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });

        for (let i = -1; i <= 1; i++) {
            // Left side wheels
            const lWheel = new THREE.Mesh(wheelGeo, wheelMat);
            lWheel.rotation.x = Math.PI / 2;
            lWheel.position.set(i * 1.1, 0.25, -1.33);
            group.add(lWheel);

            // Right side wheels
            const rWheel = new THREE.Mesh(wheelGeo, wheelMat);
            rWheel.rotation.x = Math.PI / 2;
            rWheel.position.set(i * 1.1, 0.25, 1.33);
            group.add(rWheel);
        }

        // Track guard / fenders
        const fenderGeo = new THREE.BoxGeometry(3.3, 0.08, 0.5);
        const fenderMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });

        const leftFender = new THREE.Mesh(fenderGeo, fenderMat);
        leftFender.position.set(0, 0.55, -1.15);
        leftFender.castShadow = true;
        group.add(leftFender);

        const rightFender = new THREE.Mesh(fenderGeo, fenderMat);
        rightFender.position.set(0, 0.55, 1.15);
        rightFender.castShadow = true;
        group.add(rightFender);

        // Hull
        const hullGeo = new THREE.BoxGeometry(3, 1, 2);
        const hullMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 1.0, 0);
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Hull front slope (angled armor)
        const frontGeo = new THREE.BoxGeometry(0.8, 0.6, 1.8);
        const frontMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const front = new THREE.Mesh(frontGeo, frontMat);
        front.position.set(1.7, 0.8, 0);
        front.rotation.z = -0.4;
        front.castShadow = true;
        group.add(front);

        // Hull rear details
        const rearGeo = new THREE.BoxGeometry(0.3, 0.5, 1.6);
        const rearMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
        const rear = new THREE.Mesh(rearGeo, rearMat);
        rear.position.set(-1.6, 0.9, 0);
        rear.castShadow = true;
        group.add(rear);

        // Turret base (ring)
        const turretBaseGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 12);
        const turretBaseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const turretBase = new THREE.Mesh(turretBaseGeo, turretBaseMat);
        turretBase.position.set(0, 1.55, 0);
        group.add(turretBase);

        // Turret
        const turretGeo = new THREE.BoxGeometry(1.5, 0.7, 1.2);
        const turretMat = new THREE.MeshPhongMaterial({ color: lighterTeamColor });
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.set(0.1, 1.9, 0);
        turret.castShadow = true;
        group.add(turret);

        // Turret hatch
        const hatchGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
        const hatchMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const hatch = new THREE.Mesh(hatchGeo, hatchMat);
        hatch.position.set(-0.2, 2.3, 0);
        group.add(hatch);

        // Main gun barrel
        const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(2.0, 1.9, 0);
        barrel.castShadow = true;
        group.add(barrel);

        // Barrel muzzle brake
        const muzzleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.15, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
        muzzle.rotation.z = Math.PI / 2;
        muzzle.position.set(3.3, 1.9, 0);
        group.add(muzzle);

        // Machine gun on top
        const mgGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
        const mg = new THREE.Mesh(mgGeo, barrelMat);
        mg.rotation.z = Math.PI / 2;
        mg.position.set(0.5, 2.35, 0.3);
        group.add(mg);

        // Exhaust pipes on rear
        const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6);
        const exhaustMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });

        const exhaust1 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exhaust1.position.set(-1.5, 1.7, 0.6);
        group.add(exhaust1);

        const exhaust2 = new THREE.Mesh(exhaustGeo, exhaustMat);
        exhaust2.position.set(-1.5, 1.7, -0.6);
        group.add(exhaust2);

        // Fuel tanks on back
        const fuelGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8);
        const fuelMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });

        const fuel1 = new THREE.Mesh(fuelGeo, fuelMat);
        fuel1.rotation.x = Math.PI / 2;
        fuel1.position.set(-1.3, 1.3, 0.7);
        fuel1.castShadow = true;
        group.add(fuel1);

        const fuel2 = new THREE.Mesh(fuelGeo, fuelMat);
        fuel2.rotation.x = Math.PI / 2;
        fuel2.position.set(-1.3, 1.3, -0.7);
        fuel2.castShadow = true;
        group.add(fuel2);

        return group;
    }
}
