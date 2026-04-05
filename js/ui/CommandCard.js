import { UNIT_STATS } from '../core/Constants.js';

export class CommandCard {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

    this.commandCardEl = document.getElementById('command-card');
    this.commandCardGrid = document.getElementById('command-card-grid');

    // GD-128: Exchange cooldown timer
    this._exchangeCooldown = 0;
  }

  update(delta) {
    // GD-128: Tick exchange cooldown
    if (this._exchangeCooldown > 0) {
      this._exchangeCooldown -= delta;
      if (this._exchangeCooldown < 0) this._exchangeCooldown = 0;
    }
  }

  // GD-126: Command Card - shows context-sensitive action buttons
  updateCommandCard(entities) {
    if (!this.commandCardEl || !this.commandCardGrid) return;

    if (!entities || entities.length === 0) {
      this.commandCardEl.classList.add('hidden');
      return;
    }

    this.commandCardEl.classList.remove('hidden');
    this.commandCardGrid.innerHTML = '';

    const units = entities.filter(e => e.isUnit);
    const buildings = entities.filter(e => e.isBuilding);

    if (units.length > 0) {
      this._buildUnitCommandCard(units);
    } else if (buildings.length > 0) {
      this._buildBuildingCommandCard(buildings[0]);
    }
  }

  _buildUnitCommandCard(units) {
    const primaryType = units[0].type;
    const game = this.game;

    // Base commands for all units
    const buttons = [
      { icon: '\u279C', key: 'M', label: 'Move', action: () => { this.hud.showNotification('Right-click to move', '#ffcc00'); } },
      { icon: '\u2694', key: 'A', label: 'Attack', action: () => { game.commandSystem.attackMoveMode = true; document.body.style.cursor = 'crosshair'; } },
      { icon: '\u25A0', key: 'S', label: 'Stop', action: () => { units.forEach(u => u.stop && u.stop()); } },
      { icon: '\u26CA', key: 'D', label: 'Hold', action: () => { units.forEach(u => { if (u.isUnit) { u.moveTarget = null; u.waypoints = []; u.isMoving = false; } }); } },
      { icon: '\u21BB', key: 'P', label: 'Patrol', action: () => { game.commandSystem.patrolMode = true; document.body.style.cursor = 'crosshair'; this.hud.showNotification('Click to set patrol destination', '#ffcc00'); } },
      { icon: '\u2699', key: 'V', label: 'Stance', action: () => { const s = units[0].cycleStance(); units.slice(1).forEach(u => u.stance = s); } },
    ];

    // Type-specific commands
    if (primaryType === 'infantry') {
      buttons.push({ icon: '\uD83D\uDCA3', key: 'G', label: 'Grenade', action: () => this._triggerAbility(units) });
      buttons.push({ icon: '\u2B05', key: 'R', label: 'Retreat', action: () => this._triggerRetreat(units) });
    } else if (primaryType === 'tank') {
      buttons.push({ icon: '\uD83D\uDEE1', key: 'G', label: 'Siege', action: () => this._triggerAbility(units) });
      buttons.push({ icon: '\u2B05', key: 'R', label: 'Retreat', action: () => this._triggerRetreat(units) });
    } else if (primaryType === 'engineer') {
      buttons.push({ icon: '\uD83D\uDD27', key: 'G', label: 'Repair', action: () => this._triggerAbility(units) });
      buttons.push({ icon: '\u2B05', key: 'R', label: 'Retreat', action: () => this._triggerRetreat(units) });
    } else if (primaryType === 'commander') {
      const cmd = units[0];
      if (cmd.commanderAbilities) {
        for (let i = 0; i < Math.min(3, cmd.commanderAbilities.length); i++) {
          const ab = cmd.commanderAbilities[i];
          const idx = i;
          buttons.push({ icon: '\u2605', key: `${i+1}`, label: ab.name.substring(0, 6), action: () => {
            if (cmd.isAbilityReady(idx)) {
              if (ab.range) {
                game.commandSystem._commanderAbilityUnit = cmd;
                game.commandSystem._commanderAbilityIndex = idx;
                game.commandSystem.abilityTargetMode = true;
                document.body.style.cursor = 'crosshair';
              } else {
                cmd.useAbility(idx, cmd.getPosition());
              }
            }
          }});
        }
      }
    } else {
      // Generic unit - add ability if has one
      if (units[0].ability) {
        buttons.push({ icon: '\u26A1', key: 'G', label: 'Ability', action: () => this._triggerAbility(units) });
      }
      buttons.push({ icon: '\u2B05', key: 'R', label: 'Retreat', action: () => this._triggerRetreat(units) });
    }

    // Fill up to 12 slots (3x4 grid)
    while (buttons.length < 12) {
      buttons.push(null);
    }

    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'cc-btn';
      if (buttons[i]) {
        const b = buttons[i];
        btn.innerHTML = `<span class="cc-icon">${b.icon}</span><span class="cc-key">${b.key}</span>`;
        btn.title = b.label;
        btn.addEventListener('click', b.action);
      } else {
        btn.disabled = true;
        btn.innerHTML = '';
      }
      this.commandCardGrid.appendChild(btn);
    }
  }

  _buildBuildingCommandCard(building) {
    const buttons = [];
    const game = this.game;

    // GD-128: Supply Exchange buttons
    if (building.type === 'supplyexchange') {
      const cdLeft = Math.ceil(this._exchangeCooldown);
      const cdText = cdLeft > 0 ? ` (${cdLeft}s)` : '';
      buttons.push({
        icon: '\u21C6', key: '', label: `SP\u2192MU${cdText}`,
        action: () => this._doExchange(building, 'sp_to_mu'),
        disabled: this._exchangeCooldown > 0
      });
      buttons.push({
        icon: '\u21C4', key: '', label: `MU\u2192SP${cdText}`,
        action: () => this._doExchange(building, 'mu_to_sp'),
        disabled: this._exchangeCooldown > 0
      });
    }

    // Production buttons for production buildings
    if (building.produces && building.produces.length > 0) {
      const hotkeys = { infantry: 'I', tank: 'K', drone: 'J', plane: 'L', battleship: 'N',
        carrier: 'C', submarine: 'U', mortar: 'M', scoutcar: 'O', aahalftrack: 'X',
        apc: 'A', heavytank: 'H', spg: 'Y', bomber: 'B', patrolboat: 'P',
        engineer: 'E', commander: 'Z' };
      for (const unitType of building.produces) {
        const stats = UNIT_STATS[unitType];
        if (!stats) continue;
        const hk = hotkeys[unitType] || '';
        buttons.push({
          icon: this._getUnitIcon(unitType),
          key: hk,
          label: `${this.hud.formatName(unitType)} (${stats.cost}) Shift=5x`,
          action: (e) => {
            const count = (e && e.shiftKey) ? 5 : 1;
            for (let qi = 0; qi < count; qi++) {
              game.productionSystem.requestProduction(building, unitType);
            }
          }
        });
      }
    }

    while (buttons.length < 12) {
      buttons.push(null);
    }

    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'cc-btn';
      if (buttons[i]) {
        const b = buttons[i];
        btn.innerHTML = `<span class="cc-icon">${b.icon}</span><span class="cc-key">${b.key}${b.label ? '' : ''}</span>`;
        btn.title = b.label;
        if (b.disabled) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', b.action);
        }
      } else {
        btn.disabled = true;
      }
      this.commandCardGrid.appendChild(btn);
    }
  }

  _getUnitIcon(type) {
    const icons = {
      infantry: '\uD83D\uDC82', tank: '\uD83D\uDE8C', drone: '\uD83D\uDEE9',
      plane: '\u2708', battleship: '\u26F5', carrier: '\uD83D\uDEA2',
      submarine: '\uD83E\uDE7C', mortar: '\uD83D\uDCA3', scoutcar: '\uD83D\uDE97',
      aahalftrack: '\uD83D\uDEBB', apc: '\uD83D\uDE8D', heavytank: '\uD83C\uDFF0',
      spg: '\uD83C\uDFAF', bomber: '\uD83D\uDCA5', patrolboat: '\u26F5',
      engineer: '\uD83D\uDD27', commander: '\u2605'
    };
    return icons[type] || '\u25CF';
  }

  _triggerAbility(units) {
    const abilityUnits = units.filter(u => u.ability && u.canUseAbility());
    if (abilityUnits.length === 0) return;
    const first = abilityUnits[0];
    if (first.ability.type === 'toggle' || first.ability.id === 'siege_mode') {
      for (const u of abilityUnits) {
        this.game.combatSystem.executeAbility(u);
      }
    } else {
      this.game.commandSystem.abilityTargetMode = true;
      document.body.style.cursor = 'crosshair';
      this.hud.showNotification(`Click to use ${first.ability.name}`, '#ffcc00');
    }
  }

  _triggerRetreat(units) {
    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const friendlyBuildings = this.game.getBuildings(ownTeam);
    if (friendlyBuildings.length === 0) {
      this.hud.showNotification('No buildings to retreat to!', '#ff4444');
      return;
    }
    for (const unit of units) {
      let nearestBuilding = null;
      let nearestDist = Infinity;
      for (const b of friendlyBuildings) {
        const dist = unit.distanceTo(b);
        if (dist < nearestDist) { nearestDist = dist; nearestBuilding = b; }
      }
      if (nearestBuilding) unit.startRetreat(nearestBuilding.getPosition());
    }
    this.hud.showNotification('Retreating!', '#ffffff');
    if (this.game.soundManager) this.game.soundManager.play('move');
  }

  // GD-128: Supply Exchange conversion
  _doExchange(building, direction) {
    if (this._exchangeCooldown > 0) {
      this.hud.showNotification(`Exchange on cooldown (${Math.ceil(this._exchangeCooldown)}s)`, '#ff4444');
      return;
    }
    const team = building.team;
    const teamData = this.game.teams[team];
    if (direction === 'sp_to_mu') {
      if (teamData.sp >= 150) {
        teamData.sp -= 150;
        teamData.mu = (teamData.mu || 0) + 50;
        this._exchangeCooldown = 10;
        this.hud.showNotification('Converted 150 SP \u2192 50 MU', '#ffcc00');
        if (this.game.soundManager) this.game.soundManager.play('produce');
      } else {
        this.hud.showNotification('Need 150 SP!', '#ff4444');
      }
    } else {
      if ((teamData.mu || 0) >= 50) {
        teamData.mu -= 50;
        teamData.sp += 100;
        this._exchangeCooldown = 10;
        this.hud.showNotification('Converted 50 MU \u2192 100 SP', '#ffcc00');
        if (this.game.soundManager) this.game.soundManager.play('produce');
      } else {
        this.hud.showNotification('Need 50 MU!', '#ff4444');
      }
    }
  }
}
