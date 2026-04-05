import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GAME_CONFIG, NATIONS, BUILDING_STATS, UNIT_STATS, SALVAGE_CONFIG, RESOURCE_NODE_CONFIG, CONSTRUCTION_CONFIG, COMMANDER_CONFIG, AI_DIFFICULTY } from './Constants.js';
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
import { AIWorkerBridge } from '../ai/AIWorkerBridge.js';
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
import { InstancedRenderer } from '../rendering/InstancedRenderer.js';
import { SaveSystem } from './SaveSystem.js';
import { settingsManager } from './SettingsManager.js';
import { AchievementSystem } from './AchievementSystem.js';
import { LoadingScreen } from '../ui/LoadingScreen.js';
import { SettingsUI } from '../ui/SettingsUI.js';
import { PerformanceMonitor } from '../ui/PerformanceMonitor.js';
import { SpatialGrid } from '../systems/SpatialGrid.js';
import { EntityManager } from './EntityManager.js';
import { SeededRandom } from './SeededRandom.js';
import { StateHash } from './StateHash.js';
import { ResearchSystem } from '../systems/ResearchSystem.js';
import { CommanderAbilitySystem } from '../systems/CommanderAbilitySystem.js';
import { MapEventSystem } from '../systems/MapEventSystem.js';
import { GameModeSystem } from '../systems/GameModeSystem.js';
import { ChallengeSystem } from '../systems/ChallengeSystem.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { LockstepManager } from '../networking/LockstepManager.js';
import { VoiceChat } from '../networking/VoiceChat.js';

export class Game {
  constructor() {
    this.state = 'MENU'; // MENU, NATION_SELECT, LOADING, PLAYING, GAME_OVER
    this.eventBus = new EventBus();
    this.entities = [];
    this.projectiles = [];
    // Deterministic PRNG for simulation (seeded per game for replays/networking)
    this.rng = new SeededRandom(SeededRandom.generateSeed());
    // Performance: spatial grid for O(1) neighbor queries instead of O(n²)
    this.spatialGrid = new SpatialGrid(12);
    // Performance: EntityManager with spatial hash for team-indexed + spatial queries
    this.entityManager = new EntityManager(256, 16);
    // Performance: cached entity lists by team (updated on add/remove instead of filter() per frame)
    this._cachedUnits = { player: [], enemy: [] };
    this._cachedBuildings = { player: [], enemy: [] };
    this._cachedEntitiesByTeam = { player: [], enemy: [] };
    this._cachedDitches = { player: [], enemy: [] };
    this.teams = {
      player: { nation: null, sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU },
      enemy: { nation: null, sp: GAME_CONFIG.startingSP, mu: GAME_CONFIG.startingMU }
    };
    this.mode = '1P';
    this.activeTeam = 'player'; // For 2P hot-seat
    this.clock = new THREE.Clock();
    this.paused = false;
    this.isSpectating = false;
    this.gameSpeed = 1;

    // Multiplayer lockstep state
    this.isMultiplayer = false;
    this.playerSlot = -1;
    this.lockstepManager = null;
    this._mpPaused = false; // Paused due to opponent disconnect
    this._executingLockstepTurn = false; // Flag to prevent re-queuing during lockstep execution

    // Game timer and stats
    this.gameElapsed = 0;
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
    };

    // Research state per team (managed by ResearchSystem, initialized in startGame)

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
    this.instancedRenderer = null;
    this._pendingTimeouts = []; // Track setTimeout IDs for cleanup on restart
    this.mapEventSystem = null;

    // Save system
    this.saveSystem = new SaveSystem(this);

