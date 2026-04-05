import { NATIONS, NATION_ABILITIES, CHALLENGE_SCENARIOS } from '../core/Constants.js';
import { HUD } from './HUD.js';
import { GameOverScreen } from './GameOverScreen.js';
import { CreditsScreen } from './CreditsScreen.js';

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
    this.selectedBiome = 'temperate';

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

    document.getElementById('btn-tutorial')?.addEventListener('click', () => {
      this.hideAll();
      this.game.startGame({
        mode: '1P',
        playerNation: 'america',
        enemyNation: 'germany',
        difficulty: 'easy',
        mapTemplate: 'plains',
        gameMode: 'tutorial'
      });
    });

    // New menu buttons
    document.getElementById('btn-campaign')?.addEventListener('click', () => {
      if (this.game.campaignManager) {
        this.game.campaignManager.showCampaignMenu();
      } else {
        this._showComingSoon('Campaign mode is loading...');
      }
    });

    document.getElementById('btn-multiplayer')?.addEventListener('click', () => {
      if (this.game.networkManager) {
        this.game.networkManager.showLobby();
      } else {
        this._showComingSoon('Multiplayer is loading...');
      }
    });

    document.getElementById('btn-map-editor')?.addEventListener('click', () => {
      if (this.game.mapEditor) {
        this.game.mapEditor.open();
      } else {
        this._showComingSoon('Map Editor is loading...');
      }
    });

    document.getElementById('btn-replays')?.addEventListener('click', () => {
      if (this.game.replaySystem) {
        this.game.replaySystem.showBrowser();
      } else {
        this._showComingSoon('Replay system is loading...');
      }
    });

    document.getElementById('btn-settings-menu')?.addEventListener('click', () => {
      if (this.game.settingsUI) {
        this.game.settingsUI.open();
      }
    });

    // Credits screen
    this._creditsScreen = new CreditsScreen();
    document.getElementById('btn-credits')?.addEventListener('click', () => {
      this._creditsScreen.open();
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
      kids: 'Super easy! Your units are nearly invincible. Perfect for young players.',
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

    // Biome selection buttons
    const biomeDescs = {
      temperate: 'Green grass and blue water.',
      desert: 'Sandy dunes with oasis water.',
      arctic: 'Snow and ice with frigid waters.'
    };
    document.querySelectorAll('.biome-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const biome = btn.dataset.biome;
        if (!biome) return;
        this.selectedBiome = biome;
        document.querySelectorAll('.biome-btn').forEach(b => {
          b.classList.remove('selected');
          b.style.background = 'rgba(22,33,62,0.6)';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('selected');
        btn.style.background = 'rgba(0,255,65,0.1)';
        btn.style.borderColor = '#00ff41';
        btn.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
        const descEl = document.getElementById('biome-desc');
        if (descEl) descEl.textContent = biomeDescs[biome] || '';
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

    // GD-134: Challenges button
    document.getElementById('btn-challenges')?.addEventListener('click', () => {
      this.showChallengeSelect();
    });
    document.getElementById('btn-challenge-back')?.addEventListener('click', () => {
      this.showMainMenu();
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

    // Save/Load buttons in pause menu
    this._setupSaveLoadUI();

    // Options panel
    this.optionsPanel = document.getElementById('options-panel');
    document.getElementById('btn-options')?.addEventListener('click', () => {
      // Use new settings UI if available, fall back to old options panel
      if (this.game.settingsUI) {
        this.game.settingsUI.toggle();
      } else {
        this.toggleOptions();
      }
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
      gameMode: this.selectedGameMode,
      biome: this.selectedBiome
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
    document.getElementById('challenge-select')?.classList.add('hidden');
  }

  // GD-134: Show challenge scenario selection
  showChallengeSelect() {
    this.hideAll();
    const el = document.getElementById('challenge-select');
    if (!el) return;
    el.classList.remove('hidden');

    const listEl = document.getElementById('challenge-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // Load saved scores
    const saved = JSON.parse(localStorage.getItem('warzone_challenges') || '{}');

    for (const [key, scenario] of Object.entries(CHALLENGE_SCENARIOS)) {
      const best = saved[key] || { stars: 0, bestTime: null };
      const starsStr = '\u2605'.repeat(best.stars) + '\u2606'.repeat(3 - best.stars);

      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(22, 33, 62, 0.6);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        padding: 12px 16px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:#00ff41;font-size:15px;">${scenario.name}</strong>
          <span style="color:#ffcc00;font-size:18px;letter-spacing:2px;">${starsStr}</span>
        </div>
        <div style="color:#8a9aaa;font-size:12px;margin-top:4px;">${scenario.description}</div>
        ${scenario.timeLimit > 0 ? `<div style="color:#ff8844;font-size:11px;margin-top:4px;">Time Limit: ${Math.floor(scenario.timeLimit / 60)}m</div>` : ''}
        ${best.bestTime ? `<div style="color:#88ff88;font-size:11px;">Best: ${Math.floor(best.bestTime / 60)}m ${Math.floor(best.bestTime % 60)}s</div>` : ''}
      `;
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#00ff41';
        card.style.background = 'rgba(0, 255, 65, 0.08)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(255,255,255,0.1)';
        card.style.background = 'rgba(22, 33, 62, 0.6)';
      });
      card.addEventListener('click', () => {
        this.game.startChallenge(key);
      });
      listEl.appendChild(card);
    }
  }

  _showComingSoon(message) {
    // Simple notification overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:30000;';
    overlay.innerHTML = `<div style="text-align:center;padding:40px 60px;background:rgba(15,25,35,0.95);border:1px solid rgba(0,255,65,0.2);border-radius:8px;">
      <h2 style="color:#00ff41;font-size:20px;letter-spacing:3px;margin:0 0 12px 0;">${message}</h2>
      <p style="color:#6a8a7a;font-size:13px;margin:0 0 20px 0;">This feature is being built and will be available soon.</p>
      <button onclick="this.closest('div[style]').remove()" style="padding:8px 24px;background:#1a4a2e;color:#00ff41;border:1px solid #2a6a3e;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit;">OK</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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

    // Populate nation card descriptions from Constants
    document.querySelectorAll('.nation-card').forEach(card => {
      const nationKey = card.dataset.nation;
      const nationData = NATIONS[nationKey];
      const abilityData = NATION_ABILITIES[nationKey];
      const passiveEl = card.querySelector('.nation-passive');
      const abilityEl = card.querySelector('.nation-ability');
      if (passiveEl && nationData && nationData.passiveDesc) {
        passiveEl.textContent = nationData.passiveDesc;
      }
      if (abilityEl && abilityData) {
        abilityEl.textContent = `${abilityData.name}: ${abilityData.description}`;
      }
    });

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
    // GD-139: Show dramatic VICTORY/DEFEAT overlay first
    this._showVictoryOverlay(won, () => {
      this.hideAll();
      this.gameOverEl?.classList.remove('hidden');
      if (!this.gameOverScreen) {
        this.gameOverScreen = new GameOverScreen(this.game);
      }
      this.gameOverScreen.show(won);
    });
  }

  // GD-139: Dramatic text overlay before game over screen
  _showVictoryOverlay(won, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10010;
      pointer-events: none;
      transition: opacity 0.5s;
    `;

    const text = document.createElement('div');
    text.textContent = won ? 'VICTORY' : 'DEFEAT';
    text.style.cssText = `
      font-family: 'Impact', 'Arial Black', sans-serif;
      font-size: 100px;
      font-weight: 900;
      letter-spacing: 12px;
      color: ${won ? '#00ff44' : '#ff3333'};
      text-shadow: 0 0 40px ${won ? 'rgba(0,255,65,0.6)' : 'rgba(255,0,0,0.6)'},
                   0 0 80px ${won ? 'rgba(0,255,65,0.3)' : 'rgba(255,0,0,0.3)'},
                   4px 4px 0 rgba(0,0,0,0.5);
      transform: scale(0.5);
      opacity: 0;
      transition: all 0.8s cubic-bezier(0.2, 0.8, 0.3, 1);
    `;
    overlay.appendChild(text);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      text.style.transform = 'scale(1)';
      text.style.opacity = '1';
    });

    // Camera zoom effect
    if (this.game.cameraController) {
      const cam = this.game.cameraController;
      if (won) {
        // Zoom to surviving units
        const units = this.game.getUnits('player');
        if (units.length > 0) {
          const pos = units[0].getPosition();
          cam.moveTo(pos.x, pos.z);
        }
      } else {
        // Zoom to destroyed HQ position
        const mapSize = 30; // approx player HQ position
        cam.moveTo(mapSize, mapSize);
      }
    }

    // Slow motion effect
    if (this.game) {
      this.game._slowMotion = 0.3;
      this.game._pendingTimeouts.push(setTimeout(() => {
        if (this.game) this.game._slowMotion = null;
      }, 2000));
    }

    // Remove overlay and show game over after delay
    this.game._pendingTimeouts.push(setTimeout(() => {
      overlay.style.opacity = '0';
      const innerId = setTimeout(() => {
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        callback();
      }, 500);
      if (this.game && this.game._pendingTimeouts) this.game._pendingTimeouts.push(innerId);
    }, 2500));
  }

  // =========================================================
  // Save / Load UI
  // =========================================================

  _setupSaveLoadUI() {
    const saveDialog = document.getElementById('save-load-dialog');
    const slotList = document.getElementById('save-slot-list');
    const title = document.getElementById('save-load-title');
    const fileInput = document.getElementById('save-file-input');

    // Close dialog
    document.getElementById('btn-close-save-dialog')?.addEventListener('click', () => {
      saveDialog?.classList.add('hidden');
    });

    // Save Game button
    document.getElementById('btn-save-game')?.addEventListener('click', () => {
      this._showSaveSlots('save');
    });

    // Load Game button
    document.getElementById('btn-load-game')?.addEventListener('click', () => {
      this._showSaveSlots('load');
    });

    // Export File button
    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      if (this.game.saveSystem) {
        this.game.saveSystem.exportToFile();
        this.showNotification('Save file exported!');
      }
    });

    // Import File button
    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      fileInput?.click();
    });

    // File input change
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      fileInput.value = '';
      try {
        const saveData = await this.game.saveSystem.importFromFile(file);
        await this.game.saveSystem.loadFromData(saveData);
      } catch (err) {
        this.showNotification('Load failed: ' + err.message);
        console.error('Import failed:', err);
      }
    });
  }

  _showSaveSlots(mode) {
    const saveDialog = document.getElementById('save-load-dialog');
    const slotList = document.getElementById('save-slot-list');
    const title = document.getElementById('save-load-title');
    if (!saveDialog || !slotList || !title) return;

    title.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
    slotList.innerHTML = '';

    const saves = this.game.saveSystem.listSaves();

    for (const save of saves) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:rgba(40,40,60,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:4px;';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;';

      if (save.empty) {
        info.innerHTML = `<span style="color:#666;font-size:14px;">${save.name} - Empty</span>`;
      } else {
        const elapsed = save.gameElapsed || 0;
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        const pNation = save.playerNation ? save.playerNation.charAt(0).toUpperCase() + save.playerNation.slice(1) : '?';
        const eNation = save.enemyNation ? save.enemyNation.charAt(0).toUpperCase() + save.enemyNation.slice(1) : '?';
        info.innerHTML = `
          <div style="color:#eee;font-size:14px;font-weight:bold;">${save.name}</div>
          <div style="color:#888;font-size:11px;">${save.dateString || 'Unknown date'} | ${pNation} vs ${eNation} | ${mins}m ${secs}s</div>
        `;
      }

      row.appendChild(info);

      if (mode === 'save') {
        // Save button (allow overwriting any slot, even autosave is listed but skip for save)
        if (save.slot !== '__autosave__') {
          const btn = document.createElement('button');
          btn.textContent = save.empty ? 'Save' : 'Overwrite';
          btn.style.cssText = 'padding:6px 16px;font-size:13px;font-weight:bold;background:#224422;color:#44ff44;border:1px solid #44ff44;border-radius:4px;cursor:pointer;white-space:nowrap;';
          btn.addEventListener('click', () => {
            const success = this.game.saveSystem.saveToLocal(save.slot);
            if (success) {
              this.showNotification('Game saved to ' + save.name);
              saveDialog.classList.add('hidden');
            }
          });
          row.appendChild(btn);
        }
      } else {
        // Load button (only if slot has data)
        if (!save.empty) {
          const btn = document.createElement('button');
          btn.textContent = 'Load';
          btn.style.cssText = 'padding:6px 16px;font-size:13px;font-weight:bold;background:#222244;color:#4488ff;border:1px solid #4488ff;border-radius:4px;cursor:pointer;white-space:nowrap;';
          btn.addEventListener('click', async () => {
            saveDialog.classList.add('hidden');
            try {
              await this.game.saveSystem.loadGame(save.slot);
            } catch (err) {
              this.showNotification('Load failed: ' + err.message);
              console.error('Load failed:', err);
            }
          });
          row.appendChild(btn);

          // Delete button
          const delBtn = document.createElement('button');
          delBtn.textContent = 'X';
          delBtn.title = 'Delete save';
          delBtn.style.cssText = 'padding:6px 10px;font-size:13px;font-weight:bold;background:#442222;color:#ff4444;border:1px solid #ff4444;border-radius:4px;cursor:pointer;';
          delBtn.addEventListener('click', () => {
            this.game.saveSystem.deleteSave(save.slot);
            this._showSaveSlots(mode); // Refresh
          });
          row.appendChild(delBtn);
        }
      }

      slotList.appendChild(row);
    }

    saveDialog.classList.remove('hidden');
  }
}
