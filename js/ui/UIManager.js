import { NATIONS, NATION_ABILITIES, CHALLENGE_SCENARIOS } from '../core/Constants.js';
import { HUD } from './HUD.js';
import { GameOverScreen } from './GameOverScreen.js';
import { CreditsScreen } from './CreditsScreen.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.mainMenuEl = document.getElementById('main-menu');
    this.nationSelectEl = document.getElementById('nation-select');
    this.multiplayerScreenEl = document.getElementById('multiplayer-screen');
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

    // Multiplayer lobby state
    this._mpReady = [false, false];
    this._mpNations = [null, null];
    this._mpIsHost = false;
    this._mpRoomCode = null;

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
      if (!this.game.networkManager) {
        this._showComingSoon('Multiplayer is loading...');
        return;
      }
      this.showMultiplayerScreen();
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
    this.multiplayerScreenEl?.classList.add('hidden');
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

  // =========================================================
  // Multiplayer Lobby
  // =========================================================

  showMultiplayerScreen() {
    this.hideAll();
    this.multiplayerScreenEl?.classList.remove('hidden');

    // Reset to browse view
    const browseView = document.getElementById('mp-browse-view');
    const lobbyView = document.getElementById('mp-lobby-view');
    browseView?.classList.remove('hidden');
    lobbyView?.classList.add('hidden');
    this._setMpStatus('');

    // Wire up buttons if not already done
    if (!this._mpWired) {
      this._mpWired = true;
      this._wireMultiplayerUI();
    }
  }

  _wireMultiplayerUI() {
    const nm = this.game.networkManager;

    // Back button
    document.getElementById('mp-back-btn')?.addEventListener('click', () => {
      if (nm) nm.disconnect();
      this.showMainMenu();
    });

    // Create Game
    document.getElementById('mp-create-btn')?.addEventListener('click', async () => {
      if (!nm) return;
      this._setMpStatus('Connecting...');
      try {
        await nm.connect();
        this._setMpStatus('Creating room...');
        const data = await nm.createRoom({ playerName: 'Player' });
        this._showLobby(data.room.code, true, data.room);
      } catch (e) {
        this._setMpStatus('Error: ' + (e.message || 'Connection failed'));
      }
    });

    // Join Game
    document.getElementById('mp-join-btn')?.addEventListener('click', async () => {
      if (!nm) return;
      const code = document.getElementById('mp-join-code')?.value.trim().toUpperCase();
      if (!code) {
        this._setMpStatus('Enter a room code');
        return;
      }
      this._setMpStatus('Connecting...');
      try {
        await nm.connect();
        this._setMpStatus('Joining room...');
        const data = await nm.joinRoom(code, { playerName: 'Player' });
        this._showLobby(data.room.code, false, data.room);
      } catch (e) {
        this._setMpStatus('Error: ' + (e.message || 'Could not join'));
      }
    });

    // Browse Games
    document.getElementById('mp-browse-btn')?.addEventListener('click', async () => {
      if (!nm) return;
      this._setMpStatus('Fetching rooms...');
      try {
        await nm.connect();
        const rooms = await nm.listRooms();
        this._showRoomList(rooms);
      } catch (e) {
        this._setMpStatus('Error: ' + (e.message || 'Could not fetch rooms'));
      }
    });

    // Room code copy
    document.getElementById('mp-room-code')?.addEventListener('click', () => {
      const code = this._mpRoomCode;
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          this._addSystemChatMessage('Room code copied to clipboard');
        });
      }
    });

    // Nation buttons in lobby
    document.querySelectorAll('.mp-nation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nation = btn.dataset.mpNation;
        if (!nation || !nm) return;
        nm.setNation(nation);
        // Visual feedback
        document.querySelectorAll('.mp-nation-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Ready button
    document.getElementById('mp-ready-btn')?.addEventListener('click', () => {
      if (!nm) return;
      nm.ready();
    });

    // Voice chat mic toggle button in lobby
    const voiceBtn = document.getElementById('mp-voice-btn');
    if (voiceBtn) {
      // Track lobby mic-mute preference (applied when VoiceChat starts)
      this._voiceMuted = false;
      voiceBtn.classList.add('voice-active');
      voiceBtn.addEventListener('click', () => {
        this._voiceMuted = !this._voiceMuted;
        voiceBtn.classList.toggle('voice-active', !this._voiceMuted);
        voiceBtn.classList.toggle('voice-muted', this._voiceMuted);
        voiceBtn.textContent = this._voiceMuted ? 'MIC OFF' : 'MIC';
        // If voice chat is already active (during game), toggle it live
        if (this.game.voiceChat && this.game.voiceChat.isActive) {
          this.game.voiceChat.toggleMute();
        }
      });
    }

    // Chat
    const sendChat = () => {
      const input = document.getElementById('mp-chat-input');
      const text = input?.value.trim();
      if (text && nm) {
        nm.sendChat(text);
        input.value = '';
      }
    };
    document.getElementById('mp-chat-send')?.addEventListener('click', sendChat);
    document.getElementById('mp-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });

    // Leave button
    document.getElementById('mp-leave-btn')?.addEventListener('click', () => {
      if (nm) nm.disconnect();
      this.showMultiplayerScreen();
    });

    // Enter key on room code input
    document.getElementById('mp-join-code')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('mp-join-btn')?.click();
    });

    // Register network callbacks
    this._registerNetworkCallbacks();
  }

  _registerNetworkCallbacks() {
    const nm = this.game.networkManager;
    if (!nm) return;

    nm.onPlayerJoined((msg) => {
      this.updateLobbyPlayer(msg.slot, msg.nation, false);
      this._addSystemChatMessage(`${msg.name || 'Player'} joined`);
    });

    nm.onPlayerLeft((msg) => {
      this.updateLobbyPlayer(msg.slot, null, false);
      this._mpReady[msg.slot] = false;
      const nationEl = document.getElementById(`mp-nation-${msg.slot}`);
      if (nationEl) {
        nationEl.textContent = 'Waiting for player...';
        nationEl.classList.remove('has-nation');
      }
      this._addSystemChatMessage(`${msg.name || 'Player'} left`);
    });

    nm.onNationChanged((msg) => {
      this._mpNations[msg.slot] = msg.nation;
      this.updateLobbyPlayer(msg.slot, msg.nation, this._mpReady[msg.slot]);
    });

    nm.onCountdown((seconds) => {
      const el = document.getElementById('mp-countdown');
      if (el) {
        el.classList.remove('hidden');
        el.textContent = seconds;
      }
      const readyBtn = document.getElementById('mp-ready-btn');
      if (readyBtn) readyBtn.disabled = true;
    });

    nm.onGameStart((msg) => {
      // msg = { type: 'game_start', options: { mapTemplate, gameMode, mapSeed }, players: [{ name, nation }, { name, nation }] }
      const mySlot = nm.slot;
      const opponentSlot = mySlot === 0 ? 1 : 0;
      const myNation = msg.players[mySlot]?.nation;
      const opponentNation = msg.players[opponentSlot]?.nation;

      this.hideAll();
      this.game.startGame({
        mode: 'MULTIPLAYER',
        playerNation: myNation,
        enemyNation: opponentNation,
        difficulty: 'normal',
        mapTemplate: msg.options.mapTemplate || 'continental',
        mapSeed: msg.options.mapSeed,
        gameMode: msg.options.gameMode || 'annihilation',
        seed: msg.options.mapSeed,
        multiplayer: true,
        roomCode: nm.roomCode,
        playerSlot: mySlot,
        opponentNation: opponentNation
      });
    });

    nm.onChat((msg) => {
      this.addChatMessage(msg.name, msg.text);
    });

    nm.onGamePaused((reason) => {
      this._addSystemChatMessage('Game paused: ' + reason);
    });

    nm.onGameResumed(() => {
      this._addSystemChatMessage('Game resumed');
    });

    nm.onGameOver((msg) => {
      const won = msg.winner === nm.slot;
      this.showGameOver(won);
    });

    nm.onError((err) => {
      const message = err?.message || 'Unknown error';
      this._setMpStatus('Error: ' + message);
      this._addSystemChatMessage('Error: ' + message);
    });

    nm.onDisconnect(() => {
      this._setMpStatus('Disconnected from server');
    });
  }

  _showLobby(roomCode, isHost, roomData) {
    this._mpRoomCode = roomCode;
    this._mpIsHost = isHost;
    this._mpReady = [false, false];

    const browseView = document.getElementById('mp-browse-view');
    const lobbyView = document.getElementById('mp-lobby-view');
    browseView?.classList.add('hidden');
    lobbyView?.classList.remove('hidden');

    // Set room code
    const codeEl = document.getElementById('mp-room-code');
    if (codeEl) codeEl.textContent = roomCode;

    // Clear chat
    const chatEl = document.getElementById('mp-chat-messages');
    if (chatEl) chatEl.innerHTML = '';

    // Reset countdown
    const countdownEl = document.getElementById('mp-countdown');
    if (countdownEl) {
      countdownEl.classList.add('hidden');
      countdownEl.textContent = '';
    }

    // Reset ready button
    const readyBtn = document.getElementById('mp-ready-btn');
    if (readyBtn) readyBtn.disabled = false;

    // Reset nation buttons
    document.querySelectorAll('.mp-nation-btn').forEach(b => b.classList.remove('selected'));

    // Populate slots from room data
    if (roomData && roomData.players) {
      roomData.players.forEach((p, i) => {
        if (p) {
          this.updateLobbyPlayer(i, p.nation, false);
        } else {
          this.updateLobbyPlayer(i, null, false);
        }
      });
    }

    this._addSystemChatMessage(`Room ${roomCode} - ${isHost ? 'You are the host' : 'You joined'}`);
  }

  updateLobbyPlayer(slot, nation, ready) {
    if (slot < 0 || slot > 1) return;
    this._mpNations[slot] = nation;
    this._mpReady[slot] = ready;

    const nationEl = document.getElementById(`mp-nation-${slot}`);
    const readyEl = document.getElementById(`mp-ready-${slot}`);

    if (nationEl) {
      if (nation) {
        const capitalized = nation.charAt(0).toUpperCase() + nation.slice(1);
        nationEl.textContent = capitalized;
        nationEl.classList.add('has-nation');
      } else {
        nationEl.textContent = slot === 0 ? 'No nation selected' : 'Waiting for player...';
        nationEl.classList.remove('has-nation');
      }
    }

    if (readyEl) {
      readyEl.textContent = ready ? 'READY' : 'NOT READY';
      readyEl.classList.toggle('is-ready', ready);
    }
  }

  addChatMessage(from, text) {
    const container = document.getElementById('mp-chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'mp-chat-msg';
    msg.innerHTML = `<span class="mp-chat-msg-name">${this._escapeHtml(from)}:</span> <span class="mp-chat-msg-text">${this._escapeHtml(text)}</span>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  _addSystemChatMessage(text) {
    const container = document.getElementById('mp-chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'mp-chat-msg';
    msg.innerHTML = `<span class="mp-chat-msg-system">${this._escapeHtml(text)}</span>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  _setMpStatus(text) {
    const el = document.getElementById('mp-status');
    if (el) el.textContent = text;
  }

  _showRoomList(rooms) {
    const listEl = document.getElementById('mp-room-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!rooms || rooms.length === 0) {
      listEl.innerHTML = '<div style="color:#556;padding:12px;font-size:13px;">No games available. Create one!</div>';
      listEl.classList.remove('hidden');
      this._setMpStatus('');
      return;
    }

    for (const room of rooms) {
      const item = document.createElement('div');
      item.className = 'mp-room-item';
      item.innerHTML = `
        <div>
          <span class="mp-room-item-name">${this._escapeHtml(room.name || room.code)}</span>
          <span class="mp-room-item-info" style="margin-left:10px;">${room.playerCount}/2 players</span>
        </div>
        <span class="mp-room-item-info">${room.code}</span>
      `;
      item.addEventListener('click', async () => {
        const nm = this.game.networkManager;
        if (!nm) return;
        this._setMpStatus('Joining...');
        try {
          const data = await nm.joinRoom(room.code, { playerName: 'Player' });
          this._showLobby(data.room.code, false, data.room);
        } catch (e) {
          this._setMpStatus('Error: ' + (e.message || 'Could not join'));
        }
      });
      listEl.appendChild(item);
    }

    listEl.classList.remove('hidden');
    this._setMpStatus(`${rooms.length} game(s) found`);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
