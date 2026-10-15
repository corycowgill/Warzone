// Disposable diagnostic page only. Does not save preferences or alter normal startup.
import * as THREE from 'three';
import {Game} from '../core/Game.js';
import {settingsManager} from '../core/SettingsManager.js';
const panel=document.createElement('section');
panel.style.cssText='position:fixed;top:90px;left:12px;z-index:999999;background:#14272cf5;color:white;padding:14px;width:550px;max-height:70vh;overflow:auto;font:12px monospace;pointer-events:auto';
panel.innerHTML='<button id="stress-run">Run army scaling analysis</button> <button id="stress-ai">Run 30-second AI sample</button> <button id="stress-soak">Run 90-second AI soak at 4x</button> <button id="stress-batching">Run batching A/B comparison</button> <button id="stress-compatibility">Check gameplay compatibility</button><p id="stress-status">Ready. Uses disposable game; preferences are not saved.</p><pre id="stress-results" style="white-space:pre-wrap"></pre>';
document.body.append(panel);
const status=panel.querySelector('#stress-status'),output=panel.querySelector('#stress-results'),buttons=[...panel.querySelectorAll('button')];
const game=new Game();game.init();
game.saveSystem._autosaveEnabled=false;
game.achievementSystem.save=()=>{};
const originalGraphics={...settingsManager.settings.graphics};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
let timings={},recording=false,restores=[];
function instrument(object,key,label){
 if(!object||typeof object[key]!=='function')return;
 const original=object[key];
 object[key]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{if(recording){const entry=timings[label]??={ms:0,calls:0};entry.ms+=performance.now()-start;entry.calls++;}}};
 restores.push(()=>object[key]=original);
}
function profile(){
 instrument(game.combatSystem,'update','combat');instrument(game.fogOfWar,'update','fog');
 instrument(game.pathfinding,'findPath','pathfinding');instrument(game.entityManager,'updatePositions','entityIndex');
 instrument(game.effectsManager,'update','effects');instrument(game.effectsManager,'updateShadows','blobShadows');
 instrument(game.uiManager,'updateHUD','HUD');instrument(game.aiController,'update','enemyAI');instrument(game.aiController2,'update','playerAI');
}
async function start(mode){
 restores.forEach(fn=>fn());restores=[];game.restart();
 Object.assign(settingsManager.settings.graphics,originalGraphics,{quality:'high',shadowQuality:'medium',terrainDetail:'high',resolution:1,adaptiveResolution:false,bloom:true,vignette:true});
 await game.startGame({mode,playerNation:'america',enemyNation:'germany',difficulty:'normal',mapTemplate:'plains',mapSeed:6819,seed:6819,biome:'temperate'});
 if(game.state!=='PLAYING')throw Error('Game did not start');
 game.gameModeSystem.saveMatchHistory=()=>{};
 game.cameraController.pointerOverBattlefield=false;game.cameraController.edgePanEnabled=false;
}
async function sample(label,seconds=5,warmup=2){
 status.textContent=label+' / warmup';let t=performance.now();while(performance.now()-t<warmup*1000)await frame();
 const samples=[];let previous=null;timings={};recording=true;status.textContent=label+' / measuring';t=performance.now();
 while(performance.now()-t<seconds*1000&&game.state==='PLAYING'){await frame();if(document.hidden)throw Error('Keep the diagnostic tab active during measurement');const s=game.frameMetrics.samples.at(-1);if(s&&s!==previous){samples.push({...s});previous=s;}}
 recording=false;if(!samples.length)throw Error('No frame samples');
 const mean=key=>samples.reduce((sum,s)=>sum+s[key],0)/samples.length;
 const sorted=samples.map(s=>s.frameMs).sort((a,b)=>a-b),round=n=>+n.toFixed(2);
 const result={label,frames:samples.length,entities:game.entities.length,units:game.entities.filter(e=>e.isUnit&&e.alive).length,fps:round(1000/mean('frameMs')),p95Ms:round(sorted[Math.floor(sorted.length*.95)]),maxMs:round(sorted.at(-1)),over33ms:samples.filter(s=>s.frameMs>33.4).length,simulationMs:round(mean('simulationMs')),visualMs:round(mean('visualMs')),submitMs:round(mean('renderMs')),draws:Math.round(mean('draws')),triangles:Math.round(mean('triangles')),buffer:game.sceneManager.renderer.domElement.width+'×'+game.sceneManager.renderer.domElement.height,instancedUnits:game.instancedRenderer?.entities.size??0,subsystems:Object.fromEntries(Object.entries(timings).map(([key,value])=>[key,{msPerFrame:round(value.ms/samples.length),calls:value.calls}]))};
 result.gameSeconds=round(game.gameElapsed);result.state=game.state;
 result.wallSeconds=round((performance.now()-t)/1000);
 result.batchingEnabled=game.instancedRenderer?.enabled??false;
 if(!result.batchingEnabled)result.instancedUnits=0;
 result.resources={geometries:game.sceneManager.renderer.info.memory.geometries,textures:game.sceneManager.renderer.info.memory.textures,programs:game.sceneManager.renderer.info.programs.length};
 return result;
}
async function run(task){buttons.forEach(b=>b.disabled=true);const results=[];try{await task(results);status.textContent='PASS / analysis complete';}catch(error){status.textContent='FAIL / '+error.message;console.error(error);}finally{recording=false;restores.forEach(fn=>fn());restores=[];Object.assign(settingsManager.settings.graphics,originalGraphics);game._applyGraphicsSettings();game.setState('PAUSED');buttons.forEach(b=>b.disabled=false);}}
function report(results,result){results.push(result);output.textContent=JSON.stringify(results,null,2);}
function populateArmy(count){
 while(game.getUnits('player').length<count){const i=game.getUnits('player').length,x=55+(i%20)*4,z=90+Math.floor(i/20)*4;const unit=game.createUnit(['infantry','tank','scoutcar'][i%3],'player',new THREE.Vector3(x,0,z));unit.stance='holdfire';}
}
buttons[0].onclick=()=>run(async results=>{
 await start('1P');game.aiController?.dispose();game.aiController=null;
 for(const entity of game.entities)if(entity.isUnit)entity.stance='holdfire';
 game.cameraController.moveTo(100,128);game.cameraController.zoom=85;
 profile();
 for(const count of [50,100,200,400]){
  populateArmy(count);
  report(results,await sample(count+' units / High'));
 }
 // Keep all 400 real entities active; isolate rendering options at fixed population.
 settingsManager.settings.graphics.shadows=false;game._applyGraphicsSettings();
 report(results,await sample('400 units / no directional shadows'));
 settingsManager.settings.graphics.resolution=.5;game._applyGraphicsSettings();
 report(results,await sample('400 units / half resolution, no shadows'));
 Object.assign(settingsManager.settings.graphics,{resolution:1,quality:'low',terrainDetail:'medium',bloom:false,vignette:false});game._applyGraphicsSettings();
 report(results,await sample('400 units / direct render, no shadows'));
});
buttons[1].onclick=()=>run(async results=>{await start('SPECTATE');profile();for(let i=0;i<3;i++)report(results,await sample('AI battle / window '+(i+1),10,i===0?2:0));});
buttons[2].onclick=()=>run(async results=>{
 await start('SPECTATE');game.gameSpeed=4;
 // Prevent an early HQ kill from ending this artificial endurance workload.
 for(const team of ['player','enemy'])game.getHQ(team).takeDamage=()=>{};
 profile();for(let i=0;i<3&&game.state==='PLAYING';i++)report(results,await sample('AI soak at 4x, protected HQs / window '+(i+1),30,i===0?2:0));
});
buttons[3].onclick=()=>run(async results=>{
 await start('1P');game.aiController?.dispose();game.aiController=null;
 for(const entity of game.entities)if(entity.isUnit)entity.stance='holdfire';
 game.cameraController.moveTo(100,128);game.cameraController.zoom=85;profile();
 for(const count of [200,400]){
  populateArmy(count);
  for(const enabled of [false,true]){
   game.instancedRenderer.enabled=enabled;
   report(results,await sample(count+' units / batching '+(enabled?'on':'off'),5,4));
  }
 }
});
buttons[4].onclick=()=>run(async results=>{
 await start('1P');game.aiController?.dispose();game.aiController=null;
 game.setState('PAUSED');
 const tank=game.createUnit('tank','player',new THREE.Vector3(100,0,128));
 const target=game.createUnit('heavytank','enemy',new THREE.Vector3(112,0,128));
 for(const unit of game.entities)if(unit.isUnit)unit.stance='holdfire';
 game.cameraController.moveTo(100,128);game.cameraController.update(.016);
 game.fogOfWar.grid.fill(2);game.fogOfWar.updateEntityVisibility();game.renderUpdate(.016);
 function check(condition,label){if(!condition)throw Error(label);results.push({check:label,result:'PASS'});output.textContent=JSON.stringify(results,null,2);}
 function screen(unit){const p=unit.getPosition().clone().add(new THREE.Vector3(0,1,0)).project(game.sceneManager.camera);return {clientX:(p.x+1)*innerWidth/2,clientY:(1-p.y)*innerHeight/2,shiftKey:false};}
 // Invoke the same handlers as actual canvas clicks, including their raycasters.
 game.state='PLAYING';game.selectionManager.handleClick(screen(tank));game.state='PAUSED';
 check(game.selectionManager.getSelected().includes(tank),'Select batched unit through original model picking');
 game.state='PLAYING';game.commandSystem.handleRightClick(screen(target));game.state='PAUSED';
 check(tank.attackTarget===target,'Right-click attack targets batched enemy');
 tank.attackTarget=null;tank.moveTo(new THREE.Vector3(104,0,128));const before=tank.mesh.position.clone();
 for(let i=0;i<15;i++)game.update(1/30);
 game.renderUpdate(.016);check(tank.mesh.position.distanceTo(before)>.1,'Movement updates live unit and instance transforms');
 const count=()=>[...game.instancedRenderer.batches.values()].reduce((sum,b)=>sum+b.count,0);
 const visible=count();tank.mesh.visible=false;game.instancedRenderer.update();check(count()<visible,'Fog-hidden model and overlays leave all batches');
 tank.mesh.visible=true;tank.isGarrisoned=true;game.instancedRenderer.update();check(count()<visible,'Garrisoned unit leaves all batches');tank.isGarrisoned=false;
 game.instancedRenderer.update();const corpseMesh=tank.mesh;tank.alive=false;game.update(1/30);game.renderUpdate(.016);
 check(!game.instancedRenderer.hasEntity(tank.id),'Dead unit removed from batches');
 const corpse=game._corpses.find(c=>c.mesh===corpseMesh);
 check(corpse?.mesh.parent===game.sceneManager.scene,'Corpse remains visible after live entity removal');
 game.postProcessing.render();check(true,'Batched scene and corpse render after lifecycle changes');
 const save=game.saveSystem.serialize();await game.saveSystem.deserialize(save);game.renderUpdate(.016);
 const liveUnits=game.entities.filter(e=>e.isUnit&&e.alive);
 check(liveUnits.length===game.instancedRenderer.entities.size&&liveUnits.every(e=>game.instancedRenderer.hasEntity(e.id)),
  'In-memory save/load rebuilds batches under restored entity IDs');
});
