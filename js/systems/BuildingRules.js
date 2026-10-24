import {BUILDING_STATS,BUILDING_LIMITS,NATIONS} from '../core/Constants.js';

// Read-only rules shared by the construction UI and authoritative placement.
export function buildingCost(game,type,team){
 const base=BUILDING_STATS[type]?.cost??0;
 const nation=NATIONS[game.teams?.[team]?.nation];
 return Math.round(base*(nation?.bonuses?.buildingCostReduction??1));
}
export function buildingEligibility(game,type,team,position=null){
 const stats=BUILDING_STATS[type],cost=buildingCost(game,type,team);
 const fail=(message,reason='placement')=>({cost,allowed:false,message,reason});
 if(!stats)return fail('Unknown structure.');
 if(!game.resourceSystem?.canAfford(team,cost))return fail(`Not enough SP (need ${cost})`,'cost');
 const buildings=game.getBuildings(team).filter(building=>building.alive);
 for(const requirement of stats.requires??[]){
  const name=({headquarters:'Headquarters',warfactory:'War Factory',barracks:'Barracks',techlab:'Tech Lab',airfield:'Airfield',shipyard:'Shipyard'})[requirement]??requirement;
  if(!buildings.some(building=>building.type===requirement))return fail(`Requires ${name} first`,'technology');
 }
 const limit=BUILDING_LIMITS[type];
 if(limit!==undefined&&buildings.filter(building=>building.type===type).length>=limit)return fail(`Building limit reached (${limit})`,'limit');
 if(position){
  if(game.terrain&&!game.terrain.isWalkable(position.x,position.z))return fail('Terrain is not suitable. Choose buildable ground.','terrain');
  const size=(stats.size||2)*5;
  for(const building of game.entities??[]){
   if(!building.isBuilding||!building.alive)continue;
   const radius=((BUILDING_STATS[building.type]?.size||2)*5+size)/2;
   if(building.getPosition().distanceTo(position)<radius)return fail('Too close to another building.','overlap');
  }
 }
 return {cost,allowed:true,message:position?'Ready — click to place.':'Ready to place'};
}
