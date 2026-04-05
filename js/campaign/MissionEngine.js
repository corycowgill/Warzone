import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

/**
 * MissionEngine - Drives campaign mission scripting.
 * Loads mission definitions, evaluates triggers, tracks objectives,
 * spawns scripted events, and determines victory/defeat.
 */
export class MissionEngine {
  constructor(game) {
    this.game = game;
    this.mission = null;        // Current mission definition
    this.state = 'inactive';    // inactive | briefing | playing | won | lost
    this.elapsed = 0;           // Seconds since mission start
    this.phase = 0;             // Current mission phase index
    this.objectives = [];       // Runtime objective state
    this.triggersExecuted = new Set(); // Track which triggers have fired
    this.dialogueQueue = [];    // Pending dialogue popups
    this.currentDialogue = null;
    this.dialogueTimer = 0;
    this.reinforcementsSent = new Set();
    this.eventsExecuted = new Set();
    this.areaChecks = [];       // Cached area trigger data
    this._restrictedUnits = new Set();
    this._restrictedBuildings = new Set();
    this._onKillHandler = null;
    this._onBuildingDestroyedHandler = null;
    this._onUnitCreatedHandler = null;
    this._killCounts = { player: 0, enemy: 0 };
    this._buildingsDestroyedCounts = { player: 0, enemy: 0 };
  }

  /**
   * Load and initialize a mission definition.
   * @param {Object} missionDef - Mission definition object
   */
  loadMission(missionDef) {
    this.mission = missionDef;
    this.state = 'playing';
    this.elapsed = 0;
    this.phase = 0;
    this.triggersExecuted.clear();
    this.dialogueQueue = [];
    this.currentDialogue = null;
    this.dialogueTimer = 0;
    this.reinforcementsSent.clear();
    this.eventsExecuted.clear();
    this._killCounts = { player: 0, enemy: 0 };
    this._buildingsDestroyedCounts = { player: 0, enemy: 0 };

    // Initialize objectives
    this.objectives = (missionDef.objectives || []).map((obj, i) => ({
      ...obj,
      index: i,
      status: 'active',   // active | completed | failed
      progress: 0,
      maxProgress: obj.target || 1,
      hidden: obj.hidden || false
    }));

    // Set tech restrictions
    this._restrictedUnits = new Set(missionDef.restrictedUnits || []);
    this._restrictedBuildings = new Set(missionDef.restrictedBuildings || []);

    // Register event listeners
    this._registerListeners();

    // Override resources if specified
    if (missionDef.playerStartSP !== undefined) {
      this.game.teams.player.sp = missionDef.playerStartSP;
    }
    if (missionDef.playerStartMU !== undefined) {
      this.game.teams.player.mu = missionDef.playerStartMU;
    }
    if (missionDef.enemyStartSP !== undefined) {
      this.game.teams.enemy.sp = missionDef.enemyStartSP;
    }
    if (missionDef.enemyStartMU !== undefined) {
      this.game.teams.enemy.mu = missionDef.enemyStartMU;
    }

    // Disable AI if mission wants manual enemy control
    if (missionDef.disableEnemyAI && this.game.aiController) {
      this.game.aiController._disabled = true;
    }

    // Disable production if requested
    if (missionDef.noProduction) {
      this.game._campaignNoProduction = true;
    }

    // Disable player building if requested
    if (missionDef.noPlayerBuilding) {
      this.game._campaignNoBuilding = true;
    }

    // Spawn pre-placed entities
    this._spawnPrePlaced(missionDef);

    // Show opening dialogue if present
    if (missionDef.openingDialogue) {
      for (const line of missionDef.openingDialogue) {
        this.dialogueQueue.push(line);
      }
    }

    // Execute phase 0 events
    this._executePhaseEvents(0);
  }

