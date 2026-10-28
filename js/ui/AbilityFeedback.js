import {UNIT_ABILITIES} from '../core/Constants.js';
export function abilityFeedback(units,game){
 const eligible=units.filter(u=>u.alive&&u.ability);
 const first=eligible[0];if(!first)return null;
 const ability=first.ability,group=eligible.filter(u=>u.ability.id===ability.id);
 const ready=group.filter(u=>!u.isGarrisoned&&!(u.empDisabledTimer>0)&&!(u.abilityCooldown>0));
 const cost=UNIT_ABILITIES[first.type]?.muCost||0;
 const mu=game.teams?.[first.team]?.mu||0;
 const affordable=cost?Math.floor(mu/cost):group.length;
 const count=Math.min(ready.length,affordable);
 let status;
 if(count)status=`${count}/${group.length} ready`;
 else if(!ready.length){
  const cooling=group.filter(u=>!u.isGarrisoned&&!(u.empDisabledTimer>0)&&u.abilityCooldown>0);
  status=cooling.length?`${Math.ceil(Math.min(...cooling.map(u=>u.abilityCooldown)))}s cooldown`:
   group.some(u=>u.empDisabledTimer>0)?'EMP disabled':'Garrisoned';
 }else status=`Need ${cost} MU`;
 const name=ability.id==='siege_mode'&&group.every(u=>u._siegeMode)?'Exit Siege':ability.name;
 const mixed=eligible.length!==group.length;
 const description=[ability.description||ability.name,status,cost?`${cost} MU per unit`:'No MU cost',
  mixed?'Mixed abilities selected. Select one unit type to use its ability.':''].filter(Boolean).join(' · ');
 return {name,status,description,disabled:!count&&!mixed};
}
