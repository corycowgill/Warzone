import {Vector3} from 'three';
import {GAME_CONFIG} from '../core/Constants.js';
import {buildingEligibility} from '../systems/BuildingRules.js';

// Search ahead when terrain or another structure blocks an expansion slot.
export function nextBaseBuildSite(ai,type){
 const game=ai.game,team=ai.team;
 if(!buildingEligibility(game,type,team).allowed)return null;
 const hq=game.getHQ(team);if(!hq)return null;
 const center=hq.getPosition(),worldSize=game.terrain?.worldSize??GAME_CONFIG.mapSize*GAME_CONFIG.worldScale;
 const start=ai.nextBuildSlot,seen=new Set();
 for(let offset=0;offset<36;offset++){
  const slot=start+offset,row=Math.floor(slot/3),col=slot%3;
  // Alternate north/south expansion to avoid running permanently into a map edge.
  const band=Math.floor(row/2)+1,direction=row%2===0?1:-1;
  const x=Math.max(15,Math.min(worldSize-15,center.x+(col-1)*18));
  const z=Math.max(15,Math.min(worldSize-15,center.z+direction*band*18));
  const key=`${x},${z}`;if(seen.has(key))continue;seen.add(key);
  const position=new Vector3(x,0,z);
  if(buildingEligibility(game,type,team,position).allowed)return {position,nextSlot:slot+1};
 }
 return null;
}
