export class GameOverScreen {
  constructor(game) {
    this.game = game;
    this.containerEl = document.getElementById('game-over');
    this.contentEl = null;
    this.gameStartTime = Date.now();

    // Track stats via event bus
    this.stats = {
      unitsProduced: 0,
      unitsLost: 0,
      enemiesKilled: 0,
      buildingsBuilt: 0,
      buildingsLost: 0
    };

    this.setupTracking();
    this.createContent();
  }

  setupTracking() {
    this._listeners = [];
    const on = (event, fn) => {
      this.game.eventBus.on(event, fn);
      this._listeners.push({ event, fn });
    };

    on('game:stateChange', (data) => {
      if (data.state === 'PLAYING') {
        this.gameStartTime = Date.now();
        this.resetStats();
      }
    });

    on('unit:created', (data) => {
      if (data.unit && data.unit.team === 'player') {
        this.stats.unitsProduced++;
      }
    });

    on('unit:destroyed', (data) => {
      if (data.entity) {
        if (data.entity.team === 'player') {
          this.stats.unitsLost++;
        } else {
          this.stats.enemiesKilled++;
        }
      }
    });

    on('building:placed', () => {
      this.stats.buildingsBuilt++;
    });

    on('building:destroyed', (data) => {
      if (data.entity) {
        if (data.entity.team === 'player') {
          this.stats.buildingsLost++;
        }
      }
    });
  }

  dispose() {
    if (this._listeners) {
      for (const { event, fn } of this._listeners) {
        this.game.eventBus.off(event, fn);
      }
      this._listeners = [];
    }
  }

  resetStats() {
    this.stats = {
      unitsProduced: 0,
      unitsLost: 0,
      enemiesKilled: 0,
      buildingsBuilt: 0,
      buildingsLost: 0
    };
  }

  createContent() {
    if (!this.containerEl) return;

    // Clear existing static HTML content
    this.containerEl.innerHTML = '';

    // Create inner content container
    this.contentEl = document.createElement('div');
    this.contentEl.id = 'game-over-content';
    this.contentEl.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #555;
      border-radius: 12px;
      padding: 40px 60px;
      text-align: center;
      font-family: sans-serif;
      max-width: 500px;
      width: 90%;
    `;
    this.containerEl.appendChild(this.contentEl);
  }

  show(won) {
    if (!this.containerEl) return;

    // Style the container as centered overlay
    this.containerEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
    `;

    // Calculate elapsed time
    const elapsed = Date.now() - this.gameStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Set result heading
    const resultTitle = won ? 'VICTORY!' : 'DEFEAT!';
    const resultColor = won ? '#00ff44' : '#ff3333';
    const resultSubtitle = won
      ? 'Enemy headquarters destroyed'
      : 'Your headquarters has been destroyed';
    const borderColor = won ? '#00ff44' : '#ff3333';

    if (!this.contentEl) {
      this.createContent();
    }

    if (this.contentEl) {
      this.contentEl.style.borderColor = borderColor;
      this.contentEl.innerHTML = `
        <h1 style="
          font-size: 48px;
          font-weight: bold;
          color: ${resultColor};
          margin: 0 0 10px 0;
          text-shadow: 0 0 20px ${resultColor}44, 0 0 40px ${resultColor}22;
          letter-spacing: 4px;
        ">${resultTitle}</h1>

        <p style="
          color: #aaa;
          font-size: 16px;
          margin: 0 0 30px 0;
        ">${resultSubtitle}</p>

        <div style="
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          padding: 20px 0;
          margin-bottom: 30px;
        ">
          <h3 style="color: #ffcc00; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
            Battle Statistics
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left;">
            <div style="color: #888;">Time Elapsed:</div>
            <div style="color: #fff; text-align: right;">${timeStr}</div>

            <div style="color: #888;">Units Produced:</div>
            <div style="color: #00ff88; text-align: right;">${this.stats.unitsProduced}</div>

            <div style="color: #888;">Units Lost:</div>
            <div style="color: #ff6644; text-align: right;">${this.stats.unitsLost}</div>

            <div style="color: #888;">Enemies Killed:</div>
            <div style="color: #ffcc00; text-align: right;">${this.stats.enemiesKilled}</div>

            <div style="color: #888;">Buildings Built:</div>
            <div style="color: #66aaff; text-align: right;">${this.stats.buildingsBuilt}</div>

            <div style="color: #888;">Buildings Lost:</div>
            <div style="color: #ff6644; text-align: right;">${this.stats.buildingsLost}</div>
          </div>
        </div>

        <div style="display: flex; gap: 15px; justify-content: center;">
          <button id="btn-play-again-inner" style="
            padding: 12px 30px;
            font-size: 16px;
            font-weight: bold;
            background: ${won ? '#225522' : '#552222'};
            color: ${resultColor};
            border: 2px solid ${resultColor};
            border-radius: 6px;
            cursor: pointer;
            font-family: sans-serif;
            transition: background 0.2s;
          ">Play Again</button>

          <button id="btn-main-menu-inner" style="
            padding: 12px 30px;
            font-size: 16px;
            background: #333;
            color: #ccc;
            border: 2px solid #555;
            border-radius: 6px;
            cursor: pointer;
            font-family: sans-serif;
            transition: background 0.2s;
          ">Main Menu</button>
        </div>
      `;

      // Add hover effects and click handlers
      const playAgainBtn = document.getElementById('btn-play-again-inner');
      const mainMenuBtn = document.getElementById('btn-main-menu-inner');

      if (playAgainBtn) {
        playAgainBtn.addEventListener('mouseenter', () => {
          playAgainBtn.style.background = won ? '#338833' : '#883333';
        });
        playAgainBtn.addEventListener('mouseleave', () => {
          playAgainBtn.style.background = won ? '#225522' : '#552222';
        });
        playAgainBtn.addEventListener('click', () => {
          this.game.restart();
        });
      }

      if (mainMenuBtn) {
        mainMenuBtn.addEventListener('mouseenter', () => {
          mainMenuBtn.style.background = '#444';
        });
        mainMenuBtn.addEventListener('mouseleave', () => {
          mainMenuBtn.style.background = '#333';
        });
        mainMenuBtn.addEventListener('click', () => {
          this.game.restart();
        });
      }
    }
  }

  hide() {
    if (this.containerEl) {
      this.containerEl.classList.add('hidden');
    }
  }
}
