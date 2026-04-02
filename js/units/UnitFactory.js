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
    patrolboat: PatrolBoat
};

export class UnitFactory {
    constructor(game) {
        this.game = game;
    }

    create(type, team, position) {
        const UnitClass = UNIT_MAP[type];
        if (!UnitClass) {
            console.warn(`UnitFactory: Unknown unit type "${type}"`);
            return null;
        }

        return new UnitClass(team, position);
    }

    getAvailableTypes() {
        return Object.keys(UNIT_MAP);
    }
}
