import {productionPrice} from '../systems/ProductionPricing.js';
import {localTeam} from '../systems/InputPolicy.js';
import { unitIcon } from './UIIcons.js';
import { UNIT_STATS, TECH_TREE, RESEARCH_UPGRADES, TECH_BRANCHES, FACTION_UNITS } from '../core/Constants.js';

export class ProductionPanel {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

    this.productionPanel = document.getElementById('production-panel');
    this.productionQueue = document.getElementById('production-queue');
    this.productionOptions = document.getElementById('production-options');
    if (this.productionQueue) {
      this.productionQueue.innerHTML = '<div class="production-queue-label">Training queue <small>Click an item to cancel</small></div><div id="prod-queue-icons"></div>';
      this.productionQueue.hidden = true;
    }

    // Cycle 15: Production Overview Panel
    this._prodOverviewPanel = document.getElementById('prod-overview-panel');
    this._prodOverviewEntries = document.getElementById('po-entries');
    this._prodOverviewOpen = false;
    this._prodOverviewCache = ''; // minimize DOM updates
  }

  showProductionButtons(building) {
    if (!this.productionPanel || !this.productionOptions) return;
    if (building.team !== localTeam(this.game)) {this.hideProductionOptions();return;}
    // Don't show production panel when build menu is open (they overlap)
    if (this.hud.buildPanel.buildMenuOpen) return;

    this.productionPanel.classList.remove('hidden');
    const activeTeam = localTeam(this.game);
    const signature = building.produces.map(type => {
      const price = productionPrice(this.game, activeTeam, type);
      return [type,price.sp,price.mu,this.game.resourceSystem?.canAffordBoth(activeTeam,price.sp,price.mu),this.game.productionSystem?.hasTechRequirements(activeTeam,type)].join(':');
    }).join('|') + ':' + this.hud.getPlayerNation();
    if (this._optionsBuilding === building && this._optionsSignature === signature) return;
    this._optionsBuilding = building;this._optionsSignature = signature;
    this.productionOptions.innerHTML = '';


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

      const price = productionPrice(this.game, activeTeam, unitType);
      const canAfford = this.game.resourceSystem ? this.game.resourceSystem.canAffordBoth(activeTeam, price.sp, price.mu) : false;
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
      const effectiveCost = price.sp;

      btn.innerHTML = `
        <span class="production-emblem" aria-hidden="true">${unitIcon(unitType)}</span><div class="production-copy">
          <strong>${displayName}</strong>
          ${factionDesc}
          ${reqHtml}
        </div>
        <div style="text-align:right;">
          <span style="color:${canAfford ? '#d6b36d' : '#db8378'};">${effectiveCost} SP${price.mu ? ` / ${price.mu} MU` : ''}</span>
          <div style="color:#888;font-size:10px;">${stats.buildTime}s</div>
        </div>
      `;
      btn.title = `${displayName} (${effectiveCost} SP) — Shift+click to queue 5`;

      const queue = count => {
        if (!building.alive || building.team !== localTeam(this.game)) return;
        this.game.productionSystem?.requestProductionBatch(building, unitType, count);
        this.showProductionButtons(building);
      };
      btn.addEventListener('click', event => queue(event.shiftKey ? 5 : 1));
      const bulk = document.createElement('button');
      bulk.className = 'production-bulk';bulk.textContent = '+5';
      bulk.title = `Queue up to five ${displayName} units within available resources and queue space`;
      bulk.setAttribute('aria-label', `Queue five ${displayName}`);
      bulk.addEventListener('click', () => queue(5));

      btn.addEventListener('mouseenter', () => {
        if (available) {
          btn.style.background = '#3a4a3a';
          btn.style.borderColor = '#a4bf92';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#2a3a2a';
        btn.style.borderColor = '#445544';
      });

      const entry = document.createElement('div');entry.className = 'production-entry';entry.append(btn, bulk);
      this.productionOptions.appendChild(entry);
    }
  }

  updateProductionPanel() {
    const selected = this.game.selectionManager?.getSelected() || [];
    if (selected.length === 1 && selected[0].isBuilding && selected[0].alive) {
      this.hud.selectionPanel.showSingleEntityInfo(selected[0]);
    }

  }

  hideProductionOptions() {
    if (this.productionPanel) this.productionPanel.classList.add('hidden');
  }

  populateQueueIcons(building, fullQueue) {
    const container = document.getElementById('prod-queue-icons');
    if (!container) return;
    if (this.productionQueue) this.productionQueue.hidden = !fullQueue.length;
    const signature = fullQueue.map(item => `${item.type}:${item.isCurrent}`).join('|') + ':' + localTeam(this.game) + ':' + building.team;
    if (this._queueBuilding === building && this._queueSignature === signature) {
      const bar = container.querySelector('.queue-item-progress');
      const current = fullQueue.find(item => item.isCurrent);
      if (bar && current) bar.style.width = `${Math.round(Math.max(0,Math.min(1,current.progress))*100)}%`;
      return;
    }
    const focusedIndex = this._queueBuilding === building && container.contains(document.activeElement) ? Number(document.activeElement.dataset.queueIndex) : null;
    this._queueBuilding=building;this._queueSignature=signature;
    container.replaceChildren();

    for (let i = 0; i < fullQueue.length; i++) {
      const item = fullQueue[i];
      const icon = document.createElement('button');
      icon.type='button';
      icon.dataset.queueIndex=String(i);
      icon.disabled=building.team!==localTeam(this.game);
      icon.setAttribute('aria-label', `Cancel ${this.hud.formatName(item.type)} at queue position ${i+1}`);
      icon.style.cssText = `
        position: relative;
        width: 42px;
        height: 36px;
        background: ${item.isCurrent ? '#2a3a2a' : '#22382f'};
        border: 1px solid ${item.isCurrent ? '#a4bf92' : '#445544'};
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
      icon.innerHTML = `<span style="z-index:1;pointer-events:none;">${shortName}<br><small>× Cancel</small></span>`;

      // Progress bar for current item
      if (item.isCurrent) {
        const progressBar = document.createElement('div');
        progressBar.className='queue-item-progress';
        progressBar.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: ${Math.round(item.progress * 100)}%;
          background: #a4bf92;
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
          color: #a4bf92;
          pointer-events: none;
        `;
        indicator.textContent = '\u25B6'; // play symbol
        icon.appendChild(indicator);
      }

      // Click or right-click to cancel
      const cancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (building.team !== localTeam(this.game)) return;
        if (this.game.productionSystem) {
          const success = this.game.productionSystem.cancelProduction(building, i);
          if (success) {
            this.hud.showNotification(this.game.isMultiplayer ? 'Cancellation queued' : `Cancelled ${this.hud.formatName(item.type)} — resources refunded`, '#cfaa67');
            if (this.game.soundManager) this.game.soundManager.play('select');
            // Refresh display
            this.hud.selectionPanel.showSingleEntityInfo(building);
          }
        }
      };
      icon.addEventListener('click', cancel);
      icon.addEventListener('contextmenu', cancel);

      // Hover effect
      icon.addEventListener('mouseenter', () => {
        icon.style.borderColor = '#ff6644';
        if (item.isCurrent) {
          const remaining = Math.ceil(building.getRemainingTime());
          icon.title = `${this.hud.formatName(item.type)} - ${remaining}s remaining - Click or right-click to cancel`;
        } else {
          icon.title = `${this.hud.formatName(item.type)} - Click or right-click to cancel`;
        }
      });
      icon.addEventListener('mouseleave', () => {
        icon.style.borderColor = item.isCurrent ? '#a4bf92' : '#445544';
      });

      container.appendChild(icon);
    }
    if (focusedIndex !== null && container.children.length) container.children[Math.min(focusedIndex,container.children.length-1)].focus();
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
      ent.isBuilding && ent.alive && ent.produces && ent.produces.includes(unitType) && ent.team === localTeam(this.game)
    );
    if (!building) return;

    e.preventDefault();
    if (this.game.productionSystem) {
      // Cycle 15: Shift+hotkey queues 5 units
      const count = e.shiftKey ? 5 : 1;
      this.game.productionSystem.requestProductionBatch(building, unitType, count);
    }
  }

  // Research panel
  toggleResearchPanel() {
    const selected = this.game.selectionManager?.getSelected() || [];
    const building = selected.find(ent =>
      ent.isBuilding && ent.alive && ent.team === localTeam(this.game)
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
    let html = '<h4 style="color:#9fc5c2;margin:0 0 8px 0;font-size:13px;">Research (R)</h4>';

    if (state?.inProgress) {
      const upg = RESEARCH_UPGRADES[state.inProgress];
      html += `<div style="color:#d6b36d;font-size:12px;margin-bottom:8px;">Researching: ${upg.name} (${Math.ceil(state.timer)}s)</div>`;
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
      if (completed) { status = 'DONE'; color = '#a4bf92'; bg = '#1a331a'; }
      else if (inProgress) { status = `${Math.ceil(state.timer)}s`; color = '#d6b36d'; bg = '#332a00'; }
      else if (alreadyResearching) { status = costStr; color = '#666'; }
      else if (!canAfford) { status = costStr; color = '#db8378'; }
      else { status = costStr; color = '#b9cfa8'; }

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

    html += '<div style="color:#8b9e97;font-size:10px;margin-top:4px;">Click to start research</div>';
    panel.innerHTML = html;
    panel.style.display = 'block';

    // Add click handlers for research items
    panel.querySelectorAll('.research-item').forEach(item => {
      item.addEventListener('click', () => {
        const resId = item.dataset.research;
        if (this.game.startResearch('player', resId)) {
          this.hud.showNotification(`Researching: ${RESEARCH_UPGRADES[resId].name}`, '#9fc5c2');
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

    const activeTeam = localTeam(this.game);
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
        html += `<div style="font-size:10px;color:#b9cfa8;">${unitName} - ${progress}%</div>`;
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
      html = '<div style="padding:10px;color:#8b9e97;text-align:center;">No production buildings</div>';
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
