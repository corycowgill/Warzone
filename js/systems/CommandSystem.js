import * as THREE from 'three';
import { UNIT_STATS } from '../core/Constants.js';

export class CommandSystem {
  constructor(game) {
    this.game = game;
    this.attackMoveMode = false;
    this.buildPlacementMode = false;
    this.buildPlacementType = null;
    this.raycaster = new THREE.Raycaster();
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

    if (clickedEnemy) {
      // Attack command
      this.attackTarget(selectedUnits, clickedEnemy);
    } else if (this.attackMoveMode) {
      // Attack-move: move to location but engage enemies along the way
      const worldPos = this.game.inputManager.getWorldPosition(event.clientX, event.clientY);
      if (worldPos) {
        this.attackMoveUnits(selectedUnits, worldPos);
      }
      this.attackMoveMode = false;
      document.body.style.cursor = 'default';
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

  moveUnits(units, position) {
    const formationSpacing = 4;
    const unitsPerRow = Math.max(1, Math.ceil(Math.sqrt(units.length)));

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const row = Math.floor(i / unitsPerRow);
      const col = i % unitsPerRow;
      const offsetX = (col - (unitsPerRow - 1) / 2) * formationSpacing;
      const offsetZ = (row - (Math.ceil(units.length / unitsPerRow) - 1) / 2) * formationSpacing;

      const targetPos = new THREE.Vector3(
        position.x + offsetX,
        0,
        position.z + offsetZ
      );

      // Use pathfinding for land/naval units
      if ((unit.domain === 'land' || unit.domain === 'naval') && this.game.pathfinding) {
        const path = this.game.pathfinding.findPathForDomain(
          unit.getPosition(),
          targetPos,
          unit.domain
        );
        if (path && path.length > 1) {
          // Use full waypoint path instead of just the last point
          unit.followPath(path);
        } else if (path && path.length === 1) {
          unit.moveTo(path[0]);
        } else {
          unit.moveTo(targetPos);
        }
      } else {
        // Air units or no pathfinding: direct move
        unit.moveTo(targetPos);
      }

      unit.attackTarget = null;
      unit._attackMove = false;
    }

    this.game.eventBus.emit('command:move', { units, position });

    // Play move sound
    if (this.game.soundManager) {
      this.game.soundManager.play('move');
    }
  }

  attackTarget(units, target) {
    for (const unit of units) {
      unit.attackEntity(target);
    }
    this.game.eventBus.emit('command:attack', { units, target });

    if (this.game.soundManager) {
      this.game.soundManager.play('acknowledge');
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

      case 'escape':
        // Cancel attack-move mode or build placement
        this.attackMoveMode = false;
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

      case 'tab':
        // Cycle through production buildings
        event.preventDefault();
        this.cycleProductionBuildings();
        break;
    }
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
