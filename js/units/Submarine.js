import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class Submarine extends Unit {
    constructor(team, position) {
        super('submarine', team, position, UNIT_STATS.submarine);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
        this.isSurfaced = true;
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x1a2d55 : 0x661a1a;

        // Main hull - elongated rounded shape built from boxes
        const hullGeo = new THREE.BoxGeometry(4, 1, 1.2);
        const hullMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(0, 0, 0);
        hull.castShadow = true;
        group.add(hull);

        // Hull top curve (simulate rounded hull)
        const hullTopGeo = new THREE.BoxGeometry(3.6, 0.3, 1.0);
        const hullTopMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const hullTop = new THREE.Mesh(hullTopGeo, hullTopMat);
        hullTop.position.set(0, 0.6, 0);
        hullTop.castShadow = true;
        group.add(hullTop);

        // Hull bottom curve
        const hullBottomGeo = new THREE.BoxGeometry(3.6, 0.3, 1.0);
        const hullBottom = new THREE.Mesh(hullBottomGeo, hullTopMat);
        hullBottom.position.set(0, -0.6, 0);
        hullBottom.castShadow = true;
        group.add(hullBottom);

        // Bow - tapered front
        const bowGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
        const bow = new THREE.Mesh(bowGeo, hullMat);
        bow.position.set(2.3, 0, 0);
        bow.castShadow = true;
        group.add(bow);

        // Bow tip
        const bowTipGeo = new THREE.CylinderGeometry(0, 0.35, 0.8, 8);
        const bowTipMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const bowTip = new THREE.Mesh(bowTipGeo, bowTipMat);
        bowTip.rotation.z = -Math.PI / 2;
        bowTip.position.set(3.2, 0, 0);
        bowTip.castShadow = true;
        group.add(bowTip);

        // Sonar dome at bow
        const sonarGeo = new THREE.SphereGeometry(0.2, 8, 6);
        const sonarMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const sonar = new THREE.Mesh(sonarGeo, sonarMat);
        sonar.position.set(3.4, -0.1, 0);
        group.add(sonar);

        // Stern taper
        const sternGeo = new THREE.BoxGeometry(0.8, 0.7, 0.9);
        const stern = new THREE.Mesh(sternGeo, hullMat);
        stern.position.set(-2.3, 0, 0);
        stern.castShadow = true;
        group.add(stern);

        // Conning tower / sail
        const towerGeo = new THREE.BoxGeometry(1, 0.8, 0.6);
        const towerMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(0.3, 1.1, 0);
        tower.castShadow = true;
        group.add(tower);

        // Tower top
        const towerTopGeo = new THREE.BoxGeometry(1.1, 0.1, 0.7);
        const towerTopMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const towerTop = new THREE.Mesh(towerTopGeo, towerTopMat);
        towerTop.position.set(0.3, 1.55, 0);
        group.add(towerTop);

        // Tower windows / viewing ports
        const portGeo = new THREE.BoxGeometry(0.02, 0.12, 0.5);
        const portMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            emissive: 0x224466,
            emissiveIntensity: 0.3
        });
        const frontPort = new THREE.Mesh(portGeo, portMat);
        frontPort.position.set(0.82, 1.25, 0);
        group.add(frontPort);

        // Tower dive planes (small fins on tower)
        const divePlaneGeo = new THREE.BoxGeometry(0.3, 0.05, 0.8);
        const divePlaneMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const divePlanes = new THREE.Mesh(divePlaneGeo, divePlaneMat);
        divePlanes.position.set(0.3, 0.85, 0);
        group.add(divePlanes);

        // Periscope - thin cylinder on tower
        const periscopeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
        const periscopeMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const periscope = new THREE.Mesh(periscopeGeo, periscopeMat);
        periscope.position.set(0.5, 2.0, 0);
        group.add(periscope);

        // Periscope head
        const periHeadGeo = new THREE.BoxGeometry(0.08, 0.1, 0.12);
        const periHead = new THREE.Mesh(periHeadGeo, periscopeMat);
        periHead.position.set(0.5, 2.55, 0);
        group.add(periHead);

        // Communications mast
        const commGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4);
        const comm = new THREE.Mesh(commGeo, periscopeMat);
        comm.position.set(0.1, 2.0, 0.15);
        group.add(comm);

        // Rudder at stern
        const rudderGeo = new THREE.BoxGeometry(0.05, 0.6, 0.4);
        const rudderMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const rudder = new THREE.Mesh(rudderGeo, rudderMat);
        rudder.position.set(-2.7, 0, 0);
        group.add(rudder);

        // Stern planes (horizontal fins)
        const sternPlaneGeo = new THREE.BoxGeometry(0.4, 0.05, 1.4);
        const sternPlanes = new THREE.Mesh(sternPlaneGeo, rudderMat);
        sternPlanes.position.set(-2.4, 0, 0);
        group.add(sternPlanes);

        // Stern vertical fin
        const sternFinGeo = new THREE.BoxGeometry(0.4, 0.7, 0.05);
        const sternFin = new THREE.Mesh(sternFinGeo, rudderMat);
        sternFin.position.set(-2.4, 0.2, 0);
        group.add(sternFin);

        // Propeller at back
        const propHubGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const propMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const propHub = new THREE.Mesh(propHubGeo, propMat);
        propHub.position.set(-2.9, 0, 0);
        group.add(propHub);

        // Propeller blades
        for (let i = 0; i < 4; i++) {
            const bladeGeo = new THREE.BoxGeometry(0.04, 0.4, 0.12);
            const blade = new THREE.Mesh(bladeGeo, propMat);
            blade.rotation.x = (i * Math.PI) / 2;
            blade.position.set(-2.95, 0, 0);
            group.add(blade);
        }

        // Torpedo tube hatches on bow
        const hatchGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6);
        const hatchMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

        for (let y = -0.15; y <= 0.15; y += 0.3) {
            for (let z = -0.2; z <= 0.2; z += 0.4) {
                const hatch = new THREE.Mesh(hatchGeo, hatchMat);
                hatch.rotation.z = Math.PI / 2;
                hatch.position.set(3.45, y, z);
                group.add(hatch);
            }
        }

        // Hull details - flood ports
        const floodPortGeo = new THREE.BoxGeometry(0.3, 0.15, 0.02);
        const floodMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

        for (let x = -1.5; x <= 1.5; x += 1.0) {
            const port1 = new THREE.Mesh(floodPortGeo, floodMat);
            port1.position.set(x, -0.3, 0.61);
            group.add(port1);

            const port2 = new THREE.Mesh(floodPortGeo, floodMat);
            port2.position.set(x, -0.3, -0.61);
            group.add(port2);
        }

        // Position partially submerged
        group.position.y = -1;

        return group;
    }
}
