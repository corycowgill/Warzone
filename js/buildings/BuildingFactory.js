import { Headquarters } from './Headquarters.js';
import { Barracks } from './Barracks.js';
import { WarFactory } from './WarFactory.js';
import { Airfield } from './Airfield.js';
import { Shipyard } from './Shipyard.js';
import { ResourceDepot } from './ResourceDepot.js';
import { Ditch } from './Ditch.js';

const BUILDING_MAP = {
  headquarters: Headquarters,
  barracks: Barracks,
  warfactory: WarFactory,
  airfield: Airfield,
  shipyard: Shipyard,
  resourcedepot: ResourceDepot,
  ditch: Ditch
};

export class BuildingFactory {
  static create(type, team, position, game) {
    const BuildingClass = BUILDING_MAP[type];
    if (!BuildingClass) return null;
    return new BuildingClass(team, position, game);
  }
}
