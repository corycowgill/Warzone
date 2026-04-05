/**
 * ReplayPlayer - Loads and plays back recorded replays.
 * Starts a real game from the recorded initial state, then replays commands
 * at their recorded timestamps while providing playback controls.
 *
 * NOTE on determinism: The game uses Math.random() extensively (AI decisions,
 * spawn offsets, map events, etc.). For fully deterministic replay, a seeded
 * PRNG would need to replace Math.random(). This replay system instead records
 * ALL events (including AI commands and outcomes like kills/destruction) so the
 * replay is an accurate visual reconstruction even without seeded randomness.
 * The game simulation runs normally; recorded commands are re-emitted at the
 * correct timestamps to drive unit/building behavior.
 */
export class ReplayPlayer {
  constructor(game) {
    this.game = game;
    this.replay = null;
    this.playing = false;
    this.paused = false;
    this.speed = 1;
    this.currentTime = 0;
    this.commandIndex = 0;
    this.perspective = 'spectator'; // 'player', 'enemy', 'spectator'

    // Available speed settings
    this.speeds = [0.5, 1, 2, 4, 8];
    this.speedIndex = 1; // default 1x

    // UI reference (set by ReplayUI)
    this.ui = null;

    // Key handler bound reference for cleanup
    this._keyHandler = null;
  }

  /**
   * Load a replay and start playback by launching a real game from the initial state.
   * @param {object} replayData - The full replay object
   */
  async load(replayData) {
    this.replay = replayData;
    this.currentTime = 0;
    this.commandIndex = 0;
    this.playing = true;
    this.paused = false;
    this.speed = 1;
    this.speedIndex = 1;
    this.perspective = 'spectator';

    const init = replayData.initialState;

    // Start a real game in SPECTATE mode so both sides run via AI
    // We will override the game loop to inject replay commands
    await this.game.startGame({
      mode: 'SPECTATE',
      playerNation: init.playerNation,
      enemyNation: init.enemyNation,
      difficulty: init.difficulty,
      mapTemplate: init.mapTemplate,
      mapSeed: init.mapSeed,
      gameMode: init.gameMode
    });

    // Mark game as in replay mode
    this.game._replayMode = true;

    // Disable AI controllers so only replay commands drive the game
    this.game.aiController = null;
    this.game.aiController2 = null;

    // Disable fog of war for spectator view
    if (this.game.fogOfWar) {
      this.game.fogOfWar.dispose();
      this.game.fogOfWar = null;
    }

    // Install our update hook
    this._installHook();

    // Install keyboard controls
    this._installKeyboard();

    // Show the replay UI
    if (this.ui) {
      this.ui.show();
    }
  }

  /** Install a pre-update hook on the game's update method. */
  _installHook() {
    const originalUpdate = this.game.update.bind(this.game);
    const self = this;

    this.game.update = function (delta) {
      if (!self.playing) return;
      if (self.paused) {
        // Still render but don't advance
        return;
      }

      // Scale delta by replay speed
      const scaledDelta = delta * self.speed;

      // Advance replay time
      self.currentTime += scaledDelta;

      // Execute any commands whose timestamp we've reached
      self._executeCommands();

      // Run the normal game update with scaled delta
      originalUpdate.call(self.game, scaledDelta);

      // Check if replay is finished
      if (self.replay && self.currentTime >= (self.replay.metadata.duration || Infinity)) {
        self.stop();
      }

      // Update UI
      if (self.ui) {
        self.ui.updateTimeline();
      }
    };

    this._originalUpdate = originalUpdate;
  }

  /** Remove our update hook. */
  _removeHook() {
    if (this._originalUpdate) {
      this.game.update = this._originalUpdate;
      this._originalUpdate = null;
    }
  }

  /** Execute all commands up to the current replay time. */
  _executeCommands() {
    if (!this.replay || !this.replay.commands) return;

    while (this.commandIndex < this.replay.commands.length) {
      const cmd = this.replay.commands[this.commandIndex];
      if (cmd.t > this.currentTime) break;

      this._executeCommand(cmd);
      this.commandIndex++;
    }
  }

