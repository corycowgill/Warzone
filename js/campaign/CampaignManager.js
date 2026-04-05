import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { MissionEngine } from './MissionEngine.js';
import { CampaignUI } from './CampaignUI.js';
import { CAMPAIGN_MISSIONS } from './missions/index.js';

/**
 * CampaignManager - Manages campaign progress, mission flow, and save state.
 */
export class CampaignManager {
  constructor(game) {
    this.game = game;
    this.missionEngine = null;
    this.currentMissionId = null;
    this.currentDifficulty = 'normal'; // easy | normal | hard
    this.missions = CAMPAIGN_MISSIONS;
    this.progress = this._loadProgress();
  }

  /**
   * Load campaign progress from localStorage.
   */
  _loadProgress() {
    try {
      const saved = localStorage.getItem('warzone_campaign');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse errors
    }
    return {
      completedMissions: {},  // { missionId: { stars, bestTime, difficulty } }
      currentAct: 1,
      unlockedMissions: ['mission_1'] // First mission always unlocked
    };
  }

  /**
   * Save campaign progress to localStorage.
   */
  _saveProgress() {
    try {
      localStorage.setItem('warzone_campaign', JSON.stringify(this.progress));
    } catch (e) {
      // localStorage unavailable
    }
  }

  /**
   * Get all missions organized by act.
   */
  getMissionsByAct() {
    const acts = [
      { id: 1, name: 'Act 1: The European Front', missions: [] },
      { id: 2, name: 'Act 2: The Pacific Theater', missions: [] },
      { id: 3, name: 'Act 3: The Final Stand', missions: [] }
    ];

    for (const mission of this.missions) {
      const act = acts[mission.act - 1];
      if (act) {
        act.missions.push({
          ...mission,
          unlocked: this.isMissionUnlocked(mission.id),
          completed: this.isMissionCompleted(mission.id),
          stars: this.getMissionStars(mission.id),
          bestTime: this.getMissionBestTime(mission.id)
        });
      }
    }

    return acts;
  }

  /**
   * Check if a mission is unlocked.
   */
  isMissionUnlocked(missionId) {
    return this.progress.unlockedMissions.includes(missionId);
  }

  /**
   * Check if a mission has been completed.
   */
  isMissionCompleted(missionId) {
    return !!this.progress.completedMissions[missionId];
  }

  /**
   * Get star rating for a completed mission.
   */
  getMissionStars(missionId) {
    return this.progress.completedMissions[missionId]?.stars || 0;
  }

  /**
   * Get best completion time.
   */
  getMissionBestTime(missionId) {
    return this.progress.completedMissions[missionId]?.bestTime || null;
  }

  /**
   * Get the mission definition by ID.
   */
  getMission(missionId) {
    return this.missions.find(m => m.id === missionId) || null;
  }

  /**
   * Get the next mission after the given one.
   */
  getNextMission(missionId) {
    const idx = this.missions.findIndex(m => m.id === missionId);
    if (idx >= 0 && idx < this.missions.length - 1) {
      return this.missions[idx + 1];
    }
    return null;
  }

  /**
   * Start a campaign mission.
   */
  async startMission(missionId, difficulty) {
    const missionDef = this.getMission(missionId);
    if (!missionDef) {
      console.error('Mission not found:', missionId);
      return;
    }

    this.currentMissionId = missionId;
    this.currentDifficulty = difficulty || 'normal';

    // Apply difficulty scaling
    const scaledMission = this._applyDifficulty(missionDef, this.currentDifficulty);

    // Mark this as a campaign game BEFORE startGame so placeStartingEntities is skipped
    this.game._isCampaign = true;
    this.game._campaignActive = true;

    // Start the game with mission parameters
    await this.game.startGame({
      mode: '1P',
      playerNation: scaledMission.playerNation,
      enemyNation: scaledMission.enemyNation,
      difficulty: scaledMission.aiDifficulty || this.currentDifficulty,
      mapTemplate: scaledMission.mapTemplate || 'continental',
      gameMode: 'annihilation' // Campaign uses custom victory conditions
    });

    // Create and load mission engine
    this.missionEngine = new MissionEngine(this.game);
    this.missionEngine.loadMission(scaledMission);

    // Show mission start notification
    if (this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(
        `Mission ${scaledMission.missionNumber}: ${scaledMission.name}`,
        '#ffcc00'
      );
    }

    // Show campaign UI elements (objective tracker, dialogue)
    if (this.game.campaignUI) {
      this.game.campaignUI.showObjectiveTracker();
      this.game.campaignUI.showDialogue();
    }
  }