  _registerListeners() {
    // Track kills
    this._onKillHandler = (data) => {
      if (!data.defender) return;
      const team = data.defender.team;
      if (team === 'enemy') this._killCounts.player++;
      if (team === 'player') this._killCounts.enemy++;
      // Check kill-based triggers
      this._checkKillTriggers(data);
    };
    this.game.eventBus.on('combat:kill', this._onKillHandler);

    // Track building destruction
    this._onBuildingDestroyedHandler = (data) => {
      if (!data.entity || !data.entity.isBuilding) return;
      const team = data.entity.team;
      if (team === 'enemy') this._buildingsDestroyedCounts.player++;
      if (team === 'player') this._buildingsDestroyedCounts.enemy++;
      this._checkBuildingDestroyedTriggers(data);
    };
    this.game.eventBus.on('building:destroyed', this._onBuildingDestroyedHandler);

    // Intercept unit production to enforce restrictions
    this._onUnitCreatedHandler = (data) => {
      if (!data.unit) return;
      if (data.unit.team === 'player' && this._restrictedUnits.has(data.unit.type)) {
        // Remove restricted unit immediately
        data.unit.health = 0;
        data.unit.alive = false;
      }
    };
    this.game.eventBus.on('unit:created', this._onUnitCreatedHandler);
  }

  _unregisterListeners() {
    if (this._onKillHandler) {
      this.game.eventBus.off('combat:kill', this._onKillHandler);
      this._onKillHandler = null;
    }
    if (this._onBuildingDestroyedHandler) {
      this.game.eventBus.off('building:destroyed', this._onBuildingDestroyedHandler);
      this._onBuildingDestroyedHandler = null;
    }
    if (this._onUnitCreatedHandler) {
      this.game.eventBus.off('unit:created', this._onUnitCreatedHandler);
      this._onUnitCreatedHandler = null;
    }
  }

  /**
   * Spawn pre-placed units and buildings from mission definition.
   */
  _spawnPrePlaced(missionDef) {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    // Spawn starting units
    if (missionDef.startingUnits) {
      for (const team of ['player', 'enemy']) {
        const units = missionDef.startingUnits[team];
        if (!units) continue;

        for (const placement of units) {
          // placement: { type, count, x, z } or { type, count, position: 'base' }
          const count = placement.count || 1;
          for (let i = 0; i < count; i++) {
            let x, z;
            if (placement.x !== undefined && placement.z !== undefined) {
              x = placement.x + (Math.random() - 0.5) * 3;
              z = placement.z + (Math.random() - 0.5) * 3;
            } else if (placement.position === 'base') {
              const baseX = team === 'player' ? 50 : mapSize - 80;
              x = baseX + (i % 5) * 4;
              z = mapSize / 2 + Math.floor(i / 5) * 4;
            } else {
              const baseX = team === 'player' ? 50 : mapSize - 80;
              x = baseX + (i % 5) * 4;
              z = mapSize / 2 + Math.floor(i / 5) * 4;
            }
            const pos = new THREE.Vector3(x, 0, z);
            const unit = this.game.createUnit(placement.type, team, pos);
            if (unit && placement.attackMove) {
              const targetPos = new THREE.Vector3(
                placement.attackMove.x || 50,
                0,
                placement.attackMove.z || mapSize / 2
              );
              unit.moveTo(targetPos);
              unit._attackMove = true;
            }
            // Tag scripted units
            if (unit && placement.tag) {
              unit._missionTag = placement.tag;
            }
          }
        }
      }
    }

    // Spawn starting buildings
    if (missionDef.startingBuildings) {
      for (const team of ['player', 'enemy']) {
        const buildings = missionDef.startingBuildings[team];
        if (!buildings) continue;

        for (const placement of buildings) {
          const pos = new THREE.Vector3(placement.x, 0, placement.z);
          const building = this.game.createBuilding(placement.type, team, pos);
          if (building && placement.tag) {
            building._missionTag = placement.tag;
          }
          // Allow setting custom HP (e.g., damaged buildings)
          if (building && placement.hp !== undefined) {
            building.health = placement.hp;
          }
        }
      }
    }
  }

  /**
   * Execute events for a specific phase.
   */
  _executePhaseEvents(phaseIndex) {
    if (!this.mission.phases) return;
    const phase = this.mission.phases[phaseIndex];
    if (!phase) return;

    // Show phase notification
    if (phase.name) {
      this._showNotification(phase.name, '#ffcc00');
    }

    // Queue phase dialogue
    if (phase.dialogue) {
      for (const line of phase.dialogue) {
        this.dialogueQueue.push(line);
      }
    }

    // Spawn phase units
    if (phase.spawnUnits) {
      this._spawnWaveUnits(phase.spawnUnits);
    }

    // Apply phase resource changes
    if (phase.grantSP !== undefined) {
      this.game.teams.player.sp += phase.grantSP;
    }
    if (phase.grantMU !== undefined) {
      this.game.teams.player.mu += phase.grantMU;
    }

    // Unlock units/buildings for this phase
    if (phase.unlockUnits) {
      for (const type of phase.unlockUnits) {
        this._restrictedUnits.delete(type);
      }
    }
    if (phase.unlockBuildings) {
      for (const type of phase.unlockBuildings) {
        this._restrictedBuildings.delete(type);
      }
    }

    // Enable/disable AI
    if (phase.enableEnemyAI && this.game.aiController) {
      this.game.aiController._disabled = false;
    }
    if (phase.disableEnemyAI && this.game.aiController) {
      this.game.aiController._disabled = true;
    }

    // Camera pan
    if (phase.cameraPan) {
      const target = phase.cameraPan;
      if (this.game.cameraController) {
        this.game.cameraController.moveTo(target.x, target.z);
      }
    }
  }

