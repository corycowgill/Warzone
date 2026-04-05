import { UNIT_STATS, BUILDING_STATS, GAME_CONFIG, RESEARCH_UPGRADES, TECH_BRANCHES, FACTION_UNITS } from '../core/Constants.js';
import { BuildPanel } from './BuildPanel.js';
import { CommandCard } from './CommandCard.js';
import { ProductionPanel } from './ProductionPanel.js';
import { SelectionPanel } from './SelectionPanel.js';
import { HUDNotifications } from './HUDNotifications.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.hudEl = document.getElementById('hud');

    // Reference existing HTML elements for resource display
    this.spDisplay = document.getElementById('sp-display');
    this.muDisplay = document.getElementById('mu-display');
    this.incomeDisplay = document.getElementById('income-display');
    this.unitCountDisplay = document.getElementById('unit-count-display');
    this.gameTimerDisplay = document.getElementById('game-timer-display');

    // State
    this.visible = false;

    // Create sub-components (order matters: notifications first since others use showNotification)
    this.notifications = new HUDNotifications(this);
    this.buildPanel = new BuildPanel(this);
    this.commandCard = new CommandCard(this);
    this.productionPanel = new ProductionPanel(this);
    this.selectionPanel = new SelectionPanel(this);

    // Control group badges bar
    this._controlGroupBar = null;
    this._createControlGroupBar();

    // Voice chat indicator
    this._voiceIndicator = document.getElementById('voice-indicator');
    this._voiceMicIcon = document.getElementById('voice-mic-icon');
    this._voiceOpponentSpeaking = document.getElementById('voice-opponent-speaking');

    this.setupEventListeners();
  }

  _createControlGroupBar() {
    this._controlGroupBar = document.createElement('div');
    this._controlGroupBar.id = 'control-group-bar';
    this._controlGroupBar.style.cssText = 'position:fixed;bottom:4px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:100;pointer-events:none;';
    document.body.appendChild(this._controlGroupBar);
  }

  _updateControlGroupBadges(groups) {
    if (!this._controlGroupBar) return;
    this._controlGroupBar.innerHTML = '';
    if (!groups) return;
    for (let i = 0; i < groups.length; i++) {
      // Filter dead
      const alive = groups[i].filter(e => e.alive);
      if (alive.length === 0) continue;
      const badge = document.createElement('div');
      badge.style.cssText = 'background:rgba(0,0,0,0.75);border:1px solid #00ccff;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:11px;color:#00ccff;white-space:nowrap;';
      badge.textContent = `${i}:${alive.length}`;
      this._controlGroupBar.appendChild(badge);
    }
  }

  // ============================
  // Backward-compatible delegate methods
  // ============================

  // Notifications delegates
  showNotification(message, color) { this.notifications.showNotification(message, color); }
  _hideTooltip() { this.notifications._hideTooltip(); }

  // Build panel delegates
  get buildPlacementMode() { return this.buildPanel.buildPlacementMode; }
  set buildPlacementMode(v) { this.buildPanel.buildPlacementMode = v; }
  get buildMenuOpen() { return this.buildPanel.buildMenuOpen; }
  toggleBuildMenu() { this.buildPanel.toggleBuildMenu(); }
  openBuildMenu() { this.buildPanel.openBuildMenu(); }
  closeBuildMenu() { this.buildPanel.closeBuildMenu(); }
  cancelBuildPlacement() { this.buildPanel.cancelBuildPlacement(); }
  updateGhostPosition(worldPos) { this.buildPanel.updateGhostPosition(worldPos); }
  removeRallyVisuals() { this.buildPanel.removeRallyVisuals(); }

  // Command card delegates
  get _exchangeCooldown() { return this.commandCard._exchangeCooldown; }
  set _exchangeCooldown(v) { this.commandCard._exchangeCooldown = v; }

  // Production panel delegates
  get _prodOverviewOpen() { return this.productionPanel._prodOverviewOpen; }
  set _prodOverviewOpen(v) { this.productionPanel._prodOverviewOpen = v; }
  get _prodOverviewCache() { return this.productionPanel._prodOverviewCache; }
  set _prodOverviewCache(v) { this.productionPanel._prodOverviewCache = v; }
  get _prodOverviewPanel() { return this.productionPanel._prodOverviewPanel; }

  // Notifications delegates for auto-resolve
  get _autoResolveBtn() { return this.notifications._autoResolveBtn; }

  // ============================
  // Event Listeners (keyboard dispatch + event bus)
  // ============================
  setupEventListeners() {
    // Listen for selection changes
    this.game.eventBus.on('selection:changed', (data) => {
      this.selectionPanel.updateSelectionPanel(data.entities);
    });

    // Listen for control group changes
    this.game.eventBus.on('controlgroups:changed', (data) => {
      this._updateControlGroupBadges(data.groups);
    });

    // Listen for resource changes
    this.game.eventBus.on('resource:changed', () => {
      this.updateResourceDisplay();
    });

    // Listen for production events
    this.game.eventBus.on('production:complete', (data) => {
      this.showNotification(`${this.formatName(data.unitType)} produced!`, '#00ff88');
    });

    this.game.eventBus.on('production:error', (data) => {
      if (data.reason === 'cost') {
        // Flash the SP display red for 0.5s
        if (this.spDisplay) {
          this.spDisplay.classList.remove('sp-flash-red');
          void this.spDisplay.offsetWidth;
          this.spDisplay.classList.add('sp-flash-red');
          setTimeout(() => this.spDisplay.classList.remove('sp-flash-red'), 500);
        }
        this.showNotification(data.message, '#ff4444');
      } else if (data.reason === 'popcap') {
        this.showNotification(data.message, '#ff8800');
      } else {
        this.showNotification(data.message, '#ff4444');
      }
    });

    this.game.eventBus.on('production:cancelled', (data) => {
      // Queue display will be refreshed by the click handler
    });

    // Listen for combat events
    this.game.eventBus.on('combat:kill', (data) => {
      if (data.defender.team === 'player') {
        this.showNotification(`${this.formatName(data.defender.type)} destroyed!`, '#ff6644');
      }
    });

    // Listen for building destroyed
    this.game.eventBus.on('building:destroyed', (data) => {
      if (data.entity.team === 'player') {
        this.showNotification(`${this.formatName(data.entity.type)} lost!`, '#ff4444');
      }
    });

    // Voice indicator click to toggle mute
    this._voiceIndicator?.addEventListener('click', () => {
      const vc = this.game.voiceChat;
      if (vc && vc.isActive) {
        vc.toggleMute();
        this._updateVoiceIndicator();
      }
    });

    // Formation change notification
    this.game.eventBus.on('command:formation', (data) => {
      this.showNotification(`Formation: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`, '#00ccff');
    });

    // Build menu toggle events
    this.game.eventBus.on('ui:toggleBuildPanel', () => {
      this.toggleBuildMenu();
    });

    this.game.eventBus.on('ui:showBuildMenu', () => {
      this.openBuildMenu();
    });

    // Command panel buttons
    document.getElementById('cmd-move')?.addEventListener('click', () => {
      this.showNotification('Right-click to move selected units', '#ffcc00');
    });
    document.getElementById('cmd-attack')?.addEventListener('click', () => {
      this.game.commandSystem.attackMoveMode = true;
      document.body.style.cursor = 'crosshair';
      this.showNotification('Click on an enemy or ground to attack-move', '#ffcc00');
    });
    document.getElementById('cmd-stop')?.addEventListener('click', () => {
      const selected = this.game.selectionManager?.getSelected() || [];
      selected.forEach(u => { if (u.isUnit && u.stop) u.stop(); });
    });
    document.getElementById('cmd-build')?.addEventListener('click', () => {
      this.toggleBuildMenu();
    });

    // Handle build placement click
    const canvas = this.game.sceneManager.renderer.domElement;
    canvas.addEventListener('click', (e) => {
      if (this.buildPanel._superweaponTargetMode) {
        this.buildPanel.handleSuperweaponTarget(e);
        return;
      }
      if (this.game.commandSystem.abilityTargetMode) {
        this.buildPanel.handleAbilityClick(e);
        return;
      }
      if (this.buildPanel.buildPlacementMode) {
        this.buildPanel.handleBuildPlacement(e);
      }
    });

    // Tech tree button
    document.getElementById('btn-techtree')?.addEventListener('click', () => {
      this.notifications.toggleTechTree();
    });

    // Keyboard dispatch
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeBuildMenu();
        this.cancelBuildPlacement();
        this.notifications.hideTechTree();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        if (this.notifications.helpEl) {
          this.notifications.helpEl.style.display = this.notifications.helpEl.style.display === 'none' ? 'block' : 'none';
        }
      }
      if (e.key === 't' || e.key === 'T') {
        if (this.game.state === 'PLAYING') {
          this.notifications.toggleTechTree();
        }
      }

      // Cycle 15: Backtick toggles production overview panel
      if (e.key === '`' && this.game.state === 'PLAYING') {
        this.productionPanel.toggleProductionOverview();
      }

      // Cycle 15: Ctrl+A selects all military units
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && this.game.state === 'PLAYING') {
        e.preventDefault();
        const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        const allUnits = this.game.getUnits(ownTeam);
        if (allUnits.length > 0 && this.game.selectionManager) {
          this.game.selectionManager.selectEntities(allUnits);
          this.showNotification(`Selected all ${allUnits.length} units`, '#00ccff');
        }
        return;
      }

      // Cycle 15: Ctrl+Z selects all units of selected type globally
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && this.game.state === 'PLAYING') {
        e.preventDefault();
        const selected = this.game.selectionManager?.getSelected() || [];
        const units = selected.filter(e => e.isUnit);
        if (units.length > 0) {
          const type = units[0].type;
          const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
          const allOfType = this.game.getUnits(ownTeam).filter(u => u.type === type);
          if (allOfType.length > 0 && this.game.selectionManager) {
            this.game.selectionManager.selectEntities(allOfType);
            this.showNotification(`Selected all ${allOfType.length} ${this.formatName(type)}`, '#00ccff');
          }
        }
        return;
      }

      // Production hotkeys when a production building is selected
      if (this.game.state === 'PLAYING' && !this.buildPanel.buildPlacementMode) {
        this.productionPanel.handleProductionHotkey(e);
      }

      // R key to open research panel for selected building (only when no units selected to avoid conflict with Retreat)
      if ((e.key === 'r' || e.key === 'R') && this.game.state === 'PLAYING') {
        const selected = this.game.selectionManager?.getSelected() || [];
        const hasUnits = selected.some(e => e.isUnit);
        if (!hasUnits) {
          this.productionPanel.toggleResearchPanel();
        }
      }

      // F key hotkey for nation ability
      if (e.key === 'f' && this.game.state === 'PLAYING' && !this.buildPanel.buildPlacementMode) {
        if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
          this.notifications._activateNationAbility();
        }
      }
    });
  }

  // ============================
  // Show / Hide / Update
  // ============================
  show() {
    this.visible = true;
    this.hudEl?.classList.remove('hidden');
    this.updateResourceDisplay();
    // Show voice indicator if voice chat is active
    this._updateVoiceIndicator();

    // In spectate mode on mobile, add a class to body for CSS-driven hiding
    if (this.game.isSpectating) {
      document.body.classList.add('spectate-mode');
    } else {
      document.body.classList.remove('spectate-mode');
    }
  }

  hide() {
    this.visible = false;
    this.hudEl?.classList.add('hidden');
  }

  update() {
    if (!this.visible) return;
    this.updateResourceDisplay();
    this.productionPanel.updateProductionPanel();
    this.buildPanel.updateRallyPointVisuals();
    this.notifications.updateNationAbilityButton();
    this.notifications.updateDayNightIndicator();
    // GD-128: Tick exchange cooldown
    this.commandCard.update(this.game._lastDelta || 0.016);
    // GD-139: Auto-resolve button
    this.notifications.updateAutoResolve();
    // Cycle 15: Production Overview
    this.productionPanel._updateProductionOverview();
    // Cycle 15: Hover tooltip
    this.notifications._updateTooltip();
    // Control group badges (refresh to prune dead units)
    if (this.game.selectionManager) {
      this._updateControlGroupBadges(this.game.selectionManager.controlGroups);
    }
    // Voice chat indicator
    this._updateVoiceIndicator();
  }

  // ============================
  // Resource Display
  // ============================
  updateResourceDisplay() {
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const sp = Math.floor(this.game.teams[activeTeam].sp);
    const mu = Math.floor(this.game.teams[activeTeam].mu || 0);
    const income = this.game.resourceSystem ? this.game.resourceSystem.getIncomeRate(activeTeam) : 0;
    const muIncome = this.game.resourceSystem ? this.game.resourceSystem.getMUIncomeRate(activeTeam) : 0;
    const unitCount = this.game.getUnits(activeTeam).length;
    const maxUnits = GAME_CONFIG.maxUnitsPerTeam;

    if (this.spDisplay) this.spDisplay.textContent = sp;
    if (this.muDisplay) {
      this.muDisplay.textContent = `${mu} (+${muIncome}/s)`;
      this.muDisplay.style.color = mu < 20 ? '#ff4444' : '';
    }
    if (this.incomeDisplay) this.incomeDisplay.textContent = `+${income}/s`;
    if (this.unitCountDisplay) {
      this.unitCountDisplay.textContent = `${unitCount}/${maxUnits}`;
      this.unitCountDisplay.classList.remove('unit-count-warning', 'unit-count-maxed');
      if (unitCount >= maxUnits) {
        this.unitCountDisplay.classList.add('unit-count-maxed');
      } else if (unitCount >= maxUnits - 5) {
        this.unitCountDisplay.classList.add('unit-count-warning');
      }
    }

    // Update game timer
    if (this.gameTimerDisplay && this.game.gameElapsed !== undefined) {
      const totalSeconds = Math.floor(this.game.gameElapsed);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      let timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (this.game.gameMode === 'timed') {
        const remaining = Math.max(0, 600 - totalSeconds);
        const rm = Math.floor(remaining / 60);
        const rs = remaining % 60;
        timerText = `${rm}:${rs.toString().padStart(2, '0')} left`;
      }

      if (this.game.gameMode === 'king_of_hill' && this.game._hillControl) {
        const pc = Math.floor(this.game._hillControl.player);
        const ec = Math.floor(this.game._hillControl.enemy);
        timerText += ` | Hill: P${pc}s E${ec}s`;
      }

      if (this.game.gameMode === 'survival' && this.game.waveSystem) {
        const info = this.game.waveSystem.getDisplayInfo();
        if (info.betweenWaves) {
          timerText = `Wave ${info.wave + 1} in ${info.countdown}`;
        } else {
          timerText = `Wave ${info.wave} | ${info.enemiesAlive} enemies`;
        }
      }

      if (this.game.weatherSystem) {
        const weatherName = this.game.weatherSystem.getWeatherName();
        const weatherColors = { Clear: '#88ff88', Rain: '#6688ff', Fog: '#aabbcc', Sandstorm: '#ddaa66' };
        const wColor = weatherColors[weatherName] || '#888';
        timerText += ` | <span style="color:${wColor}">${weatherName}</span>`;
      }

      this.gameTimerDisplay.innerHTML = timerText;
    }

    // Military score comparison
    if (!this._scoreDisplay) {
      this._scoreDisplay = document.createElement('span');
      this._scoreDisplay.className = 'resource-value';
      this._scoreDisplay.style.cssText = 'font-size:11px;margin-left:8px;';
      const scoreItem = document.createElement('div');
      scoreItem.className = 'resource-item';
      scoreItem.innerHTML = '<span class="resource-label">Score:</span>';
      scoreItem.appendChild(this._scoreDisplay);
      const bar = document.getElementById('resource-bar');
      if (bar) {
        const optionsItem = bar.querySelector('[style*="margin-left:auto"]');
        if (optionsItem) bar.insertBefore(scoreItem, optionsItem);
        else bar.appendChild(scoreItem);
      }
    }
    if (this.game.gameMode === 'survival' && this.game.waveSystem) {
      const info = this.game.waveSystem.getDisplayInfo();
      if (this._scoreDisplay) {
        this._scoreDisplay.innerHTML = `<span style="color:#ffcc00">${info.score}</span> <span style="color:#888;font-size:9px;">HI:${info.highScore}</span>`;
      }
    } else {
      const pScore = this.getMilitaryScore('player');
      const eScore = this.getMilitaryScore('enemy');
      if (this._scoreDisplay) {
        const leading = pScore >= eScore;
        this._scoreDisplay.innerHTML = `<span style="color:${leading ? '#88ff88' : '#ff8888'}">${pScore}</span> vs <span style="color:${!leading ? '#88ff88' : '#ff8888'}">${eScore}</span>`;
      }
    }

    // Research progress indicator
    const resState = this.game.research?.player;
    if (resState?.inProgress) {
      if (!this._researchDisplay) {
        const existing = document.getElementById('hud-research-display');
        if (existing) existing.remove();
        this._researchDisplay = document.createElement('div');
        this._researchDisplay.id = 'hud-research-display';
        this._researchDisplay.style.cssText = 'position:fixed;bottom:225px;right:10px;background:rgba(0,0,0,0.8);border:1px solid #00ccaa;border-radius:4px;padding:4px 8px;font-size:11px;color:#00ffcc;font-family:sans-serif;z-index:100;';
        document.body.appendChild(this._researchDisplay);
      }
      let researchName = '?';
      const upg = RESEARCH_UPGRADES[resState.inProgress];
      if (upg) {
        researchName = upg.name;
      } else if (resState._branchDomain && resState._branchKey) {
        const domainConfig = TECH_BRANCHES[resState._branchDomain];
        const branch = domainConfig?.[resState._branchKey];
        if (branch) researchName = branch.name;
      }
      this._researchDisplay.textContent = `Researching: ${researchName} (${Math.ceil(resState.timer)}s)`;
      this._researchDisplay.style.display = 'block';
    } else if (this._researchDisplay) {
      this._researchDisplay.style.display = 'none';
    }

    // Spectator mode: show enemy resources too
    if (this.game.mode === 'SPECTATE') {
      const enemySP = Math.floor(this.game.teams.enemy.sp);
      const enemyMU = Math.floor(this.game.teams.enemy.mu || 0);
      const enemyUnits = this.game.getUnits('enemy').length;
      const sp = Math.floor(this.game.teams.player.sp);
      const mu = Math.floor(this.game.teams.player.mu || 0);
      const unitCount = this.game.getUnits('player').length;
      if (this.spDisplay) {
        this.spDisplay.textContent = `${sp} vs ${enemySP}`;
      }
      if (this.muDisplay) {
        this.muDisplay.textContent = `${mu} vs ${enemyMU}`;
      }
      if (this.unitCountDisplay) {
        this.unitCountDisplay.textContent = `${unitCount} vs ${enemyUnits}`;
      }
    }
  }

  // ============================
  // Helpers
  // ============================
  _updateVoiceIndicator() {
    const vc = this.game.voiceChat;
    if (!this._voiceIndicator) return;

    if (!vc || !vc.isActive) {
      this._voiceIndicator.classList.add('hidden');
      return;
    }

    this._voiceIndicator.classList.remove('hidden');

    // Mute state
    const muted = vc.isMuted;
    this._voiceIndicator.classList.toggle('voice-muted', muted);
    if (this._voiceMicIcon) {
      this._voiceMicIcon.textContent = muted ? 'MIC OFF' : 'MIC';
    }

    // Opponent speaking indicator
    if (this._voiceOpponentSpeaking) {
      const speaking = vc.isSpeaking;
      this._voiceOpponentSpeaking.classList.toggle('hidden', !speaking);
      this._voiceOpponentSpeaking.classList.toggle('voice-speaking', speaking);
    }
  }

  getMilitaryScore(team) {
    let score = 0;
    const units = this.game.getUnits(team);
    for (const u of units) {
      const stats = UNIT_STATS[u.type];
      score += stats ? stats.cost : 50;
    }
    const buildings = this.game.getBuildings(team);
    for (const b of buildings) {
      const stats = BUILDING_STATS[b.type];
      score += stats ? stats.cost : 100;
    }
    return score;
  }

  formatName(type, nationKey) {
    if (!type) return '';
    if (nationKey && FACTION_UNITS[nationKey] && FACTION_UNITS[nationKey][type]) {
      return FACTION_UNITS[nationKey][type].name;
    }
    const names = {
      warfactory: 'War Factory',
      resourcedepot: 'Resource Depot',
      supplydepot: 'Supply Depot',
      aaturret: 'AA Turret',
      superweapon: 'Superweapon',
      mortar: 'Mortar Team',
      scoutcar: 'Scout Car',
      aahalftrack: 'AA Half-Track',
      apc: 'APC',
      heavytank: 'Heavy Tank',
      spg: 'SPG/Artillery',
      bomber: 'Bomber',
      patrolboat: 'Patrol Boat',
      techlab: 'Tech Lab',
      commander: 'Commander',
      munitionscache: 'Munitions Cache'
    };
    if (names[type]) return names[type];
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  }

  getPlayerNation() {
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    return this.game.teams[activeTeam]?.nation || null;
  }
}
