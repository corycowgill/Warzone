import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Unit} from '../js/entities/Unit.js';
import {CommandSystem} from '../js/systems/CommandSystem.js';
import {PathfindingSystem} from '../js/systems/PathfindingSystem.js';
import {steerStep,separationVector} from '../js/systems/NavigationSteering.js';
import {AIController} from '../js/ai/AIController.js';
import {AttackWaves,readyForWave} from '../js/ai/AttackWaves.js';
const n=48,grid=Array.from({length:n},()=>new Uint8Array(n).fill(1));
for(let z=0;z<n;z++)if(z<20||z>27)grid[z][24]=0;
const terrain={worldScale:2,worldSize:n*2,mapSize:n,walkableGrid:grid,getHeightAt:()=>0,worldToGrid:(x,z)=>({x:Math.floor(x/2),z:Math.floor(z/2)}),gridToWorld:(x,z)=>({x:x*2+1,z:z*2+1}),isWalkable:(x,z)=>grid[Math.floor(z/2)]?.[Math.floor(x/2)]===1,isWater:()=>false};
const game={terrain,isMultiplayer:true,mode:'AI',getLocalTeam:()=>'player',eventBus:{emit(){}},units:[],getUnits(team){return this.units.filter(u=>u.team===team);},getEntitiesByTeam(team){return this.getUnits(team);},rng:{next:()=>.5},getBuildings:()=>[],getHQ:()=>null};
game.pathfinding=Object.assign(Object.create(PathfindingSystem.prototype),{game,gridSize:n,worldScale:2,_wallBlockedCells:new Set(),_wallCacheDirty:false});
game.spatialGrid={query:()=>game.units};game.commandSystem=new CommandSystem(game);
function unit(type,x,z,team='player'){
 const u=new Unit(type,team,new THREE.Vector3());u.mesh=new THREE.Group();u.mesh.position.set(x,0,z);u.game=game;
 u.updateStatusBadge=()=>{};u.updateProceduralAnimation=()=>{};u.updateFactionPassives=()=>{};game.units.push(u);return u;
}
const army=Array.from({length:18},(_,i)=>unit(i%3===0?'tank':'infantry',10+i%4*3,36+Math.floor(i/4)*3));
game.commandSystem.moveUnits(army,new THREE.Vector3(78,0,48),true);
const goals=army.map(u=>u.waypoints.at(-1)?.clone()??u.moveTarget?.clone());assert.ok(goals.every(Boolean));
assert.equal(new Set(goals.map(p=>`${p.x},${p.z}`)).size,army.length,'distinct formation slots');
for(let tick=0;tick<2000;tick++)for(const u of army){u.update(.05);assert.ok(terrain.isWalkable(u.getPosition().x,u.getPosition().z),'movement stays on the passable grid');}
assert.ok(army.every(u=>u.getPosition().x>60),'mixed army crosses the choke');
assert.ok(army.every((u,i)=>u.getPosition().distanceTo(goals[i])<9),'formation reforms near its slots');
const overlap=unit('infantry',10,10),second=unit('infantry',10,10);const a=separationVector(overlap,second),b=separationVector(second,overlap);assert.ok(a.x*b.x+a.z*b.z<-.99,'coincident units separate in opposite directions');
const corner=unit('infantry',47,15);assert.ok(!steerStep(corner,4,0,4),'cannot tunnel across blocked cells');
const stranded=game.pathfinding.findPathForDomain(new THREE.Vector3(10,0,10),new THREE.Vector3(80,0,10),'naval');assert.equal(stranded,null,'unreachable orders do not fall back to a straight line');
// Route-aware retreat traverses the opening instead of crossing the wall.
const retreat=unit('infantry',78,15);retreat.startRetreat(new THREE.Vector3(10,0,15));
for(let i=0;i<1600&&retreat.isRetreating;i++){retreat.update(.05);assert.ok(terrain.isWalkable(retreat.getPosition().x,retreat.getPosition().z));}
assert.equal(retreat.isRetreating,false);assert.ok(retreat.getPosition().x<20);
// Real AI wave handlers: gather, timed release, protect wounded and active missions.
game.units=[];const waveUnits=Array.from({length:8},(_,i)=>unit('infantry',10+i%4*3,38+Math.floor(i/4)*3,'enemy'));
const ai=Object.assign(Object.create(AIController.prototype),{game,team:'enemy',enemyTeam:'player',gameTime:100,_enemyMemory:new Map()});ai.attackWaves=new AttackWaves(ai);
ai.sendUnitsToTarget(waveUnits,new THREE.Vector3(78,0,48));assert.equal(ai.attackWaves.waves.length,1);assert.ok(waveUnits.every(u=>!readyForWave(u,100)));
ai.sendUnitsToTarget(waveUnits,new THREE.Vector3(78,0,48));assert.equal(ai.attackWaves.waves.length,1,'worker cannot repeatedly retask an active wave');
ai.gameTime=109;ai.attackWaves.update();assert.equal(ai.attackWaves.waves[0].phase,'advance');assert.ok(waveUnits.every(u=>u._attackMove));
const hq={alive:true,type:'headquarters',isBuilding:true,getPosition:()=>new THREE.Vector3(10,0,40)};game.getHQ=()=>hq;game.getBuildings=()=>[hq];
ai.retreatUnit(waveUnits[0]);const revision=waveUnits[0]._orderRevision;ai.retreatUnit(waveUnits[0]);assert.equal(waveUnits[0]._orderRevision,revision,'retreat is not reissued every micro tick');assert.equal(waveUnits[0].isRetreating,true);assert.equal(readyForWave(waveUnits[0],109),false);
const unseen=unit('tank',90,90,'player'),seen=unit('infantry',14,40,'player');const intel=ai.observedEnemies();assert.ok(intel.includes(seen));assert.ok(!intel.includes(unseen),'counter intelligence excludes unseen units');
const replies=[],worker={self:{postMessage:m=>replies.push(m)}};
vm.runInNewContext(await readFile(new URL('../js/workers/PathfindingWorker.js',import.meta.url),'utf8'),worker);
const send=data=>worker.self.onmessage({data});
send({type:'updateGrid',gridSize:2,worldScale:2,walkableGrid:new Uint8Array([1,0,0,1]),waterGrid:new Uint8Array(4)});
send({type:'findPath',id:1,startX:0,startZ:0,endX:1,endZ:1,domain:'land'});assert.equal(replies.at(-1).path,null,'worker cannot cut a blocked diagonal corner');
send({type:'findPath',id:2,startX:0,startZ:0,endX:1,endZ:1,domain:'naval'});assert.equal(replies.at(-1).path,null,'trees and blocked land do not become navigable water');
console.log('PASS 18-unit mixed choke traversal, unique slots, safe steps, coincident separation, routed retreat, staged AI waves, mission protection and observed intelligence.');
