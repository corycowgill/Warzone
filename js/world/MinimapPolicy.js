import {localTeam} from '../systems/InputPolicy.js';
import {GAME_CONFIG} from '../core/Constants.js';
export function visibleMinimapContact(game,entity){
 if(!entity.alive||entity.isGarrisoned)return 'hidden';
 if(game.mode==='SPECTATE'||entity.team===localTeam(game))return 'visible';
 if(entity.type==='submarine'&&entity.isStealthed?.())return 'hidden';
 const fog=game.fogOfWar;if(!fog)return 'visible';
 if(fog.team&&fog.team!==localTeam(game))return 'hidden';
 const p=entity.getPosition(),state=fog.getStateAtGrid(Math.floor(p.x/GAME_CONFIG.worldScale),Math.floor(p.z/GAME_CONFIG.worldScale));
 if(state===2||entity._combatRevealTimer>0)return 'visible';
 if(entity._lastSeenPosition){
  const previous=entity._lastSeenPosition;
  if(fog.getStateAtGrid(Math.floor(previous.x/GAME_CONFIG.worldScale),Math.floor(previous.z/GAME_CONFIG.worldScale))!==2)return 'remembered';
 }
 return 'hidden';
}
export function canShowCombatPing(game,entity){
 if(game.mode==='SPECTATE'||entity.team===localTeam(game))return true;
 if(entity.type==='submarine'&&entity.isStealthed?.())return false;
 const fog=game.fogOfWar;if(!fog)return true;
 if(fog.team&&fog.team!==localTeam(game))return false;
 const p=entity.getPosition();return fog.getStateAtGrid(Math.floor(p.x/GAME_CONFIG.worldScale),Math.floor(p.z/GAME_CONFIG.worldScale))===2||entity._combatRevealTimer>0;
}
export function pushMinimapPing(pings,ping){pings.push(ping);if(pings.length>24)pings.splice(0,pings.length-24);}
