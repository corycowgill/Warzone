import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GAME_CONFIG, NATIONS, BUILDING_STATS, UNIT_STATS, RESEARCH_UPGRADES, SALVAGE_CONFIG, RESOURCE_NODE_CONFIG, CONSTRUCTION_CONFIG } from './Constants.js';
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
import { PostProcessing } from '../rendering/PostProcessing.js';
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
    this.paused = false;

    // Game timer and stats
    this.gameElapsed = 0;
    this.stats = {
      player: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 },
      enemy: { unitsProduced: 0, unitsLost: 0, buildingsDestroyed: 0, damageDealt: 0 }
    };

    // Research state per team
    this.research = {
      player: { completed: [], inProgress: null, timer: 0, building: null },
      enemy: { completed: [], inProgress: null, timer: 0, building: null }
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
    this.postProcessing = null;
    this.resourceNodes = [];
    this.aiController2 = null;
    this._mapEventTimer = 0;
    this._mapEventInterval = 60; // seconds between events
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

  async startGame(config) {
    try {
      // config = { mode, playerNation, enemyNation, difficulty, mapTemplate, mapSeed, gameMode }
      this.mode = config.mode;
      this.gameMode = config.gameMode || 'annihilation'; // annihilation, timed, king_of_hill
      this.teams.player.nation = config.playerNation;
      this.teams.enemy.nation = config.enemyNation;
      this.teams.player.sp = GAME_CONFIG.startingSP;
      this.teams.enemy.sp = GAME_CONFIG.startingSP;
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

      if (this.mode === '1P') {
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

    // Enemy base (right side, but before water)
    this.createBuilding('headquarters', 'enemy', new THREE.Vector3(mapSize - 60, 0, mapSize / 2));
    this.createBuilding('barracks', 'enemy', new THREE.Vector3(mapSize - 75, 0, mapSize / 2 - 15));

    // Starting infantry (3 per side)
    for (let i = 0; i < 3; i++) {
      this.createUnit('infantry', 'player', new THREE.Vector3(50 + i * 4, 0, mapSize / 2 + 10));
      this.createUnit('infantry', 'enemy', new THREE.Vector3(mapSize - 80 + i * 4, 0, mapSize / 2 + 10));
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

    // Update game timer
    this.gameElapsed += delta;

    // Day/Night cycle
    if (this.sceneManager) {
      this.sceneManager.updateDayNight(delta, this.gameElapsed);
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

    // Update UI
    this.uiManager.updateHUD();

    // Check win/lose
    this.checkGameOver();
  }

  checkGameOver() {
    let won = null;

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
    const delta = this.clock.getDelta();

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

    // Check if the team has the required building
    const hasBuilding = this.getBuildings(team).some(b => b.type === upgrade.building);
    if (!hasBuilding) return false;

    this.teams[team].sp -= upgrade.cost;
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
        const upgrade = RESEARCH_UPGRADES[state.inProgress];
        if (upgrade) {
          this.teams[team].sp += upgrade.cost;
        }
        state.inProgress = null;
        state.timer = 0;
        state.building = null;
        if (team === 'player' && this.uiManager && this.uiManager.hud) {
          this.uiManager.hud.showNotification(`Research cancelled: building destroyed! (${upgrade?.cost || 0} SP refunded)`, '#ff4444');
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
  }

  hasResearch(team, upgradeId) {
    return this.research[team]?.completed.includes(upgradeId) || false;
  }

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
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
    this.aiController2 = null;
    this.paused = false;
    this.gameElapsed = 0;
    this._mapEventTimer = 0;
    this._tutorialTimer = 0;
    this._tutorialStep = 0;
    this._tutorialShown = false;
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
      player: { completed: [], inProgress: null, timer: 0, building: null },
      enemy: { completed: [], inProgress: null, timer: 0, building: null }
    };
    // Clean up GameOverScreen event listeners
    if (this.uiManager && this.uiManager.gameOverScreen && this.uiManager.gameOverScreen.dispose) {
      this.uiManager.gameOverScreen.dispose();
      this.uiManager.gameOverScreen = null;
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
    // Clean up nation ability button
    const abilityBtn = document.getElementById('nation-ability-btn');
    if (abilityBtn) abilityBtn.style.display = 'none';

    this.setState('MENU');
    this.uiManager.showMainMenu();
  }
}
