/**
 * ReplayRecorder - Records all game-affecting events during play.
 * Hooks into EventBus to capture commands, production, research, abilities, etc.
 * Stores replay as a compact JSON structure with delta-encoded timestamps.
 */
export class ReplayRecorder {
  constructor(game) {
    this.game = game;
    this.recording = false;
    this.commands = [];
    this.metadata = {};
    this.initialState = {};
    this._listeners = [];
    this._startTime = 0;
  }

  /**
   * Begin recording. Called automatically when a game starts.
   * @param {object} config - The game start config (mode, nations, difficulty, etc.)
   */
  start(config) {
    this.recording = true;
    this.commands = [];
    this._startTime = 0;

    // Capture initial game state / config for deterministic replay
    this.initialState = {
      mode: config.mode,
      playerNation: config.playerNation,
      enemyNation: config.enemyNation,
      difficulty: config.difficulty || 'normal',
      mapTemplate: config.mapTemplate || 'continental',
      mapSeed: config.mapSeed || null,
      gameMode: config.gameMode || 'annihilation'
    };

    this.metadata = {
      date: new Date().toISOString(),
      playerNation: config.playerNation,
      enemyNation: config.enemyNation,
      difficulty: config.difficulty || 'normal',
      gameMode: config.gameMode || 'annihilation',
      mapTemplate: config.mapTemplate || 'continental',
      duration: 0,
      winner: null
    };

    this._hookEvents();
  }

  /**
   * Stop recording and finalize metadata.
   * @param {boolean|null} playerWon - true if player won, false if lost, null if unknown
   */
  stop(playerWon) {
    this.recording = false;
    this.metadata.duration = this.game.gameElapsed;
    this.metadata.winner = playerWon === true ? 'player' : playerWon === false ? 'enemy' : 'unknown';
    this.metadata.stats = {
      player: { ...this.game.stats.player },
      enemy: { ...this.game.stats.enemy }
    };
    this._unhookEvents();
  }

  /** Record a command with the current game elapsed time. */
  _record(type, data) {
    if (!this.recording) return;
    this.commands.push({
      t: Math.round(this.game.gameElapsed * 1000) / 1000, // 3 decimal places (ms precision)
      type,
      data: this._serializeData(type, data)
    });
  }

  /**
   * Serialize event data into a compact, JSON-safe form.
   * Strips non-serializable objects (meshes, references) and keeps only IDs/positions.
   */
  _serializeData(type, data) {
    if (!data) return {};

    const s = {};

    // Serialize unit references as arrays of IDs
    if (data.units) {
      s.unitIds = data.units.filter(u => u && u.id).map(u => u.id);
    }
    if (data.unit) {
      s.unitId = data.unit.id;
    }
    if (data.target) {
      s.targetId = data.target.id;
      if (data.target.getPosition) {
        const p = data.target.getPosition();
        s.targetPos = { x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 };
      }
    }

    // Serialize positions
    if (data.position) {
      s.pos = {
        x: Math.round(data.position.x * 10) / 10,
        z: Math.round(data.position.z * 10) / 10
      };
    }
    if (data.targetPos) {
      s.targetPos = {
        x: Math.round(data.targetPos.x * 10) / 10,
        z: Math.round(data.targetPos.z * 10) / 10
      };
    }

    // Building-related
    if (data.building) {
      s.buildingId = data.building.id;
      s.buildingType = data.building.type;
      s.team = data.building.team;
      // Capture building position for BUILD commands
      if (data.building.getPosition && !s.pos) {
        const bp = data.building.getPosition();
        s.pos = { x: Math.round(bp.x * 10) / 10, z: Math.round(bp.z * 10) / 10 };
      }
    }
    if (data.type) s.buildingType = data.type;

    // Unit type for production
    if (data.unitType) s.unitType = data.unitType;

    // Team
    if (data.team) s.team = data.team;

    // Stance
    if (data.stance) s.stance = data.stance;

    // Formation
    if (data.type && type === 'FORMATION_SET') s.formationType = data.type;

    // Research
    if (data.upgradeId) s.upgradeId = data.upgradeId;

    // Ability
    if (data.ability) {
      s.abilityId = data.ability.id || data.ability.name;
    }
    if (data.abilityIndex !== undefined) s.abilityIndex = data.abilityIndex;

    // Cost
    if (data.cost !== undefined) s.cost = data.cost;

    // Count
    if (data.count !== undefined) s.count = data.count;

    return s;
  }

  /** Hook into EventBus events to record them. */
  _hookEvents() {
    const eb = this.game.eventBus;
    const on = (event, replayType) => {
      const fn = (data) => this._record(replayType, data);
      eb.on(event, fn);
      this._listeners.push({ event, fn });
    };

    // Player and AI commands
    on('command:move', 'MOVE');
    on('command:attack', 'ATTACK');
    on('command:attackmove', 'ATTACK_MOVE');
    on('command:stop', 'STOP');
    on('command:patrol', 'PATROL');
    on('command:waypoint', 'WAYPOINT');
    on('command:garrison', 'GARRISON');
    on('command:retreat', 'RETREAT');
    on('command:stance', 'STANCE');
    on('command:formation', 'FORMATION_SET');

    // Production events
    on('production:started', 'PRODUCE_UNIT');
    on('production:complete', 'PRODUCTION_COMPLETE');
    on('production:cancelled', 'PRODUCTION_CANCEL');
    on('building:placed', 'BUILD');

    // Research
    on('research:started', 'RESEARCH_START');
    on('research:complete', 'RESEARCH_COMPLETE');

    // Abilities
    on('commander:ability', 'ABILITY_USED');

    // Key game state events (for timeline markers)
    on('unit:destroyed', 'UNIT_DESTROYED');
    on('building:destroyed', 'BUILDING_DESTROYED');
    on('unit:created', 'UNIT_CREATED');
    on('combat:kill', 'KILL');
  }

  /** Remove all event hooks. */
  _unhookEvents() {
    const eb = this.game.eventBus;
    for (const { event, fn } of this._listeners) {
      eb.off(event, fn);
    }
    this._listeners = [];
  }

  /** Get the full replay data object. */
  getReplay() {
    return {
      version: 1,
      metadata: { ...this.metadata },
      initialState: { ...this.initialState },
      commands: this.commands.slice()
    };
  }

  /** Save replay to localStorage with a given name. */
  saveReplay(name) {
    const replay = this.getReplay();
    replay.metadata.name = name || `Replay ${new Date().toLocaleString()}`;

    try {
      const saved = JSON.parse(localStorage.getItem('warzone_replays') || '[]');
      // Add a unique ID
      replay.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      saved.push(replay);
      // Keep max 20 replays
      if (saved.length > 20) saved.splice(0, saved.length - 20);
      localStorage.setItem('warzone_replays', JSON.stringify(saved));
      return replay.id;
    } catch (e) {
      console.warn('Failed to save replay:', e);
      return null;
    }
  }

  /** Export replay as a downloadable .wzreplay file. */
  exportReplay(name) {
    const replay = this.getReplay();
    replay.metadata.name = name || `Replay ${new Date().toLocaleString()}`;

    const json = JSON.stringify(replay);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (name || 'warzone-replay').replace(/[^a-z0-9_-]/gi, '_');
    a.download = `${safeName}.wzreplay`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Dispose and clean up. */
  dispose() {
    this._unhookEvents();
    this.commands = [];
    this.recording = false;
  }
}
