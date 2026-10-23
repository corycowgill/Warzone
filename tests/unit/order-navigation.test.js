import {it,expect,vi} from 'vitest';
import {Vector3,Scene} from 'three';
import {planFormation} from '../../js/systems/FormationPlanner.js';
import {steerStep} from '../../js/systems/NavigationSteering.js';
import {OrderFeedback,orderRoute,orderState} from '../../js/ui/OrderFeedback.js';
const unit=(id,x=0,z=0)=>({id,type:'infantry',domain:'land',getPosition:()=>new Vector3(x,0,z)});
it('bounds overlay geometry for large selections, reuses its buffers, and clears on pause',()=>{
 vi.stubGlobal('document',{createElement:()=>({hidden:false,textContent:''})});
 try {
  const units=Array.from({length:256},(_,id)=>({...unit(id),alive:true,isUnit:true,team:'player',moveTarget:new Vector3(20,0,20),waypoints:Array.from({length:40},(_,x)=>new Vector3(x,0,10))}));
  const game={state:'PLAYING',mode:'1P',sceneManager:{scene:new Scene()},selectionManager:{getSelected:()=>units}};
  const overlay=new OrderFeedback({game,visible:true,hudEl:{appendChild(){}}});const buffer=overlay.geometry.attributes.position.array;
  overlay.update();expect(overlay.lines.visible).toBe(true);expect(overlay.geometry.drawRange.count).toBeLessThanOrEqual(32*20*2);expect(overlay.label.textContent).toBe('256 moving');
  overlay.nextUpdate=0;overlay.update();expect(overlay.geometry.attributes.position.array).toBe(buffer);
  game.state='PAUSED';overlay.update();expect(overlay.lines.visible).toBe(false);expect(overlay.label.hidden).toBe(true);
 }finally{vi.unstubAllGlobals();}
});
it('uses the nearest usable alternative instead of the first square-ring corner',()=>{
 const terrain={worldSize:100,worldScale:2,worldToGrid:(x,z)=>({x,z}),getHeightAt:()=>0};
 const plans=planFormation([unit(1)],new Vector3(20,0,20),[{x:0,z:0}],0,{terrain,pathfinding:{isPassable:(x,z)=>x!==20||z!==20}});
 expect(plans[0].target.distanceTo(new Vector3(20,0,20))).toBe(2);
});
it('reserves distinct arrival positions for a large group',()=>{
 const units=Array.from({length:64},(_,id)=>unit(id,30+id%8,30+Math.floor(id/8)));
 const plans=planFormation(units,new Vector3(60,0,60),units.map(()=>({x:0,z:0})),0,{terrain:{worldSize:150,worldScale:2,getHeightAt:()=>0}});
 expect(plans).toHaveLength(64);expect(new Set(plans.map(p=>`${p.target.x},${p.target.z}`)).size).toBe(64);
});
it('slides on the second axis when forward and dominant-axis steps are blocked',()=>{
 const u=unit(1);u.game={terrain:{worldScale:2,worldToGrid:(x,z)=>({x,z})},pathfinding:{isPassable:x=>x===0}};
 expect(steerStep(u,10,5,1)).toEqual({x:0,z:1});
});
it('strong crowd separation cannot send a unit away from its destination',()=>{
 const u=unit(1);const step=steerStep(u,1,0,.5,-10,0);expect(step.x).toBeGreaterThan(0);expect(step.z).toBe(0);
});
it('bounds long route previews while preserving contiguous waypoints around obstacles',()=>{
 const points=Array.from({length:30},(_,x)=>new Vector3(x,0,0));
 const route=orderRoute({moveTarget:points[0],waypoints:points.slice(1,25),_queuedMoveOrders:points.slice(25)});
 expect(route).toHaveLength(16);expect(route).toEqual(points.slice(0,16));
});
it('never exposes a fog-hidden attack target through the order overlay',()=>{
 expect(orderRoute({attackTarget:{alive:true,mesh:{visible:false},getPosition:()=>new Vector3(99,0,99)}})).toEqual([]);
 expect(orderState({isRetreating:true})).toBe('Retreating');expect(orderState({_pathPending:true})).toBe('Finding route');expect(orderState({empDisabledTimer:1})).toBe('Disabled');
});
