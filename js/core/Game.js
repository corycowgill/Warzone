import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GAME_CONFIG, NATIONS, BUILDING_STATS, UNIT_STATS, RESEARCH_UPGRADES, SALVAGE_CONFIG, RESOURCE_NODE_CONFIG, CONSTRUCTION_CONFIG, TECH_BRANCHES, COMMANDER_CONFIG, CHALLENGE_SCENARIOS } from './Constants.js';
import { SceneManager } from '../rendering/SceneManager.js';
import { CameraController } from '../rendering/CameraController.js';
import { EffectsManager } from '../rendering/EffectsManager.js';
import { Terrain } from '../world/Terrain.js';
import { Minimap } from '../world/Minimap.js';
import { InputManager } from '../systems/InputManager.js';
import { SelectionManager } from '../systems/SelectionManager.js';
import { CommandSystem } from '../systems/CommandSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { ProductionSystem } from '../systems/ProductionSystem.js';
import { PathfindingSystem } from '../systems/PathfindingSystem.js';
import { AIController } from '../ai/AIController.js';
import { UIManager } from '../ui/UIManager.js';
import { UnitFactory } from '../units/UnitFactory.js';
import { BuildingFactory } from '../buildings/BuildingFactory.js';
import { SoundManager } from '../systems/SoundManager.js';
import { FogOfWar } from '../systems/FogOfWar.js';
import { NationAbilitySystem } from '../systems/NationAbilitySystem.js';
import { AlertSystem } from '../systems/AlertSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { NeutralStructureSystem } from '../systems/NeutralStructureSystem.js';
import { PostProcessing } from '../rendering/PostProcessing.js';
import { assetManager } from '../rendering/AssetManager.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { StrategicOverlay } from '../rendering/StrategicOverlay.js';

export class Game {
  constructor() {
    this.state = 'MENU'; // MENU, NATION_SELECT, LOADING, PLAYING, GAME_OVER
    this.eventBus = new EventBus();
    this.entities = [];
    this.projectiles = [];
    this.teams = {
      player: { nation: null, sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU },
      enemy: { nation: null, sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU }
    };
    this.mode = '1P';
    this.activeTeam = 'player'; // For 2P hot-seat
    this.clock = new THREE.Clock();
    this.paused = false;

    // Game timer and stats
    this.gameElapsed = 0;
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
    };

    // Research state per team
    this.research = {
      player: { completed: [], inProgress: null, timer: 0, building: null, branches: {} },
      enemy: { completed: [], inProgress: null, timer: 0, building: null, branches: {} }
    };