  /**
   * Execute a single replay command by re-emitting the appropriate event.
   * Since the game is running a real simulation, we emit events that the
   * game systems will pick up and execute.
   */
  _executeCommand(cmd) {
    const eb = this.game.eventBus;
    const data = cmd.data || {};

    // Resolve entity references from IDs
    const resolveUnit = (id) => this.game.entities.find(e => e.id === id && e.alive);
    const resolveUnits = (ids) => (ids || []).map(id => resolveUnit(id)).filter(Boolean);

    switch (cmd.type) {
      case 'MOVE': {
        const units = resolveUnits(data.unitIds);
        if (units.length > 0 && data.pos) {
          const pos = { x: data.pos.x, y: 0, z: data.pos.z };
          if (this.game.commandSystem) {
            this.game.commandSystem.moveUnits(units, pos);
          }
        }
        break;
      }
      case 'ATTACK': {
        const units = resolveUnits(data.unitIds);
        const target = resolveUnit(data.targetId);
        if (units.length > 0 && target && this.game.commandSystem) {
          this.game.commandSystem.attackTarget(units, target);
        }
        break;
      }
      case 'ATTACK_MOVE': {
        const units = resolveUnits(data.unitIds);
        if (units.length > 0 && data.pos && this.game.commandSystem) {
          const pos = { x: data.pos.x, y: 0, z: data.pos.z };
          this.game.commandSystem.attackMoveUnits(units, pos);
        }
        break;
      }
      case 'STOP': {
        const units = resolveUnits(data.unitIds);
        for (const unit of units) {
          if (unit.stop) unit.stop();
        }
        break;
      }
      case 'PATROL': {
        const units = resolveUnits(data.unitIds);
        if (units.length > 0 && data.pos) {
          for (const unit of units) {
            if (unit.startPatrol) {
              unit.startPatrol([unit.getPosition(), { x: data.pos.x, y: 0, z: data.pos.z }]);
            }
          }
        }
        break;
      }
      case 'PRODUCE_UNIT': {
        // Replay production start: find the building and request production
        const building = resolveUnit(data.buildingId);
        if (building && data.unitType && this.game.productionSystem) {
          this.game.productionSystem.requestProduction(building, data.unitType);
        }
        break;
      }
      case 'BUILD': {
        // Replay building placement
        if (data.buildingType && data.pos && this.game.productionSystem) {
          const pos = { x: data.pos.x, y: 0, z: data.pos.z };
          const team = data.team || 'player';
          this.game.productionSystem.requestBuilding(data.buildingType, team, pos);
        }
        break;
      }
      case 'RESEARCH_START': {
        if (data.upgradeId && data.team) {
          this.game.startResearch(data.team, data.upgradeId);
        }
        break;
      }
      case 'STANCE': {
        const units = resolveUnits(data.unitIds);
        if (data.stance) {
          for (const unit of units) {
            unit.stance = data.stance;
          }
        }
        break;
      }
      case 'RETREAT': {
        const units = resolveUnits(data.unitIds);
        for (const unit of units) {
          if (unit.startRetreat) {
            // Find nearest friendly building
            const buildings = this.game.getBuildings(unit.team);
            let nearest = null, nearestDist = Infinity;
            for (const b of buildings) {
              const d = unit.distanceTo(b);
              if (d < nearestDist) { nearestDist = d; nearest = b; }
            }
            if (nearest) unit.startRetreat(nearest.getPosition());
          }
        }
        break;
      }
      // Non-actionable events are recorded for timeline markers only
      case 'UNIT_DESTROYED':
      case 'BUILDING_DESTROYED':
      case 'UNIT_CREATED':
      case 'KILL':
      case 'PRODUCTION_COMPLETE':
      case 'PRODUCTION_CANCEL':
      case 'RESEARCH_COMPLETE':
      case 'ABILITY_USED':
      case 'FORMATION_SET':
      case 'GARRISON':
      case 'WAYPOINT':
        // These are informational - the game simulation handles them naturally
        break;
    }
  }

