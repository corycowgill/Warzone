import * as THREE from 'three';
import { Unit } from '../entities/Unit.js';
import { COMMANDER_CONFIG } from '../core/Constants.js';

/**
 * GD-111: Commander/Hero Unit
 * Each nation gets one Commander with 3 unique abilities.
 * Spawned from HQ, limit 1, can be rebuilt after 90s cooldown if killed.
 */
export class Commander extends Unit {
    constructor(team, position) {
        const stats = COMMANDER_CONFIG.stats;
        super('commander', team, position, stats);

        // Override type for display
        this.isCommander = true;
        this.factionName = 'Commander';

        // Commander abilities (set per-nation after creation)
        this.commanderAbilities = [];
        this.commanderCooldowns = [0, 0, 0];

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.createSelectionRing(3);
        this.createHealthBar();
    }

    /** Initialize nation-specific abilities */
    setNationAbilities(nationKey) {
        const abilities = COMMANDER_CONFIG.abilities[nationKey];
        if (abilities) {
            this.commanderAbilities = abilities;
            this.commanderCooldowns = abilities.map(() => 0);
        }
    }

    /** Check if a specific ability is ready */
    isAbilityReady(index) {
        return this.commanderCooldowns[index] <= 0;
    }

    /** Use a commander ability */
    useAbility(index, targetPos) {
        if (index < 0 || index >= this.commanderAbilities.length) return false;
        if (this.commanderCooldowns[index] > 0) return false;

        const ability = this.commanderAbilities[index];
        this.commanderCooldowns[index] = ability.cooldown;

        // Emit event for game to handle the ability effect
        if (this.game) {
            this.game.eventBus.emit('commander:ability', {
                unit: this,
                ability,
                abilityIndex: index,
                targetPos
            });
        }

        return true;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Tick commander ability cooldowns
        for (let i = 0; i < this.commanderCooldowns.length; i++) {
            if (this.commanderCooldowns[i] > 0) {
                this.commanderCooldowns[i] -= deltaTime;
                if (this.commanderCooldowns[i] < 0) this.commanderCooldowns[i] = 0;
            }
        }
    }

    createMesh() {
        const group = new THREE.Group();
        const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;
        const darkTeamColor = this.team === 'player' ? 0x224499 : 0xaa2222;
        const goldAccent = 0xffcc00;

        // Legs (slightly taller than infantry)
        const legMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
        const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.18, 0.35, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.18, 0.35, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Body (larger, with officer coat)
        const bodyGeo = new THREE.BoxGeometry(0.7, 1.6, 0.5);
        const bodyMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 1.5, 0);
        body.castShadow = true;
        group.add(body);

        // Gold belt/sash (commander distinction)
        const beltGeo = new THREE.BoxGeometry(0.72, 0.15, 0.52);
        const beltMat = new THREE.MeshPhongMaterial({ color: goldAccent, emissive: goldAccent, emissiveIntensity: 0.2 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(0, 0.85, 0);
        group.add(belt);

        // Shoulder epaulettes (gold)
        const shoulderGeo = new THREE.BoxGeometry(0.25, 0.12, 0.5);
        const shoulderMat = new THREE.MeshPhongMaterial({ color: goldAccent });
        const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        leftShoulder.position.set(-0.42, 2.2, 0);
        group.add(leftShoulder);
        const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        rightShoulder.position.set(0.42, 2.2, 0);
        group.add(rightShoulder);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.2, 1.0, 0.2);
        const armMat = new THREE.MeshPhongMaterial({ color: teamColor });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.45, 1.5, 0);
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.45, 1.5, 0.15);
        rightArm.rotation.x = -0.3;
        group.add(rightArm);

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 2.6, 0);
        head.castShadow = true;
        group.add(head);

        // Officer cap (distinctive peaked cap)
        const capBrimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12);
        const capMat = new THREE.MeshPhongMaterial({ color: darkTeamColor });
        const brim = new THREE.Mesh(capBrimGeo, capMat);
        brim.position.set(0, 2.85, 0.1);
        group.add(brim);

        const capTopGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.2, 12);
        const capTop = new THREE.Mesh(capTopGeo, capMat);
        capTop.position.set(0, 2.95, 0);
        group.add(capTop);

        // Gold badge on cap
        const badgeGeo = new THREE.OctahedronGeometry(0.08, 0);
        const badgeMat = new THREE.MeshPhongMaterial({ color: goldAccent, emissive: goldAccent, emissiveIntensity: 0.5 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(0, 2.95, 0.28);
        group.add(badge);

        // Pistol
        const gunGeo = new THREE.BoxGeometry(0.06, 0.15, 0.3);
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.set(0.4, 1.4, 0.35);
        group.add(gun);

        // Commander star marker floating above (always visible)
        const starGeo = new THREE.OctahedronGeometry(0.5, 0);
        const starMat = new THREE.MeshBasicMaterial({
            color: goldAccent,
            transparent: true,
            opacity: 0.8
        });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(0, 4.5, 0);
        star.scale.y = 0.3;
        group.add(star);
        this._commanderStar = star;

        return group;
    }
}
