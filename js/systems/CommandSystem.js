import * as THREE from 'three';
import { UNIT_STATS, UNIT_ABILITIES, FORMATION_CONFIG } from '../core/Constants.js';
import { LockstepManager } from '../networking/LockstepManager.js';

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

  /**
   * Check if we're in multiplayer lockstep mode.
   * If so, commands should be queued through the lockstep manager
   * instead of executed directly.
   */
  get _isMP() {
    return this.game.isMultiplayer && this.game.lockstepManager?.enabled;
  }

  /**
   * Queue a command through lockstep instead of executing directly.
   */
  _queueLockstep(cmd) {
    if (this.game.lockstepManager) {
      this.game.lockstepManager.queueCommand(cmd);
    }
  }

  handleRightClick(event) {
    if (this.game.state !== 'PLAYING') return;

    const selected = this.game.selectionManager.getSelected();
    if (selected.length === 0) return;

    // In multiplayer, only allow commands for the local player's team
    const ownTeam = this.game.isMultiplayer
      ? this.game.getLocalTeam()
      : (this.game.mode === '2P' ? this.game.activeTeam : 'player');

    // Get the selected units only (not buildings), filtered to own team
    const selectedUnits = selected.filter(e => e.isUnit && e.team === ownTeam);
    if (selectedUnits.length === 0) {
      // Handle rally point setting for selected buildings
      const selectedBuildings = selected.filter(e => e.isBuilding && e.team === ownTeam);
      if (selectedBuildings.length > 0) {
        const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
        if (worldPos) {
          if (this._isMP) {
            for (const building of selectedBuildings) {
              this._queueLockstep(LockstepManager.setRallyCommand(building.id, worldPos));
            }
          } else {
            for (const building of selectedBuildings) {
              building.setRallyPoint(worldPos);
            }
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

    // Check for enemy or neutral entity under cursor
    const enemyTeam = ownTeam === 'player' ? 'enemy' : 'player';
    const enemyEntities = [
      ...this.game.getEntitiesByTeam(enemyTeam),
      ...this.game.entities.filter(e => e.team === 'neutral' && e.alive)
    ];

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

    // Check for friendly bunker or APC under cursor (garrison command)
    if (!clickedEnemy) {
      const friendlyEntities = this.game.getEntitiesByTeam(ownTeam);
      const friendlyMeshes = [];
      const friendlyMeshToEntity = new Map();
      for (const entity of friendlyEntities) {
        if (!entity.mesh) continue;
        // Bunkers (buildings with garrisonUnit) or APCs (units with garrison method)
        const isBunker = entity.isBuilding && entity.garrisonUnit;
        const isAPC = entity.isUnit && entity.type === 'apc' && entity.garrison;
        if (!isBunker && !isAPC) continue;
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
          let target = null;
          for (const hit of friendlyHits) {
            let obj = hit.object;
            while (obj) {
              if (friendlyMeshToEntity.has(obj)) { target = friendlyMeshToEntity.get(obj); break; }
              obj = obj.parent;
            }
            if (target) break;
          }
          if (target) {
            if (this._isMP) {
              const infantry = selectedUnits.filter(u => u.type === 'infantry');
              if (infantry.length > 0) {
                this._queueLockstep(LockstepManager.garrisonCommand(
                  infantry.map(u => u.id), target.id
                ));
                if (this.game.soundManager) this.game.soundManager.play('move');
                return;
              }
            } else {
              const infantry = selectedUnits.filter(u => u.type === 'infantry');
              let garrisoned = 0;
              if (target.isBuilding && target.garrisonUnit) {
                for (const unit of infantry) {
                  if (target.garrisonUnit(unit)) garrisoned++;
                }
              } else if (target.isUnit && target.type === 'apc' && target.garrison) {
                for (const unit of infantry) {
                  if (target.garrison(unit)) garrisoned++;
                }
              }
              if (garrisoned > 0) {
                this.game.eventBus.emit('command:garrison', { target, count: garrisoned });
                if (this.game.soundManager) this.game.soundManager.play('move');
                return;
              }
            }
          }
        }
      }
    }

    const unitIds = selectedUnits.map(u => u.id);

    if (clickedEnemy) {
      // Attack command
      if (this._isMP) {
        this._queueLockstep(LockstepManager.attackCommand(unitIds, clickedEnemy.id));
        if (this.game.soundManager) this.game.soundManager.play('acknowledge', { unitType: selectedUnits[0]?.type });
      } else {
        this.attackTarget(selectedUnits, clickedEnemy);
      }
    } else if (this.patrolMode) {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        if (this._isMP) {
          this._queueLockstep(LockstepManager.patrolCommand(unitIds, worldPos));
        } else {
          for (const unit of selectedUnits) {
            const currentPos = unit.getPosition();
            unit.startPatrol([currentPos, worldPos]);
          }
          this.game.eventBus.emit('command:patrol', { units: selectedUnits, position: worldPos });
        }
        if (this.game.soundManager) this.game.soundManager.play('move', { unitType: selectedUnits[0]?.type });
        this.patrolMode = false;
        document.body.style.cursor = 'default';
      }
    } else if (this.attackMoveMode) {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        if (this._isMP) {
          this._queueLockstep(LockstepManager.attackMoveCommand(unitIds, worldPos));
        } else {
          this.attackMoveUnits(selectedUnits, worldPos);
        }
      }
      this.attackMoveMode = false;
      document.body.style.cursor = 'default';
    } else if (event.shiftKey) {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        if (this._isMP) {
          this._queueLockstep({
            type: 'WAYPOINT',
            entityIds: unitIds,
            target: { x: worldPos.x, y: worldPos.y || 0, z: worldPos.z },
          });
        } else {
          this.queueWaypoint(selectedUnits, worldPos);
        }
      }
    } else {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        if (this._isMP) {
          this._queueLockstep(LockstepManager.moveCommand(unitIds, worldPos));
          // Play sound immediately for responsiveness
          if (this.game.soundManager) this.game.soundManager.play('move', { unitType: selectedUnits[0]?.type });
          if (this.game.effectsManager) this.game.effectsManager.createMoveMarker(worldPos, 'move');
        } else {
          this.moveUnits(selectedUnits, worldPos);
        }
      }
    }

    // Also handle rally point for any selected buildings
    const selectedBuildings = selected.filter(e => e.isBuilding && e.team === ownTeam);
    if (selectedBuildings.length > 0) {
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        if (this._isMP) {
          for (const building of selectedBuildings) {
            this._queueLockstep(LockstepManager.setRallyCommand(building.id, worldPos));
          }
        } else {
          for (const building of selectedBuildings) {
            building.setRallyPoint(worldPos);
          }
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

  moveUnits(units, position, skipMarker) {
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
        // Use async pathfinding (auto-falls back to sync for short distances)
        const unitRef = unit;
        const startPos = unit.getPosition();
        // Start moving toward target immediately (will be corrected when path arrives)
        unit.moveTo(targetPos);
        unit._pathPending = true;
        this.game.pathfinding.findPathAsync(startPos, targetPos, unit.domain).then(path => {
          unitRef._pathPending = false;
          if (!unitRef.alive) return;
          if (path && path.length > 1) {
            unitRef.followPath(path);
          } else if (path && path.length === 1) {
            unitRef.moveTo(path[0]);
          }
        });
      } else {
        unit.moveTo(targetPos);
      }

      unit.attackTarget = null;
      unit._attackMove = false;
    }

    this.game.eventBus.emit('command:move', { units, position });

    // Cycle 15: Show move marker on ground (skip if attack-move will add its own)
    if (this.game.effectsManager && !skipMarker) {
      this.game.effectsManager.createMoveMarker(position, 'move');
    }

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
    // Pass skipMarker to avoid double-marker (moveUnits creates green, we want red)
    this.moveUnits(units, position, true);
    // Mark units as attack-moving (they will engage any enemy in range while moving)
    for (const unit of units) {
      unit._attackMove = true;
    }
    // Cycle 15: Show attack-move marker (red) instead of the green one
    if (this.game.effectsManager) {
      this.game.effectsManager.createMoveMarker(position, 'attackmove');
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
          const stopUnits = selected.filter(e => e.isUnit);
          if (stopUnits.length > 0) {
            if (this._isMP) {
              this._queueLockstep(LockstepManager.stopCommand(stopUnits.map(u => u.id)));
            } else {
              for (const entity of stopUnits) {
                entity.stop();
              }
            }
            this.game.eventBus.emit('command:stop', { units: stopUnits });
          }
        }
        break;

      case 'd':
        // Hold position (stop moving but keep attacking)
        {
          const holdUnits = selected.filter(e => e.isUnit);
          if (holdUnits.length > 0) {
            if (this._isMP) {
              this._queueLockstep({ type: 'HOLD', entityIds: holdUnits.map(u => u.id) });
            } else {
              for (const entity of holdUnits) {
                entity.moveTarget = null;
                entity.waypoints = [];
                entity.isMoving = false;
              }
            }
          }
        }
        break;

      case 'delete':
        // Delete selected units (debug/testing) - disabled in multiplayer
        if (!this._isMP) {
          for (const entity of selected) {
            entity.alive = false;
          }
          this.game.selectionManager.clearSelection();
        } else {
          const deleteUnits = selected.filter(e => e.team === this.game.getLocalTeam());
          if (deleteUnits.length > 0) {
            this._queueLockstep({ type: 'DELETE', entityIds: deleteUnits.map(e => e.id) });
          }
          this.game.selectionManager.clearSelection();
        }
        break;

      case 'v': {
        // Cycle unit stance (aggressive -> defensive -> hold fire)
        const stanceUnits = selected.filter(e => e.isUnit);
        if (stanceUnits.length > 0) {
          // Determine the next stance locally (for UI feedback)
          const stances = ['aggressive', 'defensive', 'holdfire'];
          const currentStance = stanceUnits[0].stance || 'aggressive';
          const idx = stances.indexOf(currentStance);
          const newStance = stances[(idx + 1) % stances.length];

          if (this._isMP) {
            this._queueLockstep(LockstepManager.stanceCommand(stanceUnits.map(u => u.id), newStance));
          } else {
            stanceUnits[0].cycleStance();
            for (let si = 1; si < stanceUnits.length; si++) {
              stanceUnits[si].stance = newStance;
            }
          }
          const stanceLabels = { aggressive: 'Aggressive', defensive: 'Defensive', holdfire: 'Hold Fire' };
          this.game.eventBus.emit('command:stance', { stance: newStance });
          this.game.eventBus.emit('notification', { message: `Stance: ${stanceLabels[newStance]}`, color: '#ffcc00' });
        }
        break;
      }

      case 'u': {
        // Unload APC
        const apcs = selected.filter(e => e.isUnit && e.type === 'apc' && e.garrisoned && e.garrisoned.length > 0);
        if (apcs.length > 0) {
          if (this._isMP) {
            this._queueLockstep({ type: 'UNLOAD', entityIds: apcs.map(a => a.id) });
          } else {
            for (const apc of apcs) {
              apc.ejectAll();
            }
          }
          if (this.game.soundManager) this.game.soundManager.play('move');
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
        this._commanderAbilityUnit = null;
        this._commanderAbilityIndex = undefined;
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
            if (this._isMP) {
              this._queueLockstep(LockstepManager.abilityCommand(
                abilityUnits.map(u => u.id), 0, null
              ));
            } else {
              for (const unit of abilityUnits) {
                if (unit.canUseAbility()) {
                  this.game.combatSystem.executeAbility(unit);
                }
              }
            }
          } else {
            // Targeted abilities enter targeting mode (click handler will queue)
            this.abilityTargetMode = true;
            document.body.style.cursor = 'crosshair';
            this.game.eventBus.emit('notification', { message: `Click to use ${firstAbility.name}`, color: '#ffcc00' });
          }
        }
        event.preventDefault();
        break;
      }

      case 'f':
        // Shift+F cycles formations; bare F is nation ability (handled in HUD)
        if (event.shiftKey) {
          this.cycleFormation();
        }
        break;

      case 'tab':
        event.preventDefault();
        this.cycleProductionBuildings();
        break;

      case ',': {
        // Select all idle military units
        const ownTeam = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
        const idleUnits = this.game.getUnits(ownTeam).filter(u =>
          u.alive && !u.moveTarget && !u.attackTarget && !u.isMoving
        );
        if (idleUnits.length > 0) {
          this.game.selectionManager.selectEntities(idleUnits);
          if (this.game.uiManager?.hud) {
            this.game.uiManager.hud.showNotification(`Selected ${idleUnits.length} idle units`, '#00ccff');
          }
          if (this.game.soundManager) this.game.soundManager.play('select');
        }
        break;
      }

      case '.': {
        // Select all military units
        const ownTeam2 = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
        const allUnits = this.game.getUnits(ownTeam2).filter(u => u.alive);
        if (allUnits.length > 0) {
          this.game.selectionManager.selectEntities(allUnits);
          if (this.game.uiManager?.hud) {
            this.game.uiManager.hud.showNotification(`Selected ${allUnits.length} units`, '#00ccff');
          }
          if (this.game.soundManager) this.game.soundManager.play('select');
        }
        break;
      }

      case ' ': {
        // Space: center camera on last combat alert position
        event.preventDefault();
        if (this.game._lastCombatAlertPos && this.game.cameraController) {
          this.game.cameraController.moveTo(
            this.game._lastCombatAlertPos.x,
            this.game._lastCombatAlertPos.z
          );
        }
        break;
      }

      case 'r': {
        // GD-125: Tactical Retreat - retreat selected units to nearest friendly building
        const retreatUnits = selected.filter(e => e.isUnit);
        if (retreatUnits.length > 0) {
          const retreatTeam = this.game.isMultiplayer
            ? this.game.getLocalTeam()
            : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
          const friendlyBuildings = this.game.getBuildings(retreatTeam);
          if (friendlyBuildings.length > 0) {
            if (this._isMP) {
              this._queueLockstep(LockstepManager.retreatCommand(retreatUnits.map(u => u.id)));
            } else {
              for (const unit of retreatUnits) {
                let nearestBuilding = null;
                let nearestDist = Infinity;
                for (const building of friendlyBuildings) {
                  const dist = unit.distanceTo(building);
                  if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestBuilding = building;
                  }
                }
                if (nearestBuilding) {
                  unit.startRetreat(nearestBuilding.getPosition());
                }
              }
            }
            this.game.eventBus.emit('command:retreat', { units: retreatUnits });
            this.game.eventBus.emit('notification', { message: 'Retreating!', color: '#ffffff' });
            if (this.game.soundManager) this.game.soundManager.play('move');
          } else {
            this.game.eventBus.emit('notification', { message: 'No buildings to retreat to!', color: '#ff4444' });
          }
        }
        break;
      }

      case '1':
      case '2':
      case '3': {
        // GD-111: Commander ability hotkeys [1][2][3]
        const abilityIndex = parseInt(key) - 1;
        const commanders = selected.filter(e => e.isUnit && e.type === 'commander' && e.commanderAbilities);
        if (commanders.length > 0) {
          const cmd = commanders[0];
          if (cmd.commanderAbilities[abilityIndex]) {
            if (cmd.isAbilityReady(abilityIndex)) {
              const ability = cmd.commanderAbilities[abilityIndex];
              // If ability needs a target position, enter targeting mode
              if (ability.range) {
                this._commanderAbilityUnit = cmd;
                this._commanderAbilityIndex = abilityIndex;
                this.abilityTargetMode = true;
                document.body.style.cursor = 'crosshair';
                this.game.eventBus.emit('notification', { message: `Click to use ${ability.name}`, color: '#ffcc00' });
              } else {
                // Self-cast / no target needed
                if (this._isMP) {
                  this._queueLockstep(LockstepManager.abilityCommand(
                    [cmd.id], abilityIndex, cmd.getPosition()
                  ));
                } else {
                  cmd.useAbility(abilityIndex, cmd.getPosition());
                }
              }
            } else {
              const cd = Math.ceil(cmd.commanderCooldowns[abilityIndex]);
              this.game.eventBus.emit('notification', { message: `Ability on cooldown (${cd}s)`, color: '#ff4444' });
              if (this.game.soundManager) this.game.soundManager.play('error');
            }
          }
        }
        break;
      }
    }
  }

  cycleFormation() {
    const types = FORMATION_CONFIG.types;
    const idx = types.indexOf(this.formationType);
    this.formationType = types[(idx + 1) % types.length];
    this.game.eventBus.emit('command:formation', { type: this.formationType });
  }

  cycleProductionBuildings() {
    const ownTeam = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
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
