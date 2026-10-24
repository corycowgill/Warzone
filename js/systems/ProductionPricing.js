import {UNIT_STATS,NATIONS} from '../core/Constants.js';
export function productionPrice(game,team,type){
 const stats=UNIT_STATS[type];if(!stats)return {sp:0,mu:0};
 let sp=Math.round(stats.cost*(NATIONS[game.teams?.[team]?.nation]?.bonuses?.costReduction??1));
 sp=Math.round(sp*(game.nationAbilitySystem?.getCostMultiplier(team)??1));
 return {sp,mu:type==='commander'?200:stats.muCost??0};
}
