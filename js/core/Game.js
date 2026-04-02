import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GAME_CONFIG, NATIONS, BUILDING_STATS, UNIT_STATS } from './Constants.js';
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
import { assetManager } from '../rendering/AssetManager.js';

export class Game {
  constructor() {
    this.state = 'MENU'; // MENU, NATION_SELECT, LOADING, PLAYING, GAME_OVER
    this.eventBus = new EventBus();
    this.entities = [];
    this.projectiles = [];
    this.teams = {
      player: { nation: null, sp: GAME_CONFIG.startingSP },
      enemy: { nation: null, sp: GAME_CONFIG.startingSP }
    };
    this.mode = '1P';
    this.activeTeam = 'player'; // For 2P hot-seat
    this.clock = new THREE.Clock();

    // Game timer and stats
    this.gameElapsed = 0;
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
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
  }

  init() {
    this.sceneManager = new SceneManager();
    this.soundManager = new SoundManager(this);
    this.uiManager = new UIManager(this);
    this.uiManager.showMainMenu();
    this.loop();
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
      // config = { mode, playerNation, enemyNation, difficulty, mapTemplate, mapSeed }
      this.mode = config.mode;
      this.teams.player.nation = config.playerNation;
      this.teams.enemy.nation = config.enemyNation;
      this.teams.player.sp = GAME_CONFIG.startingSP;
      this.teams.enemy.sp = GAME_CONFIG.startingSP;
      this.aiDifficulty = config.difficulty || 'normal';
      this.entities = [];
      this.projectiles = [];

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
      this.inputManager = new InputManager(this);
      this.pathfinding = new PathfindingSystem(this);
      this.selectionManager = new SelectionManager(this);
      this.commandSystem = new CommandSystem(this);
      this.combatSystem = new CombatSystem(this);
      this.resourceSystem = new ResourceSystem(this);
      this.productionSystem = new ProductionSystem(this);
      this.unitFactory = new UnitFactory(this);

      if (this.mode === '1P') {
        this.aiController = new AIController(this, 'enemy', this.aiDifficulty);
      }

      // Place initial buildings and units
      this.placeStartingEntities();

      // Show HUD first (so minimap canvas is available)
      this.uiManager.showHUD();

      // Initialize minimap after HUD is shown
      this.minimap = new Minimap(this);

      // Initialize Fog of War for the player team
      this.fogOfWar = new FogOfWar(this, 'player');

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

    // Enemy base (right side, but before water)
    this.createBuilding('headquarters', 'enemy', new THREE.Vector3(mapSize - 60, 0, mapSize / 2));
    this.createBuilding('barracks', 'enemy', new THREE.Vector3(mapSize - 75, 0, mapSize / 2 - 15));

    // Starting infantry (3 per side)
    for (let i = 0; i < 3; i++) {
      this.createUnit('infantry', 'player', new THREE.Vector3(50 + i * 4, 0, mapSize / 2 + 10));
      this.createUnit('infantry', 'enemy', new THREE.Vector3(mapSize - 80 + i * 4, 0, mapSize / 2 + 10));
    }
  }

  createUnit(type, team, position) {
    const unit = this.unitFactory.create(type, team, position);
    if (unit) {
      // Pass game reference so unit can access terrain for Y updates
      unit.game = this;

      // Apply nation bonuses
      const nationKey = this.teams[team]?.nation;
      if (nationKey && unit.applyNationBonuses) {
        unit.applyNationBonuses(nationKey);
      }

      // Set Y from terrain height
      const y = this.terrain.getHeightAt(position.x, position.z);
      unit.mesh.position.y = y;
      this.addEntity(unit);
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
      this.eventBus.emit('building:created', { building });
    }
    return building;
  }

  addEntity(entity) {
    this.entities.push(entity);
    if (entity.mesh) {
      this.sceneManager.scene.add(entity.mesh);
    }
  }

  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
    if (entity.mesh) {
      this.sceneManager.scene.remove(entity.mesh);
    }
  }

  addProjectile(projectile) {
    this.projectiles.push(projectile);
    if (projectile.mesh) this.sceneManager.scene.add(projectile.mesh);
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
    // Update entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.alive) {
        entity.update(delta);
      } else {
        this.effectsManager.createExplosion(entity.mesh.position);
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

    // Update systems
    this.combatSystem.update(delta);
    this.resourceSystem.update(delta);
    this.productionSystem.update(delta);
    this.effectsManager.update(delta);
    this.cameraController.update(delta);
    this.minimap.update();

    if (this.soundManager) {
      this.soundManager.update(delta);
    }

    if (this.fogOfWar) {
      this.fogOfWar.update();
    }

    if (this.aiController) {
      this.aiController.update(delta);
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

    // Update game timer
    this.gameElapsed += delta;

    // Update UI
    this.uiManager.updateHUD();

    // Check win/lose
    this.checkGameOver();
  }

  checkGameOver() {
    const playerHQ = this.getHQ('player');
    const enemyHQ = this.getHQ('enemy');

    if (!playerHQ) {
      this.setState('GAME_OVER');
      this.uiManager.showGameOver(false);
      if (this.soundManager) this.soundManager.play('defeat');
    } else if (!enemyHQ) {
      this.setState('GAME_OVER');
      this.uiManager.showGameOver(true);
      if (this.soundManager) this.soundManager.play('victory');
    } else {
      // Total annihilation check: if enemy has no units AND no production buildings
      const enemyUnits = this.getUnits('enemy');
      const enemyBuildings = this.getBuildings('enemy').filter(b =>
        b.produces && b.produces.length > 0
      );
      if (enemyUnits.length === 0 && enemyBuildings.length === 0) {
        this.setState('GAME_OVER');
        this.uiManager.showGameOver(true);
        if (this.soundManager) this.soundManager.play('victory');
      }

      // Same for player
      const playerUnits = this.getUnits('player');
      const playerBuildings = this.getBuildings('player').filter(b =>
        b.produces && b.produces.length > 0
      );
      if (playerUnits.length === 0 && playerBuildings.length === 0) {
        this.setState('GAME_OVER');
        this.uiManager.showGameOver(false);
        if (this.soundManager) this.soundManager.play('defeat');
      }
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const delta = this.clock.getDelta();

    if (this.state === 'PLAYING') {
      this.update(delta);
    }

    if (this.sceneManager) {
      this.sceneManager.render();
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

  restart() {
    // Clean up
    this.entities.forEach(e => {
      if (e.mesh) this.sceneManager.scene.remove(e.mesh);
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
    if (this.fogOfWar) {
      this.fogOfWar.dispose();
      this.fogOfWar = null;
    }
    this.setState('MENU');
    this.uiManager.showMainMenu();
  }
}