    // New systems
    this.settingsManager = settingsManager;
    this.achievementSystem = new AchievementSystem(this.eventBus);
    this.loadingScreen = new LoadingScreen();
    this.settingsUI = new SettingsUI();
    this.performanceMonitor = new PerformanceMonitor();
  }

  init() {
    this.sceneManager = new SceneManager();
    this.soundManager = new SoundManager(this);

    // Apply settings to renderer
    this._applyGraphicsSettings();
    settingsManager.onChange('graphics.*', () => this._applyGraphicsSettings());
    settingsManager.onChange('audio.*', () => this._applyAudioSettings());
    this.uiManager = new UIManager(this);
    this.uiManager.showMainMenu();

    // Global key handlers (pause, quick save/load)
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Pause' || (e.key === 'p' && e.ctrlKey)) && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        e.preventDefault();
        this.togglePause();
      }
      // F5 = Quick Save, F9 = Quick Load (disabled in multiplayer)
      if (e.key === 'F5' && (this.state === 'PLAYING' || this.state === 'PAUSED') && !this.isMultiplayer) {
        e.preventDefault();
        if (this.saveSystem) {
          const success = this.saveSystem.saveToLocal('quicksave');
          if (success && this.uiManager?.hud) {
            this.uiManager.hud.showNotification('Quick save!', '#88ccff');
          }
        }
      }
      if (e.key === 'F9' && (this.state === 'PLAYING' || this.state === 'PAUSED') && !this.isMultiplayer) {
        e.preventDefault();
        if (this.saveSystem) {
          this.saveSystem.loadGame('quicksave').catch(err => {
            if (this.uiManager?.hud) {
              this.uiManager.hud.showNotification('No quick save found', '#ff4444');
            }
          });
        }
      }
    });

    // Lazily load optional subsystems (campaign, replay, editor, networking)
    this._loadOptionalSystems();

    this.loop();
  }

  async _loadOptionalSystems() {
    try {
      const [
        { CampaignManager },
        { ReplayRecorder },
        { ReplayPlayer },
        { ReplayUI },
        { MapEditor },
        { NetworkManager }
      ] = await Promise.all([
        import('../campaign/CampaignManager.js'),
        import('../replay/ReplayRecorder.js'),
        import('../replay/ReplayPlayer.js'),
        import('../replay/ReplayUI.js'),
        import('../editor/MapEditor.js'),
        import('../networking/NetworkManager.js')
      ]);

      this.campaignManager = new CampaignManager(this);
      this.replayRecorder = new ReplayRecorder(this);
      this.replayPlayer = new ReplayPlayer(this);
      this.replaySystem = new ReplayUI(this, this.replayPlayer);
      this.mapEditor = new MapEditor(this);
      this.networkManager = new NetworkManager();

      console.log('Warzone: optional systems loaded (campaign, replay, editor, networking)');
    } catch (err) {
      console.warn('Warzone: some optional systems failed to load:', err);
    }
  }

  setState(newState) {
    this.state = newState;
    this.eventBus.emit('game:stateChange', { state: newState });
    if (this.soundManager) {
      this.soundManager.onStateChange(newState);
    }
  }

  async startGame(config) {
    try {
      // config = { mode, playerNation, enemyNation, difficulty, mapTemplate, mapSeed, gameMode, seed }
      // Seed the deterministic PRNG (use provided seed for replays, or generate new one)
      const gameSeed = config.seed || SeededRandom.generateSeed();
      this.rng = new SeededRandom(gameSeed);
      this._gameSeed = gameSeed; // store for replay/save
      this.mode = config.mode;
      this.gameMode = config.gameMode || 'annihilation'; // annihilation, timed, king_of_hill
      this.teams.player.nation = config.playerNation;
      this.teams.enemy.nation = config.enemyNation;
      this.teams.player.sp = GAME_CONFIG.startingSP;
      this.teams.player.mu = GAME_CONFIG.startingMU;
      this.teams.enemy.sp = GAME_CONFIG.startingSP;
      this.teams.enemy.mu = GAME_CONFIG.startingMU;
      this.aiDifficulty = config.difficulty || 'normal';
      this._difficultyConfig = AI_DIFFICULTY[this.aiDifficulty] || null;
      this.entities = [];
      this.projectiles = [];
      this._rebuildCaches();
      if (this.entityManager) this.entityManager.clear();
      if (this.aiController && this.aiController.dispose) this.aiController.dispose();
      this.aiController = null;
      if (this.aiController2 && this.aiController2.dispose) this.aiController2.dispose();
      this.aiController2 = null;

      this.setState('LOADING');

      // Preload 3D model assets (non-blocking — game starts even if some fail)
      if (!assetManager.ready) {
        await assetManager.preloadAll();
      }

      // Store asset manager reference for terrain and other systems
      this.assetManager = assetManager;

      // Initialize terrain with map template, seed, and biome
      const mapTemplate = config.mapTemplate || 'continental';
      const mapSeed = config.mapSeed || null;
      const biome = config.biome || 'temperate';
      this.terrain = new Terrain(this, mapTemplate, mapSeed, biome);
      this.sceneManager.scene.add(this.terrain.mesh);

      const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
      this.cameraController = new CameraController(this.sceneManager.camera, this.sceneManager.renderer.domElement);
      // Position camera over local player's base
      if (this.isMultiplayer && this.playerSlot === 1) {
        this.cameraController.moveTo(mapSize - 60, mapSize / 2);
      } else {
        this.cameraController.moveTo(50, mapSize / 2);
      }

      this.effectsManager = new EffectsManager(this);

      // GD-061: Post-processing (bloom + vignette)
      try {
        this.postProcessing = new PostProcessing(this.sceneManager);
      } catch (e) {
        console.warn('Post-processing not available:', e.message);
      }

      this.inputManager = new InputManager(this);
      this.pathfinding = new PathfindingSystem(this);
      this.pathfinding.sendGridToWorker();
      this.selectionManager = new SelectionManager(this);
      this.commandSystem = new CommandSystem(this);
      this.combatSystem = new CombatSystem(this);
      this.resourceSystem = new ResourceSystem(this);
      this.productionSystem = new ProductionSystem(this);
      this.researchSystem = new ResearchSystem(this);
      this.unitFactory = new UnitFactory(this);

      // Multiplayer setup
      this.isMultiplayer = !!config.multiplayer;
      this.playerSlot = config.playerSlot ?? -1;
      this._mpPaused = false;

      if (this.isMultiplayer) {
        // In multiplayer, seed is already set from config.seed above (line 222).
        // Both players must use the same seed for deterministic simulation.

        // No AI in multiplayer (both players are human)
        this.aiController = null;
        this.aiController2 = null;

        // Create lockstep manager
        if (this.networkManager) {
          this.lockstepManager = new LockstepManager(this, this.networkManager);

          // Hook up network callbacks for multiplayer events
          // Note: onTurnReceived is wired by lockstepManager.enable()

          this.networkManager.onGamePaused((reason) => {
            this._mpPaused = true;
            if (this.uiManager?.hud) {
              this.uiManager.hud.showNotification(
                reason || 'Opponent disconnected - waiting for reconnection...',
                '#ffcc00'
              );
            }
          });

          this.networkManager.onGameResumed(() => {
            this._mpPaused = false;
            if (this.uiManager?.hud) {
              this.uiManager.hud.showNotification('Opponent reconnected!', '#00ff88');
            }
          });

          this.networkManager.onGameOver((msg) => {
            const won = msg.winner === this.playerSlot;
            this._handleMultiplayerGameOver(won, msg.reason);
          });
        }
      } else if (this.mode === '1P' && this.gameMode !== 'survival' && this.gameMode !== 'tutorial') {
        this.aiController = new AIWorkerBridge(this, 'enemy', this.aiDifficulty);
      } else if (this.mode === 'SPECTATE') {
        // Both teams controlled by AI
        this.aiController = new AIWorkerBridge(this, 'enemy', this.aiDifficulty);
        this.aiController2 = new AIWorkerBridge(this, 'player', this.aiDifficulty);
      }

      // Spectator mode flags
      this.isSpectating = (this.mode === 'SPECTATE');
      this.gameSpeed = 1; // 1x, 2x, 4x speed multiplier

      // Place initial buildings and units
      this.placeStartingEntities();

      // Show HUD first (so minimap canvas is available)
      this.uiManager.showHUD();

      // Center camera for spectate mode
      if (this.isSpectating) {
        const center = (GAME_CONFIG.mapSize * GAME_CONFIG.worldScale) / 2;
        this.cameraController.moveTo(center, center);
        this._setupSpeedToggle();
      }

      // Initialize minimap after HUD is shown
      this.minimap = new Minimap(this);

      // Initialize Fog of War for the local team (disabled in spectate mode)
      if (this.mode !== 'SPECTATE') {
        const fogTeam = this.isMultiplayer ? this.getLocalTeam() : 'player';
        this.fogOfWar = new FogOfWar(this, fogTeam);
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

      // Map events and tutorial system
      this.mapEventSystem = new MapEventSystem(this);

      // Instanced rendering system for draw call batching
      this.instancedRenderer = new InstancedRenderer(
        this.sceneManager.scene,
        this.sceneManager.camera
      );

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

      // GD-111: Commander ability execution handler (extracted to CommanderAbilitySystem)
      this.commanderAbilitySystem = new CommanderAbilitySystem(this);
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

      this.gameModeSystem = new GameModeSystem(this);
      this.challengeSystem = new ChallengeSystem(this);

      // Tutorial mode: start interactive tutorial after game is fully initialized
      if (this.gameMode === 'tutorial') {
        this.tutorialSystem = new TutorialSystem(this);
        this.tutorialSystem.start();
      }

      this.setState('PLAYING');

      // Enable lockstep after all systems are initialized
      if (this.isMultiplayer && this.lockstepManager) {
        this.lockstepManager.enable(this.playerSlot);
      }

      // Start WebRTC voice chat for multiplayer
      if (this.isMultiplayer && this.networkManager) {
        this.voiceChat = new VoiceChat(this.networkManager);

        // Wire signaling callbacks
        this.networkManager.onWebRTCOffer((sdp) => this.voiceChat?.handleOffer(sdp));
        this.networkManager.onWebRTCAnswer((sdp) => this.voiceChat?.handleAnswer(sdp));
        this.networkManager.onWebRTCIce((candidate) => this.voiceChat?.handleIceCandidate(candidate));

        // Initiator is player in slot 0
        this.voiceChat.start(this.playerSlot === 0).then(() => {
          // Apply lobby mute preference if set
          if (this.uiManager?._voiceMuted && this.voiceChat && !this.voiceChat.isMuted) {
            this.voiceChat.toggleMute();
          }
        });
      }
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
      id: Date.now() + Math.floor(this.rng.next() * 10000),
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
        x = margin + this.rng.next() * (mapSize - 2 * margin);
        z = margin + this.rng.next() * (mapSize - 2 * margin);
        attempts++;
      } while (attempts < 20 && this.terrain && (this.terrain.isWater(x, z) || !this.terrain.isWalkable(x, z)));

      if (attempts >= 20) continue;
      this.createSupplyCache(x, z, 100 + Math.floor(this.rng.next() * 100));
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
          x = mapSize * 0.3 + this.rng.next() * mapSize * 0.4;
          z = margin + this.rng.next() * (mapSize - 2 * margin);
        } else {
          x = margin + this.rng.next() * (mapSize - 2 * margin);
          z = margin + this.rng.next() * (mapSize - 2 * margin);
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

      // Kids mode: bonus armor for player units
      if (this._difficultyConfig?.playerArmorBonus && team === 'player') {
        unit.armor = (unit.armor || 0) + this._difficultyConfig.playerArmorBonus;
      }

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
      // Set nation for production speed bonuses + defensive building bonuses
      const nationKey = this.teams[team]?.nation;
      if (nationKey) {
        building.applyNationBonuses(nationKey);
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
    // Performance: update cached entity lists
    this._addToCache(entity);
    // Performance: register with EntityManager spatial hash
    if (this.entityManager) this.entityManager.add(entity);
  }

  _addToCache(entity) {
    const team = entity.team;
    if (!team || !this._cachedEntitiesByTeam[team]) return;
    this._cachedEntitiesByTeam[team].push(entity);
    if (entity.isUnit) this._cachedUnits[team].push(entity);
    if (entity.isBuilding) this._cachedBuildings[team].push(entity);
    if (entity.type === 'ditch') this._cachedDitches[team].push(entity);
  }

  _removeFromCache(entity) {
    const team = entity.team;
    if (!team || !this._cachedEntitiesByTeam[team]) return;
    const removeFrom = (arr, e) => { const i = arr.indexOf(e); if (i !== -1) arr.splice(i, 1); };
    removeFrom(this._cachedEntitiesByTeam[team], entity);
    if (entity.isUnit) removeFrom(this._cachedUnits[team], entity);
    if (entity.isBuilding) removeFrom(this._cachedBuildings[team], entity);
    if (entity.type === 'ditch') removeFrom(this._cachedDitches[team], entity);
  }

  _rebuildCaches() {
    this._cachedUnits = { player: [], enemy: [] };
    this._cachedBuildings = { player: [], enemy: [] };
    this._cachedEntitiesByTeam = { player: [], enemy: [] };
    this._cachedDitches = { player: [], enemy: [] };
    for (const e of this.entities) {
      if (e.alive) this._addToCache(e);
    }
  }

  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
    // Performance: update cached entity lists
    this._removeFromCache(entity);
    // Performance: deregister from EntityManager spatial hash
    if (this.entityManager) this.entityManager.remove(entity);
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

    // Tint dark grey (but do NOT lay flat instantly - animate it)
    corpseGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.setHex(0x444444);
        child.material.transparent = true;
      }
    });

    // Determine death animation domain
    let deathDomain = 'land';
    if (entity.isUnit && entity.domain) {
      deathDomain = entity.domain; // 'land', 'air', 'naval'
    }
    // Determine if infantry-like (fall forward) or vehicle-like (tip over)
    const isInfantry = entity.isUnit && (entity.type === 'infantry' || entity.type === 'engineer' || entity.type === 'mortar');

    // Store initial rotation for animation
    const initRotX = corpseGroup.rotation.x;
    const initRotY = corpseGroup.rotation.y;
    const initRotZ = corpseGroup.rotation.z;
    const initPosY = corpseGroup.position.y;

    // Re-add to scene (removeEntity already removed it)
    this.sceneManager.scene.add(corpseGroup);

    this._corpses.push({
      mesh: corpseGroup,
      timer: 5.0,
      totalTime: 5.0,
      _deathAnimTimer: 0,
      _deathAnimDuration: 0.5,
      _deathDomain: deathDomain,
      _isInfantry: isInfantry,
      _initRotX: initRotX,
      _initRotY: initRotY,
      _initRotZ: initRotZ,
      _initPosY: initPosY,
      _deathAnimDone: false,
      _dustSpawned: false
    });

    // Prevent removeEntity from removing the mesh (we still need it)
    entity.mesh = null;
  }

  removeProjectile(projectile) {
    const idx = this.projectiles.indexOf(projectile);
    if (idx !== -1) this.projectiles.splice(idx, 1);
    if (projectile.mesh) this.sceneManager.scene.remove(projectile.mesh);
    // Return pooled mesh to the object pool
    if (projectile.dispose) projectile.dispose();
  }

  getEntitiesByTeam(team) {
    if (this.entityManager) return this.entityManager.getEntitiesByTeam(team);
    return this._cachedEntitiesByTeam[team] || [];
  }

  getUnits(team) {
    if (this.entityManager) return this.entityManager.getUnits(team);
    return this._cachedUnits[team] || [];
  }

  getBuildings(team) {
    if (this.entityManager) return this.entityManager.getBuildings(team);
    return this._cachedBuildings[team] || [];
  }

  getDitches(team) {
    return this._cachedDitches[team] || [];
  }

  getHQ(team) {
    return this.entities.find(e => e.isBuilding && e.type === 'headquarters' && e.team === team && e.alive);
  }

  update(delta) {
    this._lastDelta = delta;

    // Performance: rebuild spatial grid each frame for O(1) neighbor queries
    this.spatialGrid.clear();
    for (let i = 0, len = this.entities.length; i < len; i++) {
      const e = this.entities[i];
      if (e.alive && e.mesh) this.spatialGrid.insert(e);
    }

    // Performance: update EntityManager spatial hash positions for moving units
    if (this.entityManager) this.entityManager.updatePositions();

    // Update entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.alive) {
        entity.update(delta);
      } else {
        if (entity.mesh) {
          // Spec 009: Use larger death explosion instead of regular explosion
          this.effectsManager.createDeathExplosion(entity.mesh.position);
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

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(delta);
      if (!proj.alive) {
        this.removeProjectile(proj);
      }
    }

    // Update simulation systems (fixed timestep)
    this.combatSystem.update(delta);
    this.resourceSystem.update(delta);
    this.productionSystem.update(delta);

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
    if (this.researchSystem) this.researchSystem.update(delta);

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

    // Update smoke zones (mortar ability) — simulation state, affects combat
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

    // GD-089: Check mines triggering — use spatial grid instead of filtering all units
    if (this._mines) {
      for (let i = this._mines.length - 1; i >= 0; i--) {
        const mine = this._mines[i];
        if (!mine.alive) continue;
        const triggerDist = mine.triggerRadius * 3;
        const nearby = this.spatialGrid.query(mine.position.x, mine.position.z, triggerDist);
        let triggered = false;
        for (let n = 0, nlen = nearby.length; n < nlen; n++) {
          const u = nearby[n];
          if (u.team === mine.team || !u.isUnit || !u.alive || u.domain !== 'land') continue;
          triggered = true;
          break;
        }
        if (triggered) {
          mine.alive = false;
          const blastRadius = mine.radius * 3;
          const blastTargets = this.spatialGrid.query(mine.position.x, mine.position.z, blastRadius);
          for (let n = 0, nlen = blastTargets.length; n < nlen; n++) {
            const enemy = blastTargets[n];
            if (enemy.team === mine.team || !enemy.alive) continue;
            const dist = enemy.getPosition().distanceTo(mine.position);
            if (dist <= blastRadius) {
              const dmg = mine.damage * (1 - (dist / blastRadius) * 0.5);
              enemy.takeDamage(dmg);
              if (!enemy.alive) {
                this.eventBus.emit('combat:kill', { attacker: null, defender: enemy });
              }
            }
          }
          if (this.effectsManager) this.effectsManager.createExplosion(mine.position);
          if (this.soundManager) this.soundManager.play('explosion');
          if (this.cameraController) this.cameraController.shake(1.5);
          if (mine.mesh) this.sceneManager.scene.remove(mine.mesh);
          this._mines.splice(i, 1);
        }
      }
    }

    // Dynamic map events and tutorial tips
    if (this.mapEventSystem) this.mapEventSystem.update(delta);

    // Update challenge and auto-resolve
    if (this.challengeSystem) this.challengeSystem.update(delta);

    // Update tutorial
    if (this.tutorialSystem) this.tutorialSystem.update(delta);

    // Check win/lose (skip for active challenges and tutorial - they handle their own flow)
    if (!this.challengeSystem?.active && this.gameMode !== 'tutorial' && this.gameModeSystem) this.gameModeSystem.update(delta);

    // Autosave (disabled in multiplayer)
    if (this.saveSystem && !this.isMultiplayer) {
      this.saveSystem.updateAutosave(delta);
    }

    // State hash for desync detection (single-player tracking; MP hashing is done by LockstepManager)
    if (!this.isMultiplayer) {
      this._hashTickCounter = (this._hashTickCounter || 0) + 1;
      if (this._hashTickCounter >= 30) {
        this._hashTickCounter = 0;
        this._lastStateHash = StateHash.compute(this);
      }
    }
  }

  togglePause() {
    if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;
    // No manual pause in multiplayer
    if (this.isMultiplayer) return;
    if (this.paused) {
      this.paused = false;
      this.setState('PLAYING');
      this.clock.getDelta(); // discard accumulated delta
      this._accumulator = 0; // reset fixed timestep accumulator
    } else {
      this.paused = true;
      this.setState('PAUSED');
    }
  }

  // Fixed timestep: simulation runs at SIM_RATE Hz, rendering at display refresh rate
  static SIM_RATE = 30;
  static SIM_DT = 1 / 30;
  static MAX_SIM_STEPS = 4; // cap catchup to prevent spiral of death
  _accumulator = 0;

  loop() {
    requestAnimationFrame(() => this.loop());
    let frameDelta = this.clock.getDelta();

    // GD-139: Slow motion effect for victory/defeat
    if (this._slowMotion) {
      frameDelta *= this._slowMotion;
    }

    // Cap frame delta to prevent huge jumps after tab-switch or breakpoint
    if (frameDelta > 0.25) frameDelta = 0.25;

    // Spectate mode speed multiplier
    if (this.isSpectating && this.gameSpeed > 1) {
      frameDelta *= this.gameSpeed;
    }

    if (this.state === 'PLAYING' && !this.paused) {
      if (this.isMultiplayer && this.lockstepManager?.enabled) {
        // Multiplayer: lockstep manager drives simulation ticks.
        // It calls this.update(fixedDelta) internally when turns are confirmed.
        // Pause if opponent disconnected.
        if (!this._mpPaused) {
          this.lockstepManager.update(frameDelta);
        }
      } else {
        // Single-player: fixed timestep simulation
        this._accumulator += frameDelta;
        let steps = 0;
        while (this._accumulator >= Game.SIM_DT && steps < Game.MAX_SIM_STEPS) {
          this.update(Game.SIM_DT);
          this._accumulator -= Game.SIM_DT;
          steps++;
        }
        // If we hit the step cap, drain remaining accumulator to prevent spiral of death
        if (steps >= Game.MAX_SIM_STEPS) {
          this._accumulator = 0;
        }
      }

      // Render-phase updates (run every frame, not at fixed rate)
      this.renderUpdate(frameDelta);
    }

    if (this.sceneManager) {
      if (this.postProcessing && this.postProcessing.enabled) {
        this.postProcessing.render();
      } else {
        this.sceneManager.render();
      }

      // Performance monitor update
      if (this.performanceMonitor) {
        this.performanceMonitor.update(this.sceneManager.renderer, this.entities.length);
      }
    }
  }

  /**
   * Render-phase updates — visual-only systems that run every frame at display refresh rate.
   * These do NOT affect game state, only visuals/audio.
   */
  renderUpdate(frameDelta) {
    // Effects (particles, explosions, floating text)
    if (this.effectsManager) {
      this.effectsManager.update(frameDelta);
      this.effectsManager.updateShadows(this.entities);
    }

    // Camera
    if (this.cameraController) this.cameraController.update(frameDelta);

    // Minimap
    if (this.minimap) this.minimap.update(frameDelta);

    // Sound
    if (this.soundManager) this.soundManager.update(frameDelta);

    // Day/Night cycle (visual only)
    if (this.sceneManager) {
      this.sceneManager.updateDayNight(frameDelta, this.gameElapsed);
    }

    // Water shader animation (visual only)
    if (this.terrain && this.terrain.updateWater) {
      this.terrain.updateWater(frameDelta, this.sceneManager?.camera);
    }

    // Weather visuals (particles, fog color)
    if (this.weatherSystem) this.weatherSystem.update(frameDelta);

    // Strategic zoom overlay
    if (this.strategicOverlay) this.strategicOverlay.update(frameDelta);

    // Instanced renderer transform sync
    if (this.instancedRenderer) this.instancedRenderer.update();

    // Corpse fade-outs with death animations (visual only)
    if (this._corpses) {
      for (let i = this._corpses.length - 1; i >= 0; i--) {
        const corpse = this._corpses[i];
        corpse.timer -= frameDelta;

        // Death animation phase (first 0.5s)
        if (!corpse._deathAnimDone) {
          corpse._deathAnimTimer += frameDelta;
          const animP = Math.min(1, corpse._deathAnimTimer / corpse._deathAnimDuration);
          const eased = animP * (2 - animP); // ease-out

          if (corpse._deathDomain === 'air') {
            // Air units: nosedive down, slight forward tilt
            corpse.mesh.position.y = Math.max(0, corpse._initPosY * (1 - eased));
            corpse.mesh.rotation.x = corpse._initRotX + (-Math.PI / 4) * eased;
          } else if (corpse._deathDomain === 'naval') {
            // Naval: list to side and sink below water
            corpse.mesh.rotation.z = corpse._initRotZ + (Math.PI / 3) * eased;
            corpse.mesh.position.y = corpse._initPosY - 2 * eased;
          } else if (corpse._isInfantry) {
            // Infantry: fall forward
            corpse.mesh.rotation.x = corpse._initRotX + (Math.PI / 2) * eased;
          } else {
            // Vehicles/tanks: slight spin then tip onto side
            corpse.mesh.rotation.y = corpse._initRotY + 0.5 * eased;
            corpse.mesh.rotation.z = corpse._initRotZ + (Math.PI / 2) * eased;
          }

          if (animP >= 1) {
            corpse._deathAnimDone = true;
            // Dust cloud on landing for land units
            if (corpse._deathDomain === 'land' && !corpse._dustSpawned && this.effectsManager) {
              corpse._dustSpawned = true;
              this.effectsManager.createDustPuff(corpse.mesh.position);
            }
          }
        }

        // Opacity fade (starts after death anim or immediately if no anim)
        const fadeStart = corpse._deathAnimDone ? 1 : 0;
        const fadeProgress = 1 - (corpse.timer / corpse.totalTime);
        const opacity = corpse._deathAnimDone ? Math.max(0, 1 - fadeProgress) : 1;
        if (!corpse._materials) {
          corpse._materials = [];
          corpse.mesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              corpse._materials.push(child.material);
            }
          });
        }
        for (let m = 0, mlen = corpse._materials.length; m < mlen; m++) {
          corpse._materials[m].opacity = opacity;
        }
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

    // UI update
    this.uiManager.updateHUD();
  }

  _applyGraphicsSettings() {
    if (!this.sceneManager) return;
    const g = settingsManager.settings.graphics;
    const r = this.sceneManager.renderer;
    if (r) {
      r.shadowMap.enabled = g.shadows;
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2) * g.resolution);
    }
    if (this.postProcessing) {
      this.postProcessing.enabled = g.bloom || g.vignette;
    }
    this.sceneManager.dayNightEnabled = g.dayNightCycle;
    if (this.performanceMonitor) {
      if (g.showFPS) this.performanceMonitor.show();
      else this.performanceMonitor.hide();
    }
  }

  _applyAudioSettings() {
    if (!this.soundManager) return;
    const a = settingsManager.settings.audio;
    this.soundManager.setVolume(a.masterVolume);
    this.soundManager.setMusicVolume(a.musicVolume);
    this.soundManager.setEnabled(a.sfxEnabled);
    this.soundManager.setMusicEnabled(a.musicEnabled);
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

  // Proxy methods -- delegate to extracted systems
  get research() { return this.researchSystem?.state || { player: { completed: [], inProgress: null, timer: 0, building: null, branches: {} }, enemy: { completed: [], inProgress: null, timer: 0, building: null, branches: {} } }; }
  startResearch(team, id) { return this.researchSystem?.startResearch(team, id); }
  hasResearch(team, id) { return this.researchSystem?.hasResearch(team, id) || false; }
  applyAllResearchToEntity(e) { this.researchSystem?.applyAllResearchToEntity(e); }
  startBranchResearch(t, d, k) { return this.researchSystem?.startBranchResearch(t, d, k); }
  getBranchChoice(t, d) { return this.researchSystem?.getBranchChoice(t, d); }
  async startChallenge(key) { return this.challengeSystem?.startChallenge(key); }
  autoResolve() { this.challengeSystem?.autoResolve(); }
  get _canAutoResolve() { return this.challengeSystem?.canAutoResolve || false; }
  get _challenge() { return this.challengeSystem?._challenge || null; }
  checkGameOver() { this.gameModeSystem?.checkGameOver(); }
  saveMatchHistory(won) { this.gameModeSystem?.saveMatchHistory(won); }

  /**
   * Returns the team string for the local player in multiplayer.
   * Slot 0 = 'player', slot 1 = 'enemy'.
   */
  getLocalTeam() {
    if (!this.isMultiplayer) return 'player';
    return this.playerSlot === 0 ? 'player' : 'enemy';
  }

  /**
   * Handle multiplayer game over event from the server.
   */
  _handleMultiplayerGameOver(won, reason) {
    if (this.state === 'GAME_OVER') return;
    this.setState('GAME_OVER');

    // Stop voice chat
    if (this.voiceChat) {
      this.voiceChat.stop();
      this.voiceChat = null;
    }

    // Disable lockstep
    if (this.lockstepManager) {
      this.lockstepManager.disable();
    }

    const title = won ? 'VICTORY' : 'DEFEAT';
    const subtitle = reason === 'surrender'
      ? (won ? 'Opponent surrendered!' : 'You surrendered.')
      : (won ? 'Enemy forces eliminated!' : 'Your forces have been eliminated.');

    if (this.uiManager) {
      this.uiManager.showGameOver(won, subtitle);
    }
  }

  /**
   * Surrender in a multiplayer game.
   */
  surrenderMultiplayer() {
    if (!this.isMultiplayer || !this.networkManager) return;
    this.networkManager.surrender();
  }

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  _setupSpeedToggle() {
    const btn = document.getElementById('speed-toggle-btn');
    if (!btn) return;
    btn.classList.remove('hidden');
    const speeds = [1, 2, 4];
    let idx = 0;
    btn.textContent = '1x';
    btn.addEventListener('click', () => {
      idx = (idx + 1) % speeds.length;
      this.gameSpeed = speeds[idx];
      btn.textContent = speeds[idx] + 'x';
    });
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
    this._rebuildCaches();
    if (this.entityManager) this.entityManager.clear();
    if (this.aiController && this.aiController.dispose) this.aiController.dispose();
    this.aiController = null;
    if (this.aiController2 && this.aiController2.dispose) this.aiController2.dispose();
    this.aiController2 = null;
    this.paused = false;
    this.gameElapsed = 0;
    if (this.mapEventSystem) this.mapEventSystem.dispose();
    if (this.challengeSystem) { this.challengeSystem.dispose(); this.challengeSystem = null; }
    if (this.tutorialSystem) { this.tutorialSystem.dispose(); this.tutorialSystem = null; }
    this._slowMotion = null;
    this.isSpectating = false;
    this.gameSpeed = 1;
    const speedBtn = document.getElementById('speed-toggle-btn');
    if (speedBtn) speedBtn.classList.add('hidden');
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
    };
    if (this.fogOfWar) {
      this.fogOfWar.dispose();
      this.fogOfWar = null;
    }
    if (this.gameModeSystem) {
      this.gameModeSystem.dispose();
      this.gameModeSystem = null;
    }
    this.gameMode = null;
    if (this.researchSystem) { this.researchSystem.dispose(); this.researchSystem = null; }
    // Clean up GameOverScreen event listeners
    if (this.uiManager && this.uiManager.gameOverScreen && this.uiManager.gameOverScreen.dispose) {
      this.uiManager.gameOverScreen.dispose();
      this.uiManager.gameOverScreen = null;
    }
    // Clean up pathfinding worker
    if (this.pathfinding) {
      this.pathfinding.dispose();
      this.pathfinding = null;
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
      // Cycle 15: Clear move marker pool
      if (this.effectsManager._moveMarkerPool) {
        this.effectsManager._moveMarkerPool = [];
      }
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
    // Clean up instanced renderer
    if (this.instancedRenderer) {
      this.instancedRenderer.dispose();
      this.instancedRenderer = null;
    }
    // Reset commander state
    this._commanderState = null;

    // Clean up voice chat
    if (this.voiceChat) {
      this.voiceChat.stop();
      this.voiceChat = null;
    }

    // Clean up multiplayer lockstep
    if (this.lockstepManager) {
      this.lockstepManager.disable();
      this.lockstepManager = null;
    }
    this.isMultiplayer = false;
    this.playerSlot = -1;
    this._mpPaused = false;
    this._executingLockstepTurn = false;

    // Clean up commander ability system
    if (this.commanderAbilitySystem) { this.commanderAbilitySystem.dispose(); this.commanderAbilitySystem = null; }
    // Clear any pending timeouts pushed by CombatSystem/UIManager onto game._pendingTimeouts
    if (this._pendingTimeouts) {
      for (const id of this._pendingTimeouts) clearTimeout(id);
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
      // Cycle 15: Reset production overview panel
      this.uiManager.hud._prodOverviewOpen = false;
      this.uiManager.hud._prodOverviewCache = '';
      if (this.uiManager.hud._prodOverviewPanel) {
        this.uiManager.hud._prodOverviewPanel.style.display = 'none';
      }
      // Cycle 15: Hide tooltip
      this.uiManager.hud._hideTooltip();
      // Cycle 15: Cancel build placement and remove ghost mesh on restart
      this.uiManager.hud.cancelBuildPlacement();
      // Clean up rally visuals
      this.uiManager.hud.removeRallyVisuals();
    }

    // GD-139: Remove any lingering victory overlay
    const victoryOverlays = document.querySelectorAll('.victory-overlay');
    victoryOverlays.forEach(el => el.parentElement?.removeChild(el));

    this.setState('MENU');
    this.uiManager.showMainMenu();
  }
}
