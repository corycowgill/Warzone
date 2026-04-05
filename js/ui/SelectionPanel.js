import { UNIT_STATS, BUILDING_STATS, UNIT_COUNTERS, VETERANCY, BUILDING_UPGRADES } from '../core/Constants.js';

export class SelectionPanel {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

    this.selectionInfo = document.getElementById('selection-info');
  }

  updateSelectionPanel(entities) {
    if (!this.selectionInfo) return;

    // GD-126: Update command card
    this.hud.commandCard.updateCommandCard(entities);

    if (!entities || entities.length === 0) {
      this.selectionInfo.innerHTML = '<span class="selection-placeholder">No selection</span>';
      this.hud.productionPanel.hideProductionOptions();
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
        const strongList = counters.strong.map(t => this.hud.formatName(t)).join(', ');
        const weakList = counters.weak.map(t => this.hud.formatName(t)).join(', ');
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

      // GD-111: Commander abilities display
      if (entity.type === 'commander' && entity.commanderAbilities && entity.commanderAbilities.length > 0) {
        statsHtml += `<div style="margin-top:8px;color:#ffcc00;font-size:12px;font-weight:bold;">Commander Abilities</div>`;
        for (let i = 0; i < entity.commanderAbilities.length; i++) {
          const ab = entity.commanderAbilities[i];
          const cd = entity.commanderCooldowns[i];
          const ready = cd <= 0;
          const cdColor = ready ? '#00ff44' : '#ff8844';
          statsHtml += `
            <div style="margin-top:4px;padding:4px 6px;background:#1a2a1a;border:1px solid ${ready ? '#336633' : '#333'};border-radius:3px;font-size:11px;">
              <span style="color:${cdColor};font-weight:bold;">[${i+1}] ${ab.name}</span>
              <span style="float:right;color:${cdColor};">${ready ? 'READY' : Math.ceil(cd) + 's'}</span>
              <div style="color:#666;font-size:10px;">${ab.description}</div>
            </div>
          `;
        }
      }
    }

    if (entity.isBuilding) {
      if (entity.produces && entity.produces.length > 0) {
        statsHtml += `<div style="margin-top:6px;font-size:12px;"><span style="color:#888;">Produces:</span> ${entity.produces.map(u => this.hud.formatName(u)).join(', ')}</div>`;
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
        const muCost = entity.getUpgradeMUCost ? entity.getUpgradeMUCost() : 0;
        const tierBonusNext = BUILDING_UPGRADES[entity.type]?.bonuses[entity.tier + 1];
        const label = tierBonusNext ? tierBonusNext.label : `Tier ${entity.tier + 1}`;
        const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        const canAfford = this.game.resourceSystem ? this.game.resourceSystem.canAffordBoth(activeTeam, cost, muCost) : false;
        const costStr = muCost > 0 ? `${cost} SP + ${muCost} MU` : `${cost} SP`;

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
            ">Upgrade to Tier ${entity.tier + 1} - ${costStr}<br><small style="color:#888;">${label}</small></button>
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
        <div style="font-weight:bold;font-size:14px;color:#fff;">${entity.factionName || this.hud.formatName(entity.type)}${entity.isUnit && entity.veterancyRank > 0 ? ` <span style="color:${VETERANCY.ranks[entity.veterancyRank].color};font-size:12px;">${VETERANCY.ranks[entity.veterancyRank].symbol} ${VETERANCY.ranks[entity.veterancyRank].name}</span>` : ''}${entity.factionDescription ? `<div style="font-size:10px;color:#88ddff;">${entity.factionDescription}</div>` : ''}</div>
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
        const muCost = entity.getUpgradeMUCost ? entity.getUpgradeMUCost() : 0;
        const activeTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
        if (this.game.resourceSystem && this.game.resourceSystem.canAffordBoth(activeTeam, cost, muCost)) {
          this.game.resourceSystem.spendBoth(activeTeam, cost, muCost);
          entity.upgrade();
          this.hud.showNotification(`Upgraded to Tier ${entity.tier}!`, '#ffcc00');
          if (this.game.soundManager) this.game.soundManager.play('build');
          this.showSingleEntityInfo(entity);
        } else {
          const mu = this.game.teams[activeTeam].mu || 0;
          if (this.game.teams[activeTeam].sp < cost) {
            this.hud.showNotification('Not enough SP!', '#ff4444');
          } else {
            this.hud.showNotification(`Not enough MU! (need ${muCost})`, '#ff4444');
          }
        }
      });
    }

    // Populate production queue icons (after innerHTML is set)
    if (entity.isBuilding) {
      const fullQueue = entity.getFullQueue();
      if (fullQueue.length > 0) {
        this.hud.productionPanel.populateQueueIcons(entity, fullQueue);
      }
    }

    // Wire up superweapon fire button (GD-059)
    const fireBtn = document.getElementById('btn-fire-superweapon');
    if (fireBtn && entity.type === 'superweapon' && entity.isCharged) {
      fireBtn.addEventListener('click', () => {
        this.hud.showNotification('Click on the map to target superweapon!', '#ff8800');
        this.hud.buildPanel._superweaponTargetMode = true;
        this.hud.buildPanel._superweaponBuilding = entity;
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
      this.hud.productionPanel.showProductionButtons(entity);
    } else {
      this.hud.productionPanel.hideProductionOptions();
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
      typeList += `<span style="display:inline-block;background:#333;padding:2px 6px;margin:2px;border-radius:3px;font-size:11px;">${this.hud.formatName(type)} x${count}</span>`;
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

    this.hud.productionPanel.hideProductionOptions();
  }
}
