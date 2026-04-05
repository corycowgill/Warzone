/**
 * Save/Load System for Warzone RTS
 * Serializes and deserializes full game state to/from JSON.
 * Supports localStorage slots, file export/import, and autosave.
 */

import * as THREE from 'three';

const SAVE_VERSION = 1;
const SAVE_PREFIX = 'warzone_save_';
const MAX_SLOTS = 10;
const AUTOSAVE_SLOT = '__autosave__';
const AUTOSAVE_INTERVAL = 120; // seconds (2 minutes)

export class SaveSystem {
  constructor(game) {
    this.game = game;
    this._autosaveTimer = 0;
    this._autosaveEnabled = true;
    this._autosaveInterval = AUTOSAVE_INTERVAL;
  }

  // =========================================================
  // AUTOSAVE
  // =========================================================

  /**
   * Called each frame from game loop. Triggers autosave on interval.
   */
  updateAutosave(delta) {
    if (!this._autosaveEnabled) return;
    if (this.game.state !== 'PLAYING') return;

    this._autosaveTimer += delta;
    if (this._autosaveTimer >= this._autosaveInterval) {
      this._autosaveTimer = 0;
      try {
        this.saveToLocal(AUTOSAVE_SLOT);
        if (this.game.uiManager?.hud) {
          this.game.uiManager.hud.showNotification('Game autosaved', '#88ccff');
        }
      } catch (e) {
        console.warn('Autosave failed:', e);
      }
    }
  }

  // =========================================================
  // SERIALIZE
  // =========================================================

  /**
   * Capture the entire game state as a plain JSON-serializable object.
   */
  serialize() {
    const game = this.game;

    const saveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      dateString: new Date().toLocaleString(),

      // Game metadata
      meta: {
        mode: game.mode,
        gameMode: game.gameMode || 'annihilation',
        gameElapsed: game.gameElapsed,
        aiDifficulty: game.aiDifficulty || 'normal',
        playerNation: game.teams.player.nation,
        enemyNation: game.teams.enemy.nation,
        mapTemplate: game.terrain?.mapTemplate || 'continental',
        mapSeed: game.terrain?.seed ?? null,
      },

      // Resources
      teams: {
        player: { sp: game.teams.player.sp, mu: game.teams.player.mu },
        enemy: { sp: game.teams.enemy.sp, mu: game.teams.enemy.mu },
      },

      // Stats
      stats: JSON.parse(JSON.stringify(game.stats)),

      // Research
      research: this._serializeResearch(),

      // Entities
      entities: this._serializeEntities(),

      // Fog of war grid
      fog: this._serializeFog(),

      // AI state
      ai: this._serializeAI(game.aiController),
      ai2: this._serializeAI(game.aiController2),

      // Weather
      weather: this._serializeWeather(),

      // Neutral structures
      neutralStructures: this._serializeNeutralStructures(),

      // Commander state
      commanderState: game._commanderState ? JSON.parse(JSON.stringify(game._commanderState)) : null,

      // Smoke/flare zones
      smokeZones: (game._smokeZones || []).map(z => ({
        position: this._vec3(z.position),
        radius: z.radius,
        timer: z.timer,
      })),
      flareZones: (game._flareZones || []).map(z => ({
        position: this._vec3(z.position),
        radius: z.radius,
        timer: z.timer,
      })),
    };

