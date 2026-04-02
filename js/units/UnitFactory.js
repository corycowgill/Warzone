import { Infantry } from './Infantry.js';
import { Tank } from './Tank.js';
import { Drone } from './Drone.js';
import { Plane } from './Plane.js';
import { Battleship } from './Battleship.js';
import { AircraftCarrier } from './AircraftCarrier.js';
import { Submarine } from './Submarine.js';
import { MortarTeam } from './MortarTeam.js';
import { ScoutCar } from './ScoutCar.js';
import { AAHalfTrack } from './AAHalfTrack.js';
import { APC } from './APC.js';
import { HeavyTank } from './HeavyTank.js';
import { SPG } from './SPG.js';
import { Bomber } from './Bomber.js';
import { PatrolBoat } from './PatrolBoat.js';
import { Engineer } from './Engineer.js';
import { Commander } from './Commander.js';
import * as THREE from 'three';
import { FACTION_UNITS, UNIT_STATS, COMMANDER_CONFIG } from '../core/Constants.js';

const UNIT_MAP = {
    infantry: Infantry,
    tank: Tank,
    drone: Drone,
    plane: Plane,
    battleship: Battleship,
    carrier: AircraftCarrier,
    submarine: Submarine,
    mortar: MortarTeam,
    scoutcar: ScoutCar,
    aahalftrack: AAHalfTrack,
    apc: APC,
    heavytank: HeavyTank,
    spg: SPG,
    bomber: Bomber,
    patrolboat: PatrolBoat,
    engineer: Engineer,
    commander: Commander
};

export class UnitFactory {
    constructor(game) {
        this.game = game;
    }

    /**
     * Get faction override data for a unit type and nation
     */
    getFactionOverride(type, nationKey) {
        if (!nationKey || !FACTION_UNITS[nationKey]) return null;
        return FACTION_UNITS[nationKey][type] || null;
    }

    /**
     * Get the display name for a unit type considering faction overrides
     */
    getFactionUnitName(type, nationKey) {
        const override = this.getFactionOverride(type, nationKey);
        return override ? override.name : null;
    }

    create(type, team, position) {
        const UnitClass = UNIT_MAP[type];
        if (!UnitClass) {
            console.warn(`UnitFactory: Unknown unit type "${type}"`);
            return null;
        }

        const unit = new UnitClass(team, position);

        // Apply faction-unique unit overrides
        const nationKey = this.game?.teams?.[team]?.nation;
        const override = this.getFactionOverride(type, nationKey);
        if (override) {
            unit.factionType = override.factionType;
            unit.factionName = override.name;
            unit.factionDescription = override.description;

            // Apply stat overrides
            if (override.statsOverride) {
                for (const [key, value] of Object.entries(override.statsOverride)) {
                    if (key === 'hp') {
                        unit.health = value;
                        unit.maxHealth = value;
                        unit.baseMaxHP = value;
                    } else if (key === 'damage') {
                        unit.damage = value;
                        unit.baseDamage = value;
                    } else if (key === 'speed') {
                        unit.speed = value;
                        unit.baseSpeed = value;
                    } else if (key === 'range') {
                        unit.range = value;
                        unit.baseRange = value;
                    } else if (key === 'armor') {
                        unit.armor = value;
                        unit.baseArmor = value;
                    } else if (key === 'attackRate') {
                        unit.attackRate = value;
                        unit.baseAttackRate = value;
                    } else if (key === 'cost') {
                        unit.cost = value;
                    }
                }
            }

            // Apply faction ability override (replaces default ability)
            if (override.abilities && !override.abilities.passive) {
                unit.ability = { ...override.abilities };
                unit.abilityCooldown = 0;
            }

            // Store faction-specific passive data
            if (override.abilities?.passive) {
                unit.factionPassive = override.abilities;
            }
            if (override.passive) {
                unit.factionPassive = override.passive;
            }
            if (override.aura) {
                unit.factionAura = override.aura;
            }
            if (override.onDeath) {
                unit.factionOnDeath = override.onDeath;
            }

            // Apply visual distinction to faction units
            this.applyFactionVisuals(unit, override, nationKey);
        }

        return unit;
    }

    /**
     * Apply visual distinction to faction-unique units
     */
    applyFactionVisuals(unit, override, nationKey) {
        if (!unit.mesh) return;

        // Add a colored accent stripe/marker to distinguish faction units
        const accentColors = {
            america: 0x00cc44,    // Green accent for Rangers/Sherman Jumbo
            britain: 0xffcc00,    // Gold accent for Commandos/Churchill
            france: 0x8844ff,     // Purple accent for Maquis/AMX
            germany: 0xff8800,    // Orange accent for Stormtroopers/Tiger
            japan: 0xff0044,      // Crimson accent for Imperial Marines/Zero
            austria: 0xcc6600     // Bronze accent for Jaegers/Sturmhaubitze
        };

        const accentColor = accentColors[nationKey] || 0xffffff;

        try {
            // Add a colored accent ring at the unit's base
            const ringGeo = new THREE.RingGeometry(1.2, 1.6, 16);
            const ringMat = new THREE.MeshBasicMaterial({
                color: accentColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.1;
            unit.mesh.add(ring);

            // Add a small shoulder/turret badge (diamond shape)
            const badgeGeo = new THREE.OctahedronGeometry(0.2, 0);
            const badgeMat = new THREE.MeshBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.9
            });
            const badge = new THREE.Mesh(badgeGeo, badgeMat);
            // Position on top of unit
            badge.position.y = unit.domain === 'land' && unit.type !== 'infantry' ? 3.5 : 3.0;
            badge.scale.y = 0.5;
            unit.mesh.add(badge);
        } catch (e) {
            // Visual enhancement is non-critical
        }
    }

    getAvailableTypes() {
        return Object.keys(UNIT_MAP);
    }
}
