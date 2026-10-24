import {it,expect,vi} from 'vitest';
import {Group,Vector3} from 'three';
import {Unit} from '../../js/entities/Unit.js';
import {issueUnitMove} from '../../js/systems/MovementOrders.js';
function setup(multiplayer=true){
 const unit=new Unit('infantry','player',new Vector3(10,0,10));
 unit.mesh=new Group();unit.mesh.position.set(10,0,10);
 const route=(start,goal)=>[new Vector3(10,0,30),goal.clone()];
 unit.game={isMultiplayer:multiplayer,pathfinding:{findPathForDomain:vi.fn(route),findPathAsync:vi.fn(async(...args)=>route(...args))},eventBus:{emit:vi.fn()}};
 unit.updateProceduralAnimation=()=>{};unit.updateStatusBadge=()=>{};
 return unit;
}
const points=()=>[new Vector3(10,0,10),new Vector3(40,0,40)];
it('routes the first patrol leg and accepts replay-style plain coordinates',()=>{
 const unit=setup();unit.startPatrol([{x:10,y:0,z:10},{x:40,y:0,z:40}]);
 expect(unit.game.pathfinding.findPathForDomain).toHaveBeenCalledWith(new Vector3(10,0,10),new Vector3(40,0,40),'land');
 expect(unit.moveTarget).toEqual(new Vector3(10,0,30));expect(unit.waypoints).toEqual([new Vector3(40,0,40)]);
 expect(unit._isPatrolling).toBe(true);expect(unit._patrolIndex).toBe(1);
});
it('re-routes the patrol after an engagement and on reaching an endpoint',()=>{
 const unit=setup();unit.startPatrol(points());
 unit.moveTarget=null;unit.waypoints=[];unit.attackTarget=null;
 unit.update(0);expect(unit._isPatrolling).toBe(true);expect(unit._patrolIndex).toBe(1);
 expect(unit.game.pathfinding.findPathForDomain).toHaveBeenCalledTimes(2);
 unit.mesh.position.set(40,0,40);unit.moveTarget=null;unit.waypoints=[];
 unit.update(0);expect(unit._patrolIndex).toBe(0);
 expect(unit.game.pathfinding.findPathForDomain.mock.calls.at(-1)[1]).toEqual(new Vector3(10,0,10));
});
it('cancels an unreachable patrol rather than repeatedly searching forever',async()=>{
 const unit=setup(false);unit.game.pathfinding.findPathAsync.mockResolvedValue(null);
 unit.startPatrol(points());await Promise.resolve();
 expect(unit._isPatrolling).toBe(false);expect(unit._patrolPoints).toEqual([]);
 unit.update(0);expect(unit.game.pathfinding.findPathAsync).toHaveBeenCalledTimes(1);
});
it('stale asynchronous patrol paths cannot overwrite a stop or new move',async()=>{
 const unit=setup(false);let resolve;
 unit.game.pathfinding.findPathAsync.mockImplementation(()=>new Promise(done=>resolve=done));
 unit.startPatrol(points());unit.stop();resolve([new Vector3(40,0,40)]);await Promise.resolve();
 expect(unit._isPatrolling).toBe(false);expect(unit.moveTarget).toBe(null);
});
it('keeps patrol assignment during route recovery and refuses disabled patrol orders',()=>{
 const unit=setup();unit.startPatrol(points());
 issueUnitMove(unit,new Vector3(40,0,40),unit.game,{attackMove:true,recovery:true});
 expect(unit._isPatrolling).toBe(true);expect(unit._patrolPoints).toHaveLength(2);
 unit.stop();unit.empDisabledTimer=2;unit.startPatrol(points());
 expect(unit._isPatrolling).toBe(false);expect(unit.moveTarget).toBe(null);
});