    return saveData;
  }

  _vec3(v) {
    if (!v) return { x: 0, y: 0, z: 0 };
    return { x: v.x, y: v.y, z: v.z };
  }

  _serializeResearch() {
    const r = this.game.research;
    const result = {};
    for (const team of ['player', 'enemy']) {
      const state = r[team];
      result[team] = {
        completed: [...state.completed],
        inProgress: state.inProgress,
        timer: state.timer,
        branches: state.branches ? { ...state.branches } : {},
        _branchDomain: state._branchDomain || null,
        _branchKey: state._branchKey || null,
        // building reference stored as entity id
        buildingId: state.building?.id ?? null,
      };
    }
    return result;
  }

  _serializeEntities() {
    const entities = [];
    for (const e of this.game.entities) {
      if (!e.alive) continue;
      // Skip supply caches (they're procedurally placed)
      if (e._isCache) continue;

      const data = {
        id: e.id,
        type: e.type,
        team: e.team,
        isUnit: !!e.isUnit,
        isBuilding: !!e.isBuilding,
        position: this._vec3(e.getPosition()),
        health: e.health,
        maxHealth: e.maxHealth,
      };

      if (e.isUnit) {
        data.unit = {
          speed: e.speed,
          damage: e.damage,
          range: e.range,
          armor: e.armor,
          vision: e.vision,
          attackRate: e.attackRate,
          stance: e.stance,
          kills: e.kills,
          veterancyRank: e.veterancyRank,
          baseSpeed: e.baseSpeed,
          baseDamage: e.baseDamage,
          baseRange: e.baseRange,
          baseMaxHP: e.baseMaxHP,
          baseArmor: e.baseArmor,
          baseAttackRate: e.baseAttackRate,
          domain: e.domain,
          cost: e.cost,
          moveTarget: e.moveTarget ? this._vec3(e.moveTarget) : null,
          attackTarget: e.attackTarget?.id ?? null,
          isMoving: e.isMoving,
          attackCooldown: e.attackCooldown,
          waypoints: (e.waypoints || []).map(w => this._vec3(w)),
          _attackMove: e._attackMove || false,
          isRetreating: e.isRetreating || false,
          _siegeMode: e._siegeMode || false,
          empDisabledTimer: e.empDisabledTimer || 0,
          abilityCooldown: e.abilityCooldown || 0,
          abilityActive: e.abilityActive || false,
          flyHeight: e.flyHeight || 0,
          _isPatrolling: e._isPatrolling || false,
          _patrolPoints: (e._patrolPoints || []).map(p => this._vec3(p)),
          _patrolIndex: e._patrolIndex || 0,
          _regenRate: e._regenRate || 0,
          nation: e.nation,
          factionType: e.factionType || null,
        };
      }

      if (e.isBuilding) {
        data.building = {
          tier: e.tier || 1,
          productionQueue: [...(e.productionQueue || [])],
          currentProduction: e.currentProduction || null,
          productionTimer: e.productionTimer || 0,
          _productionTotalTime: e._productionTotalTime || 0,
          rallyPoint: e.rallyPoint ? this._vec3(e.rallyPoint) : null,
          _constructing: e._constructing || false,
          _constructionTime: e._constructionTime || 0,
          _constructionElapsed: e._constructionElapsed || 0,
          _constructionMaxHP: e._constructionMaxHP || e.maxHealth,
          _sabotaged: e._sabotaged || false,
          _researching: e._researching || null,
          nation: e.nation,
          cost: e.cost,
          size: e.size,
        };
      }

      entities.push(data);
    }
    return entities;
  }

  _serializeFog() {
    if (!this.game.fogOfWar) return null;
    // Encode as base64 for compactness
    const grid = this.game.fogOfWar.grid;
    return {
      team: this.game.fogOfWar.team,
      mapSize: this.game.fogOfWar.mapSize,
      grid: this._encodeUint8Array(grid),
    };
  }

  _encodeUint8Array(arr) {
    // Convert to base64 string
    let binary = '';
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  _decodeUint8Array(base64, length) {
    const binary = atob(base64);
    const arr = new Uint8Array(length);
    for (let i = 0; i < binary.length && i < length; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return arr;
  }

  _serializeAI(ai) {
    if (!ai) return null;
    return {
      team: ai.team,
      difficulty: ai.difficulty,
      strategy: ai.strategy,
      chosenBuildOrder: ai.chosenBuildOrder ? [...ai.chosenBuildOrder] : null,
      buildOrderIndex: ai.buildOrderIndex,
      strategicTimer: ai.strategicTimer,
      tacticalTimer: ai.tacticalTimer,
      microTimer: ai.microTimer,
      scoutTimer: ai.scoutTimer,
      scoutSent: ai.scoutSent,
      lastAttackTime: ai.lastAttackTime,
      attackCooldown: ai.attackCooldown,
      nextBuildSlot: ai.nextBuildSlot,
      attackWaveCount: ai.attackWaveCount,
      gameTime: ai.gameTime,
      gracePeriod: ai.gracePeriod,
      _exchangeCooldown: ai._exchangeCooldown || 0,
    };
  }

  _serializeWeather() {
    const ws = this.game.weatherSystem;
    if (!ws) return null;
    return {
      currentWeather: ws.currentWeather,
      weatherTimer: ws.weatherTimer,
      transitioning: ws.transitioning,
      transitionTimer: ws.transitionTimer,
      nextWeather: ws.nextWeather,
    };
  }

  _serializeNeutralStructures() {
    const ns = this.game.neutralStructures;
    if (!ns) return null;
    return ns.structures.map(s => ({
      type: s.type,
      position: this._vec3(s.position),
      owner: s.owner,
      captureProgress: s.captureProgress || 0,
      capturingTeam: s.capturingTeam || null,
    }));
  }

  // =========================================================
  // DESERIALIZE
  // =========================================================

  /**
   * Restore game state from save data.
   * This must be called after game.startGame() has initialized all systems.
   */
  async deserialize(saveData) {
    if (!saveData || saveData.version !== SAVE_VERSION) {
      throw new Error(`Incompatible save version: ${saveData?.version}, expected ${SAVE_VERSION}`);
    }

    const game = this.game;

    // --- Clear existing entities ---
    for (const e of [...game.entities]) {
      if (e.mesh) game.sceneManager.scene.remove(e.mesh);
    }
    game.entities = [];
    game.projectiles = [];

    // --- Restore resources ---
    game.teams.player.sp = saveData.teams.player.sp;
    game.teams.player.mu = saveData.teams.player.mu;
    game.teams.enemy.sp = saveData.teams.enemy.sp;
    game.teams.enemy.mu = saveData.teams.enemy.mu;

    // --- Restore stats ---
    game.stats = JSON.parse(JSON.stringify(saveData.stats));

    // --- Restore game timer ---
    game.gameElapsed = saveData.meta.gameElapsed;

    // --- Restore commander state ---
    if (saveData.commanderState) {
      game._commanderState = JSON.parse(JSON.stringify(saveData.commanderState));
    }

    // --- Restore smoke/flare zones ---
    game._smokeZones = (saveData.smokeZones || []).map(z => ({
      position: new THREE.Vector3(z.position.x, z.position.y, z.position.z),
      radius: z.radius,
      timer: z.timer,
    }));
    game._flareZones = (saveData.flareZones || []).map(z => ({
      position: new THREE.Vector3(z.position.x, z.position.y, z.position.z),
      radius: z.radius,
      timer: z.timer,
    }));

    // --- Recreate entities ---
    // Build an id map for attack target resolution
    const idMap = new Map();
    const deferredAttackTargets = [];

    // Reset entity ID counter to avoid collisions
    // Find max id from save data and set counter above it
    let maxId = 0;
    for (const eData of saveData.entities) {
      if (eData.id > maxId) maxId = eData.id;
    }

    // Use a module-level import to access Entity
    const { Entity } = await import('../entities/Entity.js');
    Entity.nextId = maxId + 1;

    for (const eData of saveData.entities) {
      let entity = null;

      if (eData.isBuilding) {
        const pos = new THREE.Vector3(eData.position.x, eData.position.y, eData.position.z);
        entity = game.createBuilding(eData.type, eData.team, pos);
        if (!entity) continue;

        // Restore building state
        const b = eData.building;
        entity.tier = b.tier || 1;
        entity.productionQueue = [...(b.productionQueue || [])];
        entity.currentProduction = b.currentProduction || null;
        entity.productionTimer = b.productionTimer || 0;
        entity._productionTotalTime = b._productionTotalTime || 0;
        entity._constructing = b._constructing || false;
        entity._constructionTime = b._constructionTime || 0;
        entity._constructionElapsed = b._constructionElapsed || 0;
        entity._constructionMaxHP = b._constructionMaxHP || entity.maxHealth;
        entity._sabotaged = b._sabotaged || false;
        entity._researching = b._researching || null;

        if (b.rallyPoint) {
          entity.rallyPoint = new THREE.Vector3(b.rallyPoint.x, b.rallyPoint.y, b.rallyPoint.z);
        }

        // Handle construction visual state
        if (entity._constructing && entity.mesh) {
          const progress = entity._constructionElapsed / entity._constructionTime;
          const scale = 0.5 + 0.5 * Math.min(1, progress);
          entity.mesh.scale.set(scale, scale, scale);
          entity.mesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.4;
            }
          });
        }

      } else if (eData.isUnit) {
        const pos = new THREE.Vector3(eData.position.x, eData.position.y, eData.position.z);
        entity = game.createUnit(eData.type, eData.team, pos);
        if (!entity) continue;

        // Restore unit state
        const u = eData.unit;
        entity.speed = u.speed;
        entity.damage = u.damage;
        entity.range = u.range;
        entity.armor = u.armor;
        entity.vision = u.vision;
        entity.attackRate = u.attackRate;
        entity.stance = u.stance || 'aggressive';
        entity.kills = u.kills || 0;
        entity.veterancyRank = u.veterancyRank || 0;
        entity.baseSpeed = u.baseSpeed;
        entity.baseDamage = u.baseDamage;
        entity.baseRange = u.baseRange;
        entity.baseMaxHP = u.baseMaxHP;
        entity.baseArmor = u.baseArmor;
        entity.baseAttackRate = u.baseAttackRate;
        entity.isMoving = u.isMoving || false;
        entity.attackCooldown = u.attackCooldown || 0;
        entity._attackMove = u._attackMove || false;
        entity.isRetreating = u.isRetreating || false;
        entity._siegeMode = u._siegeMode || false;
        entity.empDisabledTimer = u.empDisabledTimer || 0;
        entity.abilityCooldown = u.abilityCooldown || 0;
        entity.abilityActive = u.abilityActive || false;
        entity._isPatrolling = u._isPatrolling || false;
        entity._patrolIndex = u._patrolIndex || 0;
        entity._regenRate = u._regenRate || 0;

        if (u._patrolPoints && u._patrolPoints.length > 0) {
          entity._patrolPoints = u._patrolPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
        }

        if (u.moveTarget) {
          entity.moveTarget = new THREE.Vector3(u.moveTarget.x, u.moveTarget.y, u.moveTarget.z);
        }

        if (u.waypoints && u.waypoints.length > 0) {
          entity.waypoints = u.waypoints.map(w => new THREE.Vector3(w.x, w.y, w.z));
        }

        // Defer attack target resolution until all entities are created
        if (u.attackTarget) {
          deferredAttackTargets.push({ entity, targetId: u.attackTarget });
        }

        // Restore veterancy visual
        if (entity.veterancyRank > 0 && entity.updateRankIndicator) {
          entity.updateRankIndicator();
        }
      }

      if (entity) {
        // Restore health and max health
        entity.health = eData.health;
        entity.maxHealth = eData.maxHealth;

        // Override the auto-assigned ID with saved ID
        entity.id = eData.id;
        idMap.set(eData.id, entity);
      }
    }

    // Resolve deferred attack targets
    for (const { entity, targetId } of deferredAttackTargets) {
      const target = idMap.get(targetId);
      if (target && target.alive) {
        entity.attackTarget = target;
      }
    }

    // --- Restore research ---
    this._deserializeResearch(saveData.research, idMap);

    // --- Restore fog of war ---
    this._deserializeFog(saveData.fog);

    // --- Restore AI ---
    this._deserializeAI(game.aiController, saveData.ai);
    this._deserializeAI(game.aiController2, saveData.ai2);

    // --- Restore weather ---
    this._deserializeWeather(saveData.weather);

    // --- Restore neutral structures ---
    this._deserializeNeutralStructures(saveData.neutralStructures);

    // --- Emit resource update ---
    game.eventBus.emit('resource:changed', {
      player: game.teams.player.sp,
      enemy: game.teams.enemy.sp,
      playerMU: game.teams.player.mu,
      enemyMU: game.teams.enemy.mu,
    });
  }

  _deserializeResearch(researchData, idMap) {
    if (!researchData) return;
    const game = this.game;

    for (const team of ['player', 'enemy']) {
      const data = researchData[team];
      if (!data) continue;

      game.research[team].completed = [...(data.completed || [])];
      game.research[team].inProgress = data.inProgress || null;
      game.research[team].timer = data.timer || 0;
      game.research[team].branches = data.branches ? { ...data.branches } : {};
      game.research[team]._branchDomain = data._branchDomain || null;
      game.research[team]._branchKey = data._branchKey || null;

      // Resolve building reference
      if (data.buildingId) {
        game.research[team].building = idMap.get(data.buildingId) || null;
      } else {
        game.research[team].building = null;
      }
    }
  }

  _deserializeFog(fogData) {
    if (!fogData || !this.game.fogOfWar) return;

    const fog = this.game.fogOfWar;
    const gridLength = fog.mapSize * fog.mapSize;
    const decoded = this._decodeUint8Array(fogData.grid, gridLength);
    fog.grid.set(decoded);
    fog.updateTexture();
  }

  _deserializeAI(ai, aiData) {
    if (!ai || !aiData) return;

    ai.strategy = aiData.strategy || 'balanced';
    ai.chosenBuildOrder = aiData.chosenBuildOrder ? [...aiData.chosenBuildOrder] : null;
    ai.buildOrderIndex = aiData.buildOrderIndex || 0;
    ai.strategicTimer = aiData.strategicTimer || 0;
    ai.tacticalTimer = aiData.tacticalTimer || 0;
    ai.microTimer = aiData.microTimer || 0;
    ai.scoutTimer = aiData.scoutTimer || 0;
    ai.scoutSent = aiData.scoutSent || false;
    ai.lastAttackTime = aiData.lastAttackTime || 0;
    ai.attackCooldown = aiData.attackCooldown || 30;
    ai.nextBuildSlot = aiData.nextBuildSlot || 1;
    ai.attackWaveCount = aiData.attackWaveCount || 0;
    ai.gameTime = aiData.gameTime || 0;
    ai.gracePeriod = aiData.gracePeriod ?? 75;
    ai._exchangeCooldown = aiData._exchangeCooldown || 0;
  }

  _deserializeWeather(weatherData) {
    if (!weatherData || !this.game.weatherSystem) return;
    const ws = this.game.weatherSystem;
    ws.currentWeather = weatherData.currentWeather || 'clear';
    ws.weatherTimer = weatherData.weatherTimer || 0;
    ws.transitioning = weatherData.transitioning || false;
    ws.transitionTimer = weatherData.transitionTimer || 0;
    ws.nextWeather = weatherData.nextWeather || null;

    // Re-apply weather visual effects
    if (ws.applyWeatherEffects) {
      ws.applyWeatherEffects();
    }
  }

  _deserializeNeutralStructures(nsData) {
    if (!nsData || !this.game.neutralStructures) return;
    const ns = this.game.neutralStructures;

    // Restore state for each structure
    for (let i = 0; i < nsData.length && i < ns.structures.length; i++) {
      const savedStruct = nsData[i];
      const struct = ns.structures[i];
      if (savedStruct.type === struct.type) {
        struct.owner = savedStruct.owner || null;
        struct.captureProgress = savedStruct.captureProgress || 0;
        struct.capturingTeam = savedStruct.capturingTeam || null;
      }
    }
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  /**
   * Save game state to a named localStorage slot.
   */
  saveToLocal(slotName) {
    const saveData = this.serialize();
    const key = SAVE_PREFIX + slotName;
    try {
      const json = JSON.stringify(saveData);
      localStorage.setItem(key, json);
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      if (e.name === 'QuotaExceededError') {
        if (this.game.uiManager?.hud) {
          this.game.uiManager.hud.showNotification('Save failed: storage full!', '#ff4444');
        }
      }
      return false;
    }
  }

  /**
   * Load game state from a named localStorage slot.
   * Returns the parsed save data, or null if not found.
   */
  loadFromLocal(slotName) {
    const key = SAVE_PREFIX + slotName;
    const json = localStorage.getItem(key);
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse save data:', e);
      return null;
    }
  }

  /**
   * List all save slots with metadata.
   */
  listSaves() {
    const saves = [];
    // Check autosave
    const autoData = this.loadFromLocal(AUTOSAVE_SLOT);
    if (autoData) {
      saves.push({
        slot: AUTOSAVE_SLOT,
        name: 'Autosave',
        timestamp: autoData.timestamp,
        dateString: autoData.dateString,
        gameElapsed: autoData.meta?.gameElapsed || 0,
        playerNation: autoData.meta?.playerNation,
        enemyNation: autoData.meta?.enemyNation,
        mode: autoData.meta?.mode,
      });
    }

    // Check numbered slots
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const slotName = `slot_${i}`;
      const data = this.loadFromLocal(slotName);
      if (data) {
        saves.push({
          slot: slotName,
          name: `Save ${i}`,
          timestamp: data.timestamp,
          dateString: data.dateString,
          gameElapsed: data.meta?.gameElapsed || 0,
          playerNation: data.meta?.playerNation,
          enemyNation: data.meta?.enemyNation,
          mode: data.meta?.mode,
        });
      } else {
        saves.push({
          slot: slotName,
          name: `Save ${i}`,
          empty: true,
        });
      }
    }
    return saves;
  }

  /**
   * Delete a save slot.
   */
  deleteSave(slotName) {
    const key = SAVE_PREFIX + slotName;
    localStorage.removeItem(key);
  }

  // =========================================================
  // FILE EXPORT / IMPORT
  // =========================================================

  /**
   * Export game state as a downloadable .warzone JSON file.
   */
  exportToFile() {
    const saveData = this.serialize();
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `warzone_save_${dateStr}.warzone`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import game state from a File object (.warzone JSON file).
   * Returns a Promise that resolves to the parsed save data.
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const saveData = JSON.parse(e.target.result);
          if (!saveData.version) {
            reject(new Error('Invalid save file: missing version'));
            return;
          }
          resolve(saveData);
        } catch (err) {
          reject(new Error('Failed to parse save file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // =========================================================
  // FULL LOAD FLOW
  // =========================================================

  /**
   * Full load from a slot: restart the game with saved config, then restore state.
   */
  async loadGame(slotName) {
    const saveData = this.loadFromLocal(slotName);
    if (!saveData) {
      throw new Error('No save data found in slot: ' + slotName);
    }
    return this.loadFromData(saveData);
  }

  /**
   * Full load from parsed save data.
   */
  async loadFromData(saveData) {
    if (!saveData || !saveData.meta) {
      throw new Error('Invalid save data');
    }

    const game = this.game;

    // Clean up existing game state if running
    if (game.state === 'PLAYING' || game.state === 'PAUSED') {
      game.paused = false;
    }

    // Restart the game with the saved configuration
    await game.startGame({
      mode: saveData.meta.mode,
      playerNation: saveData.meta.playerNation,
      enemyNation: saveData.meta.enemyNation,
      difficulty: saveData.meta.aiDifficulty,
      mapTemplate: saveData.meta.mapTemplate,
      mapSeed: saveData.meta.mapSeed,
      gameMode: saveData.meta.gameMode,
    });

    // Now restore all state on top of the fresh game
    await this.deserialize(saveData);

    // Reset autosave timer
    this._autosaveTimer = 0;

    if (game.uiManager?.hud) {
      game.uiManager.hud.showNotification('Game loaded successfully!', '#00ff88');
    }
  }
}
