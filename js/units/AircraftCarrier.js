import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { UNIT_STATS } from '../core/Constants.js';

export class AircraftCarrier extends Unit {
    constructor(team, position) {
        super('carrier', team, position, UNIT_STATS.carrier);

        // GD-062: Remove direct attack - carrier relies on drones
        this.damage = 0;
        this.baseDamage = 0;

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(5);
        this.createHealthBar();

        // GD-062: Carrier drone system
        this._drones = [];
        this._droneCount = 3;
        this._droneHP = 30;
        this._droneDamage = 15;
        this._droneSpeed = 8;
        this._droneOrbitRadius = 15;
        this._droneRegenTime = 15;
        this._droneRegenTimers = [];
        this._droneTargets = [];
        this._launchTarget = null;
        this._launchTimer = 0;

        // Create drone meshes
        for (let i = 0; i < this._droneCount; i++) {
            this._createDrone(i);
        }
    }

    _createDrone(index) {
        const teamColor = this.team === 'player' ? 0x5588ff : 0xff5555;
        const group = new THREE.Group();

        // Fuselage
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.3, 0.4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Wings
        const wingGeo = new THREE.BoxGeometry(0.3, 0.05, 1.4);
        const wingMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(-0.1, 0, 0);
        group.add(wing);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.2, 0.4, 0.05);
        const tailMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(-0.6, 0.2, 0);
        group.add(tail);

        const drone = {
            mesh: group,
            alive: true,
            hp: this._droneHP,
            angle: (index / this._droneCount) * Math.PI * 2,
            attackCooldown: 0,
            target: null
        };

        this._drones.push(drone);

        // Add to scene via parent mesh
        if (this.mesh) {
            // Don't parent to carrier - add to scene directly
            group.position.copy(this.mesh.position);
            group.position.y += 12;
        }

