import * as THREE from 'three';
import {localTeam} from '../systems/InputPolicy.js';

export function orderState(unit) {
  if(unit.empDisabledTimer>0)return 'Disabled';
  if(unit.isRetreating)return 'Retreating';
  if(unit._siegeMode)return 'Siege mode';
  if(unit.attackTarget?.alive)return 'Engaging';
  if(unit._pathPending)return 'Finding route';
  if(unit._attackMove && unit.moveTarget)return 'Attack moving';
  if(unit.moveTarget)return 'Moving';
  if(unit._holdPosition)return 'Holding';
  return 'Ready';
}
export function orderRoute(unit) {
  if(unit.attackTarget?.alive)return unit.attackTarget.mesh?.visible===false?[]:[unit.attackTarget.getPosition()];
  const route=[unit.moveTarget??unit._pendingMoveGoal,...(unit.waypoints??[]),...(unit._queuedMoveOrders??[])].filter(Boolean);
  return route.slice(0,16);
}

// One reusable draw call, at most 32 selected units and 16 route segments each.
export class OrderFeedback {
  constructor(hud) {
    this.hud=hud;this.game=hud.game;this.nextUpdate=0;
    this.positions=new Float32Array(32*20*6);this.colors=new Float32Array(this.positions.length);
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.material=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,depthWrite:false,depthTest:false});
    this.lines=new THREE.LineSegments(this.geometry,this.material);this.lines.frustumCulled=false;this.lines.visible=false;this.lines.renderOrder=8;
    this.game.sceneManager.scene.add(this.lines);
    this.label=document.createElement('div');this.label.className='selected-order-status';this.label.hidden=true;
    this.label.title='Selected unit orders. Blue: movement. Coral: attack. Gold: retreat. Lines show planned routes, including queued moves.';
    hud.hudEl?.appendChild(this.label);
  }
  clear(){this.lines.visible=false;this.label.hidden=true;this.nextUpdate=0;}
  update(){
    if(!this.hud.visible || this.game.state!=='PLAYING' || this.game.mode==='SPECTATE'){this.clear();return;}
    const now=performance.now();if(now<this.nextUpdate)return;this.nextUpdate=now+100;
    const units=(this.game.selectionManager?.getSelected()??[]).filter(unit=>unit.isUnit&&unit.alive&&unit.team===localTeam(this.game)&&!unit.isGarrisoned);
    const counts=new Map();for(const unit of units){const state=orderState(unit);counts.set(state,(counts.get(state)??0)+1);}
    const text=[...counts].map(([state,count])=>`${count} ${state.toLowerCase()}`).join(' · ');
    if(this.label.textContent!==text)this.label.textContent=text;
    this.label.hidden=!units.length;
    let vertex=0;
    const segment=(a,b,color)=>{
      for(const point of [a,b]){
        const index=vertex++*3;
        this.positions[index]=point.x;this.positions[index+1]=point.y+.6;this.positions[index+2]=point.z;
        this.colors[index]=color.r;this.colors[index+1]=color.g;this.colors[index+2]=color.b;
      }
    };
    for(const unit of units.slice(0,32)){
      const color=new THREE.Color(unit.isRetreating?0xe8c27b:unit.attackTarget?.alive||unit._attackMove?0xff8263:0x83c8ff);
      const route=orderRoute(unit);let previous=unit.getPosition();
      for(const point of route){segment(previous,point,color);previous=point;}
      const fullLength=(unit.moveTarget||unit._pendingMoveGoal?1:0)+(unit.waypoints?.length??0)+(unit._queuedMoveOrders?.length??0);
      if(route.length && (unit.attackTarget?.alive || fullLength<=16)){
        const p=route.at(-1),r=.7;
        segment({x:p.x-r,y:p.y,z:p.z},{x:p.x+r,y:p.y,z:p.z},color);
        segment({x:p.x,y:p.y,z:p.z-r},{x:p.x,y:p.y,z:p.z+r},color);
      }
    }
    this.geometry.setDrawRange(0,vertex);this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;
    this.lines.visible=vertex>0;
  }
}
