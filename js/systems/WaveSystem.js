import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

/**
 * GD-085: Survival / Wave Defense Mode
 * Spawns waves of enemies at increasing difficulty.
 */

const WAVE_INTERVAL = 90; // seconds between waves
const WAVE_CONFIGS = [
  // Wave 1-3: infantry only
  { types: ['infantry'], counts: [5, 7, 10] },
  // Wave 4-6: infantry + tanks
  { types: ['infantry', 'tank'], counts: [8, 10, 12], tankRatio: 0.3 },
  // Wave 7-9: add air
  { types: ['infantry', 'tank', 'drone'], counts: [10, 12, 15], tankRatio: 0.25, airRatio: 0.2 },
  // Wave 10-12: add naval
  { types: ['infantry', 'tank', 'drone', 'battleship'], counts: [12, 15, 18], tankRatio: 0.2, airRatio: 0.2, navalRatio: 0.1 },
  // Wave 13+: elite mixed
  { types: ['infantry', 'heavytank', 'bomber', 'battleship'], counts: [18, 20, 22], tankRatio: 0.3, airRatio: 0.2, navalRatio: 0.1, elite: true }
];

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.waveNumber = 0;
    this.waveTimer = WAVE_INTERVAL; // countdown to next wave
    this.betweenWaves = true;
    this.enemiesKilled = 0;
    this.totalEnemiesKilled = 0;
    this.waveEnemiesAlive = 0;
    this.highScore = this._loadHighScore();
    this.score = 0;
    this.bonusSPAwarded = 0;

    // Listen for enemy kills
    this._onKill = (data) => {
      if (data.defender && data.defender.team === 'enemy' && data.defender._isWaveUnit) {
        this.enemiesKilled++;
        this.totalEnemiesKilled++;
        this.waveEnemiesAlive--;
      }
    };
    this.game.eventBus.on('combat:kill', this._onKill);

    this._onUnitDestroyed = (data) => {
      if (data.entity && data.entity.team === 'enemy' && data.entity._isWaveUnit) {
        if (this.waveEnemiesAlive > 0) this.waveEnemiesAlive--;
      }
    };
    this.game.eventBus.on('unit:destroyed', this._onUnitDestroyed);
  }

  update(delta) {
    if (this.game.state !== 'PLAYING') return;

    this.waveTimer -= delta;

    if (this.waveTimer <= 0 && this.betweenWaves) {
      this.spawnWave();
    }

    // Check if all wave enemies are dead
    if (!this.betweenWaves && this.waveEnemiesAlive <= 0) {
      this.waveComplete();
    }

    // Update score
    this.score = this.waveNumber * 100 + this.totalEnemiesKilled;
  }

  spawnWave() {
    this.waveNumber++;
    this.betweenWaves = false;
    this.enemiesKilled = 0;

    // Determine wave config
    const configIndex = Math.min(Math.floor((this.waveNumber - 1) / 3), WAVE_CONFIGS.length - 1);
    const config = WAVE_CONFIGS[configIndex];
    const subIndex = Math.min((this.waveNumber - 1) % 3, config.counts.length - 1);
    const totalCount = config.counts[subIndex] + Math.floor(this.waveNumber / 5) * 2; // scale up

    // Notify player
    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(
        `Wave ${this.waveNumber} incoming! (${totalCount} enemies)`, '#ff4444'
      );
    }
    if (this.game.soundManager) this.game.soundManager.play('error');

    // Determine spawn position (right side of map, enemy territory)
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    // Spawn units
    let spawned = 0;
    this.waveEnemiesAlive = 0;

    for (let i = 0; i < totalCount; i++) {
      let unitType = 'infantry';

      // Determine type based on ratios
      const roll = this.game.rng.next();
      if (config.navalRatio && roll < config.navalRatio && this.game.terrain) {
        // Naval units spawn in water
        unitType = config.types.includes('battleship') ? 'battleship' : 'patrolboat';
      } else if (config.airRatio && roll < (config.navalRatio || 0) + config.airRatio) {
        unitType = config.types.includes('bomber') ? 'bomber' : 'drone';
      } else if (config.tankRatio && roll < (config.navalRatio || 0) + (config.airRatio || 0) + config.tankRatio) {
        if (config.types.includes('heavytank')) unitType = 'heavytank';
        else if (config.types.includes('tank')) unitType = 'tank';
      } else {
        unitType = 'infantry';
      }

      // Spawn position
      let spawnX, spawnZ;
      const isNaval = unitType === 'battleship' || unitType === 'patrolboat' || unitType === 'submarine';

      if (isNaval) {
        // Find water position on map edge
        spawnX = mapSize - 10;
        spawnZ = mapSize * 0.3 + this.game.rng.next() * mapSize * 0.4;
        // Only spawn if water exists there
        if (this.game.terrain && !this.game.terrain.isWater(spawnX, spawnZ)) {
          unitType = 'infantry'; // fallback
          spawnX = mapSize - 20 - this.game.rng.next() * 20;
          spawnZ = mapSize * 0.2 + this.game.rng.next() * mapSize * 0.6;
        }
      } else {
        // Land/air: spawn from right edge
        spawnX = mapSize - 20 - this.game.rng.next() * 30;
        spawnZ = mapSize * 0.15 + this.game.rng.next() * mapSize * 0.7;

        // Ensure walkable for land
        if (unitType !== 'drone' && unitType !== 'bomber' && this.game.terrain) {
          if (!this.game.terrain.isWalkable(spawnX, spawnZ) || this.game.terrain.isWater(spawnX, spawnZ)) {
            // Try alternative positions
            for (let attempt = 0; attempt < 5; attempt++) {
              spawnX = mapSize - 30 - this.game.rng.next() * 40;
              spawnZ = mapSize * 0.2 + this.game.rng.next() * mapSize * 0.6;
              if (this.game.terrain.isWalkable(spawnX, spawnZ) && !this.game.terrain.isWater(spawnX, spawnZ)) break;
            }
          }
        }
      }

      const pos = new THREE.Vector3(spawnX, 0, spawnZ);
      const unit = this.game.createUnit(unitType, 'enemy', pos);
      if (unit) {
        unit._isWaveUnit = true;
        // Elite waves get HP/damage bonus
        if (config.elite) {
          unit.maxHealth = Math.round(unit.maxHealth * 1.3);
          unit.health = unit.maxHealth;
          unit.damage = Math.round(unit.damage * 1.2);
        }
        // Scale with wave number
        if (this.waveNumber > 10) {
          const scaleFactor = 1 + (this.waveNumber - 10) * 0.05;
          unit.maxHealth = Math.round(unit.maxHealth * scaleFactor);
          unit.health = unit.maxHealth;
          unit.damage = Math.round(unit.damage * scaleFactor);
        }
        spawned++;
        this.waveEnemiesAlive++;

        // Send units toward player base
        const playerHQ = this.game.getHQ('player');
        if (playerHQ) {
          const targetPos = playerHQ.getPosition().clone();
          targetPos.x += (this.game.rng.next() - 0.5) * 30;
          targetPos.z += (this.game.rng.next() - 0.5) * 30;
          unit.moveTo(targetPos);
          unit._attackMove = true;
        }
      }
    }
  }

  waveComplete() {
    this.betweenWaves = true;
    this.waveTimer = WAVE_INTERVAL;

    // Bonus SP based on units killed
    const bonus = this.enemiesKilled * 15 + 50;
    this.bonusSPAwarded += bonus;
    this.game.teams.player.sp += bonus;
    this.game.teams.player.mu += Math.floor(bonus * 0.3);

    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(
        `Wave ${this.waveNumber} cleared! +${bonus} SP bonus`, '#00ff44'
      );
    }
    if (this.game.soundManager) this.game.soundManager.play('produce');

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this._saveHighScore();
    }
  }

  getDisplayInfo() {
    const timeLeft = Math.max(0, Math.ceil(this.waveTimer));
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return {
      wave: this.waveNumber,
      countdown: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      enemiesAlive: this.waveEnemiesAlive,
      score: this.score,
      highScore: this.highScore,
      betweenWaves: this.betweenWaves
    };
  }

  _loadHighScore() {
    try {
      return parseInt(localStorage.getItem('warzone_survival_highscore') || '0', 10);
    } catch { return 0; }
  }

  _saveHighScore() {
    try {
      localStorage.setItem('warzone_survival_highscore', String(this.highScore));
    } catch { /* ignore */ }
  }

  destroy() {
    if (this._onKill) this.game.eventBus.off('combat:kill', this._onKill);
    if (this._onUnitDestroyed) this.game.eventBus.off('unit:destroyed', this._onUnitDestroyed);
  }
}
