import {BUILDING_STATS,NATIONS} from '../core/Constants.js';
// Keep a small standing force before saving for the next tech/economy milestone.
export function buildingReserve(ai){
  const units=ai.game.getUnits(ai.team);
  if(units.filter(u=>u.damage>0).length<6||units.some(u=>u.attackTarget?.alive))return 0;
  const type=ai.chosenBuildOrder?.[ai.buildOrderIndex],stats=BUILDING_STATS[type];
  if(!stats)return 0;
  const buildings=ai.game.getBuildings(ai.team);
  if(!['resourcedepot','turret','aaturret','wall'].includes(type)&&buildings.some(b=>b.type===type))return 0;
  if(!(stats.requires??[]).every(req=>buildings.some(b=>b.type===req)))return 0;
  const nation=NATIONS[ai.game.teams[ai.team]?.nation];
  return Math.round(stats.cost*(nation?.bonuses?.buildingCostReduction??1));
}