  /**
   * Spawn units from a wave/reinforcement definition.
   */
  _spawnWaveUnits(spawnDef) {
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    for (const spawn of spawnDef) {
      const team = spawn.team || 'enemy';
      const count = spawn.count || 1;

      for (let i = 0; i < count; i++) {
        let x, z;
        if (spawn.x !== undefined && spawn.z !== undefined) {
          x = spawn.x + (Math.random() - 0.5) * 6;
          z = spawn.z + (Math.random() - 0.5) * 6;
        } else if (spawn.edge === 'right') {
          x = mapSize - 20 + (Math.random() - 0.5) * 10;
          z = mapSize / 2 + (Math.random() - 0.5) * 60;
        } else if (spawn.edge === 'left') {
          x = 20 + (Math.random() - 0.5) * 10;
          z = mapSize / 2 + (Math.random() - 0.5) * 60;
        } else if (spawn.edge === 'top') {
          x = mapSize / 2 + (Math.random() - 0.5) * 60;
          z = 20 + (Math.random() - 0.5) * 10;
        } else if (spawn.edge === 'bottom') {
          x = mapSize / 2 + (Math.random() - 0.5) * 60;
          z = mapSize - 20 + (Math.random() - 0.5) * 10;
        } else {
          x = mapSize - 40 + (Math.random() - 0.5) * 10;
          z = mapSize / 2 + (Math.random() - 0.5) * 30;
        }

        const pos = new THREE.Vector3(x, 0, z);
        const unit = this.game.createUnit(spawn.type, team, pos);

        if (unit && spawn.attackMoveTarget) {
          const target = new THREE.Vector3(
            spawn.attackMoveTarget.x,
            0,
            spawn.attackMoveTarget.z
          );
          unit.moveTo(target);
          unit._attackMove = true;
        }

        if (unit && spawn.tag) {
          unit._missionTag = spawn.tag;
        }
      }
    }
  }

  /**
   * Main update loop - called every frame.
   */
  update(delta) {
    if (this.state !== 'playing') return;

    this.elapsed += delta;

    // Block production if mission requires it
    if (this.game._campaignNoProduction && this.game.productionSystem) {
      const playerBuildings = this.game.getBuildings('player');
      for (const b of playerBuildings) {
        if (b.productionQueue && b.productionQueue.length > 0) {
          b.productionQueue = [];
          b.currentProduction = null;
        }
      }
    }

    // Process triggers
    this._processTriggers();

    // Process timed reinforcements
    this._processReinforcements();

    // Process timed events
    this._processTimedEvents();

    // Update dialogue system
    this._updateDialogue(delta);

    // Check objective completion
    this._checkObjectives();

    // Check victory / defeat
    this._checkVictoryDefeat();
  }

  /**
   * Process all mission triggers.
   */
  _processTriggers() {
    if (!this.mission.triggers) return;

    for (let i = 0; i < this.mission.triggers.length; i++) {
      const trigger = this.mission.triggers[i];
      const trigId = `trigger_${i}`;

      // Skip already-fired one-shot triggers
      if (trigger.once !== false && this.triggersExecuted.has(trigId)) continue;

      if (this._evaluateTrigger(trigger)) {
        this.triggersExecuted.add(trigId);
        this._executeTriggerActions(trigger);
      }
    }
  }