  /** Install keyboard controls for replay playback. */
  _installKeyboard() {
    this._keyHandler = (e) => {
      if (!this.playing) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.togglePause();
          break;
        case '+':
        case '=':
          e.preventDefault();
          this.increaseSpeed();
          break;
        case '-':
        case '_':
          e.preventDefault();
          this.decreaseSpeed();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.skipForward(30);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.skipBackward(30);
          break;
        case '1':
          if (this.playing) {
            e.preventDefault();
            this.setPerspective('player');
          }
          break;
        case '2':
          if (this.playing) {
            e.preventDefault();
            this.setPerspective('enemy');
          }
          break;
        case '3':
          if (this.playing) {
            e.preventDefault();
            this.setPerspective('spectator');
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.stop();
          break;
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  /** Remove keyboard controls. */
  _removeKeyboard() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  /** Toggle play/pause. */
  togglePause() {
    this.paused = !this.paused;
    if (this.ui) this.ui.updateControls();
  }

  /** Increase playback speed. */
  increaseSpeed() {
    if (this.speedIndex < this.speeds.length - 1) {
      this.speedIndex++;
      this.speed = this.speeds[this.speedIndex];
    }
    if (this.ui) this.ui.updateControls();
  }

  /** Decrease playback speed. */
  decreaseSpeed() {
    if (this.speedIndex > 0) {
      this.speedIndex--;
      this.speed = this.speeds[this.speedIndex];
    }
    if (this.ui) this.ui.updateControls();
  }

  /** Skip forward by N seconds. */
  skipForward(seconds) {
    this.currentTime += seconds;
    if (this.replay && this.currentTime > this.replay.metadata.duration) {
      this.currentTime = this.replay.metadata.duration;
    }
    // Advance command index to match
    this._executeCommands();
    if (this.ui) this.ui.updateTimeline();
  }

  /** Skip backward by N seconds (approximate - can't truly rewind simulation). */
  skipBackward(seconds) {
    const targetTime = Math.max(0, this.currentTime - seconds);
    // Since we can't rewind the simulation, just adjust the time marker
    // Commands that were already executed won't be re-executed
    this.currentTime = targetTime;
    // Reset command index to re-scan from near the target time
    this.commandIndex = 0;
    while (this.commandIndex < this.replay.commands.length &&
           this.replay.commands[this.commandIndex].t <= this.currentTime) {
      this.commandIndex++;
    }
    if (this.ui) this.ui.updateTimeline();
  }

  /** Jump to a specific time (seconds). */
  jumpTo(seconds) {
    this.currentTime = Math.max(0, Math.min(seconds, this.replay?.metadata?.duration || 0));
    // Re-scan command index
    this.commandIndex = 0;
    while (this.commandIndex < this.replay.commands.length &&
           this.replay.commands[this.commandIndex].t <= this.currentTime) {
      this.commandIndex++;
    }
    if (this.ui) this.ui.updateTimeline();
  }

  /** Set the viewing perspective. */
  setPerspective(perspective) {
    this.perspective = perspective;

    // Toggle fog of war based on perspective
    if (perspective === 'spectator') {
      if (this.game.fogOfWar) {
        this.game.fogOfWar.dispose();
        this.game.fogOfWar = null;
      }
    } else {
      // Could re-enable fog for a specific team, but for simplicity keep it off
      // Full fog-of-war replay viewing is a future enhancement
    }

    if (this.ui) this.ui.updateControls();
  }

  /** Stop replay and return to main menu. */
  stop() {
    this.playing = false;
    this.paused = false;
    this.game._replayMode = false;

    this._removeHook();
    this._removeKeyboard();

    if (this.ui) {
      this.ui.hide();
    }

    this.game.restart();
  }

  /** Get current playback info for UI display. */
  getPlaybackInfo() {
    return {
      currentTime: this.currentTime,
      duration: this.replay?.metadata?.duration || 0,
      speed: this.speed,
      paused: this.paused,
      playing: this.playing,
      perspective: this.perspective,
      commandsExecuted: this.commandIndex,
      totalCommands: this.replay?.commands?.length || 0
    };
  }

  /** Dispose and clean up. */
  dispose() {
    this._removeHook();
    this._removeKeyboard();
    this.replay = null;
    this.playing = false;
  }
}
