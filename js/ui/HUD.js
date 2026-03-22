import { UNIT_STATS, BUILDING_STATS, TECH_TREE, NATIONS } from '../core/Constants.js';

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

    // State
    this.visible = false;
    this.buildMenuOpen = false;
    this.buildPlacementMode = false;
    this.buildPlacementType = null;

    // Create notification area
    this.notificationArea = document.createElement('div');
    this.notificationArea.id = 'hud-notifications';
    this.notificationArea.style.cssText = `
      position: absolute;
      top: 50px;
      right: 10px;
      width: 280px;
      z-index: 100;
      pointer-events: none;
    `;
    if (this.hudEl) this.hudEl.appendChild(this.notificationArea);

    // Create keyboard shortcuts help overlay
    this.createHelpOverlay();

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
      <div>B: Build menu</div>
      <div>Tab: Cycle buildings</div>
      <div>Esc: Cancel</div>
    `;
    document.body.appendChild(this.helpEl);
  }

  populateBuildMenu() {
    if (!this.buildOptions) return;
    this.buildOptions.innerHTML = '';

    const buildableTypes = ['barracks', 'warfactory', 'airfield', 'shipyard', 'resourcedepot'];
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

      btn.innerHTML = `
        <strong>${this.formatName(type)}</strong>
        <span style="color:#ffcc00;float:right;">${stats.cost} SP</span>
        <br><small style="color:#999;">${stats.produces.length > 0 ? 'Produces: ' + stats.produces.map(u => this.formatName(u)).join(', ') : (type === 'resourcedepot' ? 'Income: +' + (stats.income || 8) + ' SP/s' : '')}</small>
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

      btn.style.opacity = (hasReqs && canAfford) ? '1' : '0.5';
      btn.style.cursor = (hasReqs && canAfford) ? 'pointer' : 'not-allowed';
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
      this.showNotification(data.message, '#ff4444');
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
      if (this.buildPlacementMode) {
        this.handleBuildPlacement(e);
      }
    });

    // ESC to close build menu, F1 for help
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeBuildMenu();
        this.cancelBuildPlacement();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        if (this.helpEl) {
          this.helpEl.style.display = this.helpEl.style.display === 'none' ? 'block' : 'none';
        }
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
  }

  // ============================
  // Resource Display
  // ============================
  updateResourceDisplay() {
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const sp = Math.floor(this.game.teams[activeTeam].sp);
    const income = this.game.resourceSystem ? this.game.resourceSystem.getIncomeRate(activeTeam) : 0;
    const unitCount = this.game.getUnits(activeTeam).length;

    if (this.spDisplay) this.spDisplay.textContent = sp;
    if (this.incomeDisplay) this.incomeDisplay.textContent = `+${income}/s`;
    if (this.unitCountDisplay) this.unitCountDisplay.textContent = unitCount;
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
      statsHtml = `
        <div style="display:flex;gap:12px;margin-top:6px;font-size:12px;flex-wrap:wrap;">
          <span><span style="color:#888;">ATK:</span> <span style="color:#ff8866;">${entity.damage}</span></span>
          <span><span style="color:#888;">RNG:</span> <span style="color:#66aaff;">${entity.range}</span></span>
          <span><span style="color:#888;">SPD:</span> <span style="color:#88ff88;">${entity.speed}</span></span>
          <span><span style="color:#888;">ARM:</span> <span style="color:#cccccc;">${entity.armor || 0}</span></span>
          <span><span style="color:#888;">Rate:</span> <span style="color:#cccc88;">${entity.attackRate}/s</span></span>
        </div>
      `;
    }

    if (entity.isBuilding) {
      if (entity.produces && entity.produces.length > 0) {
        statsHtml += `<div style="margin-top:6px;font-size:12px;"><span style="color:#888;">Produces:</span> ${entity.produces.map(u => this.formatName(u)).join(', ')}</div>`;
      }

      if (entity.currentProduction) {
        const progress = entity.getProductionProgress();
        const pctStr = Math.round(progress * 100);
        statsHtml += `
          <div style="margin-top:6px;">
            <span style="color:#ffcc00;font-size:12px;">Building: ${this.formatName(entity.currentProduction)}</span>
            <div style="background:#333;height:6px;border-radius:3px;margin-top:3px;overflow:hidden;">
              <div style="background:#00ff88;height:100%;width:${pctStr}%;transition:width 0.2s;"></div>
            </div>
          </div>
        `;
      }

      if (entity.productionQueue.length > 0) {
        statsHtml += `<div style="color:#888;margin-top:3px;font-size:11px;">Queue: ${entity.productionQueue.map(u => this.formatName(u)).join(', ')}</div>`;
      }
    }

    this.selectionInfo.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-weight:bold;font-size:14px;color:#fff;">${this.formatName(entity.type)}</div>
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

    // Show production buttons if it's a production building
    if (entity.isBuilding && entity.produces && entity.produces.length > 0) {
      this.showProductionButtons(entity);
    } else {
      this.hideProductionOptions();
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

      btn.addEventListener('click', () => {
        if (building.alive && this.game.productionSystem && available) {
          this.game.productionSystem.requestProduction(building, unitType);
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
    if (selected.length === 1 && selected[0].isBuilding && selected[0].currentProduction) {
      this.showSingleEntityInfo(selected[0]);
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
    this.updateBuildMenuAvailability();
    this.buildMenu.classList.remove('hidden');
    this.buildMenuOpen = true;
  }

  closeBuildMenu() {
    if (!this.buildMenu) return;
    this.buildMenu.classList.add('hidden');
    this.buildMenuOpen = false;
    this.cancelBuildPlacement();
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
    this.closeBuildMenu();
    document.body.style.cursor = 'crosshair';
    this.showNotification(`Click to place ${this.formatName(buildingType)}. ESC to cancel.`, '#ffcc00');
  }

  cancelBuildPlacement() {
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
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
  // Helpers
  // ============================
  formatName(type) {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  }
}