  /**
   * Evaluate a single trigger condition.
   */
  _evaluateTrigger(trigger) {
    switch (trigger.type) {
      case 'time':
        return this.elapsed >= trigger.time;

      case 'time_between':
        return this.elapsed >= trigger.minTime && this.elapsed <= trigger.maxTime;

      case 'unit_count': {
        const team = trigger.team || 'enemy';
        const units = this.game.getUnits(team);
        const filtered = trigger.unitType
          ? units.filter(u => u.type === trigger.unitType)
          : units;
        if (trigger.comparison === 'lte') return filtered.length <= trigger.count;
        if (trigger.comparison === 'gte') return filtered.length >= trigger.count;
        if (trigger.comparison === 'eq') return filtered.length === trigger.count;
        return filtered.length <= trigger.count; // default: lte
      }

      case 'building_count': {
        const team = trigger.team || 'enemy';
        const buildings = this.game.getBuildings(team);
        const filtered = trigger.buildingType
          ? buildings.filter(b => b.type === trigger.buildingType)
          : buildings;
        if (trigger.comparison === 'lte') return filtered.length <= trigger.count;
        if (trigger.comparison === 'gte') return filtered.length >= trigger.count;
        return filtered.length <= trigger.count;
      }

      case 'area_units': {
        // Check if N units of a team are within a circle
        const team = trigger.team || 'player';
        const units = this.game.getUnits(team);
        const center = new THREE.Vector3(trigger.x, 0, trigger.z);
        const radius = trigger.radius || 30;
        const inArea = units.filter(u => u.getPosition().distanceTo(center) <= radius);
        const count = trigger.unitType
          ? inArea.filter(u => u.type === trigger.unitType).length
          : inArea.length;
        return count >= (trigger.count || 1);
      }

      case 'no_buildings': {
        const team = trigger.team || 'enemy';
        const buildings = this.game.getBuildings(team);
        const filtered = trigger.buildingType
          ? buildings.filter(b => b.type === trigger.buildingType)
          : buildings;
        return filtered.length === 0;
      }

      case 'kills': {
        const team = trigger.team || 'player';
        return this._killCounts[team] >= trigger.count;
      }

      case 'phase':
        return this.phase === trigger.phase;

      case 'objective_complete':
        return this.objectives[trigger.objectiveIndex]?.status === 'completed';

      case 'tagged_destroyed': {
        const tag = trigger.tag;
        const entities = this.game.entities.filter(e => e._missionTag === tag && e.alive);
        return entities.length === 0;
      }

      case 'tagged_alive': {
        const tag = trigger.tag;
        const entities = this.game.entities.filter(e => e._missionTag === tag && e.alive);
        return entities.length > 0;
      }

      case 'player_resource': {
        const resource = trigger.resource || 'sp';
        const value = resource === 'sp' ? this.game.teams.player.sp : this.game.teams.player.mu;
        if (trigger.comparison === 'gte') return value >= trigger.amount;
        if (trigger.comparison === 'lte') return value <= trigger.amount;
        return value >= trigger.amount;
      }

      default:
        return false;
    }
  }

  /**
   * Execute actions when a trigger fires.
   */
  _executeTriggerActions(trigger) {
    if (!trigger.actions) return;

    for (const action of trigger.actions) {
      this._executeAction(action);
    }
  }