        return drone;
    }

    _respawnDrone(index) {
        if (index >= this._drones.length) return;
        const drone = this._drones[index];
        drone.alive = true;
        drone.hp = this._droneHP;
        drone.attackCooldown = 0;
        drone.target = null;
        if (drone.mesh) {
            drone.mesh.visible = true;
        }
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

        // Flight deck extension at bow
        const deckExtGeo = new THREE.BoxGeometry(2.0, 0.2, 3.2);
        const deckExt = new THREE.Mesh(deckExtGeo, deckMat);
        deckExt.position.set(4.8, 1.3, 0);
        deckExt.receiveShadow = true;
        group.add(deckExt);

        // Runway markings
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

        // Island / bridge structure
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
        const windowMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, emissive: 0x224466, emissiveIntensity: 0.3 });
        const windows = new THREE.Mesh(windowGeo, windowMat);
        windows.position.set(0.5, 3.6, 1.18);
        group.add(windows);

        // Island top
        const islandTopGeo = new THREE.BoxGeometry(1.0, 0.3, 0.6);
        const islandTop = new THREE.Mesh(islandTopGeo, islandMat);
        islandTop.position.set(0.5, 4.1, 1.6);
        group.add(islandTop);

        // Radar mast
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

        // Antenna
        const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
        const antenna = new THREE.Mesh(antennaGeo, mastMat);
        antenna.position.set(0.5, 6.6, 1.6);
        group.add(antenna);

        // Smokestack
        const stackGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
        const stackMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const stack = new THREE.Mesh(stackGeo, stackMat);
        stack.position.set(-0.5, 2.5, 1.6);
        stack.castShadow = true;
        group.add(stack);

        // Elevator platforms
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
                new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), gunMat
            );
            gunBase.position.set(pos.x, 1.45, pos.z);
            group.add(gunBase);
            const gunBarrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), gunMat
            );
            gunBarrel.rotation.z = Math.PI / 4;
            gunBarrel.position.set(pos.x + 0.15, 1.7, pos.z);
            group.add(gunBarrel);
        }

        group.position.y = -0.3;
        return group;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (!this.alive || !this.mesh || !this.game) return;

        const carrierPos = this.getPosition();
        const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
        const scene = this.game.sceneManager?.scene;

        // Update each drone
        for (let i = 0; i < this._drones.length; i++) {
            const drone = this._drones[i];

            // Handle regen for dead drones
            if (!drone.alive) {
                if (this._droneRegenTimers[i] === undefined) {
                    this._droneRegenTimers[i] = this._droneRegenTime;
                    if (drone.mesh) drone.mesh.visible = false;
                }
                this._droneRegenTimers[i] -= deltaTime;
                if (this._droneRegenTimers[i] <= 0) {
                    this._respawnDrone(i);
                    this._droneRegenTimers[i] = undefined;
                }
                continue;
            }

            // Ensure drone mesh is in scene
            if (drone.mesh && !drone.mesh.parent && scene) {
                scene.add(drone.mesh);
            }

            // Tick attack cooldown
            if (drone.attackCooldown > 0) {
                drone.attackCooldown -= deltaTime;
            }

            // Launch squadron: drones go to target area
            if (this._launchTarget) {
                const targetPos = this._launchTarget;
                const dPos = drone.mesh.position;
                const dx = targetPos.x - dPos.x;
                const dz = targetPos.z - dPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 3) {
                    const speed = this._droneSpeed * deltaTime * 5;
                    dPos.x += (dx / dist) * speed;
                    dPos.z += (dz / dist) * speed;
                    dPos.y = carrierPos.y + 12;
                    drone.mesh.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
                }

                // Attack enemies near target
                if (dist < 15 && drone.attackCooldown <= 0) {
                    this._droneAttackNearby(drone, targetPos, enemyTeam);
                }
            } else {
                // Orbit around carrier
                drone.angle += deltaTime * 0.8;
                const ox = Math.cos(drone.angle) * this._droneOrbitRadius;
                const oz = Math.sin(drone.angle) * this._droneOrbitRadius;
                drone.mesh.position.set(
                    carrierPos.x + ox,
                    carrierPos.y + 12,
                    carrierPos.z + oz
                );
                drone.mesh.rotation.y = drone.angle + Math.PI / 2;

                // Auto-engage enemies in vision range
                if (drone.attackCooldown <= 0) {
                    this._droneAutoAttack(drone, carrierPos, enemyTeam);
                }
            }
        }

        // Launch squadron timer
        if (this._launchTarget) {
            this._launchTimer -= deltaTime;
            if (this._launchTimer <= 0) {
                this._launchTarget = null;
                this._launchTimer = 0;
            }
        }
    }

    _droneAutoAttack(drone, carrierPos, enemyTeam) {
        const enemies = this.game.getEntitiesByTeam(enemyTeam);
        let nearest = null;
        let nearestDist = this.vision * 3;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = enemy.getPosition().distanceTo(carrierPos);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        if (nearest) {
            this._droneStrike(drone, nearest);
        }
    }

    _droneAttackNearby(drone, targetPos, enemyTeam) {
        const enemies = this.game.getEntitiesByTeam(enemyTeam);
        let nearest = null;
        let nearestDist = 15;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = enemy.getPosition().distanceTo(targetPos);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        if (nearest) {
            this._droneStrike(drone, nearest);
        }
    }

    _droneStrike(drone, target) {
        drone.attackCooldown = 1.5;
        target.takeDamage(this._droneDamage);

        if (this.game.effectsManager) {
            this.game.effectsManager.createMuzzleFlash(drone.mesh.position.clone());
            this.game.effectsManager.createProjectileTrail(
                drone.mesh.position.clone(), target.getPosition().clone()
            );
        }

        if (!target.alive) {
            if (this.addKill) this.addKill();
            this.game.eventBus.emit('combat:kill', { attacker: this, defender: target });
            if (this.game.soundManager) this.game.soundManager.play('death', { unitType: target.type });
        }

        if (this.game.soundManager) {
            this.game.soundManager.play('attack', { unitType: 'drone' });
        }
    }

    // Called by combat system ability - launch squadron to target area
    launchSquadron(targetPos, duration) {
        this._launchTarget = targetPos.clone();
        this._launchTimer = duration || 6;
    }

    // Drones can take damage from AOE
    takeDroneDamage(droneIndex, amount) {
        if (droneIndex >= this._drones.length) return;
        const drone = this._drones[droneIndex];
        if (!drone.alive) return;
        drone.hp -= amount;
        if (drone.hp <= 0) {
            drone.hp = 0;
            drone.alive = false;
        }
    }

    // Clean up drone meshes when carrier dies
    destroy() {
        super.destroy();
        const scene = this.game?.sceneManager?.scene;
        for (const drone of this._drones) {
            if (drone.mesh && scene) {
                scene.remove(drone.mesh);
            }
        }
    }
}