    // Systems (initialized in startGame)
    this.sceneManager = null;
    this.cameraController = null;
    this.terrain = null;
    this.inputManager = null;
    this.selectionManager = null;
    this.commandSystem = null;
    this.combatSystem = null;
    this.resourceSystem = null;
    this.productionSystem = null;
    this.pathfinding = null;
    this.aiController = null;
    this.uiManager = null;
    this.minimap = null;
    this.effectsManager = null;
    this.unitFactory = null;
    this.soundManager = null;
    this.fogOfWar = null;
    this.nationAbilitySystem = null;
    this.alertSystem = null;
    this.waveSystem = null;
    this.neutralStructures = null;
    this.postProcessing = null;
    this.resourceNodes = [];
    this.aiController2 = null;
    this.weatherSystem = null;
    this.strategicOverlay = null;
    this._mapEventTimer = 0;
    this._mapEventInterval = 60; // seconds between events
    this._pendingTimeouts = []; // Track setTimeout IDs for cleanup on restart
    this._tutorialStep = 0;
    this._tutorialTimer = 0;
    this._tutorialShown = false;
  }

  init() {
    this.sceneManager = new SceneManager();
    this.soundManager = new SoundManager(this);
    this.uiManager = new UIManager(this);
    this.uiManager.showMainMenu();

    // Global key handlers (pause)
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Pause' || (e.key === 'p' && e.ctrlKey)) && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        e.preventDefault();
        this.togglePause();
      }
    });

    this.loop();
  }

  setState(newState) {
    this.state = newState;
    this.eventBus.emit('game:stateChange', { state: newState });
    if (this.soundManager) {
      this.soundManager.onStateChange(newState);
    }
  }

  // GD-134: Start a challenge scenario
  async startChallenge(challengeKey) {
    const scenario = CHALLENGE_SCENARIOS[challengeKey];
    if (!scenario) return;

    this._challenge = { key: challengeKey, scenario, startTime: 0, wavesSpawned: [], completed: false };

    await this.startGame({
      mode: '1P',
      playerNation: scenario.playerNation,
      enemyNation: scenario.enemyNation,
      difficulty: scenario.enemyDifficulty || 'normal',
      mapTemplate: scenario.mapTemplate || 'continental',
      gameMode: 'annihilation'
    });

    // Override resources
    if (scenario.playerStartSP !== undefined) this.teams.player.sp = scenario.playerStartSP;
    if (scenario.playerStartMU !== undefined) this.teams.player.mu = scenario.playerStartMU;
    if (scenario.enemyStartSP !== undefined) this.teams.enemy.sp = scenario.enemyStartSP;
    if (scenario.enemyStartMU !== undefined) this.teams.enemy.mu = scenario.enemyStartMU;

    // Disable production if scenario says so
    if (scenario.noProduction) {
      this._challenge.noProduction = true;
    }

    // Spawn starting units for each team
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    for (const team of ['player', 'enemy']) {
      const startUnits = scenario.startingUnits[team] || {};
      const baseX = team === 'player' ? 50 : mapSize - 80;
      const baseZ = mapSize / 2;
      let offset = 0;
      for (const [unitType, count] of Object.entries(startUnits)) {
        for (let i = 0; i < count; i++) {
          const pos = new THREE.Vector3(
            baseX + (offset % 5) * 4 + (Math.random() - 0.5) * 2,
            0,
            baseZ + Math.floor(offset / 5) * 4 + 10
          );
          this.createUnit(unitType, team, pos);
          offset++;
        }
      }
    }

    // Show challenge start notification
    if (this.uiManager?.hud) {
      this.uiManager.hud.showNotification(`Challenge: ${scenario.name}`, '#ffcc00');
      if (scenario.timeLimit > 0) {
        this.uiManager.hud.showNotification(`Time Limit: ${Math.floor(scenario.timeLimit / 60)} minutes`, '#ff8844');
      }
    }
  }

  // GD-134: Update challenge scenario state
  updateChallenge(delta) {
    if (!this._challenge || this._challenge.completed) return;

    const scenario = this._challenge.scenario;
    this._challenge.startTime += delta;
    const elapsed = this._challenge.startTime;

    // Block production in no-production scenarios
    if (this._challenge.noProduction && this.productionSystem) {
      // Clear any queued production for player
      const playerBuildings = this.getBuildings('player');
      for (const b of playerBuildings) {
        if (b.productionQueue && b.productionQueue.length > 0) {
          b.productionQueue = [];
          b.currentProduction = null;
        }
      }
    }

    // Spawn challenge waves
    if (scenario.waves) {
      for (let i = 0; i < scenario.waves.length; i++) {
        if (this._challenge.wavesSpawned.includes(i)) continue;
        const wave = scenario.waves[i];
        if (elapsed >= wave.time) {
          this._challenge.wavesSpawned.push(i);
          const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
          let offset = 0;
          for (const [unitType, count] of Object.entries(wave.units)) {
            for (let j = 0; j < count; j++) {
              const pos = new THREE.Vector3(
                mapSize - 60 + (offset % 5) * 4,
                0,
                mapSize / 2 + Math.floor(offset / 5) * 4 + (Math.random() - 0.5) * 10
              );
              const unit = this.createUnit(unitType, 'enemy', pos);
              if (unit) {
                // Attack-move toward player base
                const targetPos = new THREE.Vector3(50, 0, mapSize / 2);
                unit.moveTo(targetPos);
                unit._attackMove = true;
              }
              offset++;
            }
          }
          if (this.uiManager?.hud) {
            this.uiManager.hud.showNotification(`Wave ${i + 1} incoming!`, '#ff4444');
          }
          if (this.soundManager) this.soundManager.play('error');
        }
      }
    }

    // Check time limit
    if (scenario.timeLimit > 0 && elapsed >= scenario.timeLimit) {
      // Determine victory based on scenario type
      if (scenario.victory === 'survive') {
        // Survived = win
        this._challenge.completed = true;
        this.finishChallenge(true, elapsed);
      } else {
        // Time ran out = lose
        this._challenge.completed = true;
        this.finishChallenge(false, elapsed);
      }
    }

    // Check victory conditions
    if (!this._challenge.completed) {
      if (scenario.victory === 'destroy_hq') {
        const enemyHQ = this.getHQ('enemy');
        if (!enemyHQ) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      } else if (scenario.victory === 'destroy_all') {
        const enemyEntities = this.getEntitiesByTeam('enemy');
        if (enemyEntities.length === 0 && elapsed > 5) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      } else if (scenario.victory === 'destroy_commander') {
        const enemyCmds = this.getUnits('enemy').filter(u => u.type === 'commander');
        if (enemyCmds.length === 0 && elapsed > 5) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      }

      // Check player defeat (HQ destroyed)
      const playerHQ = this.getHQ('player');
      if (!playerHQ && elapsed > 5) {
        this._challenge.completed = true;
        this.finishChallenge(false, elapsed);
      }
    }
  }

  // GD-139: Auto-resolve - instant win when enemy has no production
  autoResolve() {
    if (!this._canAutoResolve) return;
    // Kill all enemy entities
    const enemies = this.getEntitiesByTeam('enemy');
    for (const e of enemies) {
      e.alive = false;
    }
    this._canAutoResolve = false;
  }

  finishChallenge(won, elapsed) {
    const scenario = this._challenge.scenario;
    const key = this._challenge.key;

    // Calculate star rating
    let stars = 0;
    if (won) {
      stars = 1; // Completed
      // Check losses for 2 stars
      const unitsLost = this.stats.player.unitsLost || 0;
      const unitsProduced = this.stats.player.unitsProduced || 0;
      const totalUnits = unitsProduced + (Object.values(scenario.startingUnits.player || {}).reduce((a, b) => a + b, 0));
      if (totalUnits > 0 && unitsLost < totalUnits * 0.5) stars = 2;
      // Check time for 3 stars
      if (scenario.halfTimeForStars > 0 && elapsed <= scenario.halfTimeForStars) stars = 3;
    }

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('warzone_challenges') || '{}');
    const prev = saved[key] || { stars: 0, bestTime: null };
    if (stars > prev.stars) prev.stars = stars;
    if (won && (prev.bestTime === null || elapsed < prev.bestTime)) prev.bestTime = elapsed;
    saved[key] = prev;
    localStorage.setItem('warzone_challenges', JSON.stringify(saved));

    // Show game over
    this.setState('GAME_OVER');
    const starsStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
    if (this.uiManager?.hud) {
      this.uiManager.hud.showNotification(
        won ? `Challenge Complete! ${starsStr}` : 'Challenge Failed!',
        won ? '#ffcc00' : '#ff4444'
      );
    }
    this.uiManager.showGameOver(won);
    if (this.soundManager) this.soundManager.play(won ? 'produce' : 'defeat');
  }

  async startGame(config) {
    try {
      // config = { mode, playerNation, enemyNation, difficulty, mapTemplate, mapSeed, gameMode }
      this.mode = config.mode;
      this.gameMode = config.gameMode || 'annihilation'; // annihilation, timed, king_of_hill
      this.teams.player.nation = config.playerNation;
      this.teams.enemy.nation = config.enemyNation;
      this.teams.player.sp = GAME_CONFIG.startingSP;
      this.teams.player.mu = GAME_CONFIG.startingMU;
      this.teams.enemy.sp = GAME_CONFIG.startingSP;
      this.teams.enemy.mu = GAME_CONFIG.startingMU;
      this.aiDifficulty = config.difficulty || 'normal';
      this.entities = [];
      this.projectiles = [];
      this.aiController = null;
      this.aiController2 = null;

      this.setState('LOADING');

      // Preload 3D model assets (non-blocking — game starts even if some fail)
      if (!assetManager.ready) {
        await assetManager.preloadAll();
      }

      // Store asset manager reference for terrain and other systems
      this.assetManager = assetManager;

      // Initialize terrain with map template and seed
      const mapTemplate = config.mapTemplate || 'continental';
      const mapSeed = config.mapSeed || null;
      this.terrain = new Terrain(this, mapTemplate, mapSeed);
      this.sceneManager.scene.add(this.terrain.mesh);

      const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
      this.cameraController = new CameraController(this.sceneManager.camera, this.sceneManager.renderer.domElement);
      // Position camera over player base
      this.cameraController.moveTo(50, mapSize / 2);

      this.effectsManager = new EffectsManager(this);

      // GD-061: Post-processing (bloom + vignette)
      try {
        this.postProcessing = new PostProcessing(this.sceneManager);
      } catch (e) {
        console.warn('Post-processing not available:', e.message);
      }

      this.inputManager = new InputManager(this);
      this.pathfinding = new PathfindingSystem(this);
      this.selectionManager = new SelectionManager(this);
      this.commandSystem = new CommandSystem(this);
      this.combatSystem = new CombatSystem(this);
      this.resourceSystem = new ResourceSystem(this);
      this.productionSystem = new ProductionSystem(this);
      this.unitFactory = new UnitFactory(this);

      if (this.mode === '1P' && this.gameMode !== 'survival') {
        this.aiController = new AIController(this, 'enemy', this.aiDifficulty);
      } else if (this.mode === 'SPECTATE') {
        // Both teams controlled by AI
        this.aiController = new AIController(this, 'enemy', this.aiDifficulty);
        this.aiController2 = new AIController(this, 'player', this.aiDifficulty);
      }

      // Place initial buildings and units
      this.placeStartingEntities();

      // Show HUD first (so minimap canvas is available)
      this.uiManager.showHUD();

      // Initialize minimap after HUD is shown
      this.minimap = new Minimap(this);

      // Initialize Fog of War for the player team (disabled in spectate mode)
      if (this.mode !== 'SPECTATE') {
        this.fogOfWar = new FogOfWar(this, 'player');
      }

      // Initialize nation ability system
      this.nationAbilitySystem = new NationAbilitySystem(this);

      // Initialize alert notification system (GD-087)
      if (this.mode !== 'SPECTATE') {
        this.alertSystem = new AlertSystem(this);
      }

      // GD-085: Initialize wave system for survival mode
      if (this.gameMode === 'survival') {
        this.waveSystem = new WaveSystem(this);
      }

      // GD-091: Place neutral capturable structures
      this.neutralStructures = new NeutralStructureSystem(this);

      // GD-112: Weather system
      this.weatherSystem = new WeatherSystem(this);

      // GD-109: Strategic zoom overlay
      this.strategicOverlay = new StrategicOverlay(this);

      // Place resource nodes on the map
      this.placeResourceNodes();

      // Initialize salvage tracking
      this.stats.player.salvageIncome = 0;
      this.stats.enemy.salvageIncome = 0;

      // Track game stats
      this._onUnitCreated = (data) => {
        if (data.unit && this.stats[data.unit.team]) {
          this.stats[data.unit.team].unitsProduced++;
        }
      };
      this.eventBus.on('unit:created', this._onUnitCreated);

      this._onUnitDestroyed = (data) => {
        if (data.entity && this.stats[data.entity.team]) {
          this.stats[data.entity.team].unitsLost++;
        }
      };
      this.eventBus.on('unit:destroyed', this._onUnitDestroyed);

      this._onBuildingDestroyed = (data) => {
        if (data.entity) {
          // Credit to the other team
          const otherTeam = data.entity.team === 'player' ? 'enemy' : 'player';
          if (this.stats[otherTeam]) this.stats[otherTeam].buildingsDestroyed++;
        }
      };
      this.eventBus.on('building:destroyed', this._onBuildingDestroyed);

      this._onCombatAttack = (data) => {
        if (data.attacker && this.stats[data.attacker.team]) {
          this.stats[data.attacker.team].damageDealt += data.damage || 0;
        }
      };
      this.eventBus.on('combat:attack', this._onCombatAttack);

      // GD-073: Track last combat alert position for Space hotkey
      this._lastCombatAlertPos = null;
      this._onCombatAlert = (data) => {
        if (data.defender && data.defender.team === 'player') {
          this._lastCombatAlertPos = data.defender.getPosition().clone();
        }
      };
      this.eventBus.on('combat:attack', this._onCombatAlert);
      this._onBuildingDestroyedAlert = (data) => {
        if (data.entity && data.entity.team === 'player') {
          this._lastCombatAlertPos = data.entity.getPosition().clone();
        }
      };
      this.eventBus.on('building:destroyed', this._onBuildingDestroyedAlert);

      // Listen for unit promotions (store reference for cleanup)
      this._onUnitPromoted = (data) => {
        if (data.unit.team === 'player') {
          const rank = data.rank;
          if (this.uiManager && this.uiManager.hud) {
            this.uiManager.hud.showNotification(
              `${this.capitalize(data.unit.type)} promoted to ${rank.name}! ${rank.symbol}`,
              rank.color
            );
          }
          if (this.soundManager) {
            this.soundManager.play('produce');
          }
          if (data.rankIndex >= 3 && this.cameraController && this.cameraController.shake) {
            this.cameraController.shake(0.3);
          }
        }
      };
      this.eventBus.on('unit:promoted', this._onUnitPromoted);

      // GD-111: Commander ability execution handler
      this._onCommanderAbility = (data) => {
        const { unit, ability, targetPos } = data;
        if (!unit || !unit.alive) return;
        const team = unit.team;
        const otherTeam = team === 'player' ? 'enemy' : 'player';

        switch (ability.id) {
          case 'airborne_drop':
          case 'resistance_cell': {
            // Spawn infantry at target position
            const count = ability.spawnCount || 3;
            const pos = targetPos || unit.getPosition();
            for (let i = 0; i < count; i++) {
              const offset = new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8);
              this.createUnit('infantry', team, pos.clone().add(offset));
            }
            if (this.effectsManager) this.effectsManager.createSmoke(pos.clone());
            if (this.soundManager) this.soundManager.play('produce');
            break;
          }
          case 'rally_cry':
          case 'inspire':
          case 'blitzkrieg_cmd':
          case 'divine_wind':
          case 'banzai_wave':
          case 'iron_discipline': {
            // Timed aura buff applied to friendly units
            const aura = ability.aura;
            if (!aura) break;
            const duration = ability.duration || 10;
            const affected = this.entities.filter(e => e.isUnit && e.alive && e.team === team);
            for (const u of affected) {
              if (aura.domain && aura.domain !== 'infantry' && u.domain !== aura.domain) continue;
              if (aura.domain === 'infantry' && u.type !== 'infantry') continue;
              if (aura.damageMult) u._cmdAuraDmg = aura.damageMult;
              if (aura.speedMult) u._cmdAuraSpd = aura.speedMult;
              if (aura.armor) u.armor = (u.armor || 0) + aura.armor;
            }
            // Schedule removal
            this._pendingTimeouts.push(setTimeout(() => {
              for (const u of affected) {
                if (!u.alive) continue;
                if (aura.damageMult) delete u._cmdAuraDmg;
                if (aura.speedMult) delete u._cmdAuraSpd;
                if (aura.armor) u.armor = Math.max(0, (u.armor || 0) - aura.armor);
              }
            }, duration * 1000));
            if (this.soundManager) this.soundManager.play('ability');
            if (team === 'player' && this.uiManager?.hud) {
              this.uiManager.hud.showNotification(`${ability.name} activated!`, '#44ff88');
            }
            break;
          }
          case 'artillery_strike':
          case 'v2_strike':
          case 'naval_bombardment':
          case 'torpedo_barrage':
          case 'siege_bombardment_cmd': {
            // AOE damage at target
            const shells = ability.shells || 1;
            const dmg = ability.damage || 100;
            const radius = ability.radius || 10;
            const pos = targetPos || unit.getPosition();
            for (let s = 0; s < shells; s++) {
              const shellOffset = new THREE.Vector3((Math.random() - 0.5) * radius, 0, (Math.random() - 0.5) * radius);
              const shellPos = pos.clone().add(shellOffset);
              // Delayed impact for each shell
              this._pendingTimeouts.push(setTimeout(() => {
                if (this.state !== 'PLAYING') return;
                const enemies = this.getEntitiesByTeam(otherTeam);
                for (const enemy of enemies) {
                  if (!enemy.alive) continue;
                  const d = enemy.getPosition().distanceTo(shellPos);
                  if (d <= radius) {
                    const falloff = 1 - (d / radius) * 0.5;
                    enemy.takeDamage(dmg * falloff);
                    if (!enemy.alive && unit.addKill) {
                      unit.addKill();
                      this.eventBus.emit('combat:kill', { attacker: unit, defender: enemy });
                    }
                  }
                }
                if (this.effectsManager) this.effectsManager.createExplosion(shellPos);
                if (this.cameraController) this.cameraController.shake(1.5);
              }, s * 600));
            }
            if (this.soundManager) this.soundManager.play('explosion');
            break;
          }
          case 'smoke_barrage': {
            // Large smoke zone
            const pos = targetPos || unit.getPosition();
            const radius = ability.radius || 15;
            const duration = ability.duration || 8;
            this._smokeZones = this._smokeZones || [];
            this._smokeZones.push({ position: pos.clone(), radius, timer: duration });
            for (let i = 0; i < 6; i++) {
              const offset = new THREE.Vector3((Math.random() - 0.5) * radius, 0, (Math.random() - 0.5) * radius);
              if (this.effectsManager) this.effectsManager.createSmoke(pos.clone().add(offset));
            }
            if (this.soundManager) this.soundManager.play('ability');
            break;
          }
          case 'sabotage': {
            // Disable target building for duration
            const pos = targetPos || unit.getPosition();
            const range = ability.range || 30;
            const disableDur = ability.disableDuration || 15;
            const enemyBuildings = this.entities.filter(e => e.isBuilding && e.alive && e.team === otherTeam);
            let closest = null, closestDist = Infinity;
            for (const b of enemyBuildings) {
              const d = b.getPosition().distanceTo(pos);
              if (d < closestDist && d < range) { closest = b; closestDist = d; }
            }
            if (closest) {
              closest._sabotaged = true;
              const savedProduction = closest.currentProduction;
              closest.currentProduction = null;
              this._pendingTimeouts.push(setTimeout(() => {
                if (closest.alive) {
                  closest._sabotaged = false;
                  // Restore production if it was interrupted
                  if (savedProduction && !closest.currentProduction) {
                    closest.productionQueue.unshift(savedProduction);
                  }
                }
              }, disableDur * 1000));
              if (this.effectsManager) this.effectsManager.createSmoke(closest.getPosition().clone());
            }
            break;
          }
          case 'fortify': {
            // Boost all friendly building HP
            const duration = ability.duration || 20;
            const mult = ability.hpMult || 1.5;
            const buildings = this.entities.filter(e => e.isBuilding && e.alive && e.team === team);
            for (const b of buildings) {
              b._origMaxHP = b.maxHealth;
              b.maxHealth = Math.floor(b.maxHealth * mult);
              b.health = Math.min(b.health + (b.maxHealth - b._origMaxHP), b.maxHealth);
            }
            this._pendingTimeouts.push(setTimeout(() => {
              for (const b of buildings) {
                if (b.alive && b._origMaxHP) {
                  b.maxHealth = b._origMaxHP;
                  b.health = Math.min(b.health, b.maxHealth);
                  delete b._origMaxHP;
                }
              }
            }, duration * 1000));
            if (this.soundManager) this.soundManager.play('ability');
            break;
          }
          case 'panzer_ace': {
            // Commander self-buff: 2x damage
            const duration = ability.duration || 10;
            unit._cmdAuraDmg = ability.selfDamageMult || 2.0;
            this._pendingTimeouts.push(setTimeout(() => { if (unit.alive) delete unit._cmdAuraDmg; }, duration * 1000));
            if (this.soundManager) this.soundManager.play('ability');
            break;
          }
          case 'mountain_fortress': {
            // Spawn temporary turrets
            const pos = targetPos || unit.getPosition();
            const count = ability.turretCount || 3;
            const dur = ability.turretDuration || 30;
            for (let i = 0; i < count; i++) {
              const offset = new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10);
              const turret = this.createBuilding('turret', team, pos.clone().add(offset));
              if (turret) {
                this._pendingTimeouts.push(setTimeout(() => {
                  if (turret.alive) {
                    turret.health = 0;
                    turret.alive = false;
                    this.eventBus.emit('building:destroyed', { entity: turret });
                  }
                }, dur * 1000));
              }
            }
            if (this.soundManager) this.soundManager.play('build');
            break;
          }
        }
      };
      this.eventBus.on('commander:ability', this._onCommanderAbility);

      // Salvage income: award SP on kills (GD-064)
      this._onSalvageKill = (data) => {
        if (!data.attacker || !data.defender) return;
        if (data.defender._isCache) return; // caches handled separately
        const defType = data.defender.type;
        if (SALVAGE_CONFIG.excludeTypes.includes(defType)) return;
        const cost = data.defender.cost || 0;
        if (cost <= 0) return;
        const salvage = Math.round(cost * SALVAGE_CONFIG.percentage);
        if (salvage <= 0) return;
        const team = data.attacker.team;
        if (this.teams[team]) {
          this.teams[team].sp += salvage;
          if (this.stats[team]) this.stats[team].salvageIncome = (this.stats[team].salvageIncome || 0) + salvage;
          // Floating gold text
          if (this.effectsManager) {
            this.effectsManager.createSalvageText(data.defender.getPosition().clone(), salvage);
          }
        }
      };
      this.eventBus.on('combat:kill', this._onSalvageKill);

      this.setState('PLAYING');
    } catch (err) {
      console.error('Failed to start game:', err);
      // Show error visually
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:red;color:white;padding:20px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
      errDiv.textContent = 'Game Error: ' + err.message + '\n' + err.stack;
      document.body.appendChild(errDiv);
    }
  }

  placeStartingEntities() {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    // Player base (left side of map)
    this.createBuilding('headquarters', 'player', new THREE.Vector3(30, 0, mapSize / 2));
    this.createBuilding('barracks', 'player', new THREE.Vector3(45, 0, mapSize / 2 - 15));

    if (this.gameMode === 'survival') {
      // GD-085: Survival mode - no enemy base, extra starting units/resources
      this.teams.player.sp += 200;
      this.teams.player.mu += 50;
      // Extra starting infantry
      for (let i = 0; i < 5; i++) {
        this.createUnit('infantry', 'player', new THREE.Vector3(50 + i * 4, 0, mapSize / 2 + 10));
      }
    } else {
      // Enemy base (right side, but before water)
      this.createBuilding('headquarters', 'enemy', new THREE.Vector3(mapSize - 60, 0, mapSize / 2));
      this.createBuilding('barracks', 'enemy', new THREE.Vector3(mapSize - 75, 0, mapSize / 2 - 15));

      // GD-138: Starting units - 3 infantry + 1 scout car per side in formation
      for (let i = 0; i < 3; i++) {
        this.createUnit('infantry', 'player', new THREE.Vector3(50 + i * 4, 0, mapSize / 2 + 10));
        this.createUnit('infantry', 'enemy', new THREE.Vector3(mapSize - 80 + i * 4, 0, mapSize / 2 + 10));
      }
      // Scout car for early scouting
      this.createUnit('scoutcar', 'player', new THREE.Vector3(50 + 14, 0, mapSize / 2 + 10));
      this.createUnit('scoutcar', 'enemy', new THREE.Vector3(mapSize - 80 + 14, 0, mapSize / 2 + 10));
    }

    // Place supply caches (neutral resource pickups)
    this.placeSupplyCaches();

    // King of the Hill: place control point marker at map center
    if (this.gameMode === 'king_of_hill') {
      this._hillControl = { player: 0, enemy: 0 };
      const center = mapSize / 2;
      const ringGeo = new THREE.RingGeometry(28, 30, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(center, 0.3, center);
      this.sceneManager.scene.add(ring);
      this._hillRing = ring;
    }
  }

  createSupplyCache(x, z, reward, color = 0xccaa44, markerColor = 0xffcc00) {
    const y = this.terrain ? this.terrain.getHeightAt(x, z) : 0;
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(2, 1.5, 2);
    const boxMat = new THREE.MeshPhongMaterial({ color });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.75;
    group.add(box);
    const markerGeo = new THREE.OctahedronGeometry(0.5, 0);
    const markerMat = new THREE.MeshBasicMaterial({ color: markerColor });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.y = 2;
    group.add(marker);
    group.position.set(x, y, z);

    const cache = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      type: 'supply_cache', team: 'neutral', alive: true,
      health: 60, maxHealth: 60, isBuilding: true, isUnit: false,
      mesh: group, selected: false, size: 1, produces: [],
      selectionRing: null, healthBar: null,
      _isCache: true, _cacheReward: reward,
      getPosition() { return this.mesh.position; },
      distanceTo(other) { return this.getPosition().distanceTo(other.getPosition()); },
      takeDamage(amount) { this.health -= amount; if (this.health <= 0) { this.health = 0; this.alive = false; } },
      update() {}, updateHealthBar() {}, setSelected(sel) { this.selected = sel; }
    };
    this.addEntity(cache);
    return cache;
  }

  placeSupplyCaches() {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    const cacheCount = 6;
    const margin = 40;

    for (let i = 0; i < cacheCount; i++) {
      let x, z, attempts = 0;
      do {
        x = margin + Math.random() * (mapSize - 2 * margin);
        z = margin + Math.random() * (mapSize - 2 * margin);
        attempts++;
      } while (attempts < 20 && this.terrain && (this.terrain.isWater(x, z) || !this.terrain.isWalkable(x, z)));

      if (attempts >= 20) continue;
      this.createSupplyCache(x, z, 100 + Math.floor(Math.random() * 100));
    }

    // Listen for cache destruction to award resources
    this._onCacheDestroyed = (data) => {
      if (data.entity && data.entity._isCache) {
        // Award SP to both teams (whoever is fighting nearby)
        // Actually, the attacker gets the reward via combat:kill event
      }
    };

    // Award resources when a supply cache is killed
    this._onCacheKill = (data) => {
      if (data.defender && data.defender._isCache && data.attacker) {
        const reward = data.defender._cacheReward || 100;
        const team = data.attacker.team;
        if (this.teams[team]) {
          this.teams[team].sp += reward;
          if (this.uiManager && this.uiManager.hud) {
            this.uiManager.hud.showNotification(`Supply cache captured! +${reward} SP`, '#ffcc00');
          }
          if (this.soundManager) this.soundManager.play('produce');
          if (this.effectsManager) {
            this.effectsManager.createExplosion(data.defender.getPosition());
          }
        }
      }
    };
    this.eventBus.on('combat:kill', this._onCacheKill);
  }

  placeResourceNodes() {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    const nodeCount = RESOURCE_NODE_CONFIG.count;
    const margin = 50;
    this.resourceNodes = [];

    for (let i = 0; i < nodeCount; i++) {
      let x, z, attempts = 0;
      // Bias some nodes toward center (contested territory)
      const centerBias = i < 3;
      do {
        if (centerBias) {
          x = mapSize * 0.3 + Math.random() * mapSize * 0.4;
          z = margin + Math.random() * (mapSize - 2 * margin);
        } else {
          x = margin + Math.random() * (mapSize - 2 * margin);
          z = margin + Math.random() * (mapSize - 2 * margin);
        }
        attempts++;
      } while (attempts < 30 && this.terrain && (this.terrain.isWater(x, z) || !this.terrain.isWalkable(x, z)));

      if (attempts >= 30) continue;

      const y = this.terrain ? this.terrain.getHeightAt(x, z) : 0;
      const node = this._createResourceNode(x, y, z, i);
      this.resourceNodes.push(node);
    }
  }

  _createResourceNode(x, y, z, index) {
    const group = new THREE.Group();

    // Glowing crystal pillar
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.8, 3, 6);
    const pillarMat = new THREE.MeshPhongMaterial({
      color: RESOURCE_NODE_CONFIG.glowColor,
      emissive: RESOURCE_NODE_CONFIG.glowColor,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 1.5;
    pillar.castShadow = true;
    group.add(pillar);

    // Glowing base ring
    const ringGeo = new THREE.RingGeometry(1.5, 2, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: RESOURCE_NODE_CONFIG.glowColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.1;
    group.add(ring);

    // Point light
    const light = new THREE.PointLight(RESOURCE_NODE_CONFIG.glowColor, 1.5, 20);
    light.position.y = 3;
    group.add(light);

    group.position.set(x, y, z);
    this.sceneManager.scene.add(group);

    return {
      mesh: group,
      position: new THREE.Vector3(x, y, z),
      index
    };
  }

  // Check if a building is near a resource node for bonus income
  getBuildingNodeBonus(building) {
    if (!building || !building.alive) return 0;
    if (building.type !== 'resourcedepot' && building.type !== 'supplydepot') return 0;

    const bPos = building.getPosition();
    for (const node of this.resourceNodes) {
      const dist = bPos.distanceTo(node.position);
      if (dist <= RESOURCE_NODE_CONFIG.captureRadius) {
        return RESOURCE_NODE_CONFIG.bonusIncome;
      }
    }
    return 0;
  }

  createUnit(type, team, position) {
    // GD-111: Commander limit check (1 per team)
    if (type === 'commander') {
      const existingCmd = this.entities.find(e => e.isUnit && e.type === 'commander' && e.team === team && e.alive);
      if (existingCmd) return null; // Already have a commander
      // Check respawn cooldown
      const cmdState = this._commanderState = this._commanderState || {};
      if (cmdState[team] && cmdState[team].respawnTimer > 0) return null;
    }

    const unit = this.unitFactory.create(type, team, position);
    if (unit) {
      // Pass game reference so unit can access terrain for Y updates
      unit.game = this;

      // Apply nation bonuses
      const nationKey = this.teams[team]?.nation;
      if (nationKey && unit.applyNationBonuses) {
        unit.applyNationBonuses(nationKey);
      }

      // GD-111: Initialize commander abilities
      if (type === 'commander' && unit.setNationAbilities && nationKey) {
        unit.setNationAbilities(nationKey);
      }

      // Set Y from terrain height
      const y = this.terrain.getHeightAt(position.x, position.z);
      unit.mesh.position.y = y;
      this.addEntity(unit);
      this.applyAllResearchToEntity(unit);
      this.eventBus.emit('unit:created', { unit });

      if (this.soundManager) {
        this.soundManager.play('produce');
      }
    }
    return unit;
  }

  createBuilding(type, team, position) {
    const building = BuildingFactory.create(type, team, position, this);
    if (building) {
      // Set nation for production speed bonuses
      const nationKey = this.teams[team]?.nation;
      if (nationKey) {
        building.nation = nationKey;
      }

      const y = this.terrain.getHeightAt(position.x, position.z);
      building.mesh.position.y = y;
      this.addEntity(building);
      this.applyAllResearchToEntity(building);
      this.eventBus.emit('building:created', { building });
    }
    return building;
  }

  addEntity(entity) {
    this.entities.push(entity);
    if (entity.mesh) {
      this.sceneManager.scene.add(entity.mesh);
    }
    if (entity.isBuilding && entity.type === 'wall' && this.pathfinding) {
      this.pathfinding.invalidateWallCache();
    }
  }

  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
    if (entity.mesh) {
      this.sceneManager.scene.remove(entity.mesh);
    }
    // GD-062: Clean up carrier drones
    if (entity._drones) {
      for (const drone of entity._drones) {
        if (drone.mesh) this.sceneManager.scene.remove(drone.mesh);
      }
    }
  }

  addProjectile(projectile) {
    this.projectiles.push(projectile);
    if (projectile.mesh) this.sceneManager.scene.add(projectile.mesh);
  }

  // GD-076: Create a corpse from a dead land unit
  _createCorpse(entity) {
    if (!entity.mesh) return;
    if (!this._corpses) this._corpses = [];

    // Clone the mesh position but detach from entity management
    const corpseGroup = entity.mesh;

    // Remove health bar, selection ring, rank indicator, status badge
    const toRemove = [];
    corpseGroup.traverse(child => {
      if (child === entity.healthBar || child === entity.selectionRing ||
          child === entity.rankIndicator || child === entity._statusBadge) {
        toRemove.push(child);
      }
    });
    for (const child of toRemove) {
      corpseGroup.remove(child);
      child.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }

    // Tint dark grey and lay flat
    corpseGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.setHex(0x444444);
        child.material.transparent = true;
      }
    });
    corpseGroup.rotation.z = Math.PI / 2; // lay on side

    // Re-add to scene (removeEntity already removed it)
    this.sceneManager.scene.add(corpseGroup);

    this._corpses.push({
      mesh: corpseGroup,
      timer: 5.0,
      totalTime: 5.0
    });

    // Prevent removeEntity from removing the mesh (we still need it)
    entity.mesh = null;
  }

  removeProjectile(projectile) {
    const idx = this.projectiles.indexOf(projectile);
    if (idx !== -1) this.projectiles.splice(idx, 1);
    if (projectile.mesh) this.sceneManager.scene.remove(projectile.mesh);
  }

  getEntitiesByTeam(team) {
    return this.entities.filter(e => e.team === team && e.alive);
  }

  getUnits(team) {
    return this.entities.filter(e => e.isUnit && e.team === team && e.alive);
  }

  getBuildings(team) {
    return this.entities.filter(e => e.isBuilding && e.team === team && e.alive);
  }

  getHQ(team) {
    return this.entities.find(e => e.isBuilding && e.type === 'headquarters' && e.team === team && e.alive);
  }

  update(delta) {
    this._lastDelta = delta;
    // Update entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.alive) {
        entity.update(delta);
      } else {
        if (entity.mesh) {
          this.effectsManager.createExplosion(entity.mesh.position);
          // GD-065: Smoke after explosion + debris for buildings
          this.effectsManager.createSmoke(entity.mesh.position.clone());
          if (entity.isBuilding) {
            this.effectsManager.createDebris(entity.mesh.position.clone());
          }
        }

        // GD-111: Commander death triggers respawn cooldown
        if (entity.isUnit && entity.type === 'commander') {
          this._commanderState = this._commanderState || {};
          this._commanderState[entity.team] = { respawnTimer: COMMANDER_CONFIG.respawnCooldown };
        }

        // GD-133: Clean up shadow sprite before removing entity
        if (entity._shadow) {
          this.sceneManager.scene.remove(entity._shadow);
          entity._shadow.geometry.dispose();
          entity._shadow.material.dispose();
          entity._shadow = null;
        }

        // GD-076: Unit corpses for land units (lay flat and fade out)
        if (entity.isUnit && entity.domain === 'land' && entity.mesh) {
          this._createCorpse(entity);
        }

        this.removeEntity(entity);
        this.eventBus.emit(entity.isUnit ? 'unit:destroyed' : 'building:destroyed', { entity });
      }
    }

    // GD-076: Update corpse fade-outs
    if (this._corpses) {
      for (let i = this._corpses.length - 1; i >= 0; i--) {
        const corpse = this._corpses[i];
        corpse.timer -= delta;
        const fadeProgress = 1 - (corpse.timer / corpse.totalTime);
        // Fade opacity
        corpse.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, 1 - fadeProgress);
          }
        });
        if (corpse.timer <= 0) {
          this.sceneManager.scene.remove(corpse.mesh);
          corpse.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
          this._corpses.splice(i, 1);
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(delta);
      if (!proj.alive) {
        this.removeProjectile(proj);
      }
    }

    // Update systems
    this.combatSystem.update(delta);
    this.resourceSystem.update(delta);
    this.productionSystem.update(delta);
    this.effectsManager.update(delta);
    // GD-133: Update dynamic shadows under entities
    this.effectsManager.updateShadows(this.entities);
    this.cameraController.update(delta);
    this.minimap.update(delta);

    if (this.soundManager) {
      this.soundManager.update(delta);
    }

    if (this.fogOfWar) {
      this.fogOfWar.update(delta);
    }

    if (this.nationAbilitySystem) {
      this.nationAbilitySystem.update(delta);
    }

    if (this.alertSystem) {
      this.alertSystem.update(delta);
    }

    // GD-085: Update wave system
    if (this.waveSystem) {
      this.waveSystem.update(delta);
    }

    // GD-091: Update neutral structures (capture logic, repair bay healing)
    if (this.neutralStructures) {
      this.neutralStructures.update(delta);
    }

    if (this.aiController) {
      this.aiController.update(delta);
    }
    if (this.aiController2) {
      this.aiController2.update(delta);
    }

    // Passive heal near HQ for both teams
    for (const team of ['player', 'enemy']) {
      const hq = this.getHQ(team);
      if (!hq) continue;
      const units = this.getUnits(team);
      for (const unit of units) {
        if (unit.health < unit.maxHealth && unit.distanceTo(hq) < 30) {
          unit.health = Math.min(unit.maxHealth, unit.health + 2 * delta);
        }
      }
    }

    // Update research
    this.updateResearch(delta);

    // Apply regen from Field Medics research
    for (const entity of this.entities) {
      if (entity.alive && entity._regenRate && entity.health < entity.maxHealth) {
        entity.health = Math.min(entity.maxHealth, entity.health + entity._regenRate * delta);
      }
    }

    // GD-111: Commander respawn cooldown
    if (this._commanderState) {
      for (const team of ['player', 'enemy']) {
        if (this._commanderState[team] && this._commanderState[team].respawnTimer > 0) {
          this._commanderState[team].respawnTimer -= delta;
        }
      }
    }

    // Update game timer
    this.gameElapsed += delta;

    // Day/Night cycle
    if (this.sceneManager) {
      this.sceneManager.updateDayNight(delta, this.gameElapsed);
    }

    // GD-106: Update water shader animation
    if (this.terrain && this.terrain.updateWater) {
      this.terrain.updateWater(delta, this.sceneManager?.camera);
    }

    // GD-112: Update weather system
    if (this.weatherSystem) {
      this.weatherSystem.update(delta);
    }

    // GD-109: Update strategic zoom overlay
    if (this.strategicOverlay) {
      this.strategicOverlay.update(delta);
    }

    // Update smoke zones (mortar ability)
    if (this._smokeZones) {
      for (let i = this._smokeZones.length - 1; i >= 0; i--) {
        this._smokeZones[i].timer -= delta;
        if (this._smokeZones[i].timer <= 0) {
          this._smokeZones.splice(i, 1);
        }
      }
    }

    // Update flare zones (scout car ability)
    if (this._flareZones) {
      for (let i = this._flareZones.length - 1; i >= 0; i--) {
        this._flareZones[i].timer -= delta;
        if (this._flareZones[i].timer <= 0) {
          this._flareZones.splice(i, 1);
        }
      }
    }

    // Update sonar reveal timers
    for (const entity of this.entities) {
      if (entity.alive && entity._sonarRevealed > 0) {
        entity._sonarRevealed -= delta;
        if (entity._sonarRevealed <= 0) entity._sonarRevealed = 0;
      }
    }

    // GD-089: Check mines triggering
    if (this._mines) {
      for (let i = this._mines.length - 1; i >= 0; i--) {
        const mine = this._mines[i];
        if (!mine.alive) continue;
        const enemyTeam = mine.team === 'player' ? 'enemy' : 'player';
        const nearbyUnits = this.getUnits(enemyTeam).filter(u =>
          u.alive && u.domain === 'land' && u.getPosition().distanceTo(mine.position) < mine.triggerRadius * 3
        );
        if (nearbyUnits.length > 0) {
          // Trigger mine!
          mine.alive = false;
          const allEnemies = this.getEntitiesByTeam(enemyTeam);
          for (const enemy of allEnemies) {
            if (!enemy.alive) continue;
            const dist = enemy.getPosition().distanceTo(mine.position);
            if (dist <= mine.radius * 3) {
              const dmg = mine.damage * (1 - (dist / (mine.radius * 3)) * 0.5);
              enemy.takeDamage(dmg);
              if (!enemy.alive) {
                this.eventBus.emit('combat:kill', { attacker: null, defender: enemy });
              }
            }
          }
          if (this.effectsManager) this.effectsManager.createExplosion(mine.position);
          if (this.soundManager) this.soundManager.play('explosion');
          if (this.cameraController) this.cameraController.shake(1.5);
          // Remove mine mesh
          if (mine.mesh) this.sceneManager.scene.remove(mine.mesh);
          this._mines.splice(i, 1);
        }
      }
    }

    // Dynamic map events
    this._mapEventTimer += delta;
    if (this._mapEventTimer >= this._mapEventInterval) {
      this._mapEventTimer = 0;
      this.triggerMapEvent();
    }

    // Tutorial tips for new players
    if (!this._tutorialShown && this.mode !== 'SPECTATE') {
      this.updateTutorial(delta);
    }

    // GD-134: Update challenge scenario
    if (this._challenge) {
      this.updateChallenge(delta);
    }

    // GD-139: Check if enemy has no production buildings - show auto-resolve
    if (this.gameMode === 'annihilation' && this.mode !== 'SPECTATE' && !this._challenge) {
      const enemyProd = this.getBuildings('enemy').filter(b =>
        b.produces && b.produces.length > 0 && b.alive
      );
      const enemyHQ = this.getHQ('enemy');
      this._canAutoResolve = (enemyProd.length === 0 && !enemyHQ);
    }

    // Update UI
    this.uiManager.updateHUD();

    // Check win/lose (skip for active challenges - they handle their own victory)
    if (!this._challenge || this._challenge.completed) {
      this.checkGameOver();
    }
  }

  checkGameOver() {
    let won = null;

    // GD-085: Survival mode - game over only when player HQ is destroyed
    if (this.gameMode === 'survival') {
      const playerHQ = this.getHQ('player');
      if (!playerHQ) {
        won = false; // Player lost
      }
      if (won !== null) {
        this.setState('GAME_OVER');
        this.uiManager.showGameOver(won);
        if (this.soundManager) this.soundManager.play('defeat');
        this.saveMatchHistory(won);
      }
      return;
    }

    if (this.gameMode === 'timed') {
      // Timed mode: 10 minutes, most military power wins
      if (this.gameElapsed >= 600) {
        const playerScore = this.getUnits('player').length + this.getBuildings('player').length * 2;
        const enemyScore = this.getUnits('enemy').length + this.getBuildings('enemy').length * 2;
        won = playerScore >= enemyScore; // tie goes to player
      }
    } else if (this.gameMode === 'king_of_hill') {
      // King of the Hill: control center for 120s
      const mapCenter = (GAME_CONFIG.mapSize * GAME_CONFIG.worldScale) / 2;
      const controlRadius = 30;
      const playerNearCenter = this.getUnits('player').filter(u => {
        const p = u.getPosition();
        const dx = p.x - mapCenter;
        const dz = p.z - mapCenter;
        return dx * dx + dz * dz < controlRadius * controlRadius;
      }).length;
      const enemyNearCenter = this.getUnits('enemy').filter(u => {
        const p = u.getPosition();
        const dx = p.x - mapCenter;
        const dz = p.z - mapCenter;
        return dx * dx + dz * dz < controlRadius * controlRadius;
      }).length;

      if (!this._hillControl) this._hillControl = { player: 0, enemy: 0 };

      if (playerNearCenter > enemyNearCenter) {
        this._hillControl.player += this._lastDelta || 0.016;
        this._hillControl.enemy = Math.max(0, this._hillControl.enemy - (this._lastDelta || 0.016) * 0.5);
      } else if (enemyNearCenter > playerNearCenter) {
        this._hillControl.enemy += this._lastDelta || 0.016;
        this._hillControl.player = Math.max(0, this._hillControl.player - (this._lastDelta || 0.016) * 0.5);
      }

      if (this._hillControl.player >= 120) won = true;
      else if (this._hillControl.enemy >= 120) won = false;
    }

    // Annihilation / fallback checks
    if (won === null) {
      if (this.gameMode === 'annihilation' || !this.gameMode) {
        // Full annihilation logic
        const playerHQ = this.getHQ('player');
        const enemyHQ = this.getHQ('enemy');

        if (!playerHQ) {
          won = false;
        } else if (!enemyHQ) {
          won = true;
        } else {
          const enemyUnits = this.getUnits('enemy');
          const enemyBuildings = this.getBuildings('enemy').filter(b =>
            b.produces && b.produces.length > 0
          );
          if (enemyUnits.length === 0 && enemyBuildings.length === 0) {
            won = true;
          }

          const playerUnits = this.getUnits('player');
          const playerBuildings = this.getBuildings('player').filter(b =>
            b.produces && b.produces.length > 0
          );
          if (playerUnits.length === 0 && playerBuildings.length === 0) {
            won = false;
          }
        }
      } else {
        // For timed/koth: only end early if HQ is destroyed (mercy rule)
        const playerHQ = this.getHQ('player');
        const enemyHQ = this.getHQ('enemy');
        if (!playerHQ) won = false;
        else if (!enemyHQ) won = true;
      }
    }

    if (won !== null) {
      this.setState('GAME_OVER');
      this.uiManager.showGameOver(won);
      if (this.soundManager) this.soundManager.play(won ? 'victory' : 'defeat');
      this.saveMatchHistory(won);
    }
  }

  saveMatchHistory(won) {
    try {
      const history = JSON.parse(localStorage.getItem('warzone_history') || '[]');
      history.push({
        date: new Date().toISOString(),
        result: won ? 'victory' : 'defeat',
        playerNation: this.teams.player.nation,
        enemyNation: this.teams.enemy.nation,
        difficulty: this.aiDifficulty || 'normal',
        gameMode: this.gameMode || 'annihilation',
        duration: Math.floor(this.gameElapsed),
        stats: { ...this.stats.player }
      });
      // Keep last 50 matches
      if (history.length > 50) history.splice(0, history.length - 50);
      localStorage.setItem('warzone_history', JSON.stringify(history));
    } catch (e) {
      // localStorage unavailable or full, silently ignore
    }
  }

  triggerMapEvent() {
    const events = ['supply_drop', 'resource_surge', 'reinforcements'];
    const event = events[Math.floor(Math.random() * events.length)];
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    switch (event) {
      case 'supply_drop': {
        const x = 60 + Math.random() * (mapSize - 120);
        const z = 60 + Math.random() * (mapSize - 120);
        if (this.terrain && this.terrain.isWalkable(x, z)) {
          const reward = 150 + Math.floor(Math.random() * 100);
          this.createSupplyCache(x, z, reward, 0x44ccff, 0x00ffcc);
          if (this.uiManager && this.uiManager.hud) {
            this.uiManager.hud.showNotification(`Supply drop detected! (${reward} SP)`, '#00ffcc');
          }
          if (this.soundManager) this.soundManager.play('produce');
        }
        break;
      }
      case 'resource_surge': {
        // Both teams get a small SP bonus
        const bonus = 50 + Math.floor(Math.random() * 50);
        this.teams.player.sp += bonus;
        this.teams.enemy.sp += bonus;
        if (this.uiManager && this.uiManager.hud) {
          this.uiManager.hud.showNotification(`Resource surge! +${bonus} SP`, '#88ff88');
        }
        break;
      }
      case 'reinforcements': {
        // Random free infantry for both teams near their HQ
        for (const team of ['player', 'enemy']) {
          const hq = this.getHQ(team);
          if (!hq) continue;
          const hqPos = hq.getPosition();
          const pos = new THREE.Vector3(
            hqPos.x + (Math.random() - 0.5) * 20,
            0,
            hqPos.z + (Math.random() - 0.5) * 20
          );
          this.createUnit('infantry', team, pos);
        }
        if (this.uiManager && this.uiManager.hud) {
          this.uiManager.hud.showNotification('Reinforcements arrived!', '#88ff88');
        }
        break;
      }
    }
  }

  updateTutorial(delta) {
    this._tutorialTimer += delta;
    const tips = [
      { time: 5, msg: 'Select units with left-click or drag. Right-click to move.', color: '#88ccff' },
      { time: 15, msg: 'Press A for attack-move. Press B to open the build menu.', color: '#88ccff' },
      { time: 30, msg: 'Press V to cycle stance (Aggressive/Defensive/Hold Fire).', color: '#ffcc00' },
      { time: 50, msg: 'Press P to patrol. Press F for nation ability. Shift+F to cycle formations.', color: '#ffcc00' },
      { time: 75, msg: 'Press G to use unit abilities. Press T to view the tech tree.', color: '#00ff88' },
      { time: 100, msg: 'Shift+right-click queues waypoints. Press F1 for all controls.', color: '#00ff88' },
    ];

    if (this._tutorialStep < tips.length && this._tutorialTimer >= tips[this._tutorialStep].time) {
      const tip = tips[this._tutorialStep];
      if (this.uiManager && this.uiManager.hud) {
        this.uiManager.hud.showNotification(tip.msg, tip.color);
      }
      this._tutorialStep++;
      if (this._tutorialStep >= tips.length) {
        this._tutorialShown = true;
      }
    }
  }

  togglePause() {
    if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;
    if (this.paused) {
      this.paused = false;
      this.setState('PLAYING');
      this.clock.getDelta(); // discard accumulated delta
    } else {
      this.paused = true;
      this.setState('PAUSED');
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    let delta = this.clock.getDelta();

    // GD-139: Slow motion effect for victory/defeat
    if (this._slowMotion) {
      delta *= this._slowMotion;
    }

    if (this.state === 'PLAYING' && !this.paused) {
      this.update(delta);
    }

    if (this.sceneManager) {
      if (this.postProcessing && this.postProcessing.enabled) {
        this.postProcessing.render();
      } else {
        this.sceneManager.render();
      }
    }
  }

  // For 2P hot-seat: switch active team
  switchTurn() {
    this.activeTeam = this.activeTeam === 'player' ? 'enemy' : 'player';
    // Move camera to other base
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    if (this.activeTeam === 'enemy') {
      this.cameraController.moveTo(mapSize - 60, mapSize / 2);
    } else {
      this.cameraController.moveTo(30, mapSize / 2);
    }
    this.selectionManager.clearSelection();
    this.eventBus.emit('turn:switched', { team: this.activeTeam });
  }

  // Research system
  startResearch(team, upgradeId) {
    const upgrade = RESEARCH_UPGRADES[upgradeId];
    if (!upgrade) return false;
    const state = this.research[team];
    if (!state) return false;
    if (state.completed.includes(upgradeId)) return false;
    if (state.inProgress) return false;
    if (this.teams[team].sp < upgrade.cost) return false;
    if (upgrade.muCost && this.teams[team].mu < upgrade.muCost) return false;

    // Check if the team has the required building
    const hasBuilding = this.getBuildings(team).some(b => b.type === upgrade.building);
    if (!hasBuilding) return false;

    this.teams[team].sp -= upgrade.cost;
    if (upgrade.muCost) this.teams[team].mu -= upgrade.muCost;
    state.inProgress = upgradeId;
    state.timer = upgrade.researchTime;

    // Find the building doing the research
    const building = this.getBuildings(team).find(b => b.type === upgrade.building);
    if (building) {
      state.building = building;
      building._researching = upgradeId;
    }

    return true;
  }

  updateResearch(delta) {
    for (const team of ['player', 'enemy']) {
      const state = this.research[team];
      if (!state.inProgress) continue;

      // Cancel research if building was destroyed — refund SP
      if (state.building && !state.building.alive) {
        let refundCost = 0;
        const upgrade = RESEARCH_UPGRADES[state.inProgress];
        if (upgrade) {
          refundCost = upgrade.cost;
        } else if (state._branchDomain) {
          // GD-090: Branch research refund
          const domainConfig = TECH_BRANCHES[state._branchDomain];
          const branch = domainConfig?.[state._branchKey];
          if (branch) refundCost = branch.cost;
          // Unlock the branch choice so they can re-choose
          delete state.branches[state._branchDomain];
          state._branchDomain = null;
          state._branchKey = null;
        }
        if (refundCost > 0) this.teams[team].sp += refundCost;
        state.inProgress = null;
        state.timer = 0;
        state.building = null;
        if (team === 'player' && this.uiManager && this.uiManager.hud) {
          this.uiManager.hud.showNotification(`Research cancelled: building destroyed! (${refundCost} SP refunded)`, '#ff4444');
        }
        continue;
      }

      state.timer -= delta;
      if (state.timer <= 0) {
        const upgradeId = state.inProgress;
        state.completed.push(upgradeId);
        state.inProgress = null;
        state.timer = 0;
        if (state.building) {
          state.building._researching = null;
          state.building = null;
        }

        // GD-090: Check if this is a branch research
        if (state._branchDomain) {
          this._completeBranchResearch(team, state._branchDomain, state._branchKey);
          state._branchDomain = null;
          state._branchKey = null;
        } else {
          // Apply upgrade effects to existing entities
          this.applyResearchUpgrade(team, upgradeId);

          if (team === 'player' && this.uiManager && this.uiManager.hud) {
            const upgrade = RESEARCH_UPGRADES[upgradeId];
            this.uiManager.hud.showNotification(`Research complete: ${upgrade.name}!`, '#00ffcc');
          }
          if (this.soundManager) this.soundManager.play('produce');
          this.eventBus.emit('research:complete', { team, upgradeId });
        }
      }
    }
  }

  applyResearchUpgrade(team, upgradeId) {
    const upgrade = RESEARCH_UPGRADES[upgradeId];
    if (!upgrade) return;
    const entities = this.entities.filter(e => e.team === team && e.alive);
    for (const entity of entities) {
      this.applyUpgradeToEntity(entity, upgrade);
    }
  }

  applyUpgradeToEntity(entity, upgrade) {
    if (upgrade.applies && !upgrade.applies(entity)) return;
    const fx = upgrade.effect;
    if (fx.armor) entity.armor = (entity.armor || 0) + fx.armor;
    if (fx.visionMult) entity.vision = (entity.vision || 10) * fx.visionMult;
    if (fx.rangeMult) entity.range = (entity.range || 6) * fx.rangeMult;
    if (fx.hpMult) {
      const ratio = entity.health / entity.maxHealth;
      entity.maxHealth *= fx.hpMult;
      entity.health = entity.maxHealth * ratio;
    }
    if (fx.attackRateMult) entity.attackRate = (entity.attackRate || 1) * fx.attackRateMult;
    if (fx.damageMult) entity.damage = (entity.damage || 1) * fx.damageMult;
    if (fx.speedMult) entity.speed = (entity.speed || 1) * fx.speedMult;
    if (fx.regen) entity._regenRate = (entity._regenRate || 0) + fx.regen;
  }

  applyAllResearchToEntity(entity) {
    const team = entity.team;
    if (!this.research[team]) return;
    for (const upgradeId of this.research[team].completed) {
      const upgrade = RESEARCH_UPGRADES[upgradeId];
      if (upgrade) this.applyUpgradeToEntity(entity, upgrade);
    }
    // GD-090: Apply branch doctrine effects
    const branches = this.research[team].branches;
    if (branches) {
      for (const domain of Object.keys(branches)) {
        const branchKey = branches[domain];
        const domainConfig = TECH_BRANCHES[domain];
        if (domainConfig && domainConfig[branchKey]) {
          this._applyBranchToEntity(entity, domainConfig[branchKey]);
        }
      }
    }
  }

  hasResearch(team, upgradeId) {
    return this.research[team]?.completed.includes(upgradeId) || false;
  }

  // GD-090: Branching Tech Tree
  startBranchResearch(team, domain, branchKey) {
    const domainConfig = TECH_BRANCHES[domain];
    if (!domainConfig) return false;

    const state = this.research[team];
    if (!state) return false;

    // Check if this domain already has a branch chosen
    if (state.branches[domain]) return false;

    // Need a tech lab
    const hasTechLab = this.getBuildings(team).some(b => b.type === 'techlab' && b.alive);
    if (!hasTechLab) return false;

    // Already researching something
    if (state.inProgress) return false;

    const branch = domainConfig[branchKey]; // 'branchA' or 'branchB'
    if (!branch) return false;

    // Check cost
    if (this.teams[team].sp < branch.cost) return false;
    if (branch.muCost && this.teams[team].mu < branch.muCost) return false;

    // Deduct cost
    this.teams[team].sp -= branch.cost;
    if (branch.muCost) this.teams[team].mu -= branch.muCost;

    // Lock the choice
    state.branches[domain] = branchKey;

    // Start research timer
    state.inProgress = `branch_${branch.id}`;
    state.timer = branch.researchTime;
    state._branchDomain = domain;
    state._branchKey = branchKey;

    const techLab = this.getBuildings(team).find(b => b.type === 'techlab' && b.alive);
    if (techLab) {
      state.building = techLab;
      techLab._researching = branch.name;
    }

    return true;
  }

  _completeBranchResearch(team, domain, branchKey) {
    const domainConfig = TECH_BRANCHES[domain];
    if (!domainConfig) return;
    const branch = domainConfig[branchKey];
    if (!branch) return;

    // Apply branch effects to all existing units
    const entities = this.entities.filter(e => e.team === team && e.alive);
    for (const entity of entities) {
      this._applyBranchToEntity(entity, branch);
    }

    if (team === 'player' && this.uiManager?.hud) {
      this.uiManager.hud.showNotification(`Doctrine complete: ${branch.name}!`, '#ff88ff');
    }
    if (this.soundManager) this.soundManager.play('produce');
    this.eventBus.emit('research:complete', { team, upgradeId: `branch_${branch.id}`, isBranch: true });
  }

  _applyBranchToEntity(entity, branch) {
    const fx = branch.effects;
    if (!fx) return;
    if (fx.applies && !fx.applies(entity)) return;
    if (fx.armor) entity.armor = (entity.armor || 0) + fx.armor;
    if (fx.damageMult) entity.damage = Math.round((entity.damage || 1) * fx.damageMult);
    if (fx.hpMult) {
      const ratio = entity.health / entity.maxHealth;
      entity.maxHealth = Math.round(entity.maxHealth * fx.hpMult);
      entity.health = Math.round(entity.maxHealth * ratio);
    }
    if (fx.speedMult) entity.speed = (entity.speed || 1) * fx.speedMult;
    if (fx.rangeMult) entity.range = (entity.range || 6) * fx.rangeMult;
    if (fx.regen) entity._regenRate = (entity._regenRate || 0) + fx.regen;
  }

  // Get the chosen branch for a domain/team (for applying to newly created units)
  getBranchChoice(team, domain) {
    return this.research[team]?.branches[domain] || null;
  }

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  restart() {
    // Clean up
    this.entities.forEach(e => {
      if (e.mesh) this.sceneManager.scene.remove(e.mesh);
      // GD-133: Clean up shadow sprites on restart
      if (e._shadow) {
        this.sceneManager.scene.remove(e._shadow);
        e._shadow.geometry.dispose();
        e._shadow.material.dispose();
        e._shadow = null;
      }
    });
    this.projectiles.forEach(p => {
      if (p.mesh) this.sceneManager.scene.remove(p.mesh);
    });
    if (this.terrain && this.terrain.mesh) {
      this.sceneManager.scene.remove(this.terrain.mesh);
    }
    this.entities = [];
    this.projectiles = [];
    this.aiController = null;
    this.aiController2 = null;
    this.paused = false;
    this.gameElapsed = 0;
    this._mapEventTimer = 0;
    this._tutorialTimer = 0;
    this._tutorialStep = 0;
    this._tutorialShown = false;
    this._challenge = null;
    this._canAutoResolve = false;
    this._slowMotion = null;
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
    };
    if (this.fogOfWar) {
      this.fogOfWar.dispose();
      this.fogOfWar = null;
    }
    if (this._hillRing) {
      this.sceneManager.scene.remove(this._hillRing);
      this._hillRing.geometry.dispose();
      this._hillRing.material.dispose();
      this._hillRing = null;
    }
    this._hillControl = null;
    this.gameMode = null;
    this.research = {
      player: { completed: [], inProgress: null, timer: 0, building: null, branches: {} },
      enemy: { completed: [], inProgress: null, timer: 0, building: null, branches: {} }
    };
    // Clean up GameOverScreen event listeners
    if (this.uiManager && this.uiManager.gameOverScreen && this.uiManager.gameOverScreen.dispose) {
      this.uiManager.gameOverScreen.dispose();
      this.uiManager.gameOverScreen = null;
    }
    // Clean up alert system
    if (this.alertSystem) {
      this.alertSystem.destroy();
      this.alertSystem = null;
    }
    // Clean up wave system (GD-085)
    if (this.waveSystem) {
      this.waveSystem.destroy();
      this.waveSystem = null;
    }
    // Clean up neutral structures (GD-091)
    if (this.neutralStructures) {
      this.neutralStructures.destroy();
      this.neutralStructures = null;
    }
    // Clean up orphaned UI elements
    const resPanel = document.getElementById('research-panel');
    if (resPanel) resPanel.remove();
    const resDisplay = document.getElementById('hud-research-display');
    if (resDisplay) resDisplay.remove();

    // Clean up minimap event listeners
    if (this.minimap && this.minimap.dispose) {
      this.minimap.dispose();
      this.minimap = null;
    }
    // Clean up event listeners to prevent leaks across game sessions
    if (this._onUnitPromoted) {
      this.eventBus.off('unit:promoted', this._onUnitPromoted);
      this._onUnitPromoted = null;
    }
    if (this._onUnitCreated) {
      this.eventBus.off('unit:created', this._onUnitCreated);
      this._onUnitCreated = null;
    }
    if (this._onUnitDestroyed) {
      this.eventBus.off('unit:destroyed', this._onUnitDestroyed);
      this._onUnitDestroyed = null;
    }
    if (this._onBuildingDestroyed) {
      this.eventBus.off('building:destroyed', this._onBuildingDestroyed);
      this._onBuildingDestroyed = null;
    }
    if (this._onCombatAttack) {
      this.eventBus.off('combat:attack', this._onCombatAttack);
      this._onCombatAttack = null;
    }
    if (this._onCacheKill) {
      this.eventBus.off('combat:kill', this._onCacheKill);
      this._onCacheKill = null;
    }
    if (this._onSalvageKill) {
      this.eventBus.off('combat:kill', this._onSalvageKill);
      this._onSalvageKill = null;
    }
    if (this._onCommanderAbility) {
      this.eventBus.off('commander:ability', this._onCommanderAbility);
      this._onCommanderAbility = null;
    }
    if (this._onCombatAlert) {
      this.eventBus.off('combat:attack', this._onCombatAlert);
      this._onCombatAlert = null;
    }
    if (this._onBuildingDestroyedAlert) {
      this.eventBus.off('building:destroyed', this._onBuildingDestroyedAlert);
      this._onBuildingDestroyedAlert = null;
    }
    this._lastCombatAlertPos = null;
    // Clean up corpse meshes still fading
    if (this._corpses) {
      for (const corpse of this._corpses) {
        if (corpse.mesh) {
          this.sceneManager.scene.remove(corpse.mesh);
          corpse.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
      }
      this._corpses = [];
    }
    // Clean up mines
    if (this._mines) {
      for (const mine of this._mines) {
        if (mine.mesh) {
          this.sceneManager.scene.remove(mine.mesh);
          if (mine.mesh.geometry) mine.mesh.geometry.dispose();
          if (mine.mesh.material) mine.mesh.material.dispose();
        }
      }
      this._mines = [];
    }
    // Clean up smoke/flare zones
    this._smokeZones = null;
    this._flareZones = null;
    // Clean up post-processing
    if (this.postProcessing) {
      if (this.postProcessing.dispose) this.postProcessing.dispose();
      this.postProcessing = null;
    }
    // Clean up nation ability system
    this.nationAbilitySystem = null;
    // Clean up resource node meshes
    if (this.resourceNodes) {
      for (const node of this.resourceNodes) {
        if (node.mesh) {
          this.sceneManager.scene.remove(node.mesh);
          node.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
      }
      this.resourceNodes = [];
    }
    // Clean up EffectsManager active effects and pooled sprites
    if (this.effectsManager) {
      for (const effect of this.effectsManager.activeEffects) {
        if (effect.particles) {
          for (const p of effect.particles) {
            if (p.userData && p.userData.isPooled) {
              this.effectsManager._returnToPool(p);
            }
          }
        }
        if (effect.group) this.sceneManager.scene.remove(effect.group);
      }
      this.effectsManager.activeEffects = [];
      // Return all pooled sprites
      for (const sprite of this.effectsManager._spritePool) {
        if (sprite.parent) sprite.parent.remove(sprite);
        sprite.visible = false;
      }
      this.effectsManager = null;
    }

    // Clean up weather system
    if (this.weatherSystem && this.weatherSystem.dispose) {
      this.weatherSystem.dispose();
      this.weatherSystem = null;
    }
    // Clean up strategic overlay
    if (this.strategicOverlay && this.strategicOverlay.dispose) {
      this.strategicOverlay.dispose();
      this.strategicOverlay = null;
    }
    // Reset commander state
    this._commanderState = null;

    // Clear all pending timeouts from commander abilities
    if (this._pendingTimeouts) {
      for (const id of this._pendingTimeouts) {
        clearTimeout(id);
      }
      this._pendingTimeouts = [];
    }

    // Clean up nation ability button
    const abilityBtn = document.getElementById('nation-ability-btn');
    if (abilityBtn) abilityBtn.style.display = 'none';

    // GD-139: Clean up auto-resolve button on restart
    if (this.uiManager && this.uiManager.hud && this.uiManager.hud._autoResolveBtn) {
      this.uiManager.hud._autoResolveBtn.style.display = 'none';
    }

    // GD-128: Reset exchange cooldown in HUD on restart
    if (this.uiManager && this.uiManager.hud) {
      this.uiManager.hud._exchangeCooldown = 0;
    }

    // GD-139: Remove any lingering victory overlay
    const victoryOverlays = document.querySelectorAll('.victory-overlay');
    victoryOverlays.forEach(el => el.parentElement?.removeChild(el));

    this.setState('MENU');
    this.uiManager.showMainMenu();
  }
}
