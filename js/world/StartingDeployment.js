import {GAME_CONFIG} from '../core/Constants.js';
// Mirror the forward offset around each HQ, rather than adding +X on both sides.
export function startingArmy(team,worldSize=GAME_CONFIG.mapSize*GAME_CONFIG.worldScale){
  const hqX=team==='player'?30:worldSize-60,direction=team==='player'?1:-1,z=worldSize/2+10;
  return [0,4,8].map(offset=>({type:'infantry',x:hqX+direction*(20+offset),z})).concat({type:'scoutcar',x:hqX+direction*34,z});
}
