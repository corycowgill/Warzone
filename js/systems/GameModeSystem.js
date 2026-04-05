import { GAME_CONFIG, VICTORY_CONDITIONS } from '../core/Constants.js';

export class GameModeSystem {
  constructor(game) {
    this.game = game;
    this._hillControl = null;
  }

  update(delta) {
    // Update domination control points each frame
    if (this.game.gameMode === 'domination') {
      this._updateDomination(delta);
    }
    this.checkGameOver();
  }

  checkGameOver() {
    let won = null;
    let reason = null;

    const mode = this.game.gameMode;

    // ============ Survival mode ============
    if (mode === 'survival') {
      const playerHQ = this.game.getHQ('player');
      if (!playerHQ) {
        won = false;
        reason = 'Your headquarters has been destroyed';
      }
      if (won !== null) {
        this._triggerGameOver(won, reason);
      }
      return;
    }

    // ============ HQ Destruction (default) ============
    if (mode === 'hq_destruction' || !mode) {
      const playerHQ = this.game.getHQ('player');
      const enemyHQ = this.game.getHQ('enemy');
      if (!playerHQ) {
        won = false;
        reason = 'Your headquarters has been destroyed';
      } else if (!enemyHQ) {
        won = true;
        reason = 'Enemy headquarters destroyed';
      }
    }

    // ============ Annihilation ============
    else if (mode === 'annihilation') {
      const playerHQ = this.game.getHQ('player');
      const enemyHQ = this.game.getHQ('enemy');

      if (!playerHQ) {
        // Check if player has any remaining entities
        const playerUnits = this.game.getUnits('player');
        const playerBuildings = this.game.getBuildings('player');
        if (playerUnits.length === 0 && playerBuildings.length === 0) {
          won = false;
          reason = 'All your forces have been destroyed';
        }
      }
      if (won === null && !enemyHQ) {
        const enemyUnits = this.game.getUnits('enemy');
        const enemyBuildings = this.game.getBuildings('enemy');
        if (enemyUnits.length === 0 && enemyBuildings.length === 0) {
          won = true;
          reason = 'All enemy forces annihilated';
        }
      }
      // Even with HQ alive, check if all units and buildings are gone
      if (won === null) {
        const enemyUnits = this.game.getUnits('enemy');
        const enemyBuildings = this.game.getBuildings('enemy');
        if (enemyUnits.length === 0 && enemyBuildings.length === 0) {
          won = true;
          reason = 'All enemy forces annihilated';
        }

        const playerUnits = this.game.getUnits('player');
        const playerBuildings = this.game.getBuildings('player');
        if (playerUnits.length === 0 && playerBuildings.length === 0) {
          won = false;
          reason = 'All your forces have been destroyed';
        }
      }
    }

    // ============ Timed (15 min) ============
    else if (mode === 'timed') {
      const vcfg = VICTORY_CONDITIONS.timed;
      const timeLimit = vcfg ? vcfg.timeLimit : 900;

      if (this.game.gameElapsed >= timeLimit) {
        const pScore = this.game.getTimedScore('player');
        const eScore = this.game.getTimedScore('enemy');
        if (pScore > eScore) {
          won = true;
          reason = `Time up! You win by score: ${pScore} vs ${eScore}`;
        } else if (eScore > pScore) {
          won = false;
          reason = `Time up! Enemy wins by score: ${eScore} vs ${pScore}`;
        } else {
          // Tiebreaker: more remaining units wins
          const pUnits = this.game.getUnits('player').length;
          const eUnits = this.game.getUnits('enemy').length;
          won = pUnits >= eUnits; // tie goes to player
          reason = `Time up! Tied score (${pScore}), ${won ? 'you have' : 'enemy has'} more units`;
        }
      }
      // Mercy rule: HQ destruction ends timed game early
      if (won === null) {
        const playerHQ = this.game.getHQ('player');
        const enemyHQ = this.game.getHQ('enemy');
        if (!playerHQ) { won = false; reason = 'Your headquarters has been destroyed'; }
        else if (!enemyHQ) { won = true; reason = 'Enemy headquarters destroyed'; }
      }
    }

    // ============ Domination ============
    else if (mode === 'domination') {
      const vcfg = VICTORY_CONDITIONS.domination;
      const target = vcfg ? vcfg.targetScore : 300;
      const scores = this.game._dominationScores;
      if (scores) {
        if (scores.player >= target) {
          won = true;
          reason = `Domination! You reached ${target} control points`;
        } else if (scores.enemy >= target) {
          won = false;
          reason = `Domination! Enemy reached ${target} control points`;
        }
      }
      // Mercy rule: HQ destruction ends domination early
      if (won === null) {
        const playerHQ = this.game.getHQ('player');
        const enemyHQ = this.game.getHQ('enemy');
        if (!playerHQ) { won = false; reason = 'Your headquarters has been destroyed'; }
        else if (!enemyHQ) { won = true; reason = 'Enemy headquarters destroyed'; }
      }
    }

    // ============ King of the Hill (legacy) ============
    else if (mode === 'king_of_hill') {
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

      // Expose for HUD
      this.game._hillControl = this._hillControl;

      if (this._hillControl.player >= 120) { won = true; reason = 'Hill controlled for 120 seconds'; }
      else if (this._hillControl.enemy >= 120) { won = false; reason = 'Enemy controlled the hill for 120 seconds'; }

      // Mercy rule
      if (won === null) {
        const playerHQ = this.game.getHQ('player');
        const enemyHQ = this.game.getHQ('enemy');
        if (!playerHQ) { won = false; reason = 'Your headquarters has been destroyed'; }
        else if (!enemyHQ) { won = true; reason = 'Enemy headquarters destroyed'; }
      }
    }

    if (won !== null) {
      this._triggerGameOver(won, reason);
    }
  }

