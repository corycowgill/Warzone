import {abilityMode,selectedAbilityGroup,abilityUnavailableReason,abilityTargetFailure,reportAbilityFailure} from '../systems/AbilityOrders.js';
import {localTeam} from '../systems/InputPolicy.js';
import {buildingEligibility} from '../systems/BuildingRules.js';
import * as THREE from 'three';
import { BUILDING_STATS } from '../core/Constants.js';
import { LockstepManager } from '../networking/LockstepManager.js';

export class BuildPanel {
  constructor(hud) {
    this.hud = hud;
    this.game = hud.game;

    this.buildMenu = document.getElementById('build-menu');
    this.buildOptions = document.getElementById('build-options');

    // State
    this.buildMenuOpen = false;
    this.buildPlacementMode = false;
    this.buildPlacementType = null;

    // Ghost building preview (3D)
    this.ghostMesh = null;
    this.ghostValid = false;

    this.populateBuildMenu();
    document.getElementById('build-placement-cancel')?.addEventListener('click', () => this.cancelBuildPlacement());
    document.getElementById('build-menu-close')?.addEventListener('click', () => this.closeBuildMenu());
    const categories = document.getElementById('build-categories');
    categories?.replaceChildren();
    this.category = 'all';
    for (const [id, label] of [['all','All'],['economy','Economy'],['military','Military'],['defense','Defense'],['technology','Tech']]) {
      if (!categories) break;
      const button = document.createElement('button');
      button.textContent = label;
      button.setAttribute('aria-pressed', String(id === 'all'));
      button.addEventListener('click', () => {
        this.category = id;
        categories.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        this.buildOptions.querySelectorAll('[data-build-type]').forEach(item => item.hidden = id !== 'all' && item.dataset.category !== id);
      });
      categories.appendChild(button);
    }
  }

