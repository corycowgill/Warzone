import {issueUnitMove} from './MovementOrders.js';
// Restart a saved in-flight route through the normal navigation transaction.
export function resumeRestoredMovement(unit,game){
 const goal=unit._restoredMoveGoal;
 if(!goal||!unit.alive||unit.attackTarget||unit.empDisabledTimer>0||unit._siegeMode||unit.isGarrisoned||unit.speed<=0)return false;
 const queued=unit._queuedMoveOrders,retreat=unit.isRetreating,retreatTarget=unit.retreatTarget?.clone()??goal.clone();
 const patrol=unit._isPatrolling,attackMove=unit._attackMove,speed=unit.formationSpeed;
 unit._restoredMoveGoal=null;
 issueUnitMove(unit,goal,game,{attackMove,formationSpeed:speed});
 unit._queuedMoveOrders=queued;
 if(unit._pathPending||unit.moveTarget){
  unit._isPatrolling=patrol;
  if(retreat){unit.isRetreating=true;unit.retreatTarget=(unit.waypoints?.at(-1)??unit.moveTarget??retreatTarget).clone();}
 }
 return true;
}