  /**
   * Execute a single action.
   */
  _executeAction(action) {
    switch (action.type) {
      case 'spawn_units':
        this._spawnWaveUnits(action.units);
        break;

      case 'dialogue':
        if (action.lines) {
          for (const line of action.lines) {
            this.dialogueQueue.push(line);
          }
        }
        break;

      case 'notification':
        this._showNotification(action.text, action.color || '#ffcc00');
        break;

      case 'set_phase':
        if (action.phase !== undefined && action.phase !== this.phase) {
          this.phase = action.phase;
          this._executePhaseEvents(this.phase);
        }
        break;

      case 'advance_phase':
        this.phase++;
        this._executePhaseEvents(this.phase);
        break;

      case 'complete_objective':
        if (this.objectives[action.objectiveIndex]) {
          this.objectives[action.objectiveIndex].status = 'completed';
        }
        break;

      case 'fail_objective':
        if (this.objectives[action.objectiveIndex]) {
          this.objectives[action.objectiveIndex].status = 'failed';
        }
        break;

      case 'reveal_objective':
        if (this.objectives[action.objectiveIndex]) {
          this.objectives[action.objectiveIndex].hidden = false;
        }
        break;

      case 'grant_resources':
        if (action.sp) this.game.teams.player.sp += action.sp;
        if (action.mu) this.game.teams.player.mu += action.mu;
        break;

      case 'camera_pan':
        if (this.game.cameraController && action.x !== undefined) {
          this.game.cameraController.moveTo(action.x, action.z);
        }
        break;

      case 'camera_shake':
        if (this.game.cameraController) {
          this.game.cameraController.shake(action.intensity || 2);
        }
        break;

      case 'play_sound':
        if (this.game.soundManager && action.sound) {
          this.game.soundManager.play(action.sound);
        }
        break;

      case 'unlock_units':
        if (action.units) {
          for (const type of action.units) {
            this._restrictedUnits.delete(type);
          }
        }
        break;

      case 'restrict_units':
        if (action.units) {
          for (const type of action.units) {
            this._restrictedUnits.add(type);
          }
        }
        break;

      case 'enable_ai':
        if (this.game.aiController) {
          this.game.aiController._disabled = false;
        }
        break;

      case 'disable_ai':
        if (this.game.aiController) {
          this.game.aiController._disabled = true;
        }
        break;

      case 'damage_tagged': {
        const entities = this.game.entities.filter(e => e._missionTag === action.tag && e.alive);
        for (const e of entities) {
          e.takeDamage(action.damage || 50);
        }
        break;
      }

      case 'heal_tagged': {
        const entities = this.game.entities.filter(e => e._missionTag === action.tag && e.alive);
        for (const e of entities) {
          e.health = Math.min(e.maxHealth, e.health + (action.amount || 50));
        }
        break;
      }

      case 'victory':
        this.state = 'won';
        break;

      case 'defeat':
        this.state = 'lost';
        break;
    }
  }

  /**
   * Process timed reinforcement waves.
   */
  _processReinforcements() {
    if (!this.mission.reinforcements) return;

    for (let i = 0; i < this.mission.reinforcements.length; i++) {
      if (this.reinforcementsSent.has(i)) continue;
      const reinf = this.mission.reinforcements[i];

      if (this.elapsed >= reinf.time) {
        this.reinforcementsSent.add(i);
        this._spawnWaveUnits(reinf.units);

        if (reinf.notification) {
          this._showNotification(reinf.notification, '#88ff88');
        } else {
          const team = reinf.units[0]?.team || 'enemy';
          if (team === 'player') {
            this._showNotification('Reinforcements have arrived!', '#88ff88');
          } else {
            this._showNotification('Enemy reinforcements incoming!', '#ff4444');
          }
        }

        if (this.game.soundManager) {
          this.game.soundManager.play('produce');
        }
      }
    }
  }

  /**
   * Process timed scripted events.
   */
  _processTimedEvents() {
    if (!this.mission.timedEvents) return;

    for (let i = 0; i < this.mission.timedEvents.length; i++) {
      if (this.eventsExecuted.has(i)) continue;
      const event = this.mission.timedEvents[i];

      if (this.elapsed >= event.time) {
        this.eventsExecuted.add(i);
        if (event.actions) {
          for (const action of event.actions) {
            this._executeAction(action);
          }
        }
      }
    }
  }

  /**
   * Check kill-based triggers.
   */
  _checkKillTriggers(data) {
    // Check if killed entity had a mission tag needed for objectives
    if (data.defender._missionTag) {
      // Update objectives that track tagged entity destruction
      for (const obj of this.objectives) {
        if (obj.status !== 'active') continue;
        if (obj.type === 'destroy_tagged' && obj.tag === data.defender._missionTag) {
          obj.progress++;
          if (obj.progress >= obj.maxProgress) {
            obj.status = 'completed';
          }
        }
      }
    }
  }

  /**
   * Check building-destroyed triggers.
   */
  _checkBuildingDestroyedTriggers(data) {
    if (data.entity._missionTag) {
      for (const obj of this.objectives) {
        if (obj.status !== 'active') continue;
        if (obj.type === 'destroy_tagged' && obj.tag === data.entity._missionTag) {
          obj.progress++;
          if (obj.progress >= obj.maxProgress) {
            obj.status = 'completed';
          }
        }
      }
    }
  }

