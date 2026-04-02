import * as THREE from 'three';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE, NATIONS, GAME_CONFIG, UNIT_COUNTERS, VETERANCY, BUILDING_UPGRADES, RESEARCH_UPGRADES, NATION_ABILITIES, BUILDING_LIMITS } from '../core/Constants.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.hudEl = document.getElementById('hud');

    // Reference existing HTML elements
    this.spDisplay = document.getElementById('sp-display');
    this.incomeDisplay = document.getElementById('income-display');
    this.unitCountDisplay = document.getElementById('unit-count-display');
    this.selectionInfo = document.getElementById('selection-info');
    this.productionPanel = document.getElementById('production-panel');
    this.productionQueue = document.getElementById('production-queue');
    this.productionOptions = document.getElementById('production-options');
    this.buildMenu = document.getElementById('build-menu');
    this.buildOptions = document.getElementById('build-options');
    this.gameTimerDisplay = document.getElementById('game-timer-display');

    // State
    this.visible = false;
    this.buildMenuOpen = false;
    this.buildPlacementMode = false;
    this.buildPlacementType = null;

    // Ghost building preview (3D)
    this.ghostMesh = null;
    this.ghostValid = false;

    // Rally point visualization (3D)
    this.rallyLine = null;
    this.rallyFlag = null;
    this.rallyTargetBuilding = null;

    // Create notification area (top-center, below resource bar)
    this.notificationArea = document.createElement('div');
    this.notificationArea.id = 'hud-notifications';
    this.notificationArea.style.cssText = `
      position: fixed;
      top: 44px;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      z-index: 100;
      pointer-events: none;
    `;
    if (this.hudEl) this.hudEl.appendChild(this.notificationArea);

    // Create keyboard shortcuts help overlay
    this.createHelpOverlay();

    // Create tech tree overlay
    this.createTechTreeOverlay();

    // Create nation ability button (GD-058)
    this.createNationAbilityButton();

    this.populateBuildMenu();
    this.setupEventListeners();
  }

  createHelpOverlay() {
    this.helpEl = document.createElement('div');
    this.helpEl.id = 'keyboard-help';
    this.helpEl.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 10px;
      background: rgba(0,0,0,0.85);
      color: #ccc;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.6;
      z-index: 200;
      border: 1px solid #444;
      pointer-events: none;
      display: none;
    `;
    this.helpEl.innerHTML = `
      <div style="color:#00ff44;font-weight:bold;margin-bottom:4px;">Controls</div>
      <div>Arrows/W/S: Pan camera</div>
      <div>Q/E: Rotate camera</div>
      <div>Scroll: Zoom</div>
      <div>Middle drag: Pan</div>
      <div style="margin-top:4px;color:#ffcc00;">Commands</div>
      <div>A: Attack move</div>
      <div>S: Stop</div>
      <div>D: Hold position</div>
      <div>V: Cycle stance</div>
      <div>P: Patrol</div>
      <div>G: Use ability</div>
      <div>B: Build menu</div>
      <div>F: Nation ability</div>
      <div>Tab: Cycle buildings</div>
      <div>T: Tech tree</div>
      <div>Shift+RClick: Queue waypoint</div>
      <div>Ctrl+P: Pause/Resume</div>
      <div>R: Research panel</div>
      <div>Esc: Cancel</div>
      <div style="margin-top:4px;color:#ff8844;">Production</div>
      <div>I: Infantry | K: Tank</div>
      <div>J: Drone | L: Plane</div>
      <div>N: Battleship | U: Sub</div>
      <div>M: Mortar | O: Scout Car</div>
      <div>H: Heavy Tank | Y: Bomber</div>
      <div style="margin-top:4px;color:#00ccff;">Control Groups</div>
      <div>Ctrl+0-9: Save group</div>
      <div>0-9: Recall group</div>
      <div>Double-tap: Center cam</div>
      <div style="margin-top:4px;color:#88ff88;">QoL</div>
      <div>, : Select idle units</div>
      <div>. : Select all units</div>
      <div>Space: Jump to alert</div>
    `;
    document.body.appendChild(this.helpEl);
  }

  createNationAbilityButton() {
    this._abilityBtn = document.createElement('button');
    this._abilityBtn.id = 'nation-ability-btn';
    this._abilityBtn.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 20px;
      background: rgba(20, 30, 50, 0.9);
      color: #ffcc00;
      border: 2px solid #ffcc00;
      border-radius: 6px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      z-index: 150;
      letter-spacing: 1px;
      transition: all 0.2s;
      display: none;
    `;
    this._abilityBtn.addEventListener('click', () => {
      this._activateNationAbility();
    });
    this._abilityBtn.addEventListener('mouseenter', () => {
      this._abilityBtn.style.background = 'rgba(40, 60, 100, 0.9)';
      this._abilityBtn.style.borderColor = '#ffdd44';
    });
    this._abilityBtn.addEventListener('mouseleave', () => {
      this._abilityBtn.style.background = 'rgba(20, 30, 50, 0.9)';
      this._abilityBtn.style.borderColor = '#ffcc00';
    });
    document.body.appendChild(this._abilityBtn);

    // F key hotkey for nation ability
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' && this.game.state === 'PLAYING' && !this.buildPlacementMode) {
        // Don't use F if formation cycling (Shift+F or with selection) - only bare F
        if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
          this._activateNationAbility();
        }
      }
    });
  }

  _activateNationAbility() {
    if (!this.game.nationAbilitySystem) return;
    const nas = this.game.nationAbilitySystem;
    const team = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    if (nas.canUse(team)) {
      nas.activate(team);
    }
  }

  updateNationAbilityButton() {
    if (!this._abilityBtn || !this.game.nationAbilitySystem) return;
    const nas = this.game.nationAbilitySystem;
    const team = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const ability = nas.getAbility(team);
    if (!ability) {
      this._abilityBtn.style.display = 'none';
      return;
    }

    this._abilityBtn.style.display = 'block';
    const cd = nas.getCooldownRemaining(team);
    const isActive = nas.isActive(team);
    const activeTimer = nas.getActiveTimer(team);

    if (isActive) {
      this._abilityBtn.textContent = `${ability.name} (${Math.ceil(activeTimer)}s) [F]`;
      this._abilityBtn.style.borderColor = '#00ff44';
      this._abilityBtn.style.color = '#00ff44';
      this._abilityBtn.style.cursor = 'default';
    } else if (cd > 0) {
      this._abilityBtn.textContent = `${ability.name} (${Math.ceil(cd)}s) [F]`;
      this._abilityBtn.style.borderColor = '#666';
      this._abilityBtn.style.color = '#666';
      this._abilityBtn.style.cursor = 'not-allowed';
    } else {
      this._abilityBtn.textContent = `${ability.name} READY [F]`;
      this._abilityBtn.style.borderColor = '#ffcc00';
      this._abilityBtn.style.color = '#ffcc00';
      this._abilityBtn.style.cursor = 'pointer';
    }

    // Tooltip
    this._abilityBtn.title = ability.description;
  }

  populateBuildMenu() {
    if (!this.buildOptions) return;
    this.buildOptions.innerHTML = '';

    const buildableTypes = ['barracks', 'warfactory', 'airfield', 'shipyard', 'techlab', 'resourcedepot', 'supplydepot', 'turret', 'aaturret', 'bunker', 'wall', 'superweapon'];
    for (const type of buildableTypes) {
      const stats = BUILDING_STATS[type];
      if (!stats) continue;

      const btn = document.createElement('button');
      btn.className = 'cmd-btn';
      btn.dataset.buildType = type;
      btn.style.cssText = `
        display: block;
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 4px;
        background: #333;
        color: #eee;
        border: 1px solid #555;
        border-radius: 3px;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 13px;
        text-align: left;
      `;

      const requires = stats.requires || [];
      const reqStr = requires.length > 0 ? `<br><small style="color:#ff8844;">Requires: ${requires.map(r => this.formatName(r)).join(', ')}</small>` : '';

      let descStr = '';
      if (stats.isSuperweapon) {
        descStr = '<span style="color:#ff8800;">Charges faction superweapon</span>';
      } else if (stats.produces && stats.produces.length > 0) {
        descStr = 'Produces: ' + stats.produces.map(u => this.formatName(u)).join(', ');
      } else if (stats.income) {
        descStr = `<span style="color:#44dd88;">Income: +${stats.income} SP/s</span>`;
      } else if (stats.damage) {
        descStr = `DMG: ${stats.damage} | RNG: ${stats.range}`;
        if (stats.garrisonSlots) descStr += ` | <span style="color:#66aaff;">Garrison: ${stats.garrisonSlots}</span>`;
        if (stats.targetDomain) descStr += ` (${stats.targetDomain})`;
      } else if (stats.blocksMovement) {
        descStr = 'Blocks movement, high armor';
      }
      btn.innerHTML = `
        <strong>${this.formatName(type)}</strong>
        <span style="color:#ffcc00;float:right;">${stats.cost} SP</span>
        <br><small style="color:#999;">${descStr}</small>
        ${reqStr}
      `;
      btn.addEventListener('click', () => {
        this.enterBuildPlacement(type);
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#444';
        btn.style.borderColor = '#00ff44';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#333';
        btn.style.borderColor = '#555';
      });
      this.buildOptions.appendChild(btn);
    }

    // Cancel button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cmd-btn';
    closeBtn.textContent = 'Cancel (Esc)';
    closeBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 6px;
      margin-top: 6px;
      background: #553333;
      color: #eee;
      border: 1px solid #774444;
      border-radius: 3px;
      cursor: pointer;
      font-family: sans-serif;
    `;
    closeBtn.addEventListener('click', () => {
      this.closeBuildMenu();
    });
    this.buildOptions.appendChild(closeBtn);
  }

  updateBuildMenuAvailability() {
    if (!this.buildOptions) return;
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const teamBuildings = this.game.getBuildings(activeTeam);

    const btns = this.buildOptions.querySelectorAll('[data-build-type]');
    btns.forEach(btn => {
      const type = btn.dataset.buildType;
      const stats = BUILDING_STATS[type];
      if (!stats) return;

      const requires = stats.requires || [];
      const hasReqs = requires.every(req => teamBuildings.some(b => b.type === req && b.alive));
      const canAfford = this.game.resourceSystem ? this.game.resourceSystem.canAfford(activeTeam, stats.cost) : false;

      // GD-079: Check building limits
      const limit = BUILDING_LIMITS[type];
      let atLimit = false;
      let limitStr = '';
      if (limit !== undefined) {
        const count = teamBuildings.filter(b => b.type === type).length;
        atLimit = count >= limit;
        limitStr = ` (${count}/${limit})`;
      }

      const enabled = hasReqs && canAfford && !atLimit;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
      // Update tooltip with limit info
      if (limit !== undefined) {
        btn.title = atLimit ? `Limit reached${limitStr}` : `Remaining${limitStr}`;
      }
    });
  }

  setupEventListeners() {
    // Listen for selection changes
    this.game.eventBus.on('selection:changed', (data) => {
      this.updateSelectionPanel(data.entities);
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
          // Force reflow to restart animation
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
      if (this._superweaponTargetMode) {
        this.handleSuperweaponTarget(e);
        return;
      }
      if (this.game.commandSystem.abilityTargetMode) {
        this.handleAbilityClick(e);
        return;
      }
      if (this.buildPlacementMode) {
        this.handleBuildPlacement(e);
      }
    });

    // Tech tree button
    document.getElementById('btn-techtree')?.addEventListener('click', () => {
      this.toggleTechTree();
    });

    // ESC to close build menu, F1 for help, T for tech tree
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeBuildMenu();
        this.cancelBuildPlacement();
        this.hideTechTree();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        if (this.helpEl) {
          this.helpEl.style.display = this.helpEl.style.display === 'none' ? 'block' : 'none';
        }
      }
      if (e.key === 't' || e.key === 'T') {
        if (this.game.state === 'PLAYING') {
          this.toggleTechTree();
        }
      }

      // Production hotkeys when a production building is selected
      if (this.game.state === 'PLAYING' && !this.buildPlacementMode) {
        this.handleProductionHotkey(e);
      }

      // R key to open research panel for selected building
      if ((e.key === 'r' || e.key === 'R') && this.game.state === 'PLAYING') {
        this.toggleResearchPanel();
      }
    });
  }

  show() {
    this.visible = true;
    this.hudEl?.classList.remove('hidden');
    this.updateResourceDisplay();
  }

  hide() {
    this.visible = false;
    this.hudEl?.classList.add('hidden');
  }

  update() {
    if (!this.visible) return;
    this.updateResourceDisplay();
    this.updateProductionPanel();
    this.updateRallyPointVisuals();
    this.updateNationAbilityButton();
    this.updateDayNightIndicator();
  }

  // ============================
  // Resource Display
  // ============================
  updateResourceDisplay() {
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const sp = Math.floor(this.game.teams[activeTeam].sp);
    const income = this.game.resourceSystem ? this.game.resourceSystem.getIncomeRate(activeTeam) : 0;
    const unitCount = this.game.getUnits(activeTeam).length;
    const maxUnits = GAME_CONFIG.maxUnitsPerTeam;

    if (this.spDisplay) this.spDisplay.textContent = sp;
    if (this.incomeDisplay) this.incomeDisplay.textContent = `+${income}/s`;
    if (this.unitCountDisplay) {
      this.unitCountDisplay.textContent = `${unitCount}/${maxUnits}`;
      // Apply warning/maxed styling
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

      // Timed mode: show countdown
      if (this.game.gameMode === 'timed') {
        const remaining = Math.max(0, 600 - totalSeconds);
        const rm = Math.floor(remaining / 60);
        const rs = remaining % 60;
        timerText = `${rm}:${rs.toString().padStart(2, '0')} left`;
      }

      // King of the Hill: show control progress
      if (this.game.gameMode === 'king_of_hill' && this.game._hillControl) {
        const pc = Math.floor(this.game._hillControl.player);
        const ec = Math.floor(this.game._hillControl.enemy);
        timerText += ` | Hill: P${pc}s E${ec}s`;
      }

      this.gameTimerDisplay.textContent = timerText;
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
    const pScore = this.getMilitaryScore('player');
    const eScore = this.getMilitaryScore('enemy');
    if (this._scoreDisplay) {
      const leading = pScore >= eScore;
      this._scoreDisplay.innerHTML = `<span style="color:${leading ? '#88ff88' : '#ff8888'}">${pScore}</span> vs <span style="color:${!leading ? '#88ff88' : '#ff8888'}">${eScore}</span>`;
    }

    // Research progress indicator
    const resState = this.game.research?.player;
    if (resState?.inProgress) {
      if (!this._researchDisplay) {
        // Remove orphaned element from previous game session
        const existing = document.getElementById('hud-research-display');
        if (existing) existing.remove();
        this._researchDisplay = document.createElement('div');
        this._researchDisplay.id = 'hud-research-display';
        this._researchDisplay.style.cssText = 'position:fixed;bottom:225px;right:10px;background:rgba(0,0,0,0.8);border:1px solid #00ccaa;border-radius:4px;padding:4px 8px;font-size:11px;color:#00ffcc;font-family:sans-serif;z-index:100;';
        document.body.appendChild(this._researchDisplay);
      }
      const upg = RESEARCH_UPGRADES[resState.inProgress];
      this._researchDisplay.textContent = `Researching: ${upg?.name || '?'} (${Math.ceil(resState.timer)}s)`;
      this._researchDisplay.style.display = 'block';
    } else if (this._researchDisplay) {
      this._researchDisplay.style.display = 'none';
    }

    // Spectator mode: show enemy resources too
    if (this.game.mode === 'SPECTATE') {
      const enemySP = Math.floor(this.game.teams.enemy.sp);
      const enemyUnits = this.game.getUnits('enemy').length;
      if (this.spDisplay) {
        this.spDisplay.textContent = `${sp} vs ${enemySP}`;
      }
      if (this.unitCountDisplay) {
        this.unitCountDisplay.textContent = `${unitCount} vs ${enemyUnits}`;
      }
    }
  }

  // ============================
  // Selection Panel
  // ============================
  updateSelectionPanel(entities) {
    if (!this.selectionInfo) return;

    if (!entities || entities.length === 0) {
      this.selectionInfo.innerHTML = '<span class="selection-placeholder">No selection</span>';
      this.hideProductionOptions();
      return;
    }

    if (entities.length === 1) {
      this.showSingleEntityInfo(entities[0]);
    } else {
      this.showMultipleEntityInfo(entities);
    }
  }

  showSingleEntityInfo(entity) {
    const hpPercent = Math.round((entity.health / entity.maxHealth) * 100);
    const hpColor = hpPercent > 50 ? '#00ff00' : hpPercent > 25 ? '#ffaa00' : '#ff0000';

    let statsHtml = '';

    if (entity.isUnit) {
      const stanceColors = { aggressive: '#ff4444', defensive: '#4488ff', holdfire: '#ffcc00' };
      const stanceLabels = { aggressive: 'AGG', defensive: 'DEF', holdfire: 'HOLD' };
      const stanceColor = stanceColors[entity.stance] || '#888';
      const stanceLabel = stanceLabels[entity.stance] || entity.stance;

      statsHtml = `
        <div style="display:flex;gap:12px;margin-top:6px;font-size:12px;flex-wrap:wrap;">
          <span><span style="color:#888;">ATK:</span> <span style="color:#ff8866;">${entity.damage}</span></span>
          <span><span style="color:#888;">RNG:</span> <span style="color:#66aaff;">${entity.range}</span></span>
          <span><span style="color:#888;">SPD:</span> <span style="color:#88ff88;">${entity.speed}</span></span>
          <span><span style="color:#888;">ARM:</span> <span style="color:#cccccc;">${entity.armor || 0}</span></span>
          <span><span style="color:#888;">Rate:</span> <span style="color:#cccc88;">${entity.attackRate}/s</span></span>
          <span style="border:1px solid ${stanceColor};padding:0 4px;border-radius:2px;color:${stanceColor};font-weight:bold;">[V] ${stanceLabel}</span>
        </div>
      `;

      // Show ability info if unit has one
      if (entity.ability) {
        const ab = entity.ability;
        const cdPercent = entity.getAbilityCooldownPercent();
        const ready = cdPercent >= 1;
        const cdColor = ready ? '#00ff44' : '#ff8844';
        const cdWidth = Math.round(cdPercent * 100);

        statsHtml += `
          <div style="margin-top:8px;padding:6px 8px;background:#1a2a1a;border:1px solid ${ready ? '#00ff44' : '#445544'};border-radius:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:${ready ? '#00ff44' : '#888'};font-weight:bold;font-size:12px;">[G] ${ab.name}</span>
              <span style="color:${cdColor};font-size:11px;">${ready ? 'READY' : Math.ceil(entity.abilityCooldown) + 's'}</span>
            </div>
            <div style="background:#333;height:4px;border-radius:2px;margin-top:4px;overflow:hidden;">
              <div style="background:${cdColor};height:100%;width:${cdWidth}%;transition:width 0.3s;"></div>
            </div>
            <div style="color:#666;font-size:10px;margin-top:3px;">${ab.description}</div>
          </div>
        `;
      }

      // Add counter matchup info for units
      if (UNIT_COUNTERS[entity.type]) {
        const counters = UNIT_COUNTERS[entity.type];
        const strongList = counters.strong.map(t => this.formatName(t)).join(', ');
        const weakList = counters.weak.map(t => this.formatName(t)).join(', ');
        statsHtml += `
          <div style="margin-top:6px;font-size:11px;display:flex;gap:12px;">
            <span><span style="color:#00ff44;">Strong vs:</span> <span style="color:#88ff88;">${strongList}</span></span>
            <span><span style="color:#ff4444;">Weak vs:</span> <span style="color:#ff8888;">${weakList}</span></span>
          </div>
        `;
      }

      // APC garrison info
      if (entity.type === 'apc' && entity.garrisonSlots) {
        const count = entity.garrisoned ? entity.garrisoned.length : 0;
        statsHtml += `<div style="margin-top:6px;font-size:12px;"><span style="color:#66aaff;">Garrison:</span> ${count}/${entity.garrisonSlots} infantry`;
        if (count > 0) {
          statsHtml += ` <span style="color:#88ff88;">(firing)</span>`;
          statsHtml += `</div><div style="margin-top:4px;"><button id="btn-eject-apc" style="padding:4px 10px;background:#553333;color:#eee;border:1px solid #774444;border-radius:3px;cursor:pointer;font-size:11px;font-family:sans-serif;">[U] Unload All</button></div>`;
        } else {
          statsHtml += `</div><div style="font-size:10px;color:#666;margin-top:2px;">Right-click with infantry to load</div>`;
        }
      }

      // SPG deploy status
      if (entity.type === 'spg') {
        const deployed = entity._deployed;
        statsHtml += `<div style="margin-top:6px;font-size:12px;padding:4px 8px;background:${deployed ? '#2a3a2a' : '#3a2a2a'};border:1px solid ${deployed ? '#00ff44' : '#ff4444'};border-radius:4px;">
          <span style="color:${deployed ? '#00ff44' : '#ff4444'};">${deployed ? 'DEPLOYED - Can fire' : 'MOBILE - Must deploy to fire [G]'}</span>
        </div>`;
      }
    }

    if (entity.isBuilding) {
      if (entity.produces && entity.produces.length > 0) {
        statsHtml += `<div style="margin-top:6px;font-size:12px;"><span style="color:#888;">Produces:</span> ${entity.produces.map(u => this.formatName(u)).join(', ')}</div>`;
      }

      // Show garrison info for bunkers
      if (entity.garrisonSlots !== undefined) {
        const count = entity.garrisoned ? entity.garrisoned.length : 0;
        statsHtml += `<div style="margin-top:6px;font-size:12px;"><span style="color:#66aaff;">Garrison:</span> ${count}/${entity.garrisonSlots} infantry`;
        if (count > 0) {
          statsHtml += ` <span style="color:#88ff88;">(+${count * 10} DMG)</span>`;
          statsHtml += `</div><div style="margin-top:4px;"><button id="btn-eject-garrison" style="padding:4px 10px;background:#553333;color:#eee;border:1px solid #774444;border-radius:3px;cursor:pointer;font-size:11px;font-family:sans-serif;">Eject All</button></div>`;
        } else {
          statsHtml += `</div><div style="font-size:10px;color:#666;margin-top:2px;">Right-click with infantry to garrison</div>`;
        }
      }

      // Show production queue as interactive icons
      const fullQueue = entity.getFullQueue();
      if (fullQueue.length > 0) {
        statsHtml += `<div style="margin-top:6px;"><span style="color:#ffcc00;font-size:12px;">Production Queue</span><span style="color:#666;font-size:10px;margin-left:6px;">(right-click to cancel)</span></div>`;
        statsHtml += `<div id="prod-queue-icons" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;"></div>`;
        // Show queue summary
        const totalCost = entity.getTotalQueueCost();
        const totalTime = Math.ceil(entity.getTotalQueueTime());
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        statsHtml += `<div style="margin-top:4px;font-size:11px;color:#888;">Queue: <span style="color:#ffcc00;">${totalCost} SP</span> over <span style="color:#88ff88;">${timeStr}</span></div>`;
      }

      // Show tier and upgrade option
      if (entity.canUpgrade && entity.canUpgrade()) {
        const cost = entity.getUpgradeCost();
        const tierBonusNext = BUILDING_UPGRADES[entity.type]?.bonuses[entity.tier + 1];
        const label = tierBonusNext ? tierBonusNext.label : `Tier ${entity.tier + 1}`;
        const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        const canAfford = this.game.resourceSystem ? this.game.resourceSystem.canAfford(activeTeam, cost) : false;

        statsHtml += `
          <div style="margin-top:8px;">
            <button id="btn-upgrade-building" style="
              padding:6px 14px;
              background:${canAfford ? '#2a3a2a' : '#333'};
              color:${canAfford ? '#ffcc00' : '#666'};
              border:1px solid ${canAfford ? '#ffcc00' : '#555'};
              border-radius:4px;
              cursor:${canAfford ? 'pointer' : 'not-allowed'};
              font-family:sans-serif;
              font-size:12px;
              width:100%;
            ">Upgrade to Tier ${entity.tier + 1} - ${cost} SP<br><small style="color:#888;">${label}</small></button>
          </div>
        `;
      }

      // Show current tier
      if (entity.tier > 1) {
        const currentTierBonus = entity.getTierBonus ? entity.getTierBonus() : null;
        if (currentTierBonus) {
          statsHtml += `<div style="margin-top:4px;font-size:11px;color:#ffcc00;">Tier ${entity.tier}: ${currentTierBonus.label}</div>`;
        }
      }

      // GD-059: Superweapon info and fire button
      if (entity.type === 'superweapon' && entity.weaponConfig) {
        const chargePercent = Math.round((entity.chargeProgress / entity.chargeTime) * 100);
        const chargeColor = entity.isCharged ? '#00ff44' : '#ff8800';
        statsHtml += `
          <div style="margin-top:8px;padding:6px 8px;background:#2a1a0a;border:1px solid ${chargeColor};border-radius:4px;">
            <div style="color:#ff8800;font-weight:bold;font-size:13px;">${entity.weaponConfig.name}</div>
            <div style="background:#333;height:6px;border-radius:3px;margin-top:4px;overflow:hidden;">
              <div style="background:${chargeColor};height:100%;width:${chargePercent}%;transition:width 0.3s;"></div>
            </div>
            <div style="color:${chargeColor};font-size:11px;margin-top:3px;">${entity.isCharged ? 'CHARGED - Click to target' : `Charging: ${chargePercent}%`}</div>
            ${entity._constructing ? '<div style="color:#888;font-size:10px;">Under construction...</div>' : ''}
          </div>
        `;
        if (entity.isCharged && entity.team === 'player') {
          statsHtml += `<div style="margin-top:4px;"><button id="btn-fire-superweapon" style="padding:6px 14px;background:#ff4400;color:#fff;border:2px solid #ff8800;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:13px;font-weight:bold;width:100%;letter-spacing:1px;">FIRE ${entity.weaponConfig.name.toUpperCase()}</button></div>`;
        }
      }

      // GD-063: Cancel construction button
      if (entity._constructing && entity.team === 'player') {
        const progress = Math.round((entity._constructionElapsed / entity._constructionTime) * 100);
        statsHtml += `
          <div style="margin-top:6px;font-size:11px;color:#888;">Construction: ${progress}%</div>
          <div style="margin-top:4px;"><button id="btn-cancel-construction" style="padding:4px 10px;background:#553333;color:#eee;border:1px solid #774444;border-radius:3px;cursor:pointer;font-size:11px;font-family:sans-serif;">Cancel (75% refund)</button></div>
        `;
      }
    }

    this.selectionInfo.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-weight:bold;font-size:14px;color:#fff;">${this.formatName(entity.type)}${entity.isUnit && entity.veterancyRank > 0 ? ` <span style="color:${VETERANCY.ranks[entity.veterancyRank].color};font-size:12px;">${VETERANCY.ranks[entity.veterancyRank].symbol} ${VETERANCY.ranks[entity.veterancyRank].name}</span>` : ''}</div>
        <div style="font-size:11px;color:#888;">${entity.domain || ''}</div>
      </div>
      <div style="margin-top:4px;">
        <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;width:150px;">
          <div style="background:${hpColor};height:100%;width:${hpPercent}%;transition:width 0.2s;"></div>
        </div>
        <span style="color:${hpColor};font-size:11px;">${Math.round(entity.health)} / ${entity.maxHealth} HP</span>
      </div>
      ${statsHtml}
    `;

    // Wire up eject button for bunkers
    if (entity.isBuilding && entity.garrisoned && entity.garrisoned.length > 0) {
      const ejectBtn = document.getElementById('btn-eject-garrison');
      if (ejectBtn) {
        ejectBtn.addEventListener('click', () => {
          entity.ejectAll();
          this.showSingleEntityInfo(entity);
          if (this.game.soundManager) this.game.soundManager.play('move');
        });
      }
    }

    // Wire up eject button for APCs
    if (entity.type === 'apc' && entity.garrisoned && entity.garrisoned.length > 0) {
      const apcEjectBtn = document.getElementById('btn-eject-apc');
      if (apcEjectBtn) {
        apcEjectBtn.addEventListener('click', () => {
          entity.ejectAll();
          this.showSingleEntityInfo(entity);
          if (this.game.soundManager) this.game.soundManager.play('move');
        });
      }
    }

    // Wire up upgrade button
    const upgradeBtn = document.getElementById('btn-upgrade-building');
    if (upgradeBtn && entity.canUpgrade && entity.canUpgrade()) {
      upgradeBtn.addEventListener('click', () => {
        const cost = entity.getUpgradeCost();
        const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        if (this.game.resourceSystem && this.game.resourceSystem.canAfford(activeTeam, cost)) {
          this.game.resourceSystem.spend(activeTeam, cost);
          entity.upgrade();
          this.showNotification(`Upgraded to Tier ${entity.tier}!`, '#ffcc00');
          if (this.game.soundManager) this.game.soundManager.play('build');
          this.showSingleEntityInfo(entity);
        } else {
          this.showNotification('Not enough SP!', '#ff4444');
        }
      });
    }

    // Populate production queue icons (after innerHTML is set)
    if (entity.isBuilding) {
      const fullQueue = entity.getFullQueue();
      if (fullQueue.length > 0) {
        this.populateQueueIcons(entity, fullQueue);
      }
    }

    // Wire up superweapon fire button (GD-059)
    const fireBtn = document.getElementById('btn-fire-superweapon');
    if (fireBtn && entity.type === 'superweapon' && entity.isCharged) {
      fireBtn.addEventListener('click', () => {
        this.showNotification('Click on the map to target superweapon!', '#ff8800');
        this._superweaponTargetMode = true;
        this._superweaponBuilding = entity;
        document.body.style.cursor = 'crosshair';
      });
    }

    // Wire up cancel construction button (GD-063)
    const cancelBtn = document.getElementById('btn-cancel-construction');
    if (cancelBtn && entity._constructing) {
      cancelBtn.addEventListener('click', () => {
        if (this.game.productionSystem) {
          this.game.productionSystem.cancelConstruction(entity);
        }
      });
    }

    // Show production buttons if it's a production building
    if (entity.isBuilding && entity.produces && entity.produces.length > 0 && !entity._constructing) {
      this.showProductionButtons(entity);
    } else {
      this.hideProductionOptions();
    }
  }

  populateQueueIcons(building, fullQueue) {
    const container = document.getElementById('prod-queue-icons');
    if (!container) return;

    for (let i = 0; i < fullQueue.length; i++) {
      const item = fullQueue[i];
      const icon = document.createElement('div');
      icon.style.cssText = `
        position: relative;
        width: 42px;
        height: 36px;
        background: ${item.isCurrent ? '#2a3a2a' : '#1a2a1a'};
        border: 1px solid ${item.isCurrent ? '#00ff88' : '#445544'};
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #ccc;
        text-align: center;
        line-height: 1.1;
        user-select: none;
        overflow: hidden;
      `;

      // Short name
      const shortName = this.formatName(item.type).substring(0, 6);
      icon.innerHTML = `<span style="z-index:1;pointer-events:none;">${shortName}</span>`;

      // Progress bar for current item
      if (item.isCurrent && item.progress > 0) {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: ${Math.round(item.progress * 100)}%;
          background: #00ff88;
        `;
        icon.appendChild(progressBar);
      }

      // Queue index indicator
      if (i === 0) {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
          position: absolute;
          top: 1px;
          right: 2px;
          font-size: 8px;
          color: #00ff88;
          pointer-events: none;
        `;
        indicator.textContent = '\u25B6'; // play symbol
        icon.appendChild(indicator);
      }

      // Right-click to cancel
      icon.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.game.productionSystem) {
          const success = this.game.productionSystem.cancelProduction(building, i);
          if (success) {
            const stats = UNIT_STATS[item.type];
            this.showNotification(`Cancelled ${this.formatName(item.type)} (+${stats ? stats.cost : 0} SP refunded)`, '#ffaa00');
            if (this.game.soundManager) this.game.soundManager.play('select');
            // Refresh display
            this.showSingleEntityInfo(building);
          }
        }
      });

      // Hover effect
      icon.addEventListener('mouseenter', () => {
        icon.style.borderColor = '#ff6644';
        if (item.isCurrent) {
          const remaining = Math.ceil(building.getRemainingTime());
          icon.title = `${this.formatName(item.type)} - ${remaining}s remaining - Right-click to cancel`;
        } else {
          icon.title = `${this.formatName(item.type)} - Right-click to cancel`;
        }
      });
      icon.addEventListener('mouseleave', () => {
        icon.style.borderColor = item.isCurrent ? '#00ff88' : '#445544';
      });

      container.appendChild(icon);
    }
  }

  showMultipleEntityInfo(entities) {
    const typeCounts = {};
    let totalHP = 0;
    let totalMaxHP = 0;

    for (const entity of entities) {
      typeCounts[entity.type] = (typeCounts[entity.type] || 0) + 1;
      totalHP += entity.health;
      totalMaxHP += entity.maxHealth;
    }

    let typeList = '';
    for (const [type, count] of Object.entries(typeCounts)) {
      typeList += `<span style="display:inline-block;background:#333;padding:2px 6px;margin:2px;border-radius:3px;font-size:11px;">${this.formatName(type)} x${count}</span>`;
    }

    const avgHP = Math.round((totalHP / totalMaxHP) * 100);
    const hpColor = avgHP > 50 ? '#00ff00' : avgHP > 25 ? '#ffaa00' : '#ff0000';

    this.selectionInfo.innerHTML = `
      <div style="font-weight:bold;font-size:14px;color:#fff;margin-bottom:4px;">${entities.length} Units Selected</div>
      <div style="margin-bottom:4px;">${typeList}</div>
      <div>
        <span style="color:#888;font-size:12px;">Avg HP:</span>
        <div style="background:#333;height:6px;border-radius:3px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;">
          <div style="background:${hpColor};height:100%;width:${avgHP}%;"></div>
        </div>
        <span style="color:${hpColor};font-size:11px;">${avgHP}%</span>
      </div>
    `;

    this.hideProductionOptions();
  }

  // ============================
  // Production Panel
  // ============================
  showProductionButtons(building) {
    if (!this.productionPanel || !this.productionOptions) return;
    // Don't show production panel when build menu is open (they overlap)
    if (this.buildMenuOpen) return;

    this.productionPanel.classList.remove('hidden');
    this.productionOptions.innerHTML = '';

    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';

    for (const unitType of building.produces) {
      const stats = UNIT_STATS[unitType];
      if (!stats) continue;

      const btn = document.createElement('button');
      btn.className = 'cmd-btn';
      btn.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 3px;
        background: #2a3a2a;
        color: #ccc;
        border: 1px solid #445544;
        border-radius: 3px;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 13px;
      `;

      const canAfford = this.game.resourceSystem ? this.game.resourceSystem.canAfford(activeTeam, stats.cost) : false;
      const hasTech = this.game.productionSystem ? this.game.productionSystem.hasTechRequirements(activeTeam, unitType) : true;
      const available = canAfford && hasTech;

      if (!available) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }

      let reqHtml = '';
      if (!hasTech) {
        const tech = TECH_TREE[unitType];
        if (tech && tech.requires.length > 0) {
          reqHtml = `<div style="color:#ff6644;font-size:10px;">Needs: ${tech.requires.map(r => this.formatName(r)).join(', ')}</div>`;
        }
      }

      btn.innerHTML = `
        <div>
          <strong>${this.formatName(unitType)}</strong>
          ${reqHtml}
        </div>
        <div style="text-align:right;">
          <span style="color:${canAfford ? '#ffcc00' : '#ff4444'};">${stats.cost} SP</span>
          <div style="color:#888;font-size:10px;">${stats.buildTime}s</div>
        </div>
      `;
      btn.title = `${this.formatName(unitType)} (${stats.cost} SP) — Shift+click to queue 5`;

      btn.addEventListener('click', (e) => {
        if (building.alive && this.game.productionSystem && available) {
          const count = e.shiftKey ? 5 : 1;
          for (let i = 0; i < count; i++) {
            this.game.productionSystem.requestProduction(building, unitType);
          }
          this.showProductionButtons(building);
        }
      });

      btn.addEventListener('mouseenter', () => {
        if (available) {
          btn.style.background = '#3a4a3a';
          btn.style.borderColor = '#00ff44';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#2a3a2a';
        btn.style.borderColor = '#445544';
      });

      this.productionOptions.appendChild(btn);
    }
  }

  updateProductionPanel() {
    const selected = this.game.selectionManager?.getSelected() || [];
    if (selected.length === 1 && selected[0].isBuilding && selected[0].alive) {
      this.showSingleEntityInfo(selected[0]);
    }
    // Also refresh build menu availability when resources change
    if (this.buildMenuOpen) {
      this.updateBuildMenuAvailability();
    }
  }

  hideProductionOptions() {
    if (this.productionPanel) this.productionPanel.classList.add('hidden');
  }

  // ============================
  // Build Menu
  // ============================
  toggleBuildMenu() {
    if (this.buildMenuOpen) {
      this.closeBuildMenu();
    } else {
      this.openBuildMenu();
    }
  }

  openBuildMenu() {
    if (!this.buildMenu) return;
    // Hide production panel while build menu is open to prevent overlap
    this.hideProductionOptions();
    this.updateBuildMenuAvailability();
    this.buildMenu.classList.remove('hidden');
    this.buildMenuOpen = true;
  }

  closeBuildMenu() {
    if (!this.buildMenu) return;
    this.buildMenu.classList.add('hidden');
    this.buildMenuOpen = false;
    this.cancelBuildPlacement();
    // Restore production panel if a building is selected
    const selected = this.game.selectionManager?.getSelected() || [];
    if (selected.length === 1 && selected[0].isBuilding) {
      this.showSingleEntityInfo(selected[0]);
    }
  }

  enterBuildPlacement(buildingType) {
    // Check tech requirements before entering placement
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const stats = BUILDING_STATS[buildingType];
    if (stats && stats.requires && stats.requires.length > 0) {
      const teamBuildings = this.game.getBuildings(activeTeam);
      for (const req of stats.requires) {
        if (!teamBuildings.some(b => b.type === req && b.alive)) {
          this.showNotification(`Requires ${this.formatName(req)} first`, '#ff4444');
          if (this.game.soundManager) this.game.soundManager.play('error');
          return;
        }
      }
    }

    this.buildPlacementMode = true;
    this.buildPlacementType = buildingType;
    // Close menu visually without canceling placement
    if (this.buildMenu) this.buildMenu.classList.add('hidden');
    this.buildMenuOpen = false;
    document.body.style.cursor = 'crosshair';
    this.showNotification(`Click to place ${this.formatName(buildingType)}. ESC to cancel.`, '#ffcc00');

    // Create ghost preview mesh
    this.createGhostMesh(buildingType);
  }

  cancelBuildPlacement() {
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
    document.body.style.cursor = 'default';
    this.removeGhostMesh();
  }

  handleSuperweaponTarget(event) {
    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
    if (worldPos && this._superweaponBuilding && this._superweaponBuilding.alive && this._superweaponBuilding.isCharged) {
      this._superweaponBuilding.fire(worldPos);
      this.showNotification('Superweapon launched!', '#ff4400');
    }
    this._superweaponTargetMode = false;
    this._superweaponBuilding = null;
    document.body.style.cursor = 'default';
  }

  handleAbilityClick(event) {
    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);

    if (worldPos) {
      const selected = this.game.selectionManager.getSelected().filter(e => e.isUnit && e.ability);
      for (const unit of selected) {
        if (unit.canUseAbility()) {
          this.game.combatSystem.executeAbility(unit, worldPos, null);
        }
      }
    }

    // Always reset state even if worldPos was null
    this.game.commandSystem.abilityTargetMode = false;
    document.body.style.cursor = 'default';
  }

  handleBuildPlacement(event) {
    if (!this.buildPlacementMode || !this.buildPlacementType) return;

    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
    if (!worldPos) return;

    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const result = this.game.productionSystem.requestBuilding(
      this.buildPlacementType,
      activeTeam,
      worldPos
    );

    if (result) {
      this.showNotification(`${this.formatName(this.buildPlacementType)} placed!`, '#00ff88');
    }

    this.cancelBuildPlacement();
  }

  // ============================
  // Notifications
  // ============================
  showNotification(message, color = '#ffffff') {
    if (!this.notificationArea) return;

    const notif = document.createElement('div');
    notif.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: ${color};
      padding: 8px 14px;
      margin-bottom: 4px;
      border-radius: 4px;
      font-family: sans-serif;
      font-size: 13px;
      border-left: 3px solid ${color};
      text-align: center;
      opacity: 1;
      transition: opacity 0.5s;
      pointer-events: none;
    `;
    notif.textContent = message;
    this.notificationArea.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = '0';
      setTimeout(() => {
        if (notif.parentElement) notif.parentElement.removeChild(notif);
      }, 500);
    }, 3000);

    while (this.notificationArea.children.length > 5) {
      this.notificationArea.removeChild(this.notificationArea.firstChild);
    }
  }

  // ============================
  // Ghost Building Preview
  // ============================
  createGhostMesh(buildingType) {
    this.removeGhostMesh();
    const stats = BUILDING_STATS[buildingType];
    if (!stats) return;

    const size = (stats.size || 2) * 2.5;
    const height = Math.max(2, size * 0.8);

    const group = new THREE.Group();

    // Simple box representing the building footprint
    const geo = new THREE.BoxGeometry(size, height, size);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x00ff44,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const box = new THREE.Mesh(geo, mat);
    box.position.y = height / 2;
    group.add(box);

    // Footprint ring on the ground
    const ringGeo = new THREE.RingGeometry(size * 0.7, size * 0.75, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);

    group.userData.ghostMat = mat;
    group.userData.ghostRingMat = ringMat;

    this.ghostMesh = group;
    this.ghostValid = false;

    const scene = this.game.sceneManager?.scene;
    if (scene) scene.add(this.ghostMesh);
  }

  removeGhostMesh() {
    if (this.ghostMesh) {
      const scene = this.game.sceneManager?.scene;
      if (scene) scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  updateGhostPosition(worldPos) {
    if (!this.ghostMesh || !worldPos) return;

    this.ghostMesh.position.set(worldPos.x, worldPos.y || 0, worldPos.z);

    // Check placement validity
    const valid = this.checkPlacementValid(worldPos);
    if (valid !== this.ghostValid) {
      this.ghostValid = valid;
      const color = valid ? 0x00ff44 : 0xff3333;
      const mat = this.ghostMesh.userData.ghostMat;
      const ringMat = this.ghostMesh.userData.ghostRingMat;
      if (mat) mat.color.setHex(color);
      if (ringMat) ringMat.color.setHex(color);
    }
  }

  checkPlacementValid(worldPos) {
    if (!this.buildPlacementType) return false;
    const stats = BUILDING_STATS[this.buildPlacementType];
    if (!stats) return false;

    // Check terrain walkability (water check)
    if (this.game.terrain && !this.game.terrain.isWalkable(worldPos.x, worldPos.z)) {
      return false;
    }

    // Check overlap with existing buildings
    const allBuildings = this.game.entities.filter(e => e.isBuilding && e.alive);
    const buildSize = (stats.size || 2) * 5;
    for (const existing of allBuildings) {
      const dist = existing.getPosition().distanceTo(worldPos);
      const existingSize = (BUILDING_STATS[existing.type]?.size || 2) * 5;
      if (dist < (buildSize + existingSize) / 2) {
        return false;
      }
    }

    return true;
  }

  // ============================
  // Rally Point Visualization
  // ============================
  updateRallyPointVisuals() {
    const selected = this.game.selectionManager?.getSelected() || [];
    const building = (selected.length === 1 && selected[0].isBuilding && selected[0].produces && selected[0].produces.length > 0)
      ? selected[0] : null;

    // If the selected production building changed, rebuild visuals
    if (building !== this.rallyTargetBuilding) {
      this.removeRallyVisuals();
      this.rallyTargetBuilding = building;
    }

    if (!building || !building.rallyPoint) {
      this.removeRallyVisuals();
      return;
    }

    const scene = this.game.sceneManager?.scene;
    if (!scene) return;

    const buildingPos = building.getPosition();
    const rallyPos = building.rallyPoint;

    // Create or update rally line
    if (!this.rallyLine) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff44, linewidth: 2, transparent: true, opacity: 0.7 });
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      this.rallyLine = new THREE.Line(lineGeo, lineMat);
      scene.add(this.rallyLine);
    }

    // Update line endpoints
    const positions = this.rallyLine.geometry.attributes.position;
    positions.setXYZ(0, buildingPos.x, buildingPos.y + 1.5, buildingPos.z);
    positions.setXYZ(1, rallyPos.x, (rallyPos.y || 0) + 0.5, rallyPos.z);
    positions.needsUpdate = true;

    // Create or update rally flag
    if (!this.rallyFlag) {
      const flagGroup = new THREE.Group();

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
      const poleMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.25;
      flagGroup.add(pole);

      // Flag triangle
      const flagShape = new THREE.Shape();
      flagShape.moveTo(0, 0);
      flagShape.lineTo(1.2, 0.35);
      flagShape.lineTo(0, 0.7);
      flagShape.closePath();
      const flagGeo = new THREE.ShapeGeometry(flagShape);
      const flagMat = new THREE.MeshPhongMaterial({
        color: 0x00ff44,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.06, 1.8, 0);
      flagGroup.add(flag);

      // Base marker circle
      const baseGeo = new THREE.RingGeometry(0.3, 0.5, 16);
      const baseMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.1;
      flagGroup.add(base);

      this.rallyFlag = flagGroup;
      scene.add(this.rallyFlag);
    }

    this.rallyFlag.position.set(rallyPos.x, rallyPos.y || 0, rallyPos.z);
  }

  removeRallyVisuals() {
    const scene = this.game.sceneManager?.scene;
    if (this.rallyLine) {
      if (scene) scene.remove(this.rallyLine);
      this.rallyLine.geometry.dispose();
      this.rallyLine.material.dispose();
      this.rallyLine = null;
    }
    if (this.rallyFlag) {
      if (scene) scene.remove(this.rallyFlag);
      this.rallyFlag = null;
    }
    this.rallyTargetBuilding = null;
  }

  // ============================
  // Tech Tree Visualization
  // ============================
  createTechTreeOverlay() {
    this.techTreeEl = document.createElement('div');
    this.techTreeEl.id = 'tech-tree-overlay';
    this.techTreeEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #555;
      border-radius: 12px;
      padding: 30px;
      z-index: 10002;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      font-family: sans-serif;
      color: #ccc;
    `;
    document.body.appendChild(this.techTreeEl);
  }

  showTechTree() {
    if (!this.techTreeEl) return;
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const teamBuildings = this.game.getBuildings(activeTeam);
    const ownedTypes = new Set(teamBuildings.map(b => b.type));

    let html = `<h2 style="color:#ffcc00;margin:0 0 20px 0;text-align:center;letter-spacing:2px;">TECH TREE</h2>`;

    // Buildings section
    html += `<h3 style="color:#00ff44;margin:15px 0 10px 0;font-size:14px;">Buildings</h3>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">`;

    const buildingTypes = Object.keys(BUILDING_STATS);
    for (const type of buildingTypes) {
      const stats = BUILDING_STATS[type];
      const owned = ownedTypes.has(type);
      const requires = stats.requires || [];
      const hasReqs = requires.every(r => ownedTypes.has(r));

      let borderColor = owned ? '#00ff44' : hasReqs ? '#ffcc00' : '#ff4444';
      let bgColor = owned ? 'rgba(0,255,65,0.1)' : 'rgba(0,0,0,0.3)';
      let statusIcon = owned ? '\u2713' : hasReqs ? '\u25CB' : '\u2715';
      let statusColor = owned ? '#00ff44' : hasReqs ? '#ffcc00' : '#ff4444';

      html += `
        <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:6px;padding:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#fff;font-size:12px;">${this.formatName(type)}</strong>
            <span style="color:${statusColor};font-size:14px;">${statusIcon}</span>
          </div>
          <div style="font-size:10px;color:#888;margin-top:4px;">HP: ${stats.hp} | Cost: ${stats.cost} SP</div>
          ${requires.length > 0 ? `<div style="font-size:10px;color:#ff8844;margin-top:2px;">Requires: ${requires.map(r => this.formatName(r)).join(', ')}</div>` : ''}
          ${stats.produces && stats.produces.length > 0 ? `<div style="font-size:10px;color:#66aaff;margin-top:2px;">Produces: ${stats.produces.map(u => this.formatName(u)).join(', ')}</div>` : ''}
        </div>
      `;
    }
    html += `</div>`;

    // Units section
    html += `<h3 style="color:#00ff44;margin:20px 0 10px 0;font-size:14px;">Units</h3>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">`;

    const unitTypes = Object.keys(UNIT_STATS);
    for (const type of unitTypes) {
      const stats = UNIT_STATS[type];
      const tech = TECH_TREE[type];
      const canProduce = tech ? ownedTypes.has(tech.building) && tech.requires.every(r => ownedTypes.has(r)) : false;

      let borderColor = canProduce ? '#00ff44' : '#ff4444';
      let bgColor = canProduce ? 'rgba(0,255,65,0.1)' : 'rgba(0,0,0,0.3)';

      html += `
        <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:6px;padding:10px;">
          <strong style="color:#fff;font-size:12px;">${this.formatName(type)}</strong>
          <span style="color:#888;font-size:10px;margin-left:4px;">${stats.domain}</span>
          <div style="font-size:10px;color:#888;margin-top:4px;">
            HP:${stats.hp} ATK:${stats.damage} RNG:${stats.range} SPD:${stats.speed}
          </div>
          <div style="font-size:10px;color:#ffcc00;margin-top:2px;">${stats.cost} SP | ${stats.buildTime}s</div>
          ${tech ? `<div style="font-size:10px;color:#ff8844;margin-top:2px;">From: ${this.formatName(tech.building)}</div>` : ''}
        </div>
      `;
    }
    html += `</div>`;

    // Close button
    html += `<div style="text-align:center;margin-top:20px;">
      <button id="btn-close-techtree" style="padding:8px 24px;background:#333;color:#fff;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:14px;">Close (T)</button>
    </div>`;

    this.techTreeEl.innerHTML = html;
    this.techTreeEl.style.display = 'block';

    document.getElementById('btn-close-techtree')?.addEventListener('click', () => {
      this.hideTechTree();
    });
  }

  hideTechTree() {
    if (this.techTreeEl) this.techTreeEl.style.display = 'none';
  }

  toggleTechTree() {
    if (this.techTreeEl && this.techTreeEl.style.display !== 'none') {
      this.hideTechTree();
    } else {
      this.showTechTree();
    }
  }

  // ============================
  // Helpers
  // ============================
  // Production hotkeys: when a production building is selected
  // I = infantry, T = tank (if warfactory), D = drone (if airfield), etc.
  handleProductionHotkey(e) {
    const key = e.key.toLowerCase();
    const hotkeys = { 'i': 'infantry', 'k': 'tank', 'j': 'drone', 'l': 'plane',
                      'n': 'battleship', 'u': 'submarine', 'm': 'mortar',
                      'o': 'scoutcar', 'h': 'heavytank', 'y': 'bomber' };
    const unitType = hotkeys[key];
    if (!unitType) return;

    const selected = this.game.selectionManager?.getSelected() || [];
    const building = selected.find(ent =>
      ent.isBuilding && ent.alive && ent.produces && ent.produces.includes(unitType) && ent.team === 'player'
    );
    if (!building) return;

    e.preventDefault();
    if (this.game.productionSystem) {
      this.game.productionSystem.requestProduction(building, unitType);
    }
  }

  // Research panel
  toggleResearchPanel() {
    const selected = this.game.selectionManager?.getSelected() || [];
    const building = selected.find(ent =>
      ent.isBuilding && ent.alive && ent.team === 'player'
    );
    if (!building) return;

    // Find available research for this building type
    const available = Object.entries(RESEARCH_UPGRADES).filter(([id, upg]) =>
      upg.building === building.type
    );
    if (available.length === 0) {
      this.showNotification('No research available at this building', '#888888');
      return;
    }

    // Create or update research panel
    let panel = document.getElementById('research-panel');
    if (panel && panel.style.display !== 'none') {
      panel.style.display = 'none';
      return;
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'research-panel';
      panel.style.cssText = `
        position: fixed;
        right: 220px;
        bottom: 60px;
        background: rgba(0,0,0,0.9);
        border: 1px solid #555;
        border-radius: 6px;
        padding: 12px;
        z-index: 200;
        font-family: sans-serif;
        width: 250px;
      `;
      document.body.appendChild(panel);
    }

    const state = this.game.research?.player;
    let html = '<h4 style="color:#00ffcc;margin:0 0 8px 0;font-size:13px;">Research (R)</h4>';

    if (state?.inProgress) {
      const upg = RESEARCH_UPGRADES[state.inProgress];
      html += `<div style="color:#ffcc00;font-size:12px;margin-bottom:8px;">Researching: ${upg.name} (${Math.ceil(state.timer)}s)</div>`;
    }

    for (const [id, upg] of available) {
      const completed = state?.completed.includes(id);
      const inProgress = state?.inProgress === id;
      const canAfford = this.game.teams.player.sp >= upg.cost;
      const alreadyResearching = !!state?.inProgress;

      let status = '';
      let color = '#ccc';
      let bg = '#333';
      if (completed) { status = 'DONE'; color = '#00ff44'; bg = '#1a331a'; }
      else if (inProgress) { status = `${Math.ceil(state.timer)}s`; color = '#ffcc00'; bg = '#332a00'; }
      else if (alreadyResearching) { status = `${upg.cost} SP`; color = '#666'; }
      else if (!canAfford) { status = `${upg.cost} SP`; color = '#ff4444'; }
      else { status = `${upg.cost} SP`; color = '#88ff88'; }

      html += `<div class="research-item" data-research="${id}" style="
        padding:6px 8px;margin-bottom:4px;background:${bg};border:1px solid #444;
        border-radius:3px;cursor:${completed || alreadyResearching ? 'default' : 'pointer'};
        opacity:${completed || (alreadyResearching && !inProgress) ? '0.6' : '1'};
      ">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#fff;font-size:12px;font-weight:600;">${upg.name}</span>
          <span style="color:${color};font-size:11px;">${status}</span>
        </div>
        <div style="color:#888;font-size:10px;margin-top:2px;">${upg.description}</div>
      </div>`;
    }

    html += '<div style="color:#666;font-size:10px;margin-top:4px;">Click to start research</div>';
    panel.innerHTML = html;
    panel.style.display = 'block';

    // Add click handlers for research items
    panel.querySelectorAll('.research-item').forEach(item => {
      item.addEventListener('click', () => {
        const resId = item.dataset.research;
        if (this.game.startResearch('player', resId)) {
          this.showNotification(`Researching: ${RESEARCH_UPGRADES[resId].name}`, '#00ffcc');
          this.toggleResearchPanel(); // refresh
          this.toggleResearchPanel();
        }
      });
    });
  }

  // Military score comparison for HUD
  updateDayNightIndicator() {
    if (!this.game.sceneManager || !this.game.sceneManager.dayNightEnabled) return;

    if (!this._dayNightIndicator) {
      const existing = document.getElementById('hud-daynight');
      if (existing) existing.remove();
      this._dayNightIndicator = document.createElement('div');
      this._dayNightIndicator.id = 'hud-daynight';
      this._dayNightIndicator.style.cssText = 'position:fixed;top:44px;right:10px;background:rgba(0,0,0,0.7);border-radius:4px;padding:3px 8px;font-size:11px;font-family:sans-serif;z-index:100;';
      document.body.appendChild(this._dayNightIndicator);
    }

    const isNight = this.game.sceneManager.isNight;
    const symbol = isNight ? '\u{1F319}' : '\u2600';
    const label = isNight ? 'Night' : 'Day';
    const color = isNight ? '#8888cc' : '#ffcc44';
    const visionNote = isNight ? ' (Vision -30%)' : '';
    this._dayNightIndicator.innerHTML = `<span style="color:${color};">${symbol} ${label}${visionNote}</span>`;
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

  formatName(type) {
    if (!type) return '';
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
      techlab: 'Tech Lab'
    };
    if (names[type]) return names[type];
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  }
}
