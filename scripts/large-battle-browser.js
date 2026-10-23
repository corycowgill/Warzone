// Development-only harness: interacts with the actual game inside its own iframe.
const frame=document.querySelector('#game'),status=document.querySelector('#status'),report=document.querySelector('#report');
const start=document.querySelector('#start'),sample=document.querySelector('#sample');
const exportButton=document.querySelector('#export');
exportButton.onclick=()=>{
 const url=URL.createObjectURL(new Blob([report.textContent],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='warzone-large-battle.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
let game,stages={},attacks=0;
const stage=(object,key,label)=>{
 const original=object?.[key];if(!original)return;
 object[key]=function(...args){const now=performance.now();try{return original.apply(this,args);}finally{const s=stages[label]??={calls:0,totalMs:0,maxMs:0};const ms=performance.now()-now;s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);}};
};
start.onclick=async()=>{
 game=frame.contentWindow.game;
 if(!game){status.textContent='Finish or skip the studio intro, then start.';return;}
 start.disabled=true;status.textContent='Loading the full battlefield…';
 try{
  await game.startGame({mode:'SPECTATE',playerNation:'america',enemyNation:'germany',difficulty:'normal',mapTemplate:'plains',mapSeed:6819,seed:6819});
  if(game.state!=='PLAYING')throw new Error('Battlefield did not load');
  for(const key of ['aiController','aiController2']){game[key]?.dispose?.();game[key]=null;}
  for(const u of [...game.getUnits('player'),...game.getUnits('enemy')])game.removeEntity(u);
  const V=game.cameraController.target.constructor;
  const types=[...Array(30).fill('infantry'),...Array(12).fill('tank'),...Array(4).fill('mortar'),...Array(4).fill('drone')];
  const taken=new Set();
  for(const [index,team] of ['player','enemy'].entries())for(const [i,type] of types.entries()){
   let point;
   for(let ring=0;ring<30&&!point;ring++)for(let z=-ring;z<=ring&&!point;z++)for(let x=-ring;x<=ring;x++){
    const px=(index?146:106)+(i%5-2)*4+x*2,pz=110+Math.floor(i/5)*3+z*2,key=`${px},${pz}`;
    if(!taken.has(key)&&game.terrain.isWalkable(px,pz)){point=new V(px,0,pz);taken.add(key);break;}
   }
   if(!point)throw new Error('No valid deployment slot');game.createUnit(type,team,point);
  }
  game.cameraController.moveTo(128,122);game.cameraController.zoom=90;game.cameraController.updateCamera();
  game.eventBus.on('combat:attack',()=>attacks++);
  for(const name of ['combatSystem','fogOfWar','effectsManager','instancedRenderer','weatherSystem','neutralStructures'])stage(game[name],'update',name);
  stage(game.effectsManager,'createDamageNumber','damageNumbers');
  for(const team of ['player','enemy'])game.commandSystem.attackMoveUnits(game.getUnits(team),new V(team==='player'?146:106,0,123));
  game.renderUpdate(0);game.uiManager.hud?.update();game.paused=true;
  status.textContent='100 units deployed and paused. Capture starts the battle.';sample.disabled=false;
 }catch(error){status.textContent=error.message;start.disabled=false;console.error(error);}
};
sample.onclick=()=>{
 sample.disabled=true;game.paused=false;stages={};attacks=0;const at=performance.now(),simStart=game.gameElapsed,initial={player:game.getUnits('player').length,enemy:game.getUnits('enemy').length};
 const metrics=game.frameMetrics;metrics.samples.length=0;metrics.resetClock();let frames=0,hidden=document.hidden,maxCorpses=0,maxLabels=0;
 const capture=()=>{
  hidden ||= document.hidden||frame.contentDocument.hidden;
  maxCorpses=Math.max(maxCorpses,game._corpses?.length??0);maxLabels=Math.max(maxLabels,game.effectsManager.activeEffects.filter(e=>e.type==='damageNumber').length);
  if(++frames<60){status.textContent=`Capturing frame ${frames}/60…`;requestAnimationFrame(capture);return;}
  const renderer=game.sceneManager.renderer;
  game.paused=true;
  const result={maxCorpses,maxLabels,damageTextureCache:game.effectsManager._damageTextCache?.size??0,scenario:'50-vs-50 mixed armies; actual renderer and simulation; no AI production',wallSeconds:(performance.now()-at)/1000,simulationSeconds:game.gameElapsed-simStart,hidden,initial,remaining:{player:game.getUnits('player').length,enemy:game.getUnits('enemy').length},attacks,metrics:metrics.summary(),stages:Object.fromEntries(Object.entries(stages).map(([key,s])=>[key,{calls:s.calls,meanMs:s.totalMs/s.calls,totalMs:s.totalMs,maxMs:s.maxMs}])),buffer:{width:renderer.domElement.width,height:renderer.domElement.height},resources:{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},userAgent:navigator.userAgent,validity:'Browser host scheduling and GPU may differ from a normal desktop tab. CPU submission is not GPU timing. Do not infer desktop FPS from a throttled host.'};
  result.graphics={...game.settingsManager.settings.graphics};
  report.textContent=JSON.stringify(result,null,2);status.textContent='Capture complete. Results remain on screen.';sample.disabled=false;exportButton.disabled=false;
 };requestAnimationFrame(capture);
};