  /**
   * Check and update objective progress.
   */
  _checkObjectives() {
    for (const obj of this.objectives) {
      if (obj.status !== 'active') continue;

      switch (obj.type) {
        case 'destroy_all_enemy_buildings': {
          const buildings = this.game.getBuildings('enemy');
          if (buildings.length === 0 && this.elapsed > 5) {
            obj.status = 'completed';
          }
          break;
        }

        case 'destroy_all_enemies': {
          const enemies = this.game.getEntitiesByTeam('enemy');
          if (enemies.length === 0 && this.elapsed > 5) {
            obj.status = 'completed';
          }
          break;
        }

        case 'destroy_enemy_hq': {
          const hq = this.game.getHQ('enemy');
          if (!hq && this.elapsed > 5) {
            obj.status = 'completed';
          }
          break;
        }

        case 'destroy_building_type': {
          const buildings = this.game.getBuildings('enemy').filter(
            b => b.type === obj.buildingType
          );
          obj.progress = obj.maxProgress - buildings.length;
          if (buildings.length === 0 && this.elapsed > 3) {
            obj.status = 'completed';
          }
          break;
        }

        case 'survive_time': {
          obj.progress = Math.min(this.elapsed, obj.target);
          if (this.elapsed >= obj.target) {
            obj.status = 'completed';
          }
          break;
        }

        case 'hold_area': {
          const units = this.game.getUnits('player');
          const center = new THREE.Vector3(obj.x, 0, obj.z);
          const inArea = units.filter(u => u.getPosition().distanceTo(center) <= (obj.radius || 30));
          if (inArea.length >= (obj.unitCount || 1)) {
            obj.progress += this.game._lastDelta || 0.016;
          }
          if (obj.progress >= obj.target) {
            obj.status = 'completed';
          }
          break;
        }

        case 'reach_area': {
          const units = this.game.getUnits('player');
          const center = new THREE.Vector3(obj.x, 0, obj.z);
          const inArea = units.filter(u => u.getPosition().distanceTo(center) <= (obj.radius || 20));
          if (inArea.length >= (obj.unitCount || 1)) {
            obj.status = 'completed';
          }
          break;
        }

        case 'build_building': {
          const buildings = this.game.getBuildings('player').filter(
            b => b.type === obj.buildingType
          );
          obj.progress = buildings.length;
          if (buildings.length >= (obj.count || 1)) {
            obj.status = 'completed';
          }
          break;
        }

        case 'produce_units': {
          const units = this.game.getUnits('player');
          const filtered = obj.unitType
            ? units.filter(u => u.type === obj.unitType)
            : units;
          obj.progress = filtered.length;
          if (filtered.length >= obj.count) {
            obj.status = 'completed';
          }
          break;
        }

        case 'kill_count': {
          obj.progress = this._killCounts.player;
          if (this._killCounts.player >= obj.target) {
            obj.status = 'completed';
          }
          break;
        }

        case 'protect_tagged': {
          const tagged = this.game.entities.filter(
            e => e._missionTag === obj.tag && e.alive
          );
          if (tagged.length === 0 && this.elapsed > 3) {
            obj.status = 'failed';
          }
          break;
        }

        case 'destroy_tagged': {
          // Progress tracked by kill/building destroyed handlers
          break;
        }

        case 'keep_units_alive': {
          const units = this.game.getUnits('player');
          const filtered = obj.unitType
            ? units.filter(u => u.type === obj.unitType)
            : units;
          if (filtered.length < (obj.minCount || 1) && this.elapsed > 5) {
            obj.status = 'failed';
          }
          break;
        }
      }
    }
  }

  /**
   * Check victory and defeat conditions.
   */
  _checkVictoryDefeat() {
    if (this.state !== 'playing') return;

    const mission = this.mission;

    // Check explicit defeat conditions
    if (mission.defeatConditions) {
      for (const cond of mission.defeatConditions) {
        if (this._evaluateCondition(cond)) {
          this.state = 'lost';
          return;
        }
      }
    }

    // Check if any primary objective failed
    const primaryObjs = this.objectives.filter(o => o.priority === 'primary');
    const anyFailed = primaryObjs.some(o => o.status === 'failed');
    if (anyFailed) {
      this.state = 'lost';
      return;
    }

    // Default defeat: player HQ destroyed (unless no HQ in mission)
    if (!mission.noDefeatOnHQLoss) {
      const playerHQ = this.game.getHQ('player');
      if (!playerHQ && this.elapsed > 5) {
        // Check if player had an HQ to begin with
        const hadHQ = (mission.startingBuildings?.player || []).some(b => b.type === 'headquarters');
        if (hadHQ) {
          this.state = 'lost';
          return;
        }
      }
    }

    // Check if all primary objectives are completed
    const allPrimaryDone = primaryObjs.length > 0 && primaryObjs.every(o => o.status === 'completed');
    if (allPrimaryDone) {
      this.state = 'won';
      return;
    }

    // Check time limit
    if (mission.timeLimit && this.elapsed >= mission.timeLimit) {
      if (mission.victoryOnTimeOut) {
        this.state = 'won';
      } else {
        this.state = 'lost';
      }
    }
  }

