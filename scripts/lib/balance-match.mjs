import {Projectile} from '../../js/entities/Projectile.js';
import {startingArmy} from '../../js/world/StartingDeployment.js';
import {UnitFactory} from '../../js/units/UnitFactory.js';
import {assetManager} from '../../js/rendering/AssetManager.js';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {AIWorkerBridge} from '../../js/ai/AIWorkerBridge.js';
import * as THREE from 'three';
import {Terrain} from '../../js/world/Terrain.js';
import {Entity} from '../../js/entities/Entity.js';
import {Building} from '../../js/entities/Building.js';
import {Turret} from '../../js/buildings/Turret.js';
import {AATurret} from '../../js/buildings/AATurret.js';
import {AIController} from '../../js/ai/AIController.js';
import {PathfindingSystem} from '../../js/systems/PathfindingSystem.js';
import {CombatSystem} from '../../js/systems/CombatSystem.js';
import {ProductionSystem} from '../../js/systems/ProductionSystem.js';
import {ResourceSystem} from '../../js/systems/ResourceSystem.js';
import {SpatialGrid} from '../../js/systems/SpatialGrid.js';
import {EventBus} from '../../js/core/EventBus.js';
import {SeededRandom} from '../../js/core/SeededRandom.js';
import {GAME_CONFIG,BUILDING_STATS,AI_DIFFICULTY} from '../../js/core/Constants.js';