  populateBuildMenu() {
    if (!this.buildOptions) return;
    this.buildOptions.innerHTML = '';

    const buildableTypes = ['barracks', 'warfactory', 'airfield', 'shipyard', 'techlab', 'resourcedepot', 'supplydepot', 'munitionscache', 'supplyexchange', 'turret', 'aaturret', 'bunker', 'wall', 'superweapon'];
    for (const type of buildableTypes) {
      const stats = BUILDING_STATS[type];
      if (!stats) continue;

      const btn = document.createElement('button');
      btn.className = 'cmd-btn';
      btn.dataset.buildType = type;
      btn.dataset.category = ['resourcedepot','supplydepot','munitionscache','supplyexchange'].includes(type) ? 'economy' : ['turret','aaturret','bunker','wall'].includes(type) ? 'defense' : ['techlab','superweapon'].includes(type) ? 'technology' : 'military';
      btn.style.cssText = `
        display: block;
        width: 100%;
        height: auto;
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
        text-transform: none;
        line-height: 1.4;
        overflow: visible;
      `;

      const requires = stats.requires || [];
      const reqStr = requires.length > 0 ? `<br><small style="color:#ff8844;">Requires: ${requires.map(r => this.hud.formatName(r)).join(', ')}</small>` : '';

      let descStr = '';
      if (stats.isSuperweapon) {
        descStr = '<span style="color:#ff8800;">Charges faction superweapon</span>';
      } else if (stats.produces && stats.produces.length > 0) {
        descStr = 'Produces: ' + stats.produces.map(u => this.hud.formatName(u)).join(', ');
      } else if (stats.income) {
        descStr = `<span style="color:#44dd88;">Income: +${stats.income} SP/s</span>`;
      } else if (stats.muIncome) {
        descStr = `<span style="color:#dd8844;">MU Income: +${stats.muIncome} MU/s</span>`;
      } else if (stats.damage) {
        descStr = `DMG: ${stats.damage} | RNG: ${stats.range}`;
        if (stats.garrisonSlots) descStr += ` | <span style="color:#66aaff;">Garrison: ${stats.garrisonSlots}</span>`;
        if (stats.targetDomain) descStr += ` (${stats.targetDomain})`;
      } else if (stats.isExchange) {
        descStr = '<span style="color:#44dd88;">Convert SP \u21C6 MU</span>';
      } else if (stats.blocksMovement) {
        descStr = 'Blocks movement, high armor';
      }
      btn.innerHTML = `
        <strong>${this.hud.formatName(type)}</strong>
        <span class="build-cost" style="color:#d6b36d;float:right;">${stats.cost} SP</span>
        <br><small style="color:#999;">${descStr}</small>
        ${reqStr}
        <span class="build-availability"></span>
      `;
      btn.addEventListener('click', () => {
        this.enterBuildPlacement(type);
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#444';
        btn.style.borderColor = '#a4bf92';
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
    const activeTeam = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
    const btns = this.buildOptions.querySelectorAll('[data-build-type]');
    btns.forEach(btn => {
      const type = btn.dataset.buildType;
      const stats = BUILDING_STATS[type];
      if (!stats) return;

      const eligibility = buildingEligibility(this.game, type, activeTeam);
      const enabled = eligibility.allowed;
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.75';
      btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
      const price = btn.querySelector('.build-cost');
      if (price) price.textContent = `${eligibility.cost} SP`;
      const reason = eligibility.message;
      btn.title = reason;
      const label = btn.querySelector('.build-availability');
      if (label) label.textContent = reason;
    });
  }

  toggleBuildMenu() {
    if (this.buildMenuOpen) {
      this.closeBuildMenu();
    } else {
      this.openBuildMenu();
    }
  }

  openBuildMenu() {
    if (!this.buildMenu) return;
    if (this.game.state !== 'PLAYING' || this.game.mode === 'SPECTATE' || this.game.isSpectating) return;
    this.cancelBuildPlacement();
    // Hide production panel while build menu is open to prevent overlap
    this.hud.productionPanel.hideProductionOptions();
    this.updateBuildMenuAvailability();
    this.buildMenu.classList.remove('hidden');
    this.buildMenuOpen = true;
    document.getElementById('cmd-build')?.setAttribute('aria-expanded', 'true');
  }

  closeBuildMenu() {
    if (!this.buildMenu) return;
    this.buildMenu.classList.add('hidden');
    this.buildMenuOpen = false;
    document.getElementById('cmd-build')?.setAttribute('aria-expanded', 'false');
    this.cancelBuildPlacement();
    // Restore production panel if a building is selected
    const selected = this.game.selectionManager?.getSelected() || [];
    if (selected.length === 1 && selected[0].isBuilding) {
      this.hud.selectionPanel.showSingleEntityInfo(selected[0]);
    }
  }

  enterBuildPlacement(buildingType) {
    // Check tech requirements before entering placement
    const activeTeam = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
    const stats = BUILDING_STATS[buildingType];
    if (stats && stats.requires && stats.requires.length > 0) {
      const teamBuildings = this.game.getBuildings(activeTeam);
      for (const req of stats.requires) {
        if (!teamBuildings.some(b => b.type === req && b.alive)) {
          this.hud.showNotification(`Requires ${this.hud.formatName(req)} first`, '#db8378');
          if (this.game.soundManager) this.game.soundManager.play('error');
          return;
        }
      }
    }

    this.buildPlacementMode = true;
    this.buildPlacementType = buildingType;
    const guide = document.getElementById('build-placement-guide');
    guide?.classList.remove('hidden');
    const name = document.getElementById('build-placement-name');
    if (name) name.textContent = `Placing ${this.hud.formatName(buildingType)}`;
    this._setPlacementStatus('Move the preview onto open ground.');
    // Close menu visually without canceling placement
    if (this.buildMenu) this.buildMenu.classList.add('hidden');
    this.buildMenuOpen = false;
    document.getElementById('cmd-build')?.setAttribute('aria-expanded', 'false');
    document.body.style.cursor = 'crosshair';
    this.hud.showNotification(`Click to place ${this.hud.formatName(buildingType)}. ESC to cancel.`, '#d6b36d');

    // Create ghost preview mesh
    this.createGhostMesh(buildingType);
  }

  cancelBuildPlacement() {
    document.getElementById('build-placement-guide')?.classList.add('hidden');
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
    document.body.style.cursor = 'default';
    this._lastPlacementPosition = null;
    this.removeGhostMesh();
  }

  handleBuildPlacement(event) {
    if (!this.buildPlacementMode || !this.buildPlacementType) return;

    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
    if (!worldPos) return;

    const activeTeam = this.game.isMultiplayer
      ? this.game.getLocalTeam()
      : (this.game.mode === '2P' ? this.game.activeTeam : 'player');

    let placed = false;
    if (this.game.isMultiplayer && this.game.lockstepManager?.enabled) {
      // In MP, validate locally for instant feedback, then queue through lockstep.
      // The actual building creation happens when the lockstep turn is confirmed.
      const canBuild = this.game.productionSystem.canRequestBuilding(
        this.buildPlacementType, activeTeam, worldPos
      );
      if (canBuild) {
        placed = true;
        this.game.lockstepManager.queueCommand(
          LockstepManager.buildCommand(this.buildPlacementType, worldPos)
        );
        this.hud.showNotification(`${this.hud.formatName(this.buildPlacementType)} queued!`, '#a4bf92');
      }
    } else {
      const result = this.game.productionSystem.requestBuilding(
        this.buildPlacementType,
        activeTeam,
        worldPos
      );
      if (result) {
        placed = true;
        this.hud.showNotification(`${this.hud.formatName(this.buildPlacementType)} placed!`, '#a4bf92');
      }
    }

    // Keep a failed preview active so the player can correct the location.
    if (placed && !event.shiftKey) this.cancelBuildPlacement();
    else this._setPlacementStatus(placed ? 'Placed. Choose another location, or Esc to finish.' : 'Unable to build here. Check terrain, spacing, resources and requirements.');
  }

  _setPlacementStatus(message) {
    const label = document.getElementById('build-placement-status');
    if (label && label.textContent !== message) label.textContent = message;
  }

  handleSuperweaponTarget(event) {
    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
    if (worldPos && this._superweaponBuilding && this._superweaponBuilding.alive && this._superweaponBuilding.isCharged) {
      if (this.game.isMultiplayer && this.game.lockstepManager?.enabled) {
        this.game.lockstepManager.queueCommand(
          LockstepManager.abilityCommand([this._superweaponBuilding.id], 0, worldPos)
        );
      } else {
        this._superweaponBuilding.fire(worldPos);
      }
      this.hud.showNotification('Superweapon launched!', '#ff4400');
    }
    this._superweaponTargetMode = false;
    this._superweaponBuilding = null;
    document.body.style.cursor = 'default';
  }

  handleAbilityClick(event) {
    const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
    const isMP = this.game.isMultiplayer && this.game.lockstepManager?.enabled;

    if (worldPos) {
      // GD-111: Check for commander ability targeting first
      const cmdSystem = this.game.commandSystem;
      if (cmdSystem._commanderAbilityUnit && cmdSystem._commanderAbilityIndex !== undefined) {
        const cmd = cmdSystem._commanderAbilityUnit;
        const idx = cmdSystem._commanderAbilityIndex;
        if (cmd.alive && cmd.isAbilityReady(idx)) {
          if (isMP) {
            this.game.lockstepManager.queueCommand(
              LockstepManager.abilityCommand([cmd.id], idx, worldPos)
            );
          } else {
            cmd.useAbility(idx, worldPos);
          }
        }
        cmdSystem._commanderAbilityUnit = null;
        cmdSystem._commanderAbilityIndex = undefined;
      } else {
        const team=localTeam(this.game);
        const selected=(cmdSystem._abilityUnits||selectedAbilityGroup(this.game)).filter(u=>u.alive&&u.team===team&&!u.isGarrisoned);
        if(selected.length){
          const needsEntity=abilityMode(selected[0].ability)==='entity';
          const target=needsEntity?cmdSystem.pickAbilityTarget(event,team):null;
          if(needsEntity&&!target){
            this.game.eventBus.emit('notification',{message:'Click a visible enemy for this ability.',color:'#e1bd7b'});
            return;
          }
          const failure=unit=>abilityUnavailableReason(unit,this.game)||abilityTargetFailure(unit,worldPos,target);
          if(selected.every(unit=>failure(unit))){reportAbilityFailure(this.game,selected[0],failure(selected[0]));return;}
          if(isMP)this.game.lockstepManager.queueCommand(LockstepManager.abilityCommand(selected.map(u=>u.id),0,worldPos,target?.id));
          else {
            let succeeded=false;
            for(const unit of selected)if(this.game.combatSystem.executeAbility(unit,worldPos,target))succeeded=true;
            if(!succeeded)return;
          }
        }
      }
    }

    if(!worldPos&&!this.game.commandSystem._commanderAbilityUnit)return;

    // Successful casts leave targeting mode.
    this.game.commandSystem._abilityUnits = null;
    this.game.commandSystem.abilityTargetMode = false;
    this.game.commandSystem._commanderAbilityUnit = null;
    this.game.commandSystem._commanderAbilityIndex = undefined;
    document.body.style.cursor = 'default';
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
    this.ghostValid = null;

    const scene = this.game.sceneManager?.scene;
    if (scene) scene.add(this.ghostMesh);
  }

  removeGhostMesh() {
    if (this.ghostMesh) {
      const scene = this.game.sceneManager?.scene;
      if (scene) scene.remove(this.ghostMesh);
      // Dispose geometry and materials to prevent memory leak
      this.ghostMesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.ghostMesh = null;
    }
  }

  updateGhostPosition(worldPos) {
    if (!this.ghostMesh || !worldPos) return;
    this._lastPlacementPosition = worldPos;

    this.ghostMesh.position.set(worldPos.x, worldPos.y || 0, worldPos.z);

    // Check placement validity
    const team = this.game.isMultiplayer ? this.game.getLocalTeam() : this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const eligibility = buildingEligibility(this.game, this.buildPlacementType, team, worldPos);
    const valid = eligibility.allowed;
    this._setPlacementStatus(`${eligibility.message} · ${eligibility.cost} SP`);
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
    const team = this.game.isMultiplayer ? this.game.getLocalTeam() : this.game.mode === '2P' ? this.game.activeTeam : 'player';
    return buildingEligibility(this.game, this.buildPlacementType, team, worldPos).allowed;
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
}
