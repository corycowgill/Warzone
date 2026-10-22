import {localTeam} from '../systems/InputPolicy.js';

export function idleCombatUnit(u){
  return u.alive&&u.damage>0&&!u.isGarrisoned&&!u.isRetreating&&!u._aiRecovering&&!u._pathPending&&!u.moveTarget&&!u.attackTarget&&!u._holdPosition&&!(u.empDisabledTimer>0);
}
export function damageEdge(position,camera){
  const p=position.clone().project(camera);
  if(p.z>1){p.x=-p.x;p.y=-p.y;}
  return Math.abs(p.x)>Math.abs(p.y)?(p.x<0?'left':'right'):(p.y<0?'bottom':'top');
}

// Bounded, non-modal battle feedback. All timing is local presentation time.
export class BattleFeedback {
  constructor(hud){
    this.hud=hud;this.game=hud.game;this.hits=new Map();this.nextScan=0;this.idle=[];
    this.root=document.createElement('div');this.root.className='battle-feedback';
    for(const edge of ['left','right','top','bottom']){
      const el=document.createElement('div');el.className=`battle-damage battle-damage-${edge}`;el.hidden=true;this.root.appendChild(el);
      this.hits.set(edge,{el,until:0});
    }
    this.status=document.createElement('div');this.status.className='battle-status';
    this.blocked=document.createElement('span');this.blocked.hidden=true;this.status.appendChild(this.blocked);
    this.idleButton=document.createElement('button');this.idleButton.type='button';this.idleButton.hidden=true;
    this.idleButton.title='Select idle combat units';this.idleButton.onclick=()=>this.game.selectionManager?.selectEntities(this.idle.filter(u=>u.team===localTeam(this.game)&&idleCombatUnit(u)));
    this.status.appendChild(this.idleButton);this.root.appendChild(this.status);hud.hudEl?.appendChild(this.root);
    const own=units=>this.game.mode!=='SPECTATE'&&units?.some(u=>u.team===localTeam(this.game));
    const marker=(position,type)=>this.game.effectsManager?.createMoveMarker(position,type);
    this.game.eventBus.on('command:attack',({units,target})=>{if(own(units)&&target?.alive)marker(target.getPosition(),'attack');});
    this.game.eventBus.on('command:retreat',({units})=>{if(own(units)){const hq=this.game.getHQ(localTeam(this.game));if(hq)marker(hq.getPosition(),'retreat');}});
    this.game.eventBus.on('command:blocked',({unit,position})=>{
      if(!own([unit])||!hud.visible)return;
      const now=performance.now();if(now<(this.blockedUntil??0)-1200)return;
      this.blockedUntil=now+1800;this.blocked.textContent='Route blocked';this.blocked.hidden=false;marker(position??unit.getPosition(),'blocked');
    });
    this.game.eventBus.on('combat:attack',({attacker,defender,damage})=>{
      if(!hud.visible||!own([defender])||damage<5)return;
      const edge=damageEdge(attacker.getPosition(),this.game.sceneManager.camera),hit=this.hits.get(edge);
      hit.until=performance.now()+650;hit.el.hidden=false;
    });
  }
  clear(){for(const hit of this.hits.values()){hit.until=0;hit.el.hidden=true;}this.blocked.hidden=true;this.idleButton.hidden=true;this.nextScan=0;this.blockedUntil=0;this.idle=[];}
  update(){
    const now=performance.now();
    for(const hit of this.hits.values())hit.el.hidden=now>=hit.until||this.game.mode==='SPECTATE';
    this.blocked.hidden=now>=(this.blockedUntil??0);
    if(now<this.nextScan)return;this.nextScan=now+1000;
    this.idle=this.game.mode==='SPECTATE'?[]:this.game.getUnits(localTeam(this.game)).filter(idleCombatUnit);
    this.idleButton.textContent=`${this.idle.length} idle`;this.idleButton.hidden=!this.idle.length;
  }
}
