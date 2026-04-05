/**
 * ReplayUI - Provides the replay browser and playback overlay UI.
 * - Replay browser: list saved replays with metadata
 * - Playback overlay: timeline, controls, event markers
 * - Import/export functionality
 */
export class ReplayUI {
  constructor(game, replayPlayer) {
    this.game = game;
    this.player = replayPlayer;
    this.player.ui = this;

    // DOM elements (created dynamically)
    this.browserEl = null;
    this.overlayEl = null;
    this.timelineEl = null;
    this.timeDisplayEl = null;
    this.speedDisplayEl = null;
    this.perspectiveEl = null;

    this._createBrowserUI();
    this._createOverlayUI();
  }

  // ---- REPLAY BROWSER ----

  /** Create the replay browser panel (shown from main menu). */
  _createBrowserUI() {
    this.browserEl = document.createElement('div');
    this.browserEl.id = 'replay-browser';
    this.browserEl.className = 'hidden';
    this.browserEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: rgba(10, 15, 30, 0.95);
      border: 1px solid rgba(0, 255, 65, 0.3);
      border-radius: 8px;
      padding: 30px;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    `;

    content.innerHTML = `
      <h2 style="color: #00ff41; margin: 0 0 20px 0; font-size: 22px; letter-spacing: 3px; text-align: center;">
        REPLAY ARCHIVE
      </h2>
      <div id="replay-list" style="
        flex: 1;
        overflow-y: auto;
        margin-bottom: 20px;
        min-height: 100px;
        max-height: 50vh;
      "></div>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="btn-replay-import" style="
          padding: 10px 20px;
          background: rgba(22, 33, 62, 0.8);
          border: 1px solid rgba(0, 200, 255, 0.4);
          border-radius: 4px;
          color: #00ccff;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          letter-spacing: 1px;
        ">Import .wzreplay</button>
        <button id="btn-replay-back" style="
          padding: 10px 20px;
          background: rgba(22, 33, 62, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #aaa;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          letter-spacing: 1px;
        ">Back to Menu</button>
      </div>
      <input type="file" id="replay-file-input" accept=".wzreplay" style="display: none;">
    `;

    this.browserEl.appendChild(content);
    document.body.appendChild(this.browserEl);

    // Event listeners
    document.getElementById('btn-replay-back')?.addEventListener('click', () => {
      this.hideBrowser();
      this.game.uiManager.showMainMenu();
    });

    document.getElementById('btn-replay-import')?.addEventListener('click', () => {
      document.getElementById('replay-file-input')?.click();
    });

    document.getElementById('replay-file-input')?.addEventListener('change', (e) => {
      this._handleImport(e);
    });
  }

  /** Show the replay browser with the list of saved replays. */
  showBrowser() {
    // Hide other menus
    this.game.uiManager.hideAll();
    this.browserEl.classList.remove('hidden');
    this._populateReplayList();
  }

  /** Hide the replay browser. */
  hideBrowser() {
    this.browserEl.classList.add('hidden');
  }

  /** Populate the replay list from localStorage. */
  _populateReplayList() {
    const listEl = document.getElementById('replay-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const replays = this._getSavedReplays();

    if (replays.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: #556; padding: 40px;">
          <p style="font-size: 16px; margin-bottom: 10px;">No replays saved yet.</p>
          <p style="font-size: 12px; color: #445;">Play a game and save the replay when it ends.</p>
        </div>
      `;
      return;
    }

    for (let i = replays.length - 1; i >= 0; i--) {
      const replay = replays[i];
      const meta = replay.metadata || {};
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(22, 33, 62, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        padding: 12px 16px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
      `;

      const duration = meta.duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const dateStr = meta.date ? new Date(meta.date).toLocaleDateString() : 'Unknown';
      const winnerColor = meta.winner === 'player' ? '#00ff44' : (meta.winner === 'enemy' ? '#ff4444' : '#888');
      const winnerText = meta.winner === 'player' ? 'Victory' : (meta.winner === 'enemy' ? 'Defeat' : 'Unknown');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #00ff41; font-size: 14px;">${meta.name || 'Unnamed Replay'}</strong>
            <div style="color: #6a8a7a; font-size: 11px; margin-top: 4px;">
              ${this._capitalize(meta.playerNation || '?')} vs ${this._capitalize(meta.enemyNation || '?')}
              &bull; ${this._capitalize(meta.gameMode || 'annihilation')}
              &bull; ${this._capitalize(meta.difficulty || 'normal')}
            </div>
            <div style="color: #556; font-size: 11px; margin-top: 2px;">
              ${dateStr} &bull; ${minutes}:${seconds.toString().padStart(2, '0')}
              &bull; <span style="color: ${winnerColor};">${winnerText}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="replay-play-btn" data-index="${i}" style="
              padding: 6px 14px;
              background: rgba(0, 255, 65, 0.15);
              border: 1px solid #00ff41;
              border-radius: 3px;
              color: #00ff41;
              cursor: pointer;
              font-family: inherit;
              font-size: 11px;
            ">Play</button>
            <button class="replay-export-btn" data-index="${i}" style="
              padding: 6px 10px;
              background: rgba(0, 150, 255, 0.1);
              border: 1px solid rgba(0, 150, 255, 0.4);
              border-radius: 3px;
              color: #0088ff;
              cursor: pointer;
              font-family: inherit;
              font-size: 11px;
            ">Export</button>
            <button class="replay-delete-btn" data-index="${i}" style="
              padding: 6px 10px;
              background: rgba(255, 50, 50, 0.1);
              border: 1px solid rgba(255, 50, 50, 0.3);
              border-radius: 3px;
              color: #ff4444;
              cursor: pointer;
              font-family: inherit;
              font-size: 11px;
            ">Delete</button>
          </div>
        </div>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#00ff41';
        card.style.background = 'rgba(0, 255, 65, 0.05)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        card.style.background = 'rgba(22, 33, 62, 0.6)';
      });

      listEl.appendChild(card);
    }

    // Attach button handlers
    listEl.querySelectorAll('.replay-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        this._playReplay(idx);
      });
    });

    listEl.querySelectorAll('.replay-export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        this._exportReplay(idx);
      });
    });

    listEl.querySelectorAll('.replay-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        this._deleteReplay(idx);
      });
    });
  }

  _getSavedReplays() {
    try {
      return JSON.parse(localStorage.getItem('warzone_replays') || '[]');
    } catch {
      return [];
    }
  }

  _playReplay(index) {
    const replays = this._getSavedReplays();
    if (index < 0 || index >= replays.length) return;
    this.hideBrowser();
    this.player.load(replays[index]);
  }

  _exportReplay(index) {
    const replays = this._getSavedReplays();
    if (index < 0 || index >= replays.length) return;
    const replay = replays[index];
    const name = replay.metadata?.name || 'warzone-replay';
    const json = JSON.stringify(replay);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.wzreplay`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _deleteReplay(index) {
    const replays = this._getSavedReplays();
    if (index < 0 || index >= replays.length) return;
    replays.splice(index, 1);
    try {
      localStorage.setItem('warzone_replays', JSON.stringify(replays));
    } catch { /* ignore */ }
    this._populateReplayList();
  }

  _handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const replay = JSON.parse(evt.target.result);
        if (!replay.version || !replay.commands || !replay.initialState) {
          alert('Invalid replay file.');
          return;
        }
        // Save to localStorage
        const replays = this._getSavedReplays();
        replay.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        replays.push(replay);
        if (replays.length > 20) replays.splice(0, replays.length - 20);
        localStorage.setItem('warzone_replays', JSON.stringify(replays));
        this._populateReplayList();
      } catch (err) {
        alert('Failed to import replay: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    e.target.value = '';
  }

  // ---- PLAYBACK OVERLAY ----

  /** Create the playback overlay (shown during replay). */
  _createOverlayUI() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'replay-overlay';
    this.overlayEl.className = 'hidden';
    this.overlayEl.style.cssText = `
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
      z-index: 8500;
      padding: 10px 20px 14px;
      font-family: 'Courier New', monospace;
      pointer-events: auto;
    `;

    this.overlayEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; max-width: 900px; margin: 0 auto;">
        <!-- REPLAY badge -->
        <div style="
          background: rgba(255, 50, 50, 0.2);
          border: 1px solid #ff4444;
          border-radius: 3px;
          padding: 3px 8px;
          color: #ff4444;
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 2px;
          white-space: nowrap;
        ">REPLAY</div>

        <!-- Play/Pause button -->
        <button id="replay-btn-pause" style="
          background: rgba(0, 255, 65, 0.15);
          border: 1px solid #00ff41;
          border-radius: 3px;
          color: #00ff41;
          cursor: pointer;
          font-family: inherit;
          font-size: 16px;
          width: 32px; height: 28px;
          display: flex; align-items: center; justify-content: center;
        ">||</button>

        <!-- Speed display -->
        <div style="display: flex; align-items: center; gap: 4px;">
          <button id="replay-btn-slower" style="
            background: none; border: 1px solid #555; border-radius: 2px;
            color: #888; cursor: pointer; width: 20px; height: 22px;
            font-family: inherit; font-size: 12px;
          ">-</button>
          <span id="replay-speed-display" style="
            color: #ffcc00; font-size: 13px; min-width: 36px; text-align: center;
          ">1x</span>
          <button id="replay-btn-faster" style="
            background: none; border: 1px solid #555; border-radius: 2px;
            color: #888; cursor: pointer; width: 20px; height: 22px;
            font-family: inherit; font-size: 12px;
          ">+</button>
        </div>

        <!-- Time display -->
        <span id="replay-time-display" style="
          color: #aaa; font-size: 12px; min-width: 90px; text-align: center;
        ">0:00 / 0:00</span>

        <!-- Timeline bar -->
        <div id="replay-timeline-container" style="
          flex: 1;
          height: 20px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          position: relative;
          cursor: pointer;
          min-width: 100px;
        ">
          <!-- Event markers will be injected here -->
          <div id="replay-timeline-progress" style="
            position: absolute;
            top: 0; left: 0; bottom: 0;
            background: rgba(0, 255, 65, 0.3);
            border-radius: 3px;
            width: 0%;
            pointer-events: none;
          "></div>
          <div id="replay-timeline-cursor" style="
            position: absolute;
            top: -2px; bottom: -2px;
            width: 3px;
            background: #00ff41;
            border-radius: 2px;
            left: 0%;
            pointer-events: none;
            box-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
          "></div>
        </div>

        <!-- Perspective toggle -->
        <select id="replay-perspective" style="
          background: rgba(22, 33, 62, 0.8);
          border: 1px solid #555;
          border-radius: 3px;
          color: #aaa;
          font-family: inherit;
          font-size: 11px;
          padding: 4px 6px;
          cursor: pointer;
        ">
          <option value="spectator">Spectator</option>
          <option value="player">Player 1</option>
          <option value="enemy">Player 2</option>
        </select>

        <!-- Exit button -->
        <button id="replay-btn-exit" style="
          background: rgba(255, 50, 50, 0.1);
          border: 1px solid rgba(255, 50, 50, 0.3);
          border-radius: 3px;
          color: #ff6644;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          padding: 4px 10px;
          letter-spacing: 1px;
        ">EXIT</button>
      </div>

      <!-- Keyboard hints -->
      <div style="
        text-align: center;
        color: #445;
        font-size: 10px;
        margin-top: 6px;
      ">
        Space: Play/Pause &bull; +/-: Speed &bull; Left/Right: Skip 30s &bull; 1/2/3: Perspective &bull; Esc: Exit
      </div>
    `;

    document.body.appendChild(this.overlayEl);

    // Wire up overlay buttons
    document.getElementById('replay-btn-pause')?.addEventListener('click', () => {
      this.player.togglePause();
    });
    document.getElementById('replay-btn-faster')?.addEventListener('click', () => {
      this.player.increaseSpeed();
    });
    document.getElementById('replay-btn-slower')?.addEventListener('click', () => {
      this.player.decreaseSpeed();
    });
    document.getElementById('replay-btn-exit')?.addEventListener('click', () => {
      this.player.stop();
    });
    document.getElementById('replay-perspective')?.addEventListener('change', (e) => {
      this.player.setPerspective(e.target.value);
    });

    // Timeline click to seek
    const timelineContainer = document.getElementById('replay-timeline-container');
    if (timelineContainer) {
      timelineContainer.addEventListener('click', (e) => {
        const rect = timelineContainer.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        const duration = this.player.replay?.metadata?.duration || 0;
        this.player.jumpTo(fraction * duration);
      });
    }
  }

  /** Show the playback overlay and populate event markers. */
  show() {
    this.overlayEl?.classList.remove('hidden');
    this._populateEventMarkers();
    this.updateControls();
    this.updateTimeline();
  }

  /** Hide the playback overlay. */
  hide() {
    this.overlayEl?.classList.add('hidden');
  }

  /** Update the timeline position and time display. */
  updateTimeline() {
    const info = this.player.getPlaybackInfo();
    const progress = info.duration > 0 ? (info.currentTime / info.duration) * 100 : 0;
    const clamped = Math.min(100, Math.max(0, progress));

    const progressEl = document.getElementById('replay-timeline-progress');
    const cursorEl = document.getElementById('replay-timeline-cursor');
    const timeEl = document.getElementById('replay-time-display');

    if (progressEl) progressEl.style.width = clamped + '%';
    if (cursorEl) cursorEl.style.left = clamped + '%';

    if (timeEl) {
      const cur = this._formatTime(info.currentTime);
      const dur = this._formatTime(info.duration);
      timeEl.textContent = `${cur} / ${dur}`;
    }
  }

  /** Update the control buttons to reflect current state. */
  updateControls() {
    const info = this.player.getPlaybackInfo();

    const pauseBtn = document.getElementById('replay-btn-pause');
    if (pauseBtn) {
      pauseBtn.textContent = info.paused ? '>' : '||';
    }

    const speedEl = document.getElementById('replay-speed-display');
    if (speedEl) {
      speedEl.textContent = info.speed + 'x';
    }

    const perspectiveEl = document.getElementById('replay-perspective');
    if (perspectiveEl) {
      perspectiveEl.value = info.perspective;
    }
  }

  /** Populate timeline event markers from the replay data. */
  _populateEventMarkers() {
    const container = document.getElementById('replay-timeline-container');
    if (!container || !this.player.replay) return;

    // Remove existing markers
    container.querySelectorAll('.replay-marker').forEach(m => m.remove());

    const commands = this.player.replay.commands;
    const duration = this.player.replay.metadata?.duration || 1;

    // Categorize events for markers
    // Red = combat (kills, unit destroyed, building destroyed)
    // Blue = production (produce, build, research)
    // Green = expansion (building placed)
    const markers = [];

    // Sample events (don't show all, just significant ones)
    for (const cmd of commands) {
      let color = null;
      switch (cmd.type) {
        case 'KILL':
        case 'UNIT_DESTROYED':
        case 'BUILDING_DESTROYED':
          color = '#ff4444';
          break;
        case 'PRODUCE_UNIT':
        case 'RESEARCH_START':
          color = '#4488ff';
          break;
        case 'BUILD':
          color = '#44ff88';
          break;
      }
      if (color) {
        markers.push({ t: cmd.t, color });
      }
    }

    // Limit markers to avoid cluttering
    const maxMarkers = 100;
    const step = markers.length > maxMarkers ? Math.floor(markers.length / maxMarkers) : 1;

    for (let i = 0; i < markers.length; i += step) {
      const m = markers[i];
      const left = (m.t / duration) * 100;
      const el = document.createElement('div');
      el.className = 'replay-marker';
      el.style.cssText = `
        position: absolute;
        bottom: 0;
        width: 2px;
        height: 8px;
        background: ${m.color};
        opacity: 0.6;
        left: ${left}%;
        pointer-events: none;
        border-radius: 1px;
      `;
      container.appendChild(el);
    }
  }

  /** Format seconds as M:SS. */
  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Capitalize first letter. */
  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Dispose and clean up DOM elements. */
  dispose() {
    if (this.browserEl && this.browserEl.parentNode) {
      this.browserEl.parentNode.removeChild(this.browserEl);
    }
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
  }
}
