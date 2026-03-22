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
    this.hud = null;
    this.gameOverScreen = null;

    // Nation selection state
    this.selectedPlayerNation = null;
    this.selectedEnemyNation = null;

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

    // Game over buttons
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.game.restart();
    });

    document.getElementById('btn-main-menu')?.addEventListener('click', () => {
      this.game.restart();
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

    if (this.game.mode === '1P') {
      // Auto-select a random enemy nation for AI
      const enemyNations = Object.keys(NATIONS).filter(n => NATIONS[n].side === 'enemy');
      enemyNation = enemyNations[Math.floor(Math.random() * enemyNations.length)];
    } else if (this.game.mode === '2P' && !enemyNation) {
      this.showNotification('Player 2: Please select your nation');
      return;
    }

    // Start the game
    this.game.startGame({
      mode: this.game.mode,
      playerNation: this.selectedPlayerNation,
      enemyNation: enemyNation
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
      if (this.game.mode === '1P') {
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
    document.querySelectorAll('.nation-card').forEach(c => c.classList.remove('selected'));
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
  }

  showGameOver(won) {
    this.hideAll();
    this.gameOverEl?.classList.remove('hidden');

    if (!this.gameOverScreen) {
      this.gameOverScreen = new GameOverScreen(this.game);
    }
    this.gameOverScreen.show(won);
  }

  updateHUD() {
    if (this.hud && this.game.state === 'PLAYING') {
      this.hud.update();
    }
  }
}
