import {Vector3} from 'three';
import {UNIT_STATS,GAME_CONFIG} from '../core/Constants.js';
export const COMBAT_PLAYTESTS = Object.freeze({
 armor:{name:'Armor and infantry support',lesson:'Use tanks to screen infantry and mortars. Avoid feeding infantry into armor.',player:['tank','tank','infantry','infantry','infantry','mortar'],enemy:['tank','tank','infantry','infantry'],map:'plains'},
 artillery:{name:'Protect the artillery',lesson:'Keep mortars behind your tanks. Reposition when enemies close inside their minimum range.',player:['tank','infantry','infantry','mortar','mortar'],enemy:['tank','infantry','infantry','infantry','scoutcar'],map:'plains'},
 air:{name:'Air versus anti-air',lesson:'Protect your AA half-tracks from ground troops while they engage aircraft.',player:['aahalftrack','aahalftrack','tank','infantry','infantry'],enemy:['plane','plane','drone','infantry','infantry'],map:'plains'},
 naval:{name:'Submarines and escorts',lesson:'Select a patrol boat and use Sonar (G) to expose submarines. Protect your battleship and concentrate fire.',player:['battleship','patrolboat','patrolboat'],enemy:['submarine','submarine','patrolboat'],map:'continental'},
 retreat:{name:'Withdraw and recover',lesson:'Select your damaged tanks and press R. Preserve at least two; recover them to 70% health near headquarters.',player:['tank','tank','tank'],enemy:['tank','tank','infantry','infantry'],map:'plains',retreat:true}
});
export function deployCombatPlaytest(game,key){
 const scenario=COMBAT_PLAYTESTS[key];if(!scenario)throw new Error('Unknown combat scenario');
 const deployed={player:[],enemy:[]},taken=[];
 const size=GAME_CONFIG.mapSize*GAME_CONFIG.worldScale;
 for(const team of ['player','enemy'])for(const [i,type] of scenario[team].entries()){
  const domain=UNIT_STATS[type].domain;
  const center=scenario.retreat?(team==='player'?75:114):key==='naval'?(team==='player'?214:238):(team==='player'?98:146);
  const desired=new Vector3(center,0,112+i*5);
  const candidates=[];
  for(let z=4;z<size-4;z+=4)for(let x=4;x<size-4;x+=4){
   const grid=game.terrain.worldToGrid(x,z);
   if(domain!=='air'&&!game.pathfinding.isPassable(grid.x,grid.z,domain))continue;
   const point=new Vector3(x,game.terrain.getHeightAt(x,z),z);
   if(taken.some(p=>Math.hypot(p.x-x,p.z-z)<4))continue;
   if((game.entities||[]).some(e=>e.alive&&e.isBuilding&&e.getPosition().distanceTo(point)<14))continue;
   candidates.push(point);
  }
  candidates.sort((a,b)=>a.distanceToSquared(desired)-b.distanceToSquared(desired));
  let pos=null;
  for(const candidate of candidates.slice(0,8)){
   const anchor=deployed[team].find(u=>u.domain===domain);
   if(domain!=='air'&&anchor){const route=game.pathfinding.findPathForDomain(anchor.getPosition(),candidate,domain);if(!route?.length||route.at(-1).distanceTo(candidate)>4)continue;}
   pos=candidate;break;
  }
  if(!pos)throw new Error(`No connected ${domain} deployment for ${team} ${type}`);
  const unit=game.createUnit(type,team,pos);if(!unit)throw new Error(`Failed to create ${type}`);
  if(scenario.retreat&&team==='player')unit.health=unit.maxHealth*.4;
  taken.push(pos);deployed[team].push(unit);
 }
 // Shared movement domains must connect across the battle, not merely within a deployment.
 for(const domain of ['land','naval']){
  const friendly=deployed.player.find(u=>u.domain===domain),opponent=deployed.enemy.find(u=>u.domain===domain);
  if(!friendly||!opponent)continue;
  const route=game.pathfinding.findPathForDomain(friendly.getPosition(),opponent.getPosition(),domain);
  if(!route?.length)throw new Error(`Deployment has no connecting ${domain} route`);
 }
 return deployed;
}
export function combatPlaytestResult(scenario,deployed,{elapsed,retreatIssued=false,hq=null}={}){
 const player=deployed.player.filter(u=>u.alive),enemy=deployed.enemy.filter(u=>u.alive);
 const recovered=player.filter(u=>u.health/u.maxHealth>=.7&&hq&&u.getPosition().distanceTo(hq.getPosition())<30).length;
 const success=scenario.retreat?retreatIssued&&recovered>=2:enemy.length===0&&player.length>0;
 return {outcome:success?'success':player.length===0?'defeat':elapsed>=180?'timeout':'in-progress',elapsed,playerSurvivors:player.length,enemySurvivors:enemy.length,recovered};
}
