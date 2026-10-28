import {localTeam} from './InputPolicy.js';
export function abilityMode(ability){
 if(['siege_mode','deploy','sonar_ping','plant_mine','banzai','smoke_pop'].includes(ability?.id))return 'self';
 return ['emp','torpedo_salvo'].includes(ability?.id)?'entity':'point';
}
export function selectedAbilityGroup(game){
 const units=game.selectionManager.getSelected().filter(u=>u.alive&&u.isUnit&&u.team===localTeam(game)&&u.ability&&!u.isGarrisoned);
 const id=units[0]?.ability.id;return units.filter(u=>u.ability.id===id);
}
