import * as THREE from 'three';
import { AIController } from './AIController.js';
import { GAME_CONFIG, AI_DIFFICULTY } from '../core/Constants.js';

/**
 * AIWorkerBridge — sits between Game and AIController.
 *
 * Offloads strategic and tactical AI decisions to a Web Worker while
 * keeping latency-sensitive micro decisions on the main thread.
 *
 * If the worker fails to load, falls back to fully synchronous AIController.
 */
export class AIWorkerBridge {
  constructor(game, team = 'enemy', difficulty = 'normal') {
    this.game = game;
    this.team = team;
    this.difficulty = difficulty;

    // Create the real AIController (always needed for micro + fallback)
    this.ai = new AIController(game, team, difficulty);

    // Worker state
    this._worker = null;
    this._workerReady = false;
    this._pendingDecision = false;
    this._workerRngState = 0;

    // Timers for deciding when to send work to the worker
    this._strategicTimer = 0;
    this._tacticalTimer = 0;
    const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
    this._strategicInterval = config.strategicInterval || 10;
    this._tacticalInterval = config.tacticalInterval || 5;

    // Try to start the worker
    this._initWorker();
  }

  _initWorker() {
    try {
      this._worker = new Worker('js/workers/AIWorker.js');
      this._worker.onmessage = (e) => this._onWorkerMessage(e);
      this._worker.onerror = (err) => {
        console.warn('[AIWorkerBridge] Worker error, falling back to sync AI:', err.message);
        this._workerReady = false;
        this._worker = null;
        // Disable worker-managed mode so AIController runs everything
        this.ai.setWorkerManaged(false);
      };
      this._workerReady = true;
      // Tell AIController to skip strategic/tactical (worker handles those)
      this.ai.setWorkerManaged(true);
    } catch (err) {
      console.warn('[AIWorkerBridge] Failed to create worker, using sync fallback:', err.message);
      this._worker = null;
      this._workerReady = false;
    }
  }

  _onWorkerMessage(e) {
    const msg = e.data;
    if (msg.type === 'aiCommands') {
      this._pendingDecision = false;
      // Update RNG state for next round
      this._workerRngState = msg.rngState || 0;
      // Execute commands on main thread
      this._executeCommands(msg.commands);
    }
  }

  /**
   * Snapshot the game state into a plain transferable object for the worker.
   */
  _snapshotState() {
    const game = this.game;
    const team = this.team;
    const enemyTeam = team === 'enemy' ? 'player' : 'enemy';

    const myUnits = game.getUnits(team).map(u => {
      const pos = u.getPosition();
      return {
        id: u.id, type: u.type, health: u.health, maxHealth: u.maxHealth,
        domain: u.domain, x: pos.x, z: pos.z,
        inCombat: !!(u.attackTarget && u.attackTarget.alive),
        isMoving: !!u.moveTarget
      };
    });

    const myBuildings = game.getBuildings(team).map(b => {
      const pos = b.getPosition();
      return {
        id: b.id, type: b.type, health: b.health, maxHealth: b.maxHealth,
        x: pos.x, z: pos.z,
        produces: b.produces || [],
        canProduce: typeof b.canProduce === 'function',
        canUpgrade: !!(b.canUpgrade && b.canUpgrade()),
        hasProduction: !!(b.currentProduction || (b.productionQueue && b.productionQueue.length > 1)),
        isCharged: !!(b.isCharged),
        sabotaged: !!(b.sabotaged)
      };
    });

    const enemyUnits = game.getUnits(enemyTeam).map(u => {
      const pos = u.getPosition();
      return {
        id: u.id, type: u.type, health: u.health, domain: u.domain,
        x: pos.x, z: pos.z,
        inCombat: !!(u.attackTarget && u.attackTarget.alive),
        isMoving: !!u.moveTarget
      };
    });

    const enemyBuildings = game.getBuildings(enemyTeam).filter(b => b.alive).map(b => {
      const pos = b.getPosition();
      return {
        id: b.id, type: b.type, health: b.health, x: pos.x, z: pos.z
      };
    });

    const researchState = game.research?.[team] || { completed: [], inProgress: null, branches: {} };

    const nationKey = game.teams[team]?.nation;
    const personality = nationKey ? {
      preferredStrategy: null,
      unitBias: null,
      aggressionMultiplier: 1.0,
      earlyHarass: false,
      gracePeriodReduction: 0,
      // Copy from the ai controller's personality if available
      ...(this.ai.personality || {})
    } : null;

    const hasResourceNodes = !!(game.resourceNodes && game.resourceNodes.length > 0);

    return {
      sp: game.teams[team].sp,
      mu: game.teams[team].mu || 0,
      nation: nationKey || '',
      myUnits,
      myBuildings,
      enemyUnits,
      enemyBuildings,
      research: {
        completed: researchState.completed || [],
        inProgress: researchState.inProgress || null,
        branches: researchState.branches || {}
      },
      gameTime: this.ai.gameTime,
      difficulty: this.difficulty,
      strategy: this.ai.strategy,
      gracePeriod: this.ai.gracePeriod,
      attackWaveCount: this.ai.attackWaveCount,
      lastAttackTime: this.ai.lastAttackTime,
      attackCooldown: this.ai.attackCooldown,
      hasWater: this.ai.hasSignificantWater(),
      maxUnitsPerTeam: GAME_CONFIG.maxUnitsPerTeam,
      buildOrderIndex: this.ai.buildOrderIndex,
      chosenBuildOrder: this.ai.chosenBuildOrder,
      personality,
      config: {
        attackThresholdMultiplier: this.ai.config.attackThresholdMultiplier,
        multiPronged: this.ai.config.multiPronged,
        targetPriority: this.ai.config.targetPriority,
        countersPlayer: this.ai.config.countersPlayer,
        scouting: this.ai.config.scouting
      },
      resourceNodes: hasResourceNodes ? game.resourceNodes.map(n => ({
        x: n.position.x, z: n.position.z
      })) : [],
      rngState: this._workerRngState
    };
  }