  /**
   * Update domination control points: check ownership and accumulate scores.
   */
  _updateDomination(delta) {
    const points = this.game._dominationPoints;
    const scores = this.game._dominationScores;
    const meshes = this.game._dominationMeshes;
    if (!points || !scores || !meshes) return;

    const vcfg = VICTORY_CONDITIONS.domination;
    const controlRadius = vcfg ? vcfg.controlRadius : 15;
    const rSq = controlRadius * controlRadius;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const px = pt.x;
      const pz = pt.z;

      let playerNear = 0;
      let enemyNear = 0;

      // Count units near this control point
      for (const unit of this.game.getUnits('player')) {
        const pos = unit.getPosition();
        const dx = pos.x - px;
        const dz = pos.z - pz;
        if (dx * dx + dz * dz < rSq) playerNear++;
      }
      for (const unit of this.game.getUnits('enemy')) {
        const pos = unit.getPosition();
        const dx = pos.x - px;
        const dz = pos.z - pz;
        if (dx * dx + dz * dz < rSq) enemyNear++;
      }

      // Determine ownership
      if (playerNear > 0 && enemyNear === 0) {
        pt.owner = 'player';
      } else if (enemyNear > 0 && playerNear === 0) {
        pt.owner = 'enemy';
      } else if (playerNear > 0 && enemyNear > 0) {
        pt.owner = 'contested';
      } else {
        // No units nearby: keep previous owner but don't score
        // (points stay owned until someone else takes them, but only score when units present)
        if (pt.owner !== 'player' && pt.owner !== 'enemy') {
          pt.owner = null;
        }
        // No one scores if no units present
        pt._activeScoring = false;
        this._updateDominationVisual(i, pt.owner);
        continue;
      }

      pt._activeScoring = (pt.owner === 'player' || pt.owner === 'enemy');

      // Accumulate score: +1 per second per point controlled
      if (pt.owner === 'player') {
        scores.player += delta;
      } else if (pt.owner === 'enemy') {
        scores.enemy += delta;
      }

      // Update visual
      this._updateDominationVisual(i, pt.owner);
    }
  }

  _updateDominationVisual(index, owner) {
    const meshes = this.game._dominationMeshes;
    if (!meshes || !meshes[index]) return;
    const dm = meshes[index];

    let color;
    if (owner === 'player') color = 0x00ff44;
    else if (owner === 'enemy') color = 0xff3333;
    else if (owner === 'contested') color = 0xffcc00;
    else color = 0x888888;

    if (dm.ringMat) dm.ringMat.color.setHex(color);
    if (dm.pillarMat) {
      dm.pillarMat.color.setHex(color);
      dm.pillarMat.emissive.setHex(color === 0x888888 ? 0x333333 : (color & 0xffffff) >> 1);
    }
  }

  _triggerGameOver(won, reason) {
    this.game.victoryReason = reason || null;
    this.game.setState('GAME_OVER');
    this.game.uiManager.showGameOver(won);
    if (this.game.soundManager) this.game.soundManager.play(won ? 'victory' : 'defeat');
    this.saveMatchHistory(won);
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
        gameMode: this.game.gameMode || 'hq_destruction',
        victoryReason: this.game.victoryReason || '',
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
