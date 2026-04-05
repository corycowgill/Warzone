import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class Submarine extends Unit {
    constructor(team, position) {
        super('submarine', team, position, UNIT_STATS.submarine);
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
        this.isSurfaced = true;

        // GD-074: Stealth system
        this._stealthed = true;        // Default: invisible to enemies
        this._stealthRevealTimer = 0;  // Timer after firing (3s reveal)
        this._sonarRevealed = 0;       // Sonar ping reveal timer (from PatrolBoat ability)
    }

    // GD-074: Check if this submarine is currently stealthed (invisible to enemies)
    isStealthed() {
        if (this._stealthRevealTimer > 0) return false;  // Revealed after firing
        if (this._sonarRevealed > 0) return false;        // Sonar pinged
        return this._stealthed;
    }

    // GD-074: Update stealth state based on nearby enemies
    updateStealth(delta) {
        // Tick reveal timer
        if (this._stealthRevealTimer > 0) {
            this._stealthRevealTimer -= delta;
            if (this._stealthRevealTimer < 0) this._stealthRevealTimer = 0;
        }

        // Check proximity reveal: within distance 6 of any enemy unit
        if (this.game && this._stealthRevealTimer <= 0 && (this._sonarRevealed || 0) <= 0) {
            const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
            const enemies = this.game.getUnits(enemyTeam);
            const myPos = this.getPosition();
            let proximityRevealed = false;

            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dist = myPos.distanceTo(enemy.getPosition());

                // Drone vision reveals submarines
                if (enemy.type === 'drone' && dist < enemy.vision * 3) {
                    proximityRevealed = true;
                    break;
                }
                // Patrol boat sonar proximity (always-on passive)
                if (enemy.type === 'patrolboat' && dist < 18) {
                    proximityRevealed = true;
                    break;
                }
                // Any enemy within distance 6 world units
                if (dist < 18) { // 6 range * 3 world units
                    proximityRevealed = true;
                    break;
                }
            }

            this._stealthed = !proximityRevealed;
        }

        // Update mesh opacity based on stealth state
        this._updateStealthVisual();
    }

    _updateStealthVisual() {
        if (!this.mesh || !this.game) return;

        const isOwnTeam = this.game.mode === 'SPECTATE' ||
            this.team === (this.game.mode === '2P' ? this.game.activeTeam : 'player');

        if (isOwnTeam) {
            // Owner always sees their sub, but slightly transparent when stealthed
            const opacity = this.isStealthed() ? 0.6 : 1.0;
            this.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    if (!child.material._subOrigOpacity) {
                        child.material._subOrigOpacity = child.material.opacity;
                        child.material._subOrigTransparent = child.material.transparent;
                    }
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                }
            });
        }
        // Enemy visibility is handled by FogOfWar / CombatSystem
    }

    // Override update to include stealth logic
    update(deltaTime) {
        super.update(deltaTime);
        if (this.alive) {
            this.updateStealth(deltaTime);
        }
    }

    // GD-074: Called when this sub fires - reveal for 3 seconds
    onFired() {
        this._stealthRevealTimer = 3.0;
        this._stealthed = false;
    }

    createMesh() {
        const model = assetManager.getTeamTintedModel('unit_submarine', this.team);
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
