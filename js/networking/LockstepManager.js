/**
 * LockstepManager - Deterministic lockstep synchronization for multiplayer RTS
 *
 * Replaces direct command execution with turn-based command buffering.
 * Each game tick is a "turn" (100ms). Local commands are queued and sent
 * to the server. The game only advances when both players' commands for
 * that turn have been received from the server.
 *
 * Integration:
 *   - Intercepts commands from CommandSystem
 *   - Buffers them per turn
 *   - Sends to server via NetworkManager
 *   - Receives confirmed turns and executes commands
 *   - Controls game loop advancement
 */

import { StateHash } from '../core/StateHash.js';

// Command types that can be serialized and sent over the network
export const CommandType = {
  MOVE: 'MOVE',
  ATTACK: 'ATTACK',
  ATTACK_MOVE: 'ATTACK_MOVE',
  STOP: 'STOP',
  HOLD: 'HOLD',
  BUILD: 'BUILD',
  PRODUCE: 'PRODUCE',
  CANCEL_PRODUCE: 'CANCEL_PRODUCE',
  ABILITY: 'ABILITY',
  RESEARCH: 'RESEARCH',
  CANCEL_RESEARCH: 'CANCEL_RESEARCH',
  SET_RALLY: 'SET_RALLY',
  PATROL: 'PATROL',
  GARRISON: 'GARRISON',
  UNLOAD: 'UNLOAD',
  RETREAT: 'RETREAT',
  STANCE: 'STANCE',
  FORMATION: 'FORMATION',
  WAYPOINT: 'WAYPOINT',
  DELETE: 'DELETE',
};