  /**
   * Apply difficulty scaling to a mission definition.
   */
  _applyDifficulty(missionDef, difficulty) {
    // Deep clone
    const mission = JSON.parse(JSON.stringify(missionDef));

    const multipliers = {
      easy:   { enemyCount: 0.6, enemyHP: 0.8, playerResources: 1.5, timeLimit: 1.3 },
      normal: { enemyCount: 1.0, enemyHP: 1.0, playerResources: 1.0, timeLimit: 1.0 },
      hard:   { enemyCount: 1.5, enemyHP: 1.2, playerResources: 0.7, timeLimit: 0.8 }
    };

    const mult = multipliers[difficulty] || multipliers.normal;

    // Scale starting resources
    if (mission.playerStartSP !== undefined) {
      mission.playerStartSP = Math.round(mission.playerStartSP * mult.playerResources);
    }
    if (mission.playerStartMU !== undefined) {
      mission.playerStartMU = Math.round(mission.playerStartMU * mult.playerResources);
    }

    // Scale enemy starting units
    if (mission.startingUnits?.enemy) {
      for (const placement of mission.startingUnits.enemy) {
        placement.count = Math.max(1, Math.round((placement.count || 1) * mult.enemyCount));
      }
    }

    // Scale reinforcement waves
    if (mission.reinforcements) {
      for (const reinf of mission.reinforcements) {
        for (const unit of reinf.units) {
          if (unit.team !== 'player') {
            unit.count = Math.max(1, Math.round((unit.count || 1) * mult.enemyCount));
          }
        }
      }
    }

    // Scale time-based objectives
    if (mission.objectives) {
      for (const obj of mission.objectives) {
        if (obj.type === 'survive_time' && obj.target) {
          obj.target = Math.round(obj.target * mult.timeLimit);
        }
      }
    }

    // Scale time limit
    if (mission.timeLimit) {
      mission.timeLimit = Math.round(mission.timeLimit * mult.timeLimit);
    }

    return mission;
  }

  /**
   * Called every frame from Game.update() when campaign is active.
   */
  update(delta) {
    if (!this.missionEngine) return;

    this.missionEngine.update(delta);

    // Check if mission ended
    if (this.missionEngine.state === 'won') {
      this._onMissionWon();
    } else if (this.missionEngine.state === 'lost') {
      this._onMissionLost();
    }
  }

  /**
   * Handle mission victory.
   */
  _onMissionWon() {
    const stars = this.missionEngine.calculateStars();
    const stats = this.missionEngine.getCompletionStats();
    const missionId = this.currentMissionId;

    // Update progress
    const prev = this.progress.completedMissions[missionId];
    const newStars = prev ? Math.max(prev.stars, stars) : stars;
    const newBestTime = prev?.bestTime
      ? Math.min(prev.bestTime, stats.elapsed)
      : stats.elapsed;

    this.progress.completedMissions[missionId] = {
      stars: newStars,
      bestTime: Math.round(newBestTime),
      difficulty: this.currentDifficulty
    };

    // Unlock next mission
    const nextMission = this.getNextMission(missionId);
    if (nextMission && !this.progress.unlockedMissions.includes(nextMission.id)) {
      this.progress.unlockedMissions.push(nextMission.id);
    }

    this._saveProgress();

    // Show victory through the campaign UI
    this.game.setState('GAME_OVER');
    this.game.eventBus.emit('campaign:missionComplete', {
      missionId,
      stars,
      stats,
      nextMissionId: nextMission?.id || null
    });

    if (this.game.soundManager) this.game.soundManager.play('produce');
  }

  /**
   * Handle mission defeat.
   */
  _onMissionLost() {
    const stats = this.missionEngine.getCompletionStats();

    this.game.setState('GAME_OVER');
    this.game.eventBus.emit('campaign:missionFailed', {
      missionId: this.currentMissionId,
      stats
    });

    if (this.game.soundManager) this.game.soundManager.play('defeat');
  }

  /**
   * Clean up campaign state.
   */
  destroy() {
    if (this.missionEngine) {
      this.missionEngine.destroy();
      this.missionEngine = null;
    }
    this.currentMissionId = null;
    if (this.game) {
      this.game._isCampaign = false;
      this.game._campaignActive = false;
    }
  }

  /**
   * Reset all campaign progress.
   */
  resetProgress() {
    this.progress = {
      completedMissions: {},
      currentAct: 1,
      unlockedMissions: ['mission_1']
    };
    this._saveProgress();
  }

  /**
   * Get total stars earned across all missions.
   */
  getTotalStars() {
    let total = 0;
    for (const data of Object.values(this.progress.completedMissions)) {
      total += data.stars || 0;
    }
    return total;
  }

  /**
   * Get max possible stars.
   */
  getMaxStars() {
    return this.missions.length * 3;
  }

  /**
   * Show the campaign menu screen (called from UIManager).
   */
  showCampaignMenu() {
    if (!this._campaignUI) {
      this._campaignUI = new CampaignUI(this.game, this);
    }
    this._campaignUI.showCampaignSelect();
  }
}
