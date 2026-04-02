import * as THREE from 'three';
import { UNIT_STATS, UNIT_ABILITIES, FORMATION_CONFIG } from '../core/Constants.js';

export class CommandSystem {
  constructor(game) {
    this.game = game;
    this.attackMoveMode = false;
    this.abilityTargetMode = false;
    this.patrolMode = false;
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
    this.raycaster = new THREE.Raycaster();
    this.formationType = FORMATION_CONFIG.defaultType;
  }

  handleRightClick(event) {
    if (this.game.state !== 'PLAYING') return;

    const selected = this.game.selectionManager.getSelected();
    if (selected.length === 0) return;

    // Get the selected units only (not buildings)
    const selectedUnits = selected.filter(e => e.isUnit);
    if (selectedUnits.length === 0) {
      // Handle rally point setting for selected buildings
      const selectedBuildings = selected.filter(e => e.isBuilding);
      if (selectedBuildings.length > 0) {
        const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
        if (worldPos) {
          for (const building of selectedBuildings) {
            building.setRallyPoint(worldPos);
          }
        }
      }
      return;
    }

    const camera = this.game.sceneManager.camera;
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, camera);

    // Check for enemy entity under cursor
    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const enemyTeam = ownTeam === 'player' ? 'enemy' : 'player';
    const enemyEntities = this.game.getEntitiesByTeam(enemyTeam);

