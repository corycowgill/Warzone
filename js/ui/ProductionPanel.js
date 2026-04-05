import { UNIT_STATS, TECH_TREE, RESEARCH_UPGRADES, TECH_BRANCHES, FACTION_UNITS } from '../core/Constants.js';

export class ProductionPanel {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

    this.productionPanel = document.getElementById('production-panel');
    this.productionQueue = document.getElementById('production-queue');
    this.productionOptions = document.getElementById('production-options');

    // Cycle 15: Production Overview Panel
    this._prodOverviewPanel = document.getElementById('prod-overview-panel');
    this._prodOverviewEntries = document.getElementById('po-entries');
    this._prodOverviewOpen = false;
    this._prodOverviewCache = ''; // minimize DOM updates
  }

  showProductionButtons(building) {
    if (!this.productionPanel || !this.productionOptions) return;
    // Don't show production panel when build menu is open (they overlap)
    if (this.hud.buildPanel.buildMenuOpen) return;

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
        height: auto;
        padding: 8px 12px;
        margin-bottom: 3px;
        background: #2a3a2a;
        color: #ccc;
        border: 1px solid #445544;
        border-radius: 3px;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 13px;
        text-transform: none;
        line-height: 1.4;
        overflow: visible;
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
          reqHtml = `<div style="color:#ff6644;font-size:10px;">Needs: ${tech.requires.map(r => this.hud.formatName(r)).join(', ')}</div>`;
        }
      }

      const playerNation = this.hud.getPlayerNation();
      const factionOverride = playerNation && FACTION_UNITS[playerNation] ? FACTION_UNITS[playerNation][unitType] : null;
      const displayName = factionOverride ? factionOverride.name : this.hud.formatName(unitType);
      const factionDesc = factionOverride ? `<div style="color:#88ddff;font-size:10px;">${factionOverride.description}</div>` : '';
      const effectiveCost = factionOverride?.statsOverride?.cost || stats.cost;

      btn.innerHTML = `
        <div>
          <strong>${displayName}</strong>
          ${factionDesc}
          ${reqHtml}
        </div>
        <div style="text-align:right;">
          <span style="color:${canAfford ? '#ffcc00' : '#ff4444'};">${effectiveCost} SP</span>
          <div style="color:#888;font-size:10px;">${stats.buildTime}s</div>
        </div>
      `;
      btn.title = `${displayName} (${effectiveCost} SP) — Shift+click to queue 5`;

      btn.addEventListener('click', (e) => {
        if (!building.alive || !this.game.productionSystem) return;
        // Re-check affordability at click time (not creation time)
        const clickTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        const clickCanAfford = this.game.resourceSystem ? this.game.resourceSystem.canAfford(clickTeam, effectiveCost) : false;
        const clickHasTech = this.game.productionSystem ? this.game.productionSystem.hasTechRequirements(clickTeam, unitType) : true;
        if (clickCanAfford && clickHasTech) {
          const count = e.shiftKey ? 5 : 1;
          for (let i = 0; i < count; i++) {
            this.game.productionSystem.requestProduction(building, unitType);
          }
          this.showProductionButtons(building);
        } else if (!clickCanAfford) {
          this.hud.showNotification('Not enough resources!', '#ff4444');
        } else {
          this.hud.showNotification('Missing tech requirements!', '#ff4444');
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
      this.hud.selectionPanel.showSingleEntityInfo(selected[0]);
    }
    // Also refresh build menu availability when resources change
    if (this.hud.buildPanel.buildMenuOpen) {
      this.hud.buildPanel.updateBuildMenuAvailability();
    }
  }

  hideProductionOptions() {
    if (this.productionPanel) this.productionPanel.classList.add('hidden');
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
      const shortName = this.hud.formatName(item.type).substring(0, 6);
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
            this.hud.showNotification(`Cancelled ${this.hud.formatName(item.type)} (+${stats ? stats.cost : 0} SP refunded)`, '#ffaa00');
            if (this.game.soundManager) this.game.soundManager.play('select');
            // Refresh display
            this.hud.selectionPanel.showSingleEntityInfo(building);
          }
        }
      });

      // Hover effect
      icon.addEventListener('mouseenter', () => {
        icon.style.borderColor = '#ff6644';
        if (item.isCurrent) {
          const remaining = Math.ceil(building.getRemainingTime());
          icon.title = `${this.hud.formatName(item.type)} - ${remaining}s remaining - Right-click to cancel`;
        } else {
          icon.title = `${this.hud.formatName(item.type)} - Right-click to cancel`;
        }
      });
      icon.addEventListener('mouseleave', () => {
        icon.style.borderColor = item.isCurrent ? '#00ff88' : '#445544';
      });

      container.appendChild(icon);
    }
  }

  // Production hotkeys: when a production building is selected
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
      // Cycle 15: Shift+hotkey queues 5 units
      const count = e.shiftKey ? 5 : 1;
      for (let qi = 0; qi < count; qi++) {
        this.game.productionSystem.requestProduction(building, unitType);
      }
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
      this.hud.showNotification('No research available at this building', '#888888');
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
      const canAffordSP = this.game.teams.player.sp >= upg.cost;
      const canAffordMU = !upg.muCost || (this.game.teams.player.mu || 0) >= upg.muCost;
      const canAfford = canAffordSP && canAffordMU;
      const alreadyResearching = !!state?.inProgress;
      const costStr = upg.muCost ? `${upg.cost} SP + ${upg.muCost} MU` : `${upg.cost} SP`;

      let status = '';
      let color = '#ccc';
      let bg = '#333';
      if (completed) { status = 'DONE'; color = '#00ff44'; bg = '#1a331a'; }
      else if (inProgress) { status = `${Math.ceil(state.timer)}s`; color = '#ffcc00'; bg = '#332a00'; }
      else if (alreadyResearching) { status = costStr; color = '#666'; }
      else if (!canAfford) { status = costStr; color = '#ff4444'; }
      else { status = costStr; color = '#88ff88'; }

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
          this.hud.showNotification(`Researching: ${RESEARCH_UPGRADES[resId].name}`, '#00ffcc');
          this.toggleResearchPanel(); // refresh
          this.toggleResearchPanel();
        }
      });
    });
  }

  // ============================
  // Cycle 15: Production Overview Panel
  // ============================
  toggleProductionOverview() {
    this._prodOverviewOpen = !this._prodOverviewOpen;
    if (this._prodOverviewPanel) {
      this._prodOverviewPanel.style.display = this._prodOverviewOpen ? 'block' : 'none';
    }
    if (this._prodOverviewOpen) {
      this._prodOverviewCache = ''; // force refresh
      this._updateProductionOverview();
    }
  }

  _updateProductionOverview() {
    if (!this._prodOverviewOpen || !this._prodOverviewEntries) return;

    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const buildings = this.game.getBuildings(activeTeam).filter(b =>
      b.produces && b.produces.length > 0
    );

    // Build a content signature to avoid unnecessary DOM rebuilds
    let sig = '';
    for (const b of buildings) {
      const prod = b.currentProduction || 'idle';
      const progress = b.getProductionProgress ? Math.round(b.getProductionProgress() * 100) : 0;
      const qLen = b.productionQueue ? b.productionQueue.length : 0;
      sig += `${b.id}:${prod}:${progress}:${qLen};`;
    }

    if (sig === this._prodOverviewCache) return;
    this._prodOverviewCache = sig;

    let html = '';
    for (const b of buildings) {
      const bName = b.factionName || this.hud.formatName(b.type);
      const hasProd = !!b.currentProduction;

      html += `<div class="po-entry" data-building-id="${b.id}">`;
      html += `<div class="po-building-name">${bName}</div>`;

      if (hasProd) {
        const progress = b.getProductionProgress ? Math.round(b.getProductionProgress() * 100) : 0;
        const unitName = this.hud.formatName(b.currentProduction);
        html += `<div style="font-size:10px;color:#88ff88;">${unitName} - ${progress}%</div>`;
        html += `<div class="po-progress-bar"><div class="po-progress-fill" style="width:${progress}%"></div></div>`;

        // Queue items
        if (b.productionQueue && b.productionQueue.length > 0) {
          html += `<div class="po-queue-row">`;
          html += `<div class="po-queue-icon current">${unitName.substring(0, 3)}</div>`;
          for (const qi of b.productionQueue) {
            const qn = this.hud.formatName(qi.type || qi);
            html += `<div class="po-queue-icon">${qn.substring(0, 3)}</div>`;
          }
          html += `</div>`;
        }
      } else {
        html += `<div class="po-idle">IDLE</div>`;
      }

      html += `</div>`;
    }

    if (buildings.length === 0) {
      html = '<div style="padding:10px;color:#666;text-align:center;">No production buildings</div>';
    }

    this._prodOverviewEntries.innerHTML = html;

    // Add click-to-center handlers
    this._prodOverviewEntries.querySelectorAll('.po-entry').forEach(entry => {
      entry.addEventListener('click', () => {
        const bid = parseInt(entry.dataset.buildingId);
        const building = this.game.entities.find(e => e.id === bid && e.alive);
        if (building && this.game.cameraController) {
          const pos = building.getPosition();
          this.game.cameraController.moveTo(pos.x, pos.z);
        }
      });
    });
  }
}
