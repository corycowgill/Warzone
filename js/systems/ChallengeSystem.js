import * as THREE from 'three';
import { GAME_CONFIG, CHALLENGE_SCENARIOS } from '../core/Constants.js';

export class ChallengeSystem {
  constructor(game) {
    this.game = game;
    this._challenge = null;
    this._canAutoResolve = false;
  }

  /** Whether a challenge is currently active */
  get active() { return !!this._challenge; }

  /** Whether the active challenge forbids production */
  get noProduction() { return this._challenge?.noProduction; }

  /** Whether auto-resolve is available */
  get canAutoResolve() { return this._canAutoResolve; }

  // GD-134: Start a challenge scenario
  async startChallenge(challengeKey) {
    const scenario = CHALLENGE_SCENARIOS[challengeKey];
    if (!scenario) return;

    this._challenge = { key: challengeKey, scenario, startTime: 0, wavesSpawned: [], completed: false };

    await this.game.startGame({
      mode: '1P',
      playerNation: scenario.playerNation,
      enemyNation: scenario.enemyNation,
      difficulty: scenario.enemyDifficulty || 'normal',
      mapTemplate: scenario.mapTemplate || 'continental',
      gameMode: 'annihilation'
    });

    // Override resources
    if (scenario.playerStartSP !== undefined) this.game.teams.player.sp = scenario.playerStartSP;
    if (scenario.playerStartMU !== undefined) this.game.teams.player.mu = scenario.playerStartMU;
    if (scenario.enemyStartSP !== undefined) this.game.teams.enemy.sp = scenario.enemyStartSP;
    if (scenario.enemyStartMU !== undefined) this.game.teams.enemy.mu = scenario.enemyStartMU;

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
            baseX + (offset % 5) * 4 + (this.game.rng.next() - 0.5) * 2,
            0,
            baseZ + Math.floor(offset / 5) * 4 + 10
          );
          this.game.createUnit(unitType, team, pos);
          offset++;
        }
      }
    }

    // Show challenge start notification
    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(`Challenge: ${scenario.name}`, '#ffcc00');
      if (scenario.timeLimit > 0) {
        this.game.uiManager.hud.showNotification(`Time Limit: ${Math.floor(scenario.timeLimit / 60)} minutes`, '#ff8844');
      }
    }
  }

  // GD-134: Update challenge scenario state
  update(delta) {
    this._updateAutoResolve();
    this._updateChallenge(delta);
  }

  _updateAutoResolve() {
    // GD-139: Check if enemy has no production buildings - show auto-resolve
    if ((this.game.gameMode === 'annihilation' || this.game.gameMode === 'hq_destruction') && this.game.mode !== 'SPECTATE' && !this._challenge) {
      const enemyProd = this.game.getBuildings('enemy').filter(b =>
        b.produces && b.produces.length > 0 && b.alive
      );
      const enemyHQ = this.game.getHQ('enemy');
      this._canAutoResolve = (enemyProd.length === 0 && !enemyHQ);
    }
  }

  _updateChallenge(delta) {
    if (!this._challenge || this._challenge.completed) return;

    const scenario = this._challenge.scenario;
    this._challenge.startTime += delta;
    const elapsed = this._challenge.startTime;

    // Block production in no-production scenarios
    if (this._challenge.noProduction && this.game.productionSystem) {
      // Clear any queued production for player
      const playerBuildings = this.game.getBuildings('player');
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
                mapSize / 2 + Math.floor(offset / 5) * 4 + (this.game.rng.next() - 0.5) * 10
              );
              const unit = this.game.createUnit(unitType, 'enemy', pos);
              if (unit) {
                // Attack-move toward player base
                const targetPos = new THREE.Vector3(50, 0, mapSize / 2);
                unit.moveTo(targetPos);
                unit._attackMove = true;
              }
              offset++;
            }
          }
          if (this.game.uiManager?.hud) {
            this.game.uiManager.hud.showNotification(`Wave ${i + 1} incoming!`, '#ff4444');
          }
          if (this.game.soundManager) this.game.soundManager.play('error');
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
        const enemyHQ = this.game.getHQ('enemy');
        if (!enemyHQ) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      } else if (scenario.victory === 'destroy_all') {
        const enemyEntities = this.game.getEntitiesByTeam('enemy');
        if (enemyEntities.length === 0 && elapsed > 5) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      } else if (scenario.victory === 'destroy_commander') {
        const enemyCmds = this.game.getUnits('enemy').filter(u => u.type === 'commander');
        if (enemyCmds.length === 0 && elapsed > 5) {
          this._challenge.completed = true;
          this.finishChallenge(true, elapsed);
        }
      }

      // Check player defeat (HQ destroyed)
      const playerHQ = this.game.getHQ('player');
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
    const enemies = this.game.getEntitiesByTeam('enemy');
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
      const unitsLost = this.game.stats.player.unitsLost || 0;
      const unitsProduced = this.game.stats.player.unitsProduced || 0;
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
    this.game.setState('GAME_OVER');
    const starsStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(
        won ? `Challenge Complete! ${starsStr}` : 'Challenge Failed!',
        won ? '#ffcc00' : '#ff4444'
      );
    }
    this.game.uiManager.showGameOver(won);
    if (this.game.soundManager) this.game.soundManager.play(won ? 'produce' : 'defeat');
  }

  dispose() {
    this._challenge = null;
    this._canAutoResolve = false;
  }
}