export class LockstepManager {
  /**
   * @param {Object} game - The Game instance
   * @param {import('./NetworkManager.js').NetworkManager} networkManager
   */
  constructor(game, networkManager) {
    this.game = game;
    this.network = networkManager;

    // Turn state
    this.currentTurn = 0;                // Turn we are trying to execute
    this.localCommandBuffer = [];        // Commands queued for the current unsent turn
    this.pendingSendTurn = 0;            // Next turn to send commands for
    this.confirmedTurns = new Map();     // turn -> { 0: [...], 1: [...] }
    this.localSlot = -1;                 // Our player slot (0 or 1)

    // Timing
    this.turnInterval = 100;             // ms per turn
    this.accumulator = 0;                // Time accumulator for turn advancement
    this.gameDelta = this.turnInterval / 1000; // Fixed delta per turn in seconds

    // State flags
    this.enabled = false;
    this.waiting = false;                // True when waiting for opponent's commands
    this.waitingSince = 0;

    // Statistics
    this.turnsExecuted = 0;
    this.turnsWaited = 0;
    this.maxWaitTime = 0;

    // State hash for desync detection
    this._hashInterval = 30;          // Compute hash every N turns (~3s at 100ms/turn)
    this._lastLocalHash = null;       // Our last computed hash
    this._remoteHashes = new Map();   // turn -> hash from opponent

    // UI elements
    this._waitingOverlay = null;

    // Bind network callback
    this._onTurnReceived = this._onTurnReceived.bind(this);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Enable lockstep mode. Called when a multiplayer game starts.
   * @param {number} slot - Our player slot (0 or 1)
   */
  enable(slot) {
    this.localSlot = slot;
    this.currentTurn = 0;
    this.pendingSendTurn = 0;
    this.localCommandBuffer = [];
    this.confirmedTurns.clear();
    this.accumulator = 0;
    this.waiting = false;
    this.turnsExecuted = 0;
    this.turnsWaited = 0;
    this.enabled = true;

    // Register for turn confirmations from the server
    this.network.onTurnReceived(this._onTurnReceived);

    this._createWaitingOverlay();
  }

  /**
   * Disable lockstep mode. Returns to normal single-player game loop.
   */
  disable() {
    this.enabled = false;
    this.network.onTurnReceived(null);
    this._removeWaitingOverlay();
  }

  // -------------------------------------------------------------------------
  // Command queueing (replaces direct execution in multiplayer)
  // -------------------------------------------------------------------------

  /**
   * Queue a command to be sent on the next turn.
   * In multiplayer, commands are not executed immediately - they are
   * buffered and sent to the server, then executed when confirmed.
   *
   * @param {Object} command - Serialized command object
   * @param {string} command.type - One of CommandType values
   * @param {Array<number>} [command.entityIds] - Entity IDs involved
   * @param {Object} [command.target] - Target position {x, y, z} or entity ID
   * @param {*} [command.data] - Additional command-specific data
   */
  queueCommand(command) {
    if (!this.enabled) return;

    // Validate command structure
    if (!command || !command.type || !CommandType[command.type]) {
      console.warn('LockstepManager: invalid command type', command?.type);
      return;
    }

    this.localCommandBuffer.push(command);
  }

  // -------------------------------------------------------------------------
  // Serialization helpers
  // -------------------------------------------------------------------------

  /**
   * Create a MOVE command from game entities and target position.
   */
  static moveCommand(entityIds, position) {
    return {
      type: CommandType.MOVE,
      entityIds,
      target: { x: position.x, y: position.y || 0, z: position.z },
    };
  }

  /**
   * Create an ATTACK command.
   */
  static attackCommand(entityIds, targetEntityId) {
    return {
      type: CommandType.ATTACK,
      entityIds,
      data: { targetId: targetEntityId },
    };
  }

  /**
   * Create an ATTACK_MOVE command.
   */
  static attackMoveCommand(entityIds, position) {
    return {
      type: CommandType.ATTACK_MOVE,
      entityIds,
      target: { x: position.x, y: position.y || 0, z: position.z },
    };
  }

  /**
   * Create a STOP command.
   */
  static stopCommand(entityIds) {
    return {
      type: CommandType.STOP,
      entityIds,
    };
  }

  /**
   * Create a BUILD command (place a building).
   */
  static buildCommand(buildingType, position) {
    return {
      type: CommandType.BUILD,
      data: {
        buildingType,
        position: { x: position.x, y: position.y || 0, z: position.z },
      },
    };
  }

  /**
   * Create a PRODUCE command (queue unit at building).
   */
  static produceCommand(buildingId, unitType) {
    return {
      type: CommandType.PRODUCE,
      entityIds: [buildingId],
      data: { unitType },
    };
  }

  /**
   * Create an ABILITY command.
   */
  static abilityCommand(entityIds, abilityIndex, targetPosition) {
    return {
      type: CommandType.ABILITY,
      entityIds,
      data: { abilityIndex },
      target: targetPosition ? { x: targetPosition.x, y: targetPosition.y || 0, z: targetPosition.z } : null,
    };
  }

  /**
   * Create a RESEARCH command.
   */
  static researchCommand(buildingId, researchId) {
    return {
      type: CommandType.RESEARCH,
      entityIds: [buildingId],
      data: { researchId },
    };
  }

  /**
   * Create a PATROL command.
   */
  static patrolCommand(entityIds, position) {
    return {
      type: CommandType.PATROL,
      entityIds,
      target: { x: position.x, y: position.y || 0, z: position.z },
    };
  }

  /**
   * Create a GARRISON command.
   */
  static garrisonCommand(entityIds, targetEntityId) {
    return {
      type: CommandType.GARRISON,
      entityIds,
      data: { targetId: targetEntityId },
    };
  }

  /**
   * Create a RETREAT command.
   */
  static retreatCommand(entityIds) {
    return {
      type: CommandType.RETREAT,
      entityIds,
    };
  }

  /**
   * Create a STANCE command.
   */
  static stanceCommand(entityIds, stance) {
    return {
      type: CommandType.STANCE,
      entityIds,
      data: { stance },
    };
  }

  /**
   * Create a SET_RALLY command.
   */
  static setRallyCommand(buildingId, position) {
    return {
      type: CommandType.SET_RALLY,
      entityIds: [buildingId],
      target: { x: position.x, y: position.y || 0, z: position.z },
    };
  }

  // -------------------------------------------------------------------------
  // Turn update (replaces Game.update in multiplayer mode)
  // -------------------------------------------------------------------------

  /**
   * Called each frame from the game loop. Manages turn advancement.
   * @param {number} realDelta - Real elapsed time in seconds
   */
  update(realDelta) {
    if (!this.enabled) return;

    this.accumulator += realDelta * 1000;

    // Process as many turns as the accumulator allows
    while (this.accumulator >= this.turnInterval) {
      // Send our commands for the current pending turn
      if (this.pendingSendTurn <= this.currentTurn) {
        // Include state hash periodically for desync detection
        let hash = null;
        if (this.pendingSendTurn > 0 && this.pendingSendTurn % this._hashInterval === 0) {
          const hashResult = StateHash.compute(this.game);
          hash = hashResult.hash;
          this._lastLocalHash = { turn: this.pendingSendTurn, hash };
        }
        this.network.sendCommands(this.pendingSendTurn, this.localCommandBuffer, hash);
        this.localCommandBuffer = [];
        this.pendingSendTurn++;
      }

      // Check if we have the confirmed turn
      if (this.confirmedTurns.has(this.currentTurn)) {
        const turnData = this.confirmedTurns.get(this.currentTurn);
        this._executeTurn(turnData);
        this.confirmedTurns.delete(this.currentTurn);
        this.currentTurn++;
        this.turnsExecuted++;
        this.accumulator -= this.turnInterval;

        if (this.waiting) {
          this.waiting = false;
          this._hideWaiting();
        }
      } else {
        // We don't have the turn data yet - wait
        if (!this.waiting) {
          this.waiting = true;
          this.waitingSince = performance.now();
          this.turnsWaited++;
        }
        // Don't consume accumulator - we'll try again next frame
        // Cap accumulator to prevent spiral of death
        this.accumulator = Math.min(this.accumulator, this.turnInterval * 3);

        const waitTime = performance.now() - this.waitingSince;
        if (waitTime > 500) {
          this._showWaiting(waitTime);
        }
        if (waitTime > this.maxWaitTime) {
          this.maxWaitTime = waitTime;
        }
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Turn execution
  // -------------------------------------------------------------------------

  /**
   * Execute all commands for a confirmed turn.
   * @param {Object} turnData - { 0: [...commands], 1: [...commands] }
   */
  _executeTurn(turnData) {
    // Flag to prevent re-queuing commands that are being executed from lockstep
    this.game._executingLockstepTurn = true;

    // Execute commands for both players
    for (let slot = 0; slot < 2; slot++) {
      const commands = turnData[slot] || [];
      const team = slot === 0 ? 'player' : 'enemy';

      for (const cmd of commands) {
        this._executeCommand(cmd, team);
      }

      // Extract hash from opponent's commands for desync detection
      if (slot !== this.localSlot && turnData._hashes && turnData._hashes[slot] != null) {
        this._remoteHashes.set(this.currentTurn, turnData._hashes[slot]);
      }
    }

    // Clear the flag before updating game state
    this.game._executingLockstepTurn = false;

    // Advance the game simulation by one fixed tick
    this.game.update(this.gameDelta);

    // Check for desync on hash interval turns
    if (this.currentTurn > 0 && this.currentTurn % this._hashInterval === 0) {
      const localHash = StateHash.compute(this.game);
      const remoteHash = this._remoteHashes.get(this.currentTurn);
      if (remoteHash != null && localHash.hash !== remoteHash) {
        console.warn(
          `[DESYNC] Turn ${this.currentTurn}: local hash ${localHash.hash} != remote hash ${remoteHash}` +
          ` (entities: ${localHash.entityCount})`
        );
        this.game.eventBus.emit('multiplayer:desync', {
          turn: this.currentTurn,
          localHash: localHash.hash,
          remoteHash,
        });
      }
      // Clean up old hashes
      this._remoteHashes.delete(this.currentTurn);
    }
  }

  /**
   * Execute a single command from the confirmed turn.
   * Maps serialized commands back to game actions.
   *
   * @param {Object} cmd - Command object
   * @param {string} team - 'player' or 'enemy'
   */
  _executeCommand(cmd, team) {
    const game = this.game;

    // Resolve entity IDs to actual entities
    const entities = (cmd.entityIds || [])
      .map(id => game.entities.find(e => e.id === id))
      .filter(e => e && e.alive && e.team === team);

    const units = entities.filter(e => e.isUnit);
    const buildings = entities.filter(e => e.isBuilding);

    switch (cmd.type) {
      case CommandType.MOVE:
        if (units.length > 0 && cmd.target) {
          game.commandSystem.moveUnits(units, cmd.target);
        }
        break;

      case CommandType.ATTACK:
        if (units.length > 0 && cmd.data?.targetId) {
          const target = game.entities.find(e => e.id === cmd.data.targetId);
          if (target && target.alive) {
            game.commandSystem.attackTarget(units, target);
          }
        }
        break;

      case CommandType.ATTACK_MOVE:
        if (units.length > 0 && cmd.target) {
          game.commandSystem.attackMoveUnits(units, cmd.target);
        }
        break;

      case CommandType.STOP:
        for (const unit of units) {
          unit.stop();
        }
        break;

      case CommandType.HOLD:
        for (const unit of units) {
          unit.moveTarget = null;
          unit.waypoints = [];
          unit.isMoving = false;
        }
        break;

      case CommandType.BUILD:
        if (cmd.data?.buildingType && cmd.data?.position) {
          // Route through production system for validation + resource deduction
          const pos = cmd.data.position;
          const buildPos = {
            x: pos.x, y: pos.y || 0, z: pos.z,
            clone: function() { return { x: this.x, y: this.y, z: this.z }; },
            distanceTo: function(other) {
              const dx = this.x - (other.x ?? other.position?.x ?? 0);
              const dz = this.z - (other.z ?? other.position?.z ?? 0);
              return Math.sqrt(dx * dx + dz * dz);
            },
          };
          if (game.productionSystem) {
            game.productionSystem.requestBuilding(cmd.data.buildingType, team, buildPos);
          } else {
            game.createBuilding(cmd.data.buildingType, team, buildPos);
          }
        }
        break;

      case CommandType.PRODUCE:
        if (buildings.length > 0 && cmd.data?.unitType) {
          // Route through requestProduction for full validation + resource deduction
          game.productionSystem.requestProduction(buildings[0], cmd.data.unitType);
        }
        break;

      case CommandType.CANCEL_PRODUCE:
        if (buildings.length > 0) {
          game.productionSystem.cancelProduction(buildings[0]);
        }
        break;

      case CommandType.ABILITY:
        if (units.length > 0) {
          const abilityIndex = cmd.data?.abilityIndex;
          if (abilityIndex !== undefined) {
            // Commander abilities
            if (units[0].commanderAbilities && units[0].isAbilityReady) {
              units[0].useAbility(abilityIndex, cmd.target);
            } else if (units[0].canUseAbility && units[0].canUseAbility()) {
              game.combatSystem.executeAbility(units[0], cmd.target);
            }
          } else {
            // Generic ability
            for (const unit of units) {
              if (unit.canUseAbility && unit.canUseAbility()) {
                game.combatSystem.executeAbility(unit, cmd.target);
              }
            }
          }
        }
        break;

      case CommandType.RESEARCH:
        if (buildings.length > 0 && cmd.data?.researchId) {
          game.eventBus.emit('research:start', {
            team,
            researchId: cmd.data.researchId,
            building: buildings[0],
          });
        }
        break;

      case CommandType.CANCEL_RESEARCH:
        if (buildings.length > 0) {
          game.eventBus.emit('research:cancel', { team });
        }
        break;

      case CommandType.SET_RALLY:
        if (buildings.length > 0 && cmd.target) {
          for (const building of buildings) {
            building.setRallyPoint(cmd.target);
          }
        }
        break;

      case CommandType.PATROL:
        if (units.length > 0 && cmd.target) {
          for (const unit of units) {
            const currentPos = unit.getPosition();
            unit.startPatrol([currentPos, cmd.target]);
          }
        }
        break;

      case CommandType.GARRISON:
        if (units.length > 0 && cmd.data?.targetId) {
          const target = game.entities.find(e => e.id === cmd.data.targetId);
          if (target) {
            const infantry = units.filter(u => u.type === 'infantry');
            for (const unit of infantry) {
              if (target.garrisonUnit) target.garrisonUnit(unit);
              else if (target.garrison) target.garrison(unit);
            }
          }
        }
        break;

      case CommandType.UNLOAD:
        for (const unit of units) {
          if (unit.ejectAll) unit.ejectAll();
        }
        break;

      case CommandType.RETREAT:
        for (const unit of units) {
          const friendlyBuildings = game.getBuildings(team);
          if (friendlyBuildings.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const b of friendlyBuildings) {
              const d = unit.distanceTo(b);
              if (d < nearestDist) {
                nearestDist = d;
                nearest = b;
              }
            }
            if (nearest) {
              unit.startRetreat(nearest.getPosition());
            }
          }
        }
        break;

      case CommandType.STANCE:
        if (units.length > 0 && cmd.data?.stance) {
          for (const unit of units) {
            unit.stance = cmd.data.stance;
          }
        }
        break;

      case CommandType.FORMATION:
        if (cmd.data?.formationType) {
          game.commandSystem.formationType = cmd.data.formationType;
        }
        break;

      case CommandType.WAYPOINT:
        if (units.length > 0 && cmd.target) {
          game.commandSystem.queueWaypoint(units, cmd.target);
        }
        break;

      case CommandType.DELETE:
        for (const entity of entities) {
          entity.alive = false;
        }
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Network callback
  // -------------------------------------------------------------------------

  _onTurnReceived(turnNumber, commands) {
    this.confirmedTurns.set(turnNumber, commands);

    // If the server relays hashes alongside commands, extract them
    // The server may attach hashes to the turn data as _hashes: { 0: hash, 1: hash }
    if (commands && commands._hashes) {
      const opponentSlot = this.localSlot === 0 ? 1 : 0;
      if (commands._hashes[opponentSlot] != null) {
        this._remoteHashes.set(turnNumber, commands._hashes[opponentSlot]);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Waiting indicator UI
  // -------------------------------------------------------------------------

  _createWaitingOverlay() {
    if (this._waitingOverlay) return;
    const el = document.createElement('div');
    el.id = 'lockstep-waiting';
    el.className = 'hidden';
    el.innerHTML = `
      <div style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8); color: #ffcc00; padding: 20px 40px;
        border: 2px solid #ffcc00; border-radius: 8px; font-family: monospace;
        font-size: 16px; z-index: 10000; text-align: center;
      ">
        <div style="margin-bottom: 8px;">Waiting for opponent...</div>
        <div id="lockstep-wait-time" style="font-size: 12px; color: #aaa;"></div>
      </div>
    `;
    document.body.appendChild(el);
    this._waitingOverlay = el;
  }

  _removeWaitingOverlay() {
    if (this._waitingOverlay) {
      this._waitingOverlay.remove();
      this._waitingOverlay = null;
    }
  }

  _showWaiting(waitTimeMs) {
    if (!this._waitingOverlay) return;
    this._waitingOverlay.classList.remove('hidden');
    const timeEl = this._waitingOverlay.querySelector('#lockstep-wait-time');
    if (timeEl) {
      timeEl.textContent = `${(waitTimeMs / 1000).toFixed(1)}s`;
    }
  }

  _hideWaiting() {
    if (this._waitingOverlay) {
      this._waitingOverlay.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------------------
  // Debug / stats
  // -------------------------------------------------------------------------

  getStats() {
    return {
      currentTurn: this.currentTurn,
      pendingSendTurn: this.pendingSendTurn,
      confirmedTurnsBuffered: this.confirmedTurns.size,
      turnsExecuted: this.turnsExecuted,
      turnsWaited: this.turnsWaited,
      maxWaitTime: Math.round(this.maxWaitTime),
      latency: this.network.latency,
      waiting: this.waiting,
    };
  }
}
