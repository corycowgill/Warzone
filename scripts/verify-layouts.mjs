import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {Terrain} from '../js/world/Terrain.js';
import {trailZ} from '../js/world/BattlefieldLayout.js';
import {ReplayRecorder} from '../js/replay/ReplayRecorder.js';
import {PathfindingSystem} from '../js/systems/PathfindingSystem.js';
const messages=[];
const worker={self:{postMessage:m=>messages.push(m)}};
vm.runInNewContext(await readFile(new URL('../js/workers/PathfindingWorker.js',import.meta.url),'utf8'),worker);
const send=data=>worker.self.onmessage({data});
const seeds=[1,7,42,6819,99123,2147483647];
for(const map of ['continental','river','plains','islands'])for(const seed of seeds){
  const terrain=new Terrain({},map,seed);
  const pf=Object.assign(Object.create(PathfindingSystem.prototype),{game:{terrain,entities:[]},gridSize:terrain.mapSize,worldScale:terrain.worldScale,_wallBlockedCells:new Set(),_wallCacheDirty:false});
  assert.ok(terrain.heightData.every(row=>row.every(Number.isFinite)));
  for(const cx of [15,98])for(let dz=-7;dz<=7;dz++)for(let dx=-7;dx<=7;dx++){
    if(Math.hypot(dx,dz)>7)continue;
    assert.equal(terrain.walkableGrid[64+dz][cx+dx],1,`${map}/${seed}: base construction clearing`);
    assert.equal(terrain.heightData[64+dz][cx+dx],2);
  }
  if(map!=='islands'){
    for(const lane of [-1,1])for(let x=15;x<=98;x++){
      const z=Math.round(trailZ(x,128,lane));
      for(let dz=-1;dz<=1;dz++)assert.equal(terrain.walkableGrid[z+dz][x],1,`${map}/${seed}: flank lane stays open`);
    }
    const route=pf.astar({x:15,y:64},{x:98,y:64},'land');
    assert.ok(route?.length>2,`${map}/${seed}: actual A* reaches enemy base`);
    assert.ok(route.every(p=>terrain.walkableGrid[p.y][p.x]===1));
    const grid=new Uint8Array(128*128);terrain.walkableGrid.forEach((row,z)=>grid.set(row,z*128));
    send({type:'updateGrid',gridSize:128,worldScale:2,walkableGrid:grid});
    send({type:'findPath',id:seed,startX:15,startZ:64,endX:98,endZ:64,domain:'land'});
    assert.ok(messages.at(-1).path?.length>2,'real worker A* finds the route');
    assert.ok(messages.at(-1).path.every(p=>terrain.walkableGrid[p.y][p.x]===1));
  }else{
    const water=terrain.heightData.flatMap(row=>Array.from(row)).filter(h=>h<-.5).length;
    assert.ok(water>128*128*.3,'islands retain a substantial naval domain');
    assert.ok(pf.astar({x:64,y:55},{x:64,y:73},'naval')?.length,'naval passage between main islands');
  }
  assert.ok(terrain.landmarks.length>=2);
  terrain.dispose();
}
// Captured from e440b94 before the layout redesign: heights, collision and trees.
const legacyHashes={continental:'62c70e3b83bd7c2aa28a47177e0dd230361cc142b9e7d52667a15d2187c3a5c9',river:'1e02bf39d4e224176e6d94cfd7788c1ad654d1d6128fb15b349ed4c556563f84',islands:'0e8b2c823f0226cad88e588834f89c7c8a1febf74ac402c407e5ab78a62c068c',plains:'59b1c3b026a76120c63734cde26a49a874f7d0ec31e012c1a8753187b1fb2e38'};
for(const [map,expected] of Object.entries(legacyHashes)){
 const t=new Terrain({},map,6819,'temperate',1),hash=createHash('sha256');
 for(const row of t.heightData)hash.update(Buffer.from(row.buffer));
 for(const row of t.walkableGrid)hash.update(Buffer.from(row.buffer));
 hash.update(JSON.stringify(t.treePositions));assert.equal(hash.digest('hex'),expected,`${map} old-save terrain unchanged`);t.dispose();
}
const old=new Terrain({},'river',6819,'temperate',1);
assert.equal(old.layoutVersion,1);assert.equal(old.landmarks,undefined);
const current=new Terrain({},'river',6819);
assert.notDeepEqual(current.heightData,old.heightData,'new layouts differ from legacy saves');
old.dispose();current.dispose();
const recorder=new ReplayRecorder({terrain:{seed:42,layoutVersion:2,biome:'arctic'}});
recorder._hookEvents=()=>{};recorder.start({});
assert.equal(recorder.initialState.mapSeed,42);assert.equal(recorder.initialState.layoutVersion,2);assert.equal(recorder.initialState.biome,'arctic');
console.log('PASS 24 seeded layouts: flat base clearings, open flanks, actual land A*, naval passage, landmarks and legacy generation.');
