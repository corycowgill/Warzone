import { Headquarters } from './Headquarters.js';
import { Barracks } from './Barracks.js';
import { WarFactory } from './WarFactory.js';
import { Airfield } from './Airfield.js';
import { Shipyard } from './Shipyard.js';
import { ResourceDepot } from './ResourceDepot.js';
import { SupplyDepot } from './SupplyDepot.js';
import { Bunker } from './Bunker.js';
import { Ditch } from './Ditch.js';
import { Turret } from './Turret.js';
import { AATurret } from './AATurret.js';
import { Wall } from './Wall.js';
import { SuperweaponFacility } from './SuperweaponFacility.js';
import { TechLab } from './TechLab.js';
import { MunitionsCache } from './MunitionsCache.js';
import { SupplyExchange } from './SupplyExchange.js';

const BUILDING_MAP = {
  headquarters: Headquarters,
  barracks: Barracks,
  warfactory: WarFactory,
  airfield: Airfield,
  shipyard: Shipyard,
  resourcedepot: ResourceDepot,
  supplydepot: SupplyDepot,
  bunker: Bunker,
  ditch: Ditch,
  turret: Turret,
  aaturret: AATurret,
  wall: Wall,
  superweapon: SuperweaponFacility,
  techlab: TechLab,
  munitionscache: MunitionsCache,
  supplyexchange: SupplyExchange
};

export class BuildingFactory {
  static create(type, team, position, game) {
    const BuildingClass = BUILDING_MAP[type];
    if (!BuildingClass) return null;

    return new BuildingClass(team, position, game);
  }
}