    const entityMeshes = [];
    const meshToEntity = new Map();
    for (const entity of enemyEntities) {
      if (!entity.mesh) continue;
      if (entity.mesh.visible === false) continue; // skip fog-hidden entities
      entity.mesh.traverse((child) => {
        if (child.isMesh) {
          entityMeshes.push(child);
          meshToEntity.set(child, entity);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(entityMeshes, false);
    let clickedEnemy = null;

    if (intersects.length > 0) {
      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj) {
          if (meshToEntity.has(obj)) {
            clickedEnemy = meshToEntity.get(obj);
            break;
          }
          obj = obj.parent;
        }
        if (!clickedEnemy) {
          clickedEnemy = meshToEntity.get(intersects[0].object);
        }
        if (clickedEnemy) break;
      }
    }

    // Check for friendly bunker under cursor (garrison command)
    if (!clickedEnemy) {
      const friendlyEntities = this.game.getEntitiesByTeam(ownTeam);
      const friendlyMeshes = [];
      const friendlyMeshToEntity = new Map();
      for (const entity of friendlyEntities) {
        if (!entity.mesh || !entity.isBuilding || !entity.garrisonUnit) continue;
        entity.mesh.traverse((child) => {
          if (child.isMesh) {
            friendlyMeshes.push(child);
            friendlyMeshToEntity.set(child, entity);
          }
        });
      }
      if (friendlyMeshes.length > 0) {
        const friendlyHits = this.raycaster.intersectObjects(friendlyMeshes, false);
        if (friendlyHits.length > 0) {
          let bunker = null;
          for (const hit of friendlyHits) {
            let obj = hit.object;
            while (obj) {
              if (friendlyMeshToEntity.has(obj)) { bunker = friendlyMeshToEntity.get(obj); break; }
              obj = obj.parent;
            }
            if (bunker) break;
          }
          if (bunker) {
            const infantry = selectedUnits.filter(u => u.type === 'infantry');
            let garrisoned = 0;
            for (const unit of infantry) {
              if (bunker.garrisonUnit(unit)) garrisoned++;
            }
            if (garrisoned > 0) {
              this.game.eventBus.emit('command:garrison', { bunker, count: garrisoned });
              if (this.game.soundManager) this.game.soundManager.play('move');
              return;
            }
          }
        }
      }
    }

    if (clickedEnemy) {
      // Attack command
      this.attackTarget(selectedUnits, clickedEnemy);
    } else if (this.patrolMode) {
      // Patrol: set patrol between current position and clicked location
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        for (const unit of selectedUnits) {
          const currentPos = unit.getPosition();
          unit.startPatrol([currentPos, worldPos]);
        }
        this.game.eventBus.emit('command:patrol', { units: selectedUnits, position: worldPos });
        if (this.game.soundManager) this.game.soundManager.play('move', { unitType: selectedUnits[0]?.type });
      }
      this.patrolMode = false;
      document.body.style.cursor = 'default';
    } else if (this.attackMoveMode) {
      // Attack-move: move to location but engage enemies along the way
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        this.attackMoveUnits(selectedUnits, worldPos);
      }
      this.attackMoveMode = false;
      document.body.style.cursor = 'default';
    } else if (event.shiftKey) {
      // Shift-click: queue waypoint
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        this.queueWaypoint(selectedUnits, worldPos);
      }
    } else {
      // Move command
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        this.moveUnits(selectedUnits, worldPos);
      }
    }

    // Also handle rally point for any selected buildings
    const selectedBuildings = selected.filter(e => e.isBuilding);
    if (selectedBuildings.length > 0) {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        for (const building of selectedBuildings) {
          building.setRallyPoint(worldPos);
        }
      }
    }
  }

  getFormationOffsets(count, type) {
    const spacing = FORMATION_CONFIG.spacing;
    const offsets = [];

    if (type === 'line') {
      for (let i = 0; i < count; i++) {
        offsets.push({
          x: (i - (count - 1) / 2) * spacing,
          z: 0
        });
      }
    } else if (type === 'wedge') {
      // V-shape formation pointing in movement direction
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const side = i % 2 === 0 ? -1 : 1;
        const col = Math.ceil((i + 1) / 2);
        offsets.push({
          x: side * col * spacing * 0.7,
          z: -row * spacing
        });
      }
      // Center first unit at point
      if (offsets.length > 0) {
        offsets[0] = { x: 0, z: spacing };
      }
    } else if (type === 'circle') {
      // Ring formation
      if (count === 1) {
        offsets.push({ x: 0, z: 0 });
      } else {
        const radius = Math.max(spacing, count * spacing / (2 * Math.PI));
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          offsets.push({
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius
          });
        }
      }
    } else if (type === 'column') {
      // Single-file column
      for (let i = 0; i < count; i++) {
        offsets.push({
          x: 0,
          z: -i * spacing
        });
      }
    } else {
      // Default box formation
      const perRow = Math.max(1, Math.ceil(Math.sqrt(count)));
      const totalRows = Math.ceil(count / perRow);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const rowCount = (row < totalRows - 1) ? perRow : count - row * perRow;
        offsets.push({
          x: (col - (rowCount - 1) / 2) * spacing,
          z: (row - (totalRows - 1) / 2) * spacing
        });
      }
    }
    return offsets;
  }

  getFormationHeading(units, position) {
    let cx = 0, cz = 0;
    for (const u of units) {
      const p = u.getPosition();
      cx += p.x;
      cz += p.z;
    }
    cx /= units.length;
    cz /= units.length;
    const dx = position.x - cx;
    const dz = position.z - cz;
    return Math.atan2(dx, dz);
  }

  moveUnits(units, position) {
    const groupSpeed = Math.min(...units.map(u => u.speed));
    const offsets = this.getFormationOffsets(units.length, this.formationType);
    const heading = this.getFormationHeading(units, position);
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const ox = offsets[i].x;
      const oz = offsets[i].z;
      const rx = ox * cosH - oz * sinH;
      const rz = ox * sinH + oz * cosH;

      const targetPos = new THREE.Vector3(
        position.x + rx,
        0,
        position.z + rz
      );

      unit.formationSpeed = groupSpeed;

      if ((unit.domain === 'land' || unit.domain === 'naval') && this.game.pathfinding) {
        const path = this.game.pathfinding.findPathForDomain(
          unit.getPosition(),
          targetPos,
          unit.domain
        );
        if (path && path.length > 1) {
          unit.followPath(path);
        } else if (path && path.length === 1) {
          unit.moveTo(path[0]);
        } else {
          unit.moveTo(targetPos);
        }
      } else {
        unit.moveTo(targetPos);
      }

      unit.attackTarget = null;
      unit._attackMove = false;
    }

    this.game.eventBus.emit('command:move', { units, position });

    if (this.game.soundManager) {
      const unitType = units.length > 0 ? units[0].type : null;
      this.game.soundManager.play('move', { unitType });
    }
  }

  attackTarget(units, target) {
    for (const unit of units) {
      unit.attackEntity(target);
    }
    this.game.eventBus.emit('command:attack', { units, target });

    if (this.game.soundManager) {
      const unitType = units.length > 0 ? units[0].type : null;
      this.game.soundManager.play('acknowledge', { unitType });
    }
  }

  attackMoveUnits(units, position) {
    this.moveUnits(units, position);
    // Mark units as attack-moving (they will engage any enemy in range while moving)
    for (const unit of units) {
      unit._attackMove = true;
    }
    this.game.eventBus.emit('command:attackmove', { units, position });
  }

  handleKeyPress(event) {
    if (this.game.state !== 'PLAYING') return;

    const key = event.key.toLowerCase();
    const selected = this.game.selectionManager.getSelected();

    switch (key) {
      case 'a':
        // Enter attack-move mode
        this.attackMoveMode = true;
        document.body.style.cursor = 'crosshair';
        event.preventDefault();
        break;

      case 's':
        // Stop all selected units (only if units are selected)
        if (selected.length > 0) {
          for (const entity of selected) {
            if (entity.isUnit) {
              entity.stop();
            }
          }
          this.game.eventBus.emit('command:stop', { units: selected.filter(e => e.isUnit) });
        }
        break;

      case 'd':
        // Hold position (stop moving but keep attacking)
        for (const entity of selected) {
          if (entity.isUnit) {
            entity.moveTarget = null;
            entity.waypoints = [];
            entity.isMoving = false;
          }
        }
        break;

      case 'delete':
        // Delete selected units (debug/testing)
        for (const entity of selected) {
          entity.alive = false;
        }
        this.game.selectionManager.clearSelection();
        break;

      case 'v': {
        // Cycle unit stance (aggressive → defensive → hold fire)
        const stanceUnits = selected.filter(e => e.isUnit);
        if (stanceUnits.length > 0) {
          const newStance = stanceUnits[0].cycleStance();
          // Sync all selected to same stance
          for (let si = 1; si < stanceUnits.length; si++) {
            stanceUnits[si].stance = newStance;
          }
          const stanceLabels = { aggressive: 'Aggressive', defensive: 'Defensive', holdfire: 'Hold Fire' };
          this.game.eventBus.emit('command:stance', { stance: newStance });
          this.game.eventBus.emit('notification', { message: `Stance: ${stanceLabels[newStance]}`, color: '#ffcc00' });
        }
        break;
      }

      case 'p': {
        // Enter patrol mode
        const patrolUnits = selected.filter(e => e.isUnit);
        if (patrolUnits.length > 0) {
          this.patrolMode = true;
          document.body.style.cursor = 'crosshair';
          this.game.eventBus.emit('notification', { message: 'Click to set patrol destination', color: '#ffcc00' });
        }
        break;
      }

      case 'escape':
        // Cancel attack-move mode, ability targeting, patrol, or build placement
        this.attackMoveMode = false;
        this.abilityTargetMode = false;
        this.patrolMode = false;
        this.buildPlacementMode = false;
        this.buildPlacementType = null;
        document.body.style.cursor = 'default';
        break;

      case 'b': {
        // Open build menu for selected building, or toggle build panel
        const selectedBuildings = selected.filter(e => e.isBuilding);
        if (selectedBuildings.length > 0) {
          this.game.eventBus.emit('ui:showBuildMenu', { building: selectedBuildings[0] });
        } else {
          this.game.eventBus.emit('ui:toggleBuildPanel', {});
        }
        break;
      }

      case 'g': {
        // Activate ability for selected units
        const abilityUnits = selected.filter(e => e.isUnit && e.ability);
        if (abilityUnits.length > 0) {
          const firstAbility = abilityUnits[0].ability;
          if (firstAbility.type === 'toggle') {
            // Toggle abilities (like siege_mode) execute immediately
            for (const unit of abilityUnits) {
              if (unit.canUseAbility()) {
                this.game.combatSystem.executeAbility(unit);
              }
            }
          } else {
            // Targeted abilities enter targeting mode
            this.abilityTargetMode = true;
            document.body.style.cursor = 'crosshair';
            this.game.eventBus.emit('notification', { message: `Click to use ${firstAbility.name}`, color: '#ffcc00' });
          }
        }
        event.preventDefault();
        break;
      }

      case 'f':
        this.cycleFormation();
        break;

      case 'tab':
        event.preventDefault();
        this.cycleProductionBuildings();
        break;
    }
  }

  cycleFormation() {
    const types = FORMATION_CONFIG.types;
    const idx = types.indexOf(this.formationType);
    this.formationType = types[(idx + 1) % types.length];
    this.game.eventBus.emit('command:formation', { type: this.formationType });
  }

  cycleProductionBuildings() {
    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const buildings = this.game.getBuildings(ownTeam).filter(b => b.produces.length > 0);
    if (buildings.length === 0) return;

    const selected = this.game.selectionManager.getSelected();
    const currentBuilding = selected.length === 1 && selected[0].isBuilding ? selected[0] : null;

    let nextIdx = 0;
    if (currentBuilding) {
      const idx = buildings.indexOf(currentBuilding);
      nextIdx = (idx + 1) % buildings.length;
    }

    this.game.selectionManager.selectEntities([buildings[nextIdx]]);
  }

  queueWaypoint(units, position) {
    for (const unit of units) {
      // Add to existing waypoints without clearing current movement
      unit.waypoints.push(position.clone());
      if (!unit.isMoving && !unit.moveTarget) {
        unit.moveTarget = unit.waypoints.shift();
        unit.isMoving = true;
      }
    }
    this.game.eventBus.emit('command:waypoint', { units, position });
    if (this.game.soundManager) {
      this.game.soundManager.play('move', { unitType: units[0]?.type });
    }
  }

  // Enter build placement mode
  enterBuildPlacement(buildingType) {
    this.buildPlacementMode = true;
    this.buildPlacementType = buildingType;
    document.body.style.cursor = 'crosshair';
  }

  // Cancel build placement
  cancelBuildPlacement() {
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
    document.body.style.cursor = 'default';
  }
}