  /**
   * Evaluate a defeat/victory condition.
   */
  _evaluateCondition(condition) {
    switch (condition.type) {
      case 'all_units_dead': {
        const team = condition.team || 'player';
        return this.game.getUnits(team).length === 0 && this.elapsed > 5;
      }
      case 'building_destroyed': {
        const tagged = this.game.entities.filter(
          e => e._missionTag === condition.tag && e.alive
        );
        return tagged.length === 0 && this.elapsed > 3;
      }
      case 'time_expired':
        return this.elapsed >= condition.time;
      default:
        return false;
    }
  }

  /**
   * Update dialogue display system.
   */
  _updateDialogue(delta) {
    if (this.currentDialogue) {
      this.dialogueTimer -= delta;
      if (this.dialogueTimer <= 0) {
        this.currentDialogue = null;
      }
    }

    if (!this.currentDialogue && this.dialogueQueue.length > 0) {
      this.currentDialogue = this.dialogueQueue.shift();
      this.dialogueTimer = this.currentDialogue.duration || 5;
    }
  }

  /**
   * Show a HUD notification.
   */
  _showNotification(text, color) {
    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(text, color);
    }
  }

  /**
   * Get current mission completion stats for scoring.
   */
  getCompletionStats() {
    const primaryObjs = this.objectives.filter(o => o.priority === 'primary');
    const secondaryObjs = this.objectives.filter(o => o.priority === 'secondary');
    const primaryDone = primaryObjs.filter(o => o.status === 'completed').length;
    const secondaryDone = secondaryObjs.filter(o => o.status === 'completed').length;

    return {
      elapsed: this.elapsed,
      primaryCompleted: primaryDone,
      primaryTotal: primaryObjs.length,
      secondaryCompleted: secondaryDone,
      secondaryTotal: secondaryObjs.length,
      unitsLost: this.game.stats.player.unitsLost || 0,
      enemiesKilled: this._killCounts.player,
      buildingsDestroyed: this._buildingsDestroyedCounts.player
    };
  }

  /**
   * Calculate star rating (1-3).
   */
  calculateStars() {
    if (this.state !== 'won') return 0;

    const stats = this.getCompletionStats();
    let stars = 1; // Beat the mission

    // 2 stars: complete at least 1 secondary objective and lose < 50% units
    const totalUnits = (this.game.stats.player.unitsProduced || 0) + 10; // rough starting units
    if (stats.secondaryCompleted > 0 && stats.unitsLost < totalUnits * 0.5) {
      stars = 2;
    }

    // 3 stars: all secondary objectives and low losses
    if (stats.secondaryCompleted === stats.secondaryTotal && stats.secondaryTotal > 0
        && stats.unitsLost < totalUnits * 0.25) {
      stars = 3;
    }

    // Mission-specific star override
    if (this.mission.starConditions) {
      stars = 1;
      if (this.mission.starConditions.twoStar) {
        if (this._evaluateCondition(this.mission.starConditions.twoStar)) stars = 2;
      }
      if (this.mission.starConditions.threeStar) {
        if (this._evaluateCondition(this.mission.starConditions.threeStar)) stars = 3;
      }
    }

    return stars;
  }

  /**
   * Check if a unit type is restricted in this mission.
   */
  isUnitRestricted(unitType) {
    return this._restrictedUnits.has(unitType);
  }

  /**
   * Check if a building type is restricted.
   */
  isBuildingRestricted(buildingType) {
    return this._restrictedBuildings.has(buildingType);
  }

  /**
   * Clean up when mission ends.
   */
  destroy() {
    this._unregisterListeners();
    this.game._campaignNoProduction = false;
    this.game._campaignNoBuilding = false;
    if (this.game.aiController) {
      this.game.aiController._disabled = false;
    }
    this.state = 'inactive';
    this.mission = null;
    this.objectives = [];
    this.dialogueQueue = [];
    this.currentDialogue = null;
  }
}
