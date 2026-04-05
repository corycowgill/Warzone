/**
 * AchievementSystem - Tracks player milestones and unlocks.
 * Persists to localStorage. Shows toast notifications on unlock.
 */
export class AchievementSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.achievements = this._defineAchievements();
    this.unlocked = {};
    this.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      totalUnitsProduced: 0,
      totalUnitsKilled: 0,
      totalBuildingsDestroyed: 0,
      totalDamageDealt: 0,
      totalPlayTime: 0,
      campaignMissionsCompleted: 0,
      multiplayerWins: 0,
      perfectMissions: 0,  // No unit losses
      fastestWin: Infinity,
      largestArmy: 0,
      superweaponsLaunched: 0,
      commanderAbilitiesUsed: 0,
      nationsPlayed: new Set(),
      consecutiveWins: 0,
      maxConsecutiveWins: 0,
    };

    this.toastQueue = [];
    this.currentToast = null;
    this.toastContainer = null;

    this.load();
    this._createToastContainer();
    this._subscribeEvents();
  }

  _defineAchievements() {
    return {
      // Getting Started
      first_blood: { name: 'First Blood', description: 'Win your first game', icon: '⚔️', category: 'general' },
      boot_camp: { name: 'Boot Camp', description: 'Complete the tutorial', icon: '🎓', category: 'general' },
      five_star_general: { name: 'Five Star General', description: 'Win 50 games', icon: '⭐', category: 'general' },
      war_veteran: { name: 'War Veteran', description: 'Play 100 games', icon: '🎖️', category: 'general' },

      // Combat
      blitzkrieg: { name: 'Blitzkrieg', description: 'Win a game in under 5 minutes', icon: '⚡', category: 'combat' },
      flawless_victory: { name: 'Flawless Victory', description: 'Win without losing a single unit', icon: '💎', category: 'combat' },
      army_builder: { name: 'Army Builder', description: 'Have 100+ units at once', icon: '🏗️', category: 'combat' },
      nuke_em: { name: 'Nuclear Option', description: 'Launch a superweapon', icon: '☢️', category: 'combat' },
      combined_arms: { name: 'Combined Arms', description: 'Win with land, air, and naval units', icon: '🌐', category: 'combat' },
      tank_rush: { name: 'Tank Rush', description: 'Win using only tanks', icon: '🔩', category: 'combat' },

      // Economy
      tycoon: { name: 'War Tycoon', description: 'Accumulate 10,000 SP in a single game', icon: '💰', category: 'economy' },
      industrialist: { name: 'Industrialist', description: 'Have 10+ production buildings', icon: '🏭', category: 'economy' },
      salvage_king: { name: 'Salvage King', description: 'Earn 2,000 SP from salvage in one game', icon: '♻️', category: 'economy' },

      // Campaign
      chapter_one: { name: 'Chapter One', description: 'Complete Act 1 of the campaign', icon: '📖', category: 'campaign' },
      chapter_two: { name: 'Chapter Two', description: 'Complete Act 2 of the campaign', icon: '📗', category: 'campaign' },
      war_hero: { name: 'War Hero', description: 'Complete the entire campaign', icon: '🏆', category: 'campaign' },
      all_stars: { name: 'All Stars', description: 'Earn 3 stars on every campaign mission', icon: '🌟', category: 'campaign' },

      // Multiplayer
      online_warrior: { name: 'Online Warrior', description: 'Win your first multiplayer game', icon: '🌍', category: 'multiplayer' },
      win_streak: { name: 'Win Streak', description: 'Win 5 multiplayer games in a row', icon: '🔥', category: 'multiplayer' },
      mp_veteran: { name: 'MP Veteran', description: 'Win 25 multiplayer games', icon: '🎯', category: 'multiplayer' },

      // Nations
      world_tour: { name: 'World Tour', description: 'Play as all 6 nations', icon: '🗺️', category: 'nations' },
      faction_master: { name: 'Faction Master', description: 'Win 10 games with the same nation', icon: '🏛️', category: 'nations' },

      // Map Editor
      cartographer: { name: 'Cartographer', description: 'Create a custom map', icon: '📐', category: 'editor' },
      map_maestro: { name: 'Map Maestro', description: 'Create 10 custom maps', icon: '🗺️', category: 'editor' },

      // Challenges
      challenge_accepted: { name: 'Challenge Accepted', description: 'Complete a challenge scenario', icon: '🎮', category: 'challenges' },
      challenge_master: { name: 'Challenge Master', description: 'Complete all challenge scenarios with 3 stars', icon: '👑', category: 'challenges' },

      // Special
      speed_demon: { name: 'Speed Demon', description: 'Produce 50 units in under 3 minutes', icon: '💨', category: 'special' },
      comeback_kid: { name: 'Comeback Kid', description: 'Win after losing your HQ', icon: '🔄', category: 'special' },
      explorer: { name: 'Explorer', description: 'Reveal 100% of the map', icon: '🔍', category: 'special' },
      commander_elite: { name: 'Commander Elite', description: 'Use 50 commander abilities', icon: '🎖️', category: 'special' },
    };
  }

  _subscribeEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('GAME_OVER', (data) => {
      this.stats.gamesPlayed++;
      if (data.winner === 'player') {
        this.stats.gamesWon++;
        this.stats.consecutiveWins++;
        this.stats.maxConsecutiveWins = Math.max(this.stats.maxConsecutiveWins, this.stats.consecutiveWins);
        this.check('first_blood', () => true);
        this.check('five_star_general', () => this.stats.gamesWon >= 50);
        this.check('win_streak', () => this.stats.consecutiveWins >= 5);
      } else {
        this.stats.consecutiveWins = 0;
      }
      this.check('war_veteran', () => this.stats.gamesPlayed >= 100);
      this.save();
    });

    this.eventBus.on('UNIT_KILLED', () => {
      this.stats.totalUnitsKilled++;
    });

    this.eventBus.on('SUPERWEAPON_FIRED', () => {
      this.stats.superweaponsLaunched++;
      this.check('nuke_em', () => true);
    });

    this.eventBus.on('ABILITY_USED', (data) => {
      if (data.isCommander) {
        this.stats.commanderAbilitiesUsed++;
        this.check('commander_elite', () => this.stats.commanderAbilitiesUsed >= 50);
      }
    });
  }

  /**
   * Check and potentially unlock an achievement
   */
  check(id, condition) {
    if (this.unlocked[id]) return false;
    if (!this.achievements[id]) return false;

    if (condition()) {
      this.unlock(id);
      return true;
    }
    return false;
  }

  /**
   * Force unlock an achievement
   */
  unlock(id) {
    if (this.unlocked[id]) return;
    if (!this.achievements[id]) return;

    this.unlocked[id] = {
      unlockedAt: new Date().toISOString(),
    };

    this.showToast(this.achievements[id]);
    this.save();
  }

  /**
   * Track nation played
   */
  trackNation(nation) {
    this.stats.nationsPlayed.add(nation);
    this.check('world_tour', () => this.stats.nationsPlayed.size >= 6);
  }

  /**
   * Get achievement progress data
   */
  getProgress() {
    const total = Object.keys(this.achievements).length;
    const unlocked = Object.keys(this.unlocked).length;
    return {
      total,
      unlocked,
      percentage: Math.round((unlocked / total) * 100),
      byCategory: this._getByCategory(),
    };
  }

  _getByCategory() {
    const categories = {};
    for (const [id, ach] of Object.entries(this.achievements)) {
      if (!categories[ach.category]) categories[ach.category] = { total: 0, unlocked: 0 };
      categories[ach.category].total++;
      if (this.unlocked[id]) categories[ach.category].unlocked++;
    }
    return categories;
  }

  /**
   * Get all achievements with unlock status
   */
  getAll() {
    return Object.entries(this.achievements).map(([id, ach]) => ({
      id,
      ...ach,
      unlocked: !!this.unlocked[id],
      unlockedAt: this.unlocked[id]?.unlockedAt || null,
    }));
  }

  // Toast notification system

  _createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'achievement-toasts';
    this.toastContainer.style.cssText = `
      position: fixed; top: 80px; right: 20px; z-index: 10000;
      display: flex; flex-direction: column; gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(this.toastContainer);
  }

  showToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="ach-toast-icon">${achievement.icon}</div>
      <div class="ach-toast-text">
        <div class="ach-toast-title">Achievement Unlocked!</div>
        <div class="ach-toast-name">${achievement.name}</div>
        <div class="ach-toast-desc">${achievement.description}</div>
      </div>
    `;
    this.toastContainer.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('ach-toast-dismiss');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Persistence

  save() {
    try {
      const data = {
        unlocked: this.unlocked,
        stats: {
          ...this.stats,
          nationsPlayed: [...this.stats.nationsPlayed],
        },
      };
      localStorage.setItem('warzone_achievements', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem('warzone_achievements');
      if (raw) {
        const data = JSON.parse(raw);
        this.unlocked = data.unlocked || {};
        if (data.stats) {
          Object.assign(this.stats, data.stats);
          if (Array.isArray(data.stats.nationsPlayed)) {
            this.stats.nationsPlayed = new Set(data.stats.nationsPlayed);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }

  dispose() {
    this.toastContainer?.remove();
  }
}
