import {it,expect,vi} from 'vitest';
import {Group,Vector3} from 'three';
import {Unit} from '../../js/entities/Unit.js';
import {queueUnitWaypoint,MAX_QUEUED_MOVES} from '../../js/systems/MovementOrders.js';
function setup(){
 const unit=new Unit('tank','player',new Vector3(10,0,10));unit.mesh=new Group();unit.mesh.position.set(10,0,10);
 unit.game={getUnits:()=>[],isMultiplayer:true,pathfinding:{findPathForDomain:vi.fn((_,goal)=>[goal.clone()])},eventBus:{emit:vi.fn()}};
 unit.updateProceduralAnimation=()=>{};unit.updateStatusBadge=()=>{};return unit;
}
const goal=new Vector3(40,0,40);
it('Shift movement preserves a stationary attack and runs after the engagement clears',()=>{
 const unit=setup();const target={alive:true};unit.attackTarget=target;
 expect(queueUnitWaypoint(unit,goal,unit.game)).toBe(true);
 expect(unit.attackTarget).toBe(target);expect(unit._queuedMoveOrders).toEqual([goal]);
 expect(unit.game.pathfinding.findPathForDomain).not.toHaveBeenCalled();
 unit.attackTarget=null;unit.update(0);
 expect(unit.moveTarget).toEqual(goal);expect(unit._queuedMoveOrders).toEqual([]);
});
it('retains queued destinations through siege mode and starts them after undeploying',()=>{
 const unit=setup();unit._siegeMode=true;queueUnitWaypoint(unit,goal,unit.game);unit.update(0);
 expect(unit._queuedMoveOrders).toEqual([goal]);expect(unit.moveTarget).toBe(null);
 unit._siegeMode=false;unit.update(0);expect(unit.moveTarget).toEqual(goal);
});
it('retains queued destinations through EMP and starts after recovery',()=>{
 const unit=setup();unit.empDisabledTimer=10;queueUnitWaypoint(unit,goal,unit.game);unit.update(0);
 expect(unit._queuedMoveOrders).toEqual([goal]);
 unit.empDisabledTimer=0;unit.update(0);expect(unit.moveTarget).toEqual(goal);
});
it('starts idle moves immediately, clones queued goals and bounds pending commands',()=>{
 const unit=setup();queueUnitWaypoint(unit,goal,unit.game);expect(unit.moveTarget).toEqual(goal);
 const point=new Vector3(50,0,50);queueUnitWaypoint(unit,point,unit.game);point.x=99;
 expect(unit._queuedMoveOrders[0].x).toBe(50);
 for(let i=0;i<MAX_QUEUED_MOVES*2;i++)queueUnitWaypoint(unit,goal,unit.game);
 expect(unit._queuedMoveOrders).toHaveLength(MAX_QUEUED_MOVES);
 expect(queueUnitWaypoint(unit,goal,unit.game)).toBe(false);
});
it('Stop clears delayed moves and garrisoned or dead units reject them',()=>{
 const unit=setup();unit._siegeMode=true;queueUnitWaypoint(unit,goal,unit.game);unit.stop();
 expect(unit._queuedMoveOrders).toEqual([]);
 unit.isGarrisoned=true;expect(queueUnitWaypoint(unit,goal,unit.game)).toBe(false);
 unit.isGarrisoned=false;unit.alive=false;expect(queueUnitWaypoint(unit,goal,unit.game)).toBe(false);
});
