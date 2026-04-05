import { GAME_CONFIG } from '../core/Constants.js';

export class GameModeSystem {
  constructor(game) {
    this.game = game;
    this._hillControl = null;
  }

  update(delta) {
    this.checkGameOver();
  }

  checkGameOver() {
    let won = null;

    // GD-085: Survival mode - game over only when player HQ is destroyed
    if (this.game.gameMode === 'survival') {
      const playerHQ = this.game.getHQ('player');
      if (!playerHQ) {
        won = false; // Player lost
      }
      if (won !== null) {
        this.game.setState('GAME_OVER');
        this.game.uiManager.showGameOver(won);
        if (this.game.soundManager) this.game.soundManager.play('defeat');
        this.saveMatchHistory(won);
      }
      return;
    }

    if (this.game.gameMode === 'timed') {
      // Timed mode: 10 minutes, most military power wins
      if (this.game.gameElapsed >= 600) {
        const playerScore = this.game.getUnits('player').length + this.game.getBuildings('player').length * 2;
        const enemyScore = this.game.getUnits('enemy').length + this.game.getBuildings('enemy').length * 2;
        won = playerScore >= enemyScore; // tie goes to player
      }
    } else if (this.game.gameMode === 'king_of_hill') {
      // King of the Hill: control center for 120s
      const mapCenter = (GAME_CONFIG.mapSize * GAME_CONFIG.worldScale) / 2;
      const controlRadius = 30;
      const playerNearCenter = this.game.getUnits('player').filter(u => {
        const p = u.getPosition();
        const dx = p.x - mapCenter;
        const dz = p.z - mapCenter;
        return dx * dx + dz * dz < controlRadius * controlRadius;
      }).length;
      const enemyNearCenter = this.game.getUnits('enemy').filter(u => {
        const p = u.getPosition();
        const dx = p.x - mapCenter;
        const dz = p.z - mapCenter;
        return dx * dx + dz * dz < controlRadius * controlRadius;
      }).length;

      if (!this._hillControl) this._hillControl = { player: 0, enemy: 0 };

      if (playerNearCenter > enemyNearCenter) {
        this._hillControl.player += this.game._lastDelta || 0.016;
        this._hillControl.enemy = Math.max(0, this._hillControl.enemy - (this.game._lastDelta || 0.016) * 0.5);
      } else if (enemyNearCenter > playerNearCenter) {
        this._hillControl.enemy += this.game._lastDelta || 0.016;
        this._hillControl.player = Math.max(0, this._hillControl.player - (this.game._lastDelta || 0.016) * 0.5);
      }

      if (this._hillControl.player >= 120) won = true;
      else if (this._hillControl.enemy >= 120) won = false;
    }

    // Annihilation / fallback checks
    if (won === null) {
      if (this.game.gameMode === 'annihilation' || !this.game.gameMode) {
        // Full annihilation logic
        const playerHQ = this.game.getHQ('player');
        const enemyHQ = this.game.getHQ('enemy');

        if (!playerHQ) {
          won = false;
        } else if (!enemyHQ) {
          won = true;
        } else {
          const enemyUnits = this.game.getUnits('enemy');
          const enemyBuildings = this.game.getBuildings('enemy').filter(b =>
            b.produces && b.produces.length > 0
          );
          if (enemyUnits.length === 0 && enemyBuildings.length === 0) {
            won = true;
          }

          const playerUnits = this.game.getUnits('player');
          const playerBuildings = this.game.getBuildings('player').filter(b =>
            b.produces && b.produces.length > 0
          );
          if (playerUnits.length === 0 && playerBuildings.length === 0) {
            won = false;
          }
        }
      } else {
        // For timed/koth: only end early if HQ is destroyed (mercy rule)
        const playerHQ = this.game.getHQ('player');
        const enemyHQ = this.game.getHQ('enemy');
        if (!playerHQ) won = false;
        else if (!enemyHQ) won = true;
      }
    }

    if (won !== null) {
      this.game.setState('GAME_OVER');
      this.game.uiManager.showGameOver(won);
      if (this.game.soundManager) this.game.soundManager.play(won ? 'victory' : 'defeat');
      this.saveMatchHistory(won);
    }
  }

  saveMatchHistory(won) {
    try {
      const history = JSON.parse(localStorage.getItem('warzone_history') || '[]');
      history.push({
        date: new Date().toISOString(),
        result: won ? 'victory' : 'defeat',
        playerNation: this.game.teams.player.nation,
        enemyNation: this.game.teams.enemy.nation,
        difficulty: this.game.aiDifficulty || 'normal',
        gameMode: this.game.gameMode || 'annihilation',
        duration: Math.floor(this.game.gameElapsed),
        stats: { ...this.game.stats.player }
      });
      // Keep last 50 matches
      if (history.length > 50) history.splice(0, history.length - 50);
      localStorage.setItem('warzone_history', JSON.stringify(history));
    } catch (e) {
      // localStorage unavailable or full, silently ignore
    }
  }

  dispose() {
    this._hillControl = null;
    // Hill ring cleanup
    if (this.game._hillRing) {
      this.game.sceneManager.scene.remove(this.game._hillRing);
      this.game._hillRing.geometry.dispose();
      this.game._hillRing.material.dispose();
      this.game._hillRing = null;
    }
  }
}
