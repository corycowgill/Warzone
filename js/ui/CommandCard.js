import {abilityFeedback} from './AbilityFeedback.js';
import {PRODUCTION_HOTKEYS} from './ProductionShortcuts.js';
import {productionPrice} from '../systems/ProductionPricing.js';
import { commandIcon, unitIcon } from './UIIcons.js';
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
    const team = this.game.isMultiplayer ? this.game.getLocalTeam() : this.game.mode === '2P' ? this.game.activeTeam : 'player';
    entities = entities?.filter(e => e.alive && e.team === team);

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
    const dispatch=key=>game.commandSystem.handleKeyPress({key});
    const buttons = [
      {key:'M',label:'Move',action:()=>dispatch('m')},
      {key:'A',label:'Attack',action:()=>dispatch('a')},
      {key:'S',label:'Stop',action:()=>dispatch('s')},
      {key:'D',label:'Hold',action:()=>dispatch('d')},
      {key:'P',label:'Patrol',action:()=>dispatch('p')},
      {key:'V',label:'Stance',action:()=>dispatch('v')},
    ];

    const feedback = abilityFeedback(units,game);
    if (primaryType !== 'commander' && feedback) {
      buttons.push({key:'G',label:feedback.name,status:feedback.status,
        description:feedback.description,disabled:feedback.disabled,action:()=>this._triggerAbility(units)});
    }
    if (primaryType === 'commander') {
      const cmd = units[0];
      if (cmd.commanderAbilities) {
        for (let i = 0; i < Math.min(3, cmd.commanderAbilities.length); i++) {
          const ab = cmd.commanderAbilities[i];
          const idx = i;
          buttons.push({ icon: '\u2605', key: `${i+1}`, label: ab.name.substring(0, 6), action: () => {
            if (cmd.isAbilityReady(idx)) {
              if (ab.range) {
                game.commandSystem.moveMode=false;game.commandSystem.attackMoveMode=false;game.commandSystem.patrolMode=false;
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
    }
    buttons.push({key:'R',label:'Retreat',action:()=>this._triggerRetreat(units)});

    // Fill up to 12 slots (3x4 grid)
    while (buttons.length < 12) {
      buttons.push(null);
    }

    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'cc-btn';
      if (buttons[i]) {
        const b = buttons[i];
        btn.innerHTML = `<span class="cc-icon">${commandIcon(b.label, b.icon)}</span><span class="cc-label">${b.label.split(" (")[0]}</span><span class="cc-key">${b.key}</span>`;
        btn.title = `${b.label} [${b.key}]${b.description ? " — " + b.description : ""}`;
        btn.setAttribute('aria-label', b.status ? `${b.label}, ${b.status}` : b.label);
        if(b.status){const status=document.createElement('span');status.className='cc-ability-status';status.textContent=b.status;btn.appendChild(status);}
        btn.disabled=!!b.disabled;
        if(!b.disabled)btn.addEventListener('click', b.action);
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
      const hotkeys = PRODUCTION_HOTKEYS;
      for (const unitType of building.produces) {
        const stats = UNIT_STATS[unitType];
        if (!stats) continue;
        const hk = hotkeys[unitType] || '';
        buttons.push({
          icon: this._getUnitIcon(unitType),
          key: hk,
          label: `${this.hud.formatName(unitType)} (${productionPrice(game, building.team, unitType).sp}) Shift=5x`,
          action: (e) => {
            const count = (e && e.shiftKey) ? 5 : 1;
            game.productionSystem.requestProductionBatch(building, unitType, count);
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
        btn.innerHTML = `<span class="cc-icon">${commandIcon(b.label, b.icon)}</span><span class="cc-label">${b.label.split(" (")[0]}</span><span class="cc-key">${b.key}${b.label ? '' : ''}</span>`;
        btn.title = `${b.label} [${b.key}]`;
        btn.setAttribute('aria-label', b.label);
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
    return unitIcon(type);
  }

  _triggerAbility(units) {
    this.game.commandSystem.handleKeyPress({key:'g'});
  }

  _triggerRetreat(units) {
    this.game.commandSystem.handleKeyPress({key:'r'});
  }

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
