import {UNIT_ABILITIES} from '../core/Constants.js';
import {localTeam} from './InputPolicy.js';
export function abilityMode(ability){
 if(['siege_mode','deploy','sonar_ping','plant_mine','banzai','smoke_pop'].includes(ability?.id))return 'self';
 return ['emp','torpedo_salvo'].includes(ability?.id)?'entity':'point';
}
export function selectedAbilityGroup(game){
 const units=game.selectionManager.getSelected().filter(u=>u.alive&&u.isUnit&&u.team===localTeam(game)&&u.ability&&!u.isGarrisoned);
 const id=units[0]?.ability.id;return units.filter(u=>u.ability.id===id);
}

export function abilityUnavailableReason(unit,game){
 if(unit.alive===false||!unit.ability)return 'This unit cannot use an ability.';
 if(unit.isGarrisoned)return 'Unload this unit before using its ability.';
 if(unit.empDisabledTimer>0)return 'EMP disabled. Wait for recovery.';
 if(unit.abilityCooldown>0)return `Ability recharging: ${Math.ceil(unit.abilityCooldown)}s remaining.`;
 const cost=UNIT_ABILITIES[unit.type]?.muCost||0;
 const balance=game.teams?.[unit.team]?.mu;
 const affordable=game.resourceSystem?.canAffordMU?.(unit.team,cost);
 if(cost&&(affordable===false||(balance!==undefined&&balance<cost)))return `Not enough MU: need ${cost}.`;
 return unit.canUseAbility?.()===false?'Ability is not ready.':null;
}
export function abilityTargetFailure(unit,targetPos,targetEntity){
 const mode=abilityMode(unit.ability);if(mode==='self')return null;
 if(mode==='entity'&&(!targetEntity?.alive||targetEntity.team===unit.team||targetEntity.team==='neutral'))return 'Choose a living enemy target.';
 const target=mode==='entity'?targetEntity?.getPosition?.():targetPos;
 if(!target||![target.x,target.y??0,target.z].every(Number.isFinite))return 'Choose a valid battlefield target.';
 const range=UNIT_ABILITIES[unit.type]?.range;
 if(range&&unit.getPosition().distanceTo(target)>range*3)return 'Target out of range. Move closer and try again.';
 return null;
}
export function reportAbilityFailure(game,unit,message){
 if(!message||game.mode==='SPECTATE'||unit.team!==localTeam(game))return;
 const now=Date.now();
 if(game._abilityFailureAt!=null&&now-game._abilityFailureAt<1000)return;
 game._abilityFailureAt=now;
 game.eventBus?.emit?.('notification',{message,color:'#e1bd7b'});
}
