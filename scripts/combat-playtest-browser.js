import {COMBAT_PLAYTESTS,deployCombatPlaytest,combatPlaytestResult} from '../js/testing/CombatPlaytests.js';
const $=id=>document.getElementById(id);
const select=$('scenario'),frame=$('game'),status=$('status');
for(const [key,s] of Object.entries(COMBAT_PLAYTESTS)){const option=document.createElement('option');option.value=key;option.textContent=s.name;select.append(option);}
const describe=()=>{$('lesson').textContent=COMBAT_PLAYTESTS[select.value].lesson+' Fixed armies, 180-second limit. Select your units and issue normal game commands. Load again to retry.';};
select.onchange=describe;describe();
$('fullscreen').onclick=()=>frame.requestFullscreen().catch(()=>{status.textContent='Full-screen is unavailable here. Open the game in a larger browser window.';});
let game,deployed,scenario,key,startedAt=0,report=null,timer=null,retreatIssued=false,hiddenDuringRun=false,events=[],listeners=[];
function cleanup(){clearInterval(timer);timer=null;for(const [event,fn] of listeners)game?.eventBus.off(event,fn);listeners=[];}
function listen(event,fn){game.eventBus.on(event,fn);listeners.push([event,fn]);}
function snapshot(){
 const result=combatPlaytestResult(scenario,deployed,{elapsed:game.gameElapsed-startedAt,retreatIssued,hq:game.getHQ('player')});
 return {scenario:key,seed:6819,initial:{player:scenario.player,enemy:scenario.enemy},units:Object.fromEntries(['player','enemy'].map(team=>[team,deployed[team].map(u=>({type:u.type,alive:u.alive,health:u.health,position:{x:u.getPosition().x,z:u.getPosition().z},retreating:u.isRetreating,holding:u._holdPosition,pathPending:u._pathPending}))])),remaining:Object.fromEntries(['player','enemy'].map(team=>[team,deployed[team].filter(u=>u.alive).map(u=>({type:u.type,health:u.health,maxHealth:u.maxHealth}))])),build:'combat-trials-v1',...result,events:[...events],metrics:game.frameMetrics?.summary(),graphics:{...game.settingsManager.settings.graphics},userAgent:navigator.userAgent,buffer:{width:game.sceneManager.renderer.domElement.width,height:game.sceneManager.renderer.domElement.height},visibility:document.visibilityState,hiddenDuringRun,limitations:'Human-controlled fixed armies; AI strategy and production disabled. Frame metrics are host-dependent and do not measure GPU completion.'};
}
$('start').onclick=async()=>{
 const candidate=frame.contentWindow.game;if(!candidate){status.textContent='Finish or skip the intro first.';return;}
 $('start').disabled=true;$('run').disabled=true;$('export').disabled=true;select.disabled=true;status.textContent='Preparing the scenario…';
 cleanup();game=candidate;key=select.value;scenario=COMBAT_PLAYTESTS[key];report=null;events=[];retreatIssued=false;
 try{
  if(game.terrain)game.restart();
  game.uiManager.hideAll();
  // Same faction and Normal difficulty avoid asymmetric nation bonuses and Easy assists.
  await game.startGame({mode:'1P',playerNation:'america',enemyNation:'america',difficulty:'normal',mapTemplate:scenario.map,mapSeed:6819,seed:6819,gameMode:'hq_destruction'});
  if(game.state!=='PLAYING')throw new Error('Game failed to load');
  game.paused=true;
  for(const name of ['aiController','aiController2']){game[name]?.dispose?.();game[name]=null;}
  // Suppress ordinary match victory and random map events, without creating a tutorial.
  game.gameMode='tutorial';game.mapEventSystem?.dispose?.();game.mapEventSystem=null;
  for(const entity of [...game.entities])if(entity.isUnit||(entity.isBuilding&&entity.type!=='headquarters'))game.removeEntity(entity);
  game.selectionManager.clearSelection();
  deployed=deployCombatPlaytest(game,key);
  // Initialize fog before pausing: no simulation ticks run during briefing.
  const fog=game.fogOfWar;
  if(fog){
    fog._worker?.terminate();fog._worker=null;fog._workerBusy=false;
    fog._throttleCounter=fog._throttleInterval-1;fog.update(0);
    fog._initWorker();
  }
  // Fixed armies: reject training/construction in this development harness only.
  game.productionSystem.requestProduction=()=>false;
  game.productionSystem.requestBuilding=()=>false;
  const pos=deployed.player[0].getPosition();game.cameraController.moveTo(pos.x,pos.z);game.cameraController.zoom=85;game.cameraController.updateCamera();
  game.selectionManager.selectEntities(deployed.player);
  game.renderUpdate(0);game.uiManager.hud?.update();
  status.textContent='Ready and paused. Review your army, then Begin combat.';$('run').disabled=false;
 }catch(error){status.textContent=`Setup failed: ${error.message}`;game.paused=true;}
 finally{$('start').disabled=false;select.disabled=false;}
};
$('run').onclick=()=>{
 $('run').disabled=true;startedAt=game.gameElapsed;events=[];retreatIssued=false;hiddenDuringRun=document.hidden;
 for(const event of ['combat:attack','combat:kill','command:retreat','command:blocked','ability:used'])listen(event,data=>{
  if(event==='command:retreat'&&data.units?.some(u=>deployed.player.includes(u)))retreatIssued=true;
  if(events.length<256)events.push({event,time:+(game.gameElapsed-startedAt).toFixed(2),unitType:(data.unit||data.attacker)?.type,team:(data.unit||data.attacker)?.team,defenderType:data.defender?.type,defenderTeam:data.defender?.team,damage:data.damage,ability:data.ability,orders:data.units?.map(u=>({type:u.type,position:{x:u.getPosition().x,z:u.getPosition().z},retreatTarget:u.retreatTarget?{x:u.retreatTarget.x,z:u.retreatTarget.z}:null,pendingGoal:u._pendingMoveGoal?{x:u._pendingMoveGoal.x,z:u._pendingMoveGoal.z}:null}))});
 });
 const V=deployed.player[0].getPosition().constructor;
 const target=deployed.player[0].getPosition();
 game.commandSystem.attackMoveUnits(deployed.enemy,new V(target.x,0,target.z));
 game.frameMetrics.samples.length=0;game.frameMetrics.resetClock();game.paused=false;
 timer=setInterval(()=>{
  hiddenDuringRun ||= document.hidden || frame.contentDocument.hidden;
  const result=snapshot();status.textContent=`${result.outcome} · ${result.elapsed.toFixed(1)}s · yours ${result.playerSurvivors} / enemy ${result.enemySurvivors}${scenario.retreat?' · recovered '+result.recovered:''}`;
  report=result;$('export').disabled=false;
  if(result.outcome!=='in-progress'){game.paused=true;cleanup();}
 },250);
};
$('export').onclick=()=>{
 if(!report)return;
 const result={...report,clarity:$('clarity').value,notes:$('notes').value};
 const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`warzone-combat-${key}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('pagehide',cleanup);
