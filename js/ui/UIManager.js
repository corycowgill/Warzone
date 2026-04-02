import { NATIONS } from '../core/Constants.js';
import { HUD } from './HUD.js';
import { GameOverScreen } from './GameOverScreen.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.mainMenuEl = document.getElementById('main-menu');
    this.nationSelectEl = document.getElementById('nation-select');
    this.hudEl = document.getElementById('hud');
    this.gameOverEl = document.getElementById('game-over');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.matchHistoryEl = document.getElementById('match-history');
    this.hud = null;
    this.gameOverScreen = null;

    // Nation selection state
    this.selectedPlayerNation = null;
    this.selectedEnemyNation = null;
    this.selectedDifficulty = 'normal';
    this.selectedMap = 'continental';
    this.selectedGameMode = 'annihilation';

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Main menu buttons
    document.getElementById('btn-1player')?.addEventListener('click', () => {
      this.game.mode = '1P';
      this.showNationSelect();
    });

    document.getElementById('btn-2player')?.addEventListener('click', () => {
      this.game.mode = '2P';
      this.showNationSelect();
    });

    document.getElementById('btn-spectate')?.addEventListener('click', () => {
      this.game.mode = 'SPECTATE';
      this.showNationSelect();
    });

    // Nation selection - allied cards
    const alliedCards = document.querySelectorAll('.nation-card[data-side="allied"], .nation-card[data-nation="america"], .nation-card[data-nation="britain"], .nation-card[data-nation="france"]');
    alliedCards.forEach(card => {
      card.addEventListener('click', () => {
        const nation = card.getAttribute('data-nation');
        if (!nation) return;
        const nationData = NATIONS[nation];
        if (!nationData || nationData.side !== 'allied') return;

        // Deselect other allied cards
        alliedCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPlayerNation = nation;
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) startBtn.disabled = false;
      });
    });

    // Nation selection - enemy cards (for 2P mode)
    const enemyCards = document.querySelectorAll('.nation-card[data-side="enemy"], .nation-card[data-nation="japan"], .nation-card[data-nation="germany"], .nation-card[data-nation="austria"]');
    enemyCards.forEach(card => {
      card.addEventListener('click', () => {
        const nation = card.getAttribute('data-nation');
        if (!nation) return;
        const nationData = NATIONS[nation];
        if (!nationData || nationData.side !== 'enemy') return;

        // In 2P mode, allow selecting enemy nation
        if (this.game.mode === '2P') {
          enemyCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedEnemyNation = nation;
        }
      });
    });

    // Also handle generic nation-card clicks in case markup doesn't use data-side
    const allNationCards = document.querySelectorAll('.nation-card');
    if (alliedCards.length === 0 && allNationCards.length > 0) {
      allNationCards.forEach(card => {
        card.addEventListener('click', () => {
          const nation = card.getAttribute('data-nation');
          if (!nation || !NATIONS[nation]) return;

          const nationData = NATIONS[nation];

          if (nationData.side === 'allied') {
            // Select as player nation
            allNationCards.forEach(c => {
              const n = c.getAttribute('data-nation');
              if (n && NATIONS[n] && NATIONS[n].side === 'allied') {
                c.classList.remove('selected');
              }
            });
            card.classList.add('selected');
            this.selectedPlayerNation = nation;
            const startBtn = document.getElementById('btn-start-game');
            if (startBtn) startBtn.disabled = false;
          } else if (nationData.side === 'enemy' && this.game.mode === '2P') {
            // Select as enemy nation in 2P
            allNationCards.forEach(c => {
              const n = c.getAttribute('data-nation');
              if (n && NATIONS[n] && NATIONS[n].side === 'enemy') {
                c.classList.remove('selected');
              }
            });
            card.classList.add('selected');
            this.selectedEnemyNation = nation;
          }
        });
      });
    }

    // Start game button
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.handleStartGame();
    });

    // Back button in nation select
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Difficulty selection buttons
    const difficultyDescs = {
      easy: 'Relaxed AI with slower build-up and weaker attacks.',
      normal: 'Standard AI with varied strategies and smart targeting.',
      hard: 'Aggressive AI with resource bonuses and relentless pressure.'
    };
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.difficulty;
        if (!diff) return;
        this.selectedDifficulty = diff;
        // Update button styles
        document.querySelectorAll('.difficulty-btn').forEach(b => {
          b.classList.remove('selected');
          b.style.background = 'rgba(22,33,62,0.6)';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('selected');
        btn.style.background = 'rgba(0,255,65,0.1)';
        btn.style.borderColor = '#00ff41';
        btn.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
        // Update description
        const descEl = document.getElementById('difficulty-desc');
        if (descEl) descEl.textContent = difficultyDescs[diff] || '';
      });
    });

    // Map selection buttons
    const mapDescs = {
      random: 'Randomly selected map template.',
      continental: 'Large landmass with water on one side.',
      islands: 'Archipelago map — naval control is key.',
      river: 'Two landmasses split by a river with crossing points.',
      plains: 'Wide open terrain with minimal water.'
    };
    document.querySelectorAll('.map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const map = btn.dataset.map;
        if (!map) return;
        this.selectedMap = map;
        document.querySelectorAll('.map-btn').forEach(b => {
          b.classList.remove('selected');
          b.style.background = 'rgba(22,33,62,0.6)';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('selected');
        btn.style.background = 'rgba(0,255,65,0.1)';
        btn.style.borderColor = '#00ff41';
        btn.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
        const descEl = document.getElementById('map-desc');
        if (descEl) descEl.textContent = mapDescs[map] || '';
      });
    });

    // Game mode selection
    const gamemodeDescs = {
      annihilation: 'Destroy all enemy buildings and units to win.',
      timed: '10-minute match. Most units + buildings remaining wins.',
      king_of_hill: 'Control the center of the map for 120 seconds to win.',
      survival: 'Survive waves of enemies! Waves every 90s, escalating difficulty.'
    };
    document.querySelectorAll('.gamemode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.gamemode;
        if (!mode) return;
        this.selectedGameMode = mode;
        document.querySelectorAll('.gamemode-btn').forEach(b => {
          b.classList.remove('selected');
          b.style.background = 'rgba(22,33,62,0.6)';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('selected');
        btn.style.background = 'rgba(0,255,65,0.1)';
        btn.style.borderColor = '#00ff41';
        btn.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
        const descEl = document.getElementById('gamemode-desc');
        if (descEl) descEl.textContent = gamemodeDescs[mode] || '';
      });
    });

    // Game over buttons
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.game.restart();
    });

    document.getElementById('btn-main-menu')?.addEventListener('click', () => {
      this.game.restart();
    });

    // Match history button
    document.getElementById('btn-history')?.addEventListener('click', () => {
      this.showMatchHistory();
    });
    document.getElementById('btn-close-history')?.addEventListener('click', () => {
      this.hideMatchHistory();
    });

    // Pause overlay toggle (UIManager is a singleton, listener persists for app lifetime)
    this._pauseStateListener = (data) => {
      if (data.state === 'PAUSED') {
        this.pauseOverlay?.classList.remove('hidden');
      } else {
        this.pauseOverlay?.classList.add('hidden');
      }
    };
    this.game.eventBus.on('game:stateChange', this._pauseStateListener);

    // GD-077: Surrender button + confirmation dialog
    const surrenderConfirm = document.getElementById('surrender-confirm');
    document.getElementById('btn-surrender')?.addEventListener('click', () => {
      surrenderConfirm?.classList.remove('hidden');
    });
    document.getElementById('btn-surrender-no')?.addEventListener('click', () => {
      surrenderConfirm?.classList.add('hidden');
    });
    document.getElementById('btn-surrender-yes')?.addEventListener('click', () => {
      surrenderConfirm?.classList.add('hidden');
      this.pauseOverlay?.classList.add('hidden');
      this.game.paused = false;
      this.game.setState('GAME_OVER');
      this.showGameOver(false);
      if (this.game.soundManager) this.game.soundManager.play('defeat');
      this.game.saveMatchHistory(false);
    });

    // Options panel
    this.optionsPanel = document.getElementById('options-panel');
    document.getElementById('btn-options')?.addEventListener('click', () => {
      this.toggleOptions();
    });
    document.getElementById('btn-help')?.addEventListener('click', () => {
      // Toggle keyboard help
      const helpEl = document.getElementById('keyboard-help');
      if (helpEl) {
        helpEl.style.display = helpEl.style.display === 'none' ? 'block' : 'none';
      }
    });
    document.getElementById('btn-close-options')?.addEventListener('click', () => {
      this.hideOptions();
    });
    document.getElementById('opt-volume')?.addEventListener('input', (e) => {
      if (this.game.soundManager) {
        this.game.soundManager.setVolume(parseInt(e.target.value) / 100);
      }
    });
    document.getElementById('opt-sound')?.addEventListener('change', (e) => {
      if (this.game.soundManager) {
        this.game.soundManager.setEnabled(e.target.checked);
      }
    });
    document.getElementById('opt-music-volume')?.addEventListener('input', (e) => {
      if (this.game.soundManager) {
        this.game.soundManager.setMusicVolume(parseInt(e.target.value) / 100);
      }
    });
    document.getElementById('opt-music')?.addEventListener('change', (e) => {
      if (this.game.soundManager) {
        this.game.soundManager.setMusicEnabled(e.target.checked);
      }
    });
    document.getElementById('opt-camspeed')?.addEventListener('input', (e) => {
      if (this.game.cameraController) {
        this.game.cameraController.moveSpeed = parseInt(e.target.value);
      }
    });
  }

  toggleOptions() {
    if (this.optionsPanel) {
      this.optionsPanel.classList.toggle('hidden');
    }
  }

  hideOptions() {
    if (this.optionsPanel) {
      this.optionsPanel.classList.add('hidden');
    }
  }

  handleStartGame() {
    // Validate player nation is selected
    if (!this.selectedPlayerNation) {
      this.showNotification('Please select your nation');
      return;
    }

    let enemyNation = this.selectedEnemyNation;

    if (this.game.mode === '1P' || this.game.mode === 'SPECTATE') {
      // Auto-select a random enemy nation for AI
      const enemyNations = Object.keys(NATIONS).filter(n => NATIONS[n].side === 'enemy');
      enemyNation = enemyNations[Math.floor(Math.random() * enemyNations.length)];

      // In spectate mode, also auto-select player nation if not chosen
      if (this.game.mode === 'SPECTATE' && !this.selectedPlayerNation) {
        const alliedNations = Object.keys(NATIONS).filter(n => NATIONS[n].side === 'allied');
        this.selectedPlayerNation = alliedNations[Math.floor(Math.random() * alliedNations.length)];
      }
    } else if (this.game.mode === '2P' && !enemyNation) {
      this.showNotification('Player 2: Please select your nation');
      return;
    }

    // Resolve random map
    let mapTemplate = this.selectedMap;
    if (mapTemplate === 'random') {
      const templates = ['continental', 'islands', 'river', 'plains'];
      mapTemplate = templates[Math.floor(Math.random() * templates.length)];
    }

    // Get optional seed
    const seedInput = document.getElementById('map-seed-input');
    const mapSeed = seedInput && seedInput.value.trim() ? parseInt(seedInput.value.trim()) || null : null;

    // Start the game
    this.game.startGame({
      mode: this.game.mode,
      playerNation: this.selectedPlayerNation,
      enemyNation: enemyNation,
      difficulty: this.selectedDifficulty,
      mapTemplate: mapTemplate,
      mapSeed: mapSeed,
      gameMode: this.selectedGameMode
    });
  }

  showNotification(message) {
    // Create a temporary notification
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 15px 30px;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 16px;
      z-index: 10000;
      pointer-events: none;
      transition: opacity 0.5s;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = '0';
      setTimeout(() => notif.remove(), 500);
    }, 2000);
  }

  hideAll() {
    this.mainMenuEl?.classList.add('hidden');
    this.nationSelectEl?.classList.add('hidden');
    this.hudEl?.classList.add('hidden');
    this.gameOverEl?.classList.add('hidden');
    this.pauseOverlay?.classList.add('hidden');
    this.matchHistoryEl?.classList.add('hidden');
  }

  showMainMenu() {
    this.hideAll();
    this.mainMenuEl?.classList.remove('hidden');

    // Reset selections
    this.selectedPlayerNation = null;
    this.selectedEnemyNation = null;
    document.querySelectorAll('.nation-card').forEach(c => c.classList.remove('selected'));
  }

  showNationSelect() {
    this.hideAll();
    this.nationSelectEl?.classList.remove('hidden');

    // Show/hide enemy nation selection based on mode
    const enemyPanel = document.querySelector('.enemy-panel');
    if (enemyPanel) {
      if (this.game.mode === '1P' || this.game.mode === 'SPECTATE') {
        enemyPanel.style.opacity = '0.5';
        enemyPanel.style.pointerEvents = 'none';
        enemyPanel.querySelector('.panel-header').textContent = 'Enemy Nation (Auto)';
      } else {
        enemyPanel.style.opacity = '1';
        enemyPanel.style.pointerEvents = 'auto';
        enemyPanel.querySelector('.panel-header').textContent = 'Enemy Nation';
      }
    }

    // Reset selections when re-entering nation select
    this.selectedPlayerNation = null;
    this.selectedEnemyNation = null;
    this.selectedDifficulty = 'normal';
    this.selectedMap = 'continental';
    this.selectedGameMode = 'annihilation';
    document.querySelectorAll('.nation-card').forEach(c => c.classList.remove('selected'));

    // Reset button visual states to defaults
    const resetBtnGroup = (selector, defaultAttr, defaultVal) => {
      document.querySelectorAll(selector).forEach(b => {
        b.classList.remove('selected');
        b.style.background = 'rgba(22,33,62,0.6)';
        b.style.borderColor = 'rgba(255,255,255,0.08)';
        b.style.boxShadow = 'none';
      });
      const def = document.querySelector(`${selector}[${defaultAttr}="${defaultVal}"]`);
      if (def) {
        def.classList.add('selected');
        def.style.background = 'rgba(0,255,65,0.1)';
        def.style.borderColor = '#00ff41';
        def.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
      }
    };
    resetBtnGroup('.difficulty-btn', 'data-difficulty', 'normal');
    resetBtnGroup('.map-btn', 'data-map', 'continental');
    resetBtnGroup('.gamemode-btn', 'data-gamemode', 'annihilation');

    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) startBtn.disabled = true;
  }

  showHUD() {
    this.hideAll();
    this.hudEl?.classList.remove('hidden');

    if (!this.hud) {
      this.hud = new HUD(this.game);
    }
    this.hud.show();

    // Create GameOverScreen early so it tracks stats from game start
    if (!this.gameOverScreen) {
      this.gameOverScreen = new GameOverScreen(this.game);
    }
  }

  updateHUD() {
    if (this.hud && (this.game.state === 'PLAYING' || this.game.state === 'PAUSED')) {
      this.hud.update();
    }
  }

  showMatchHistory() {
    if (!this.matchHistoryEl) return;
    const list = document.getElementById('match-history-list');
    if (!list) return;

    try {
      const history = JSON.parse(localStorage.getItem('warzone_history') || '[]');
      if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#666;">No matches played yet.</p>';
      } else {
        let html = '';
        // Show newest first
        for (let i = history.length - 1; i >= 0; i--) {
          const m = history[i];
          const isWin = m.result === 'victory';
          const mins = Math.floor((m.duration || 0) / 60);
          const secs = (m.duration || 0) % 60;
          const date = new Date(m.date).toLocaleDateString();
          html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:4px;background:${isWin ? 'rgba(0,255,65,0.08)' : 'rgba(255,0,0,0.08)'};border:1px solid ${isWin ? '#335533' : '#553333'};border-radius:4px;font-size:12px;">
              <div>
                <span style="color:${isWin ? '#00ff44' : '#ff4444'};font-weight:bold;">${isWin ? 'VICTORY' : 'DEFEAT'}</span>
                <span style="color:#888;margin-left:8px;">${date}</span>
              </div>
              <div style="color:#aaa;">
                ${(m.playerNation || '?').charAt(0).toUpperCase() + (m.playerNation || '').slice(1)} vs ${(m.enemyNation || '?').charAt(0).toUpperCase() + (m.enemyNation || '').slice(1)}
                <span style="color:#666;margin-left:8px;">${mins}:${secs.toString().padStart(2, '0')}</span>
                <span style="color:#666;margin-left:8px;">${(m.difficulty || 'normal').charAt(0).toUpperCase() + (m.difficulty || '').slice(1)}</span>
              </div>
            </div>
          `;
        }
        list.innerHTML = html;
      }
    } catch (e) {
      list.innerHTML = '<p style="text-align:center;color:#666;">Could not load match history.</p>';
    }

    this.matchHistoryEl.classList.remove('hidden');
  }

  hideMatchHistory() {
    if (this.matchHistoryEl) this.matchHistoryEl.classList.add('hidden');
  }

  showGameOver(won) {
    this.hideAll();
    this.gameOverEl?.classList.remove('hidden');

    if (!this.gameOverScreen) {
      this.gameOverScreen = new GameOverScreen(this.game);
    }
    this.gameOverScreen.show(won);
  }
}
