import * as THREE from 'three';
import { BUILDING_STATS, UNIT_STATS, TECH_TREE, TECH_BRANCHES, VETERANCY, UNIT_COUNTERS, NATION_ABILITIES, RESEARCH_UPGRADES, GAME_CONFIG } from '../core/Constants.js';

export class HUDNotifications {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

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
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.appendChild(this.notificationArea);

    // Cycle 15: Hover Tooltip
    this._tooltipEl = document.getElementById('entity-tooltip');
    this._hoveredEntity = null;
    this._tooltipRaycaster = new THREE.Raycaster();
    this._lastTooltipRaycast = 0;
    this._tooltipThrottleMs = 100;
    this._tooltipMouseX = 0;
    this._tooltipMouseY = 0;

    // Create overlays and buttons
    this.createHelpOverlay();
    this.createTechTreeOverlay();
    this.createNationAbilityButton();
    this._setupTooltipListener();
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
  // Help Overlay
  // ============================
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
      <div>R: Retreat</div>
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
      <div>\` : Production overview</div>
      <div>Ctrl+A: Select all units</div>
      <div>Ctrl+Z: Select all of type</div>
      <div>Dbl-click: Same type on screen</div>
    `;
    document.body.appendChild(this.helpEl);
  }

  // ============================
  // Nation Ability Button
  // ============================
  createNationAbilityButton() {
    this._abilityBtn = document.createElement('button');
    this._abilityBtn.id = 'nation-ability-btn';
    this._abilityBtn.style.cssText = `
      position: fixed;
      top: 100px;
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

  // ============================
  // Auto Resolve Button
  // ============================
  updateAutoResolve() {
    if (!this._autoResolveBtn) {
      this._autoResolveBtn = document.createElement('button');
      this._autoResolveBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 16px 40px;
        background: rgba(0, 100, 0, 0.9);
        color: #ffcc00;
        border: 2px solid #ffcc00;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        z-index: 200;
        letter-spacing: 2px;
        display: none;
        transition: all 0.2s;
      `;
      this._autoResolveBtn.textContent = 'AUTO-RESOLVE VICTORY';
      this._autoResolveBtn.addEventListener('click', () => {
        this.game.autoResolve();
        this._autoResolveBtn.style.display = 'none';
      });
      this._autoResolveBtn.addEventListener('mouseenter', () => {
        this._autoResolveBtn.style.background = 'rgba(0, 150, 0, 0.95)';
      });
      this._autoResolveBtn.addEventListener('mouseleave', () => {
        this._autoResolveBtn.style.background = 'rgba(0, 100, 0, 0.9)';
      });
      document.body.appendChild(this._autoResolveBtn);
    }

    if (this.game.challengeSystem?.canAutoResolve) {
      this._autoResolveBtn.style.display = 'block';
    } else {
      this._autoResolveBtn.style.display = 'none';
    }
  }

  // ============================
  // Day/Night Indicator
  // ============================
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

  // ============================
  // Tech Tree Visualization
  // ============================
  createTechTreeOverlay() {
    this.techTreeEl = document.createElement('div');
    this.techTreeEl.id = 'tech-tree-overlay';
    this.techTreeEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.95);border:2px solid #555;border-radius:12px;padding:30px;z-index:10002;max-width:700px;width:90%;max-height:80vh;overflow-y:auto;display:none;font-family:sans-serif;color:#ccc;';
    document.body.appendChild(this.techTreeEl);
  }

  showTechTree() {
    if (!this.techTreeEl) return;
    const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const teamBuildings = this.game.getBuildings(activeTeam);
    const ownedTypes = new Set(teamBuildings.map(b => b.type));
    const fmt = (t) => this.hud.formatName(t);
    let html = '<h2 style="color:#ffcc00;margin:0 0 20px 0;text-align:center;letter-spacing:2px;">TECH TREE</h2>';
    // Buildings section
    html += '<h3 style="color:#00ff44;margin:15px 0 10px 0;font-size:14px;">Buildings</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">';
    for (const type of Object.keys(BUILDING_STATS)) {
      const stats = BUILDING_STATS[type];
      const owned = ownedTypes.has(type);
      const requires = stats.requires || [];
      const hasReqs = requires.every(r => ownedTypes.has(r));
      const bc = owned ? '#00ff44' : hasReqs ? '#ffcc00' : '#ff4444';
      const bg = owned ? 'rgba(0,255,65,0.1)' : 'rgba(0,0,0,0.3)';
      const si = owned ? '\u2713' : hasReqs ? '\u25CB' : '\u2715';
      html += `<div style="background:${bg};border:1px solid ${bc};border-radius:6px;padding:10px;">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;"><strong style="color:#fff;font-size:12px;">${fmt(type)}</strong><span style="color:${bc};font-size:14px;">${si}</span></div>`;
      html += `<div style="font-size:10px;color:#888;margin-top:4px;">HP: ${stats.hp} | Cost: ${stats.cost} SP</div>`;
      if (requires.length > 0) html += `<div style="font-size:10px;color:#ff8844;margin-top:2px;">Requires: ${requires.map(fmt).join(', ')}</div>`;
      if (stats.produces?.length > 0) html += `<div style="font-size:10px;color:#66aaff;margin-top:2px;">Produces: ${stats.produces.map(fmt).join(', ')}</div>`;
      html += '</div>';
    }
    html += '</div>';
    // Units section
    html += '<h3 style="color:#00ff44;margin:20px 0 10px 0;font-size:14px;">Units</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">';
    for (const type of Object.keys(UNIT_STATS)) {
      const stats = UNIT_STATS[type];
      const tech = TECH_TREE[type];
      const canProduce = tech ? ownedTypes.has(tech.building) && tech.requires.every(r => ownedTypes.has(r)) : false;
      const bc = canProduce ? '#00ff44' : '#ff4444';
      const bg = canProduce ? 'rgba(0,255,65,0.1)' : 'rgba(0,0,0,0.3)';
      html += `<div style="background:${bg};border:1px solid ${bc};border-radius:6px;padding:10px;">`;
      html += `<strong style="color:#fff;font-size:12px;">${fmt(type)}</strong> <span style="color:#888;font-size:10px;">${stats.domain}</span>`;
      html += `<div style="font-size:10px;color:#888;margin-top:4px;">HP:${stats.hp} ATK:${stats.damage} RNG:${stats.range} SPD:${stats.speed}</div>`;
      html += `<div style="font-size:10px;color:#ffcc00;margin-top:2px;">${stats.cost} SP | ${stats.buildTime}s</div>`;
      if (tech) html += `<div style="font-size:10px;color:#ff8844;margin-top:2px;">From: ${fmt(tech.building)}</div>`;
      html += '</div>';
    }
    html += '</div>';
    // GD-090: Branching Doctrines section
    const hasTechLab = ownedTypes.has('techlab');
    const teamBranches = this.game.research?.[activeTeam]?.branches || {};
    const researchInProgress = !!this.game.research?.[activeTeam]?.inProgress;
    html += '<h3 style="color:#ff88ff;margin:20px 0 10px 0;font-size:14px;">Doctrines (Tech Lab)</h3>';
    if (!hasTechLab) {
      html += '<div style="color:#888;font-size:12px;padding:8px;">Build a Tech Lab to unlock doctrine choices.</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
      for (const [domain, domainConfig] of Object.entries(TECH_BRANCHES)) {
        const chosen = teamBranches[domain];
        html += `<div style="grid-column:1/3;color:#ffcc00;font-size:13px;font-weight:bold;margin-top:8px;border-bottom:1px solid #333;padding-bottom:4px;">${domainConfig.label}</div>`;
        for (const [key, branch] of [['branchA', domainConfig.branchA], ['branchB', domainConfig.branchB]]) {
          const isChosen = chosen === key, isLocked = chosen && chosen !== key;
          const canAfford = this.game.teams[activeTeam].sp >= branch.cost && (!branch.muCost || (this.game.teams[activeTeam].mu || 0) >= branch.muCost);
          const isCompleted = this.game.research?.[activeTeam]?.completed.includes(`branch_${branch.id}`);
          const bc = isCompleted ? '#00ff44' : isChosen ? '#ffcc00' : isLocked ? '#444' : canAfford ? '#88ff88' : '#ff4444';
          const bg = isCompleted ? 'rgba(0,255,65,0.1)' : isChosen ? 'rgba(255,204,0,0.1)' : 'rgba(0,0,0,0.3)';
          const st = isCompleted ? 'ACTIVE' : isChosen ? 'Researching...' : isLocked ? 'LOCKED' : `${branch.cost} SP + ${branch.muCost} MU`;
          const sc = isCompleted ? '#00ff44' : isChosen ? '#ffcc00' : isLocked ? '#666' : canAfford ? '#88ff88' : '#ff4444';
          const clickable = !chosen && !researchInProgress && canAfford && hasTechLab;
          html += `<div class="branch-choice" data-domain="${domain}" data-branch="${key}" style="background:${bg};border:1px solid ${bc};border-radius:6px;padding:10px;cursor:${clickable ? 'pointer' : 'default'};opacity:${isLocked ? '0.5' : '1'};${clickable ? 'transition:background 0.2s;' : ''}">`;
          html += `<div style="display:flex;justify-content:space-between;align-items:center;"><strong style="color:#fff;font-size:12px;">${branch.name}</strong><span style="color:${sc};font-size:10px;">${st}</span></div>`;
          html += `<div style="color:#aaa;font-size:10px;margin-top:4px;">${branch.description}</div></div>`;
        }
      }
      html += '</div>';
    }
    html += '<div style="text-align:center;margin-top:20px;"><button id="btn-close-techtree" style="padding:8px 24px;background:#333;color:#fff;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:14px;">Close (T)</button></div>';
    this.techTreeEl.innerHTML = html;
    this.techTreeEl.style.display = 'block';
    document.getElementById('btn-close-techtree')?.addEventListener('click', () => this.hideTechTree());
    // GD-090: Branch choice click handlers
    this.techTreeEl.querySelectorAll('.branch-choice').forEach(el => {
      el.addEventListener('click', () => {
        const domain = el.dataset.domain, branchKey = el.dataset.branch;
        if (this.game.startBranchResearch(activeTeam, domain, branchKey)) {
          const branch = TECH_BRANCHES[domain][branchKey];
          this.showNotification(`Doctrine chosen: ${branch.name}`, '#ff88ff');
          this.showTechTree();
        }
      });
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
  // Cycle 15: Hover Tooltip System
  // ============================
  _setupTooltipListener() {
    const canvas = this.game.sceneManager?.renderer?.domElement;
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      this._tooltipMouseX = e.clientX;
      this._tooltipMouseY = e.clientY;
    });

    // Hide tooltip on click (selection takes over)
    canvas.addEventListener('mousedown', () => {
      this._hideTooltip();
    });
  }

  _updateTooltip() {
    if (!this._tooltipEl || this.game.state !== 'PLAYING') return;

    // Clear tooltip if hovered entity died
    if (this._hoveredEntity && !this._hoveredEntity.alive) {
      this._hideTooltip();
    }

    const now = performance.now();
    if (now - this._lastTooltipRaycast < this._tooltipThrottleMs) {
      // Just reposition if still hovering
      if (this._hoveredEntity && this._tooltipEl.style.display !== 'none') {
        this._tooltipEl.style.left = (this._tooltipMouseX + 16) + 'px';
        this._tooltipEl.style.top = (this._tooltipMouseY - 10) + 'px';
      }
      return;
    }
    this._lastTooltipRaycast = now;

    const camera = this.game.sceneManager?.camera;
    if (!camera) return;

    const mouse = new THREE.Vector2(
      (this._tooltipMouseX / window.innerWidth) * 2 - 1,
      -(this._tooltipMouseY / window.innerHeight) * 2 + 1
    );
    this._tooltipRaycaster.setFromCamera(mouse, camera);

    // Gather all visible entity meshes (respect fog of war for enemies)
    const entityMeshes = [];
    const meshToEntity = new Map();
    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const fog = this.game.fogOfWar;
    for (const entity of this.game.entities) {
      if (!entity.alive || !entity.mesh || entity.mesh.visible === false) continue;
      // Skip fog-hidden enemies so player can't peek at stats through fog
      if (fog && entity.team !== ownTeam && entity.team !== 'neutral') {
        const pos = entity.getPosition();
        const gx = Math.floor(pos.x / GAME_CONFIG.worldScale);
        const gz = Math.floor(pos.z / GAME_CONFIG.worldScale);
        const state = fog.getStateAtGrid(gx, gz);
        const combatRevealed = entity._combatRevealTimer && entity._combatRevealTimer > 0;
        if (state < 2 && !combatRevealed) continue;
      }
      entity.mesh.traverse((child) => {
        if (child.isMesh) {
          entityMeshes.push(child);
          meshToEntity.set(child, entity);
        }
      });
    }

    const intersects = this._tooltipRaycaster.intersectObjects(entityMeshes, false);
    let hovered = null;
    if (intersects.length > 0) {
      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj) {
          if (meshToEntity.has(obj)) { hovered = meshToEntity.get(obj); break; }
          obj = obj.parent;
        }
        if (!hovered) hovered = meshToEntity.get(intersects[0].object);
        if (hovered) break;
      }
    }

    // Don't show tooltip for selected entities (already shown in selection panel)
    const selected = this.game.selectionManager?.getSelected() || [];
    if (hovered && selected.includes(hovered)) hovered = null;

    if (hovered !== this._hoveredEntity) {
      this._hoveredEntity = hovered;
      if (hovered) {
        this._showTooltip(hovered);
      } else {
        this._hideTooltip();
      }
    } else if (hovered) {
      // Update position
      this._tooltipEl.style.left = (this._tooltipMouseX + 16) + 'px';
      this._tooltipEl.style.top = (this._tooltipMouseY - 10) + 'px';
      // Update HP bar live
      this._updateTooltipHP(hovered);
    }
  }

  _showTooltip(entity) {
    if (!this._tooltipEl) return;

    const hpPercent = Math.round((entity.health / entity.maxHealth) * 100);
    const hpColor = hpPercent > 50 ? '#00ff00' : hpPercent > 25 ? '#ffaa00' : '#ff0000';
    const teamColor = entity.team === 'player' ? '#4488ff' : entity.team === 'enemy' ? '#ff4444' : '#cccccc';

    let html = `<div class="tt-name" style="color:${teamColor}">${entity.factionName || this.hud.formatName(entity.type)}`;

    // Veterancy rank
    if (entity.isUnit && entity.veterancyRank > 0) {
      const rank = VETERANCY.ranks[entity.veterancyRank];
      if (rank) html += ` <span style="color:${rank.color};font-size:11px;">${rank.symbol}</span>`;
    }
    html += `</div>`;

    // HP bar
    html += `<div class="tt-hp-bar"><div class="tt-hp-fill" style="width:${hpPercent}%;background:${hpColor};"></div></div>`;
    html += `<div class="tt-detail">${Math.round(entity.health)}/${entity.maxHealth} HP</div>`;

    if (entity.isUnit) {
      html += `<div class="tt-detail">ATK:${entity.damage} RNG:${entity.range} SPD:${entity.speed}</div>`;

      // Counter info
      const counters = UNIT_COUNTERS[entity.type];
      if (counters) {
        html += `<div class="tt-strong">Strong vs: ${counters.strong.map(t => this.hud.formatName(t)).join(', ')}</div>`;
        html += `<div class="tt-weak">Weak vs: ${counters.weak.map(t => this.hud.formatName(t)).join(', ')}</div>`;
      }
    }

    if (entity.isBuilding) {
      // Current production
      if (entity.currentProduction) {
        const progress = entity.getProductionProgress ? Math.round(entity.getProductionProgress() * 100) : 0;
        html += `<div class="tt-detail">Producing: ${this.hud.formatName(entity.currentProduction)} (${progress}%)</div>`;
      }
      // Tier
      if (entity.tier > 1) {
        html += `<div class="tt-detail" style="color:#ffcc00;">Tier ${entity.tier}</div>`;
      }
    }

    this._tooltipEl.innerHTML = html;
    this._tooltipEl.style.display = 'block';
    this._tooltipEl.style.left = (this._tooltipMouseX + 16) + 'px';
    this._tooltipEl.style.top = (this._tooltipMouseY - 10) + 'px';
  }

  _updateTooltipHP(entity) {
    const fill = this._tooltipEl.querySelector('.tt-hp-fill');
    if (fill) {
      const hpPercent = Math.round((entity.health / entity.maxHealth) * 100);
      const hpColor = hpPercent > 50 ? '#00ff00' : hpPercent > 25 ? '#ffaa00' : '#ff0000';
      fill.style.width = hpPercent + '%';
      fill.style.background = hpColor;
    }
  }

  _hideTooltip() {
    if (this._tooltipEl) {
      this._tooltipEl.style.display = 'none';
    }
    this._hoveredEntity = null;
  }
}