  /**
   * Execute commands returned by the worker on the main thread.
   */
  _executeCommands(commands) {
    const game = this.game;
    const team = this.team;
    const ai = this.ai;

    for (const cmd of commands) {
      try {
        switch (cmd.cmd) {
          case 'build':
            ai.tryBuildBuilding(cmd.buildingType);
            break;

          case 'queueBuild':
            // Append to build order if not already queued
            if (!ai.chosenBuildOrder.includes(cmd.buildingType)) {
              ai.chosenBuildOrder.push(cmd.buildingType);
            }
            break;

          case 'advanceBuildOrder':
            ai.buildOrderIndex++;
            break;

          case 'buildDefense':
            ai.tryBuildDefense(cmd.defenseType);
            break;

          case 'produce': {
            const building = game.entities.find(e => e.id === cmd.buildingId && e.isBuilding);
            if (building && building.canProduce && building.canProduce(cmd.unitType)) {
              game.productionSystem.requestProduction(building, cmd.unitType);
            }
            break;
          }

          case 'research':
            game.startResearch(team, cmd.upgradeId);
            break;

          case 'researchBranch':
            game.startBranchResearch(team, cmd.domain, cmd.branchKey);
            break;

          case 'upgrade': {
            const building = game.entities.find(e => e.id === cmd.buildingId && e.isBuilding);
            if (building && building.canUpgrade && building.canUpgrade()) {
              const cost = building.getUpgradeCost();
              const muCost = building.getUpgradeMUCost ? building.getUpgradeMUCost() : 0;
              if (cost > 0 && game.resourceSystem.canAffordBoth(team, cost, muCost)) {
                game.resourceSystem.spendBoth(team, cost, muCost);
                building.upgrade();
              }
            }
            break;
          }

          case 'attack': {
            const units = cmd.unitIds
              .map(id => game.entities.find(e => e.id === id && e.isUnit && e.team === team))
              .filter(Boolean);
            if (units.length > 0) {
              const targetPos = new THREE.Vector3(cmd.targetX, 0, cmd.targetZ);
              ai.sendUnitsToTarget(units, targetPos);
            }
            break;
          }

          case 'retreat': {
            const units = cmd.unitIds
              .map(id => game.entities.find(e => e.id === id && e.isUnit && e.team === team))
              .filter(Boolean);
            for (const unit of units) {
              ai.retreatUnit(unit);
            }
            break;
          }

          case 'setCounterBias':
            ai._counterProductionBias = cmd.bias;
            break;

          case 'setAttackCooldown':
            ai.attackCooldown = cmd.value;
            break;

          case 'resetAttackTimer':
            ai.lastAttackTime = 0;
            ai.attackWaveCount++;
            break;

          case 'fireSuperweapon': {
            const sw = game.entities.find(e => e.id === cmd.buildingId && e.isBuilding);
            if (sw && sw.fire) {
              sw.fire(new THREE.Vector3(cmd.targetX, 0, cmd.targetZ));
            }
            break;
          }

          case 'exchange':
            ai.considerExchange();
            break;

          case 'considerBuildNearNode':
            ai.considerBuildNearNode();
            break;

          default:
            // Unknown command, ignore
            break;
        }
      } catch (err) {
        console.warn('[AIWorkerBridge] Command execution error:', cmd.cmd, err.message);
      }
    }
  }

  /**
   * Main update — called every frame from Game.
   * Delegates micro to AIController on main thread.
   * Sends strategic/tactical decisions to worker on their respective intervals.
   */
  update(delta) {
    if (this.game.state !== 'PLAYING') return;

    // Always update the AIController (it handles micro, scouting, and timekeeping)
    this.ai.update(delta);

    // If worker is active, handle strategic/tactical timing ourselves
    if (this._workerReady && this._worker && !this._pendingDecision) {
      this._strategicTimer += delta;
      this._tacticalTimer += delta;

      // Send to worker when either timer fires
      const shouldSendStrategic = this._strategicTimer >= this._strategicInterval;
      const shouldSendTactical = this._tacticalTimer >= this._tacticalInterval;

      if (shouldSendStrategic || shouldSendTactical) {
        if (shouldSendStrategic) this._strategicTimer = 0;
        if (shouldSendTactical) this._tacticalTimer = 0;

        this._pendingDecision = true;
        const state = this._snapshotState();
        this._worker.postMessage({ type: 'aiDecide', team: this.team, state });
      }
    }
  }

  /**
   * Clean up the worker.
   */
  dispose() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._workerReady = false;
  }
}