// Actual core simulation without renderer, active abilities, research, neutral loot,
// fog rendering or worker scheduling. Results screen for pacing; they are not live win rates.
export function runMatch({seed=6819,map='river',nations=['america','germany'],difficulty='normal',limit=360,dt=.1}={}){
  // Warm the render-only projectile pool before resetting deterministic streams.
  const dummy={type:'infantry',getPosition:()=>new THREE.Vector3()};new Projectile(dummy,dummy,0).dispose();
  Entity.nextId=1;
  const rng=new SeededRandom(seed),random=Math.random,wallNow=Date.now,originalModel=assetManager.getTeamTintedModel,originalLabel=Entity.prototype.createTypeLabel;Entity.prototype.createTypeLabel=()=>{};assetManager.getTeamTintedModel=()=>new THREE.Group();const visualRng=new SeededRandom(seed^0x5588);Math.random=()=>visualRng.next();
  const workerSource=readFileSync(new URL('../../js/workers/AIWorker.js',import.meta.url),'utf8');
  const stats=()=>({resourcesGathered:0,unitsProduced:0,unitsLost:0,enemiesKilled:0,buildingsBuilt:0,buildingsLost:0});
  const game={mode:'SPECTATE',state:'PLAYING',isMultiplayer:true,aiDifficulty:difficulty,_difficultyConfig:AI_DIFFICULTY[difficulty],gameElapsed:0,rng,entities:[],eventBus:new EventBus(),stats:{player:stats(),enemy:stats()},
    teams:Object.fromEntries(['player','enemy'].map((team,i)=>[team,{nation:nations[i],sp:GAME_CONFIG.startingSP,mu:GAME_CONFIG.startingMU}])),
    startResearch:()=>false,startBranchResearch:()=>false,
    sceneManager:{camera:new THREE.PerspectiveCamera()},getLocalTeam:()=>'player',hasResearch:()=>false,
    getUnits(team){return this.entities.filter(e=>e.alive&&e.isUnit&&e.team===team);},getBuildings(team){return this.entities.filter(e=>e.alive&&e.isBuilding&&e.team===team);},getEntitiesByTeam(team){return this.entities.filter(e=>e.alive&&e.team===team);},getDitches(team){return this.getBuildings(team).filter(e=>e.type==='ditch');},getHQ(team){return this.getBuildings(team).find(e=>e.type==='headquarters');},
    addProjectile(p){p.dispose();},
  };
  Date.now=()=>Math.round(game.gameElapsed*1000);
  const report={seed,map,nations,difficulty,firstCombat:null,firstHQDamage:null,construction:{player:[],enemy:[]},waves:{player:0,enemy:0},duration:limit,winner:'timeout',peakArmy:{player:0,enemy:0}};
  function prepare(e,pos){e.mesh=new THREE.Group();e.mesh.position.copy(pos);e.game=game;e.takeDamage=function(damage){this.health=Math.max(0,this.health-damage);if(!this.health)this.alive=false;};e.updateHealthBar=()=>{};game.entities.push(e);return e;}
  const factory=new UnitFactory(game);factory.applyFactionVisuals=()=>{};
  game.createUnit=(type,team,pos)=>{const u=prepare(factory.create(type,team,pos),pos);u.applyNationBonuses(game.teams[team].nation);u.ability=null;u.updateStatusBadge=()=>{};u.updateProceduralAnimation=()=>{};u.updateFactionPassives=()=>{};u._updateVeterancyVisual=()=>{};game.stats[team].unitsProduced++;return u;};
  game.createBuilding=(type,team,pos)=>{const b=prepare(new Building(type,team,pos),pos);b.applyNationBonuses(game.teams[team].nation);b._updateDamageState=()=>{};
    if(type==='turret'||type==='aaturret'){
      const proto=type==='turret'?Turret.prototype:AATurret.prototype;
      Object.assign(b,{damage:BUILDING_STATS[type].damage,range:BUILDING_STATS[type].range,attackRate:BUILDING_STATS[type].attackRate,armor:BUILDING_STATS[type].armor,attackCooldown:0,attackTarget:null,isTurret:true});
      for(const key of ['autoTarget','canAttack','isInRange'])b[key]=proto[key];
      b.update=function(delta){Building.prototype.update.call(this,delta);this.attackCooldown-=delta;if(!this._constructing)this.autoTarget();};
    }
    game.stats[team].buildingsBuilt++;report.construction[team].push({type,time:+game.gameElapsed.toFixed(1)});return b;
  };
  try{
    game.terrain=new Terrain(game,map,seed);
    game.pathfinding=Object.assign(Object.create(PathfindingSystem.prototype),{game,gridSize:128,worldScale:2,_wallBlockedCells:new Set(),_wallCacheDirty:true});
    game.pathfinding.findPathAsync=(start,end,domain)=>Promise.resolve(game.pathfinding.findPathForDomain(start,end,domain));
    game.resourceSystem=new ResourceSystem(game);game.productionSystem=new ProductionSystem(game);game.combatSystem=new CombatSystem(game);game.spatialGrid=new SpatialGrid(12);
    game.eventBus.on('combat:kill',({attacker,defender})=>{if(defender.isUnit){game.stats[defender.team].unitsLost++;game.stats[attacker.team].enemiesKilled++;}else game.stats[defender.team].buildingsLost++;});
    game.eventBus.on('combat:attack',({attacker,defender,damage})=>{if(report.firstCombat===null)report.firstCombat=+game.gameElapsed.toFixed(1);if(defender.type==='headquarters'&&report.firstHQDamage===null)report.firstHQDamage=+game.gameElapsed.toFixed(1);});
    for(const [team,x,bx,ux] of [['player',30,45,50],['enemy',196,181,176]]){
      game.createBuilding('headquarters',team,new THREE.Vector3(x,2,128));game.createBuilding('barracks',team,new THREE.Vector3(bx,2,113));
      for(const unit of startingArmy(team))game.createUnit(unit.type,team,new THREE.Vector3(unit.x,2,unit.z));
    }
    const ais=[new AIController(game,'player',difficulty),new AIController(game,'enemy',difficulty)];
    const bridges=ais.map((ai,i)=>{
      ai._workerManaged=true;
      const bridge=Object.assign(Object.create(AIWorkerBridge.prototype),{game,team:ai.team,ai,difficulty,_workerRngState:seed+i*139,timer:0});
      const context={self:{postMessage(message){bridge._workerRngState=message.rngState;bridge._executeCommands(message.commands);}}};vm.runInNewContext(workerSource,context);bridge.context=context;return bridge;
    });
    for(let tick=0;tick<limit/dt;tick++){
      game.gameElapsed=tick*dt;
      game.spatialGrid.clear();for(const e of game.entities)if(e.alive)game.spatialGrid.insert(e);
      for(const e of game.entities)if(e.alive)e.update(dt);
      game.combatSystem.update(dt);game.resourceSystem.update(dt);game.productionSystem.update(dt);
      for(const bridge of bridges){bridge.ai.update(dt);bridge.timer+=dt;if(bridge.timer>=bridge.ai.tacticalInterval){bridge.timer=0;bridge.context.self.onmessage({data:{type:'aiDecide',team:bridge.team,state:bridge._snapshotState()}});}}
      for(const team of ['player','enemy'])report.peakArmy[team]=Math.max(report.peakArmy[team],game.getUnits(team).length);
      if(!game.getHQ('player')||!game.getHQ('enemy')){report.duration=+game.gameElapsed.toFixed(1);report.winner=game.getHQ('player')?'player':game.getHQ('enemy')?'enemy':'draw';break;}
      if(tick%100===0)game.entities=game.entities.filter(e=>e.alive);
    }
    report.waves=Object.fromEntries(ais.map(ai=>[ai.team,ai.attackWaveCount]));report.economy=game.stats;report.hqHP=Object.fromEntries(['player','enemy'].map(team=>[team,game.getHQ(team)?.health??0]));
    game.terrain.dispose();return report;
  }finally{Math.random=random;Date.now=wallNow;assetManager.getTeamTintedModel=originalModel;Entity.prototype.createTypeLabel=originalLabel;}
}
