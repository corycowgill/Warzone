import * as THREE from 'three';

export class SelectionManager {
  constructor(game) {
    this.game = game;
    this.selected = [];
    this.raycaster = new THREE.Raycaster();
    this.selectionBoxEl = null;

    this.createSelectionBoxElement();
  }

  createSelectionBoxElement() {
    this.selectionBoxEl = document.createElement('div');
    this.selectionBoxEl.style.position = 'fixed';
    this.selectionBoxEl.style.border = '1px solid #00ff00';
    this.selectionBoxEl.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    this.selectionBoxEl.style.pointerEvents = 'none';
    this.selectionBoxEl.style.display = 'none';
    this.selectionBoxEl.style.zIndex = '1000';
    document.body.appendChild(this.selectionBoxEl);

    // Update box position during drag via mousemove
    const canvas = this.game.sceneManager.renderer.domElement;
    canvas.addEventListener('mousemove', (e) => {
      if (this.game.inputManager.isDragging && this.game.inputManager.dragStart) {
        this.updateSelectionBox(e);
      }
    });
  }

  updateSelectionBox(event) {
    const dragStart = this.game.inputManager.dragStart;
    if (!dragStart) return;

    const x1 = Math.min(dragStart.x, event.clientX);
    const y1 = Math.min(dragStart.y, event.clientY);
    const x2 = Math.max(dragStart.x, event.clientX);
    const y2 = Math.max(dragStart.y, event.clientY);

    this.selectionBoxEl.style.display = 'block';
    this.selectionBoxEl.style.left = x1 + 'px';
    this.selectionBoxEl.style.top = y1 + 'px';
    this.selectionBoxEl.style.width = (x2 - x1) + 'px';
    this.selectionBoxEl.style.height = (y2 - y1) + 'px';
  }

  handleClick(event) {
    if (this.game.state !== 'PLAYING') return;

    const camera = this.game.sceneManager.camera;
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, camera);

    // Determine which team the active player controls
    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';

    // Gather all entity meshes for raycasting
    const entityMeshes = [];
    const meshToEntity = new Map();
    for (const entity of this.game.entities) {
      if (!entity.alive || !entity.mesh) continue;
      entity.mesh.traverse((child) => {
        if (child.isMesh) {
          entityMeshes.push(child);
          meshToEntity.set(child, entity);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(entityMeshes, false);
    let clickedEntity = null;

    if (intersects.length > 0) {
      // Find the entity associated with the clicked mesh
      for (const intersect of intersects) {
        let obj = intersect.object;
        // Walk up to find mapped entity
        while (obj) {
          if (meshToEntity.has(obj)) {
            clickedEntity = meshToEntity.get(obj);
            break;
          }
          obj = obj.parent;
        }
        if (!clickedEntity) {
          // Try the direct object
          clickedEntity = meshToEntity.get(intersect.object);
        }
        if (clickedEntity) break;
      }
    }

    const shiftHeld = event.shiftKey;

    if (clickedEntity) {
      // Only allow selecting own team entities
      if (clickedEntity.team === ownTeam) {
        if (shiftHeld) {
          // Toggle selection
          const idx = this.selected.indexOf(clickedEntity);
          if (idx !== -1) {
            clickedEntity.setSelected(false);
            this.selected.splice(idx, 1);
          } else {
            clickedEntity.setSelected(true);
            this.selected.push(clickedEntity);
          }
        } else {
          // Replace selection
          this.clearSelection();
          clickedEntity.setSelected(true);
          this.selected.push(clickedEntity);
        }
      } else {
        // Clicked an enemy entity - clear selection (or could command attack)
        if (!shiftHeld) {
          this.clearSelection();
        }
      }
    } else {
      // Clicked empty ground - clear selection
      if (!shiftHeld) {
        this.clearSelection();
      }
    }

    this.game.eventBus.emit('selection:changed', { entities: [...this.selected] });
  }

  handleBoxSelectEnd(event) {
    if (this.game.state !== 'PLAYING') return;

    this.selectionBoxEl.style.display = 'none';

    const dragStart = this.game.inputManager.dragStart;
    if (!dragStart) return;

    const ownTeam = this.game.mode === '2P' ? this.game.activeTeam : 'player';
    const camera = this.game.sceneManager.camera;

    // Compute screen-space bounding box
    const x1 = Math.min(dragStart.x, event.clientX);
    const y1 = Math.min(dragStart.y, event.clientY);
    const x2 = Math.max(dragStart.x, event.clientX);
    const y2 = Math.max(dragStart.y, event.clientY);

    // Clear current selection unless shift is held
    if (!event.shiftKey) {
      this.clearSelection();
    }

    // Find all player units whose screen positions fall within the box
    const units = this.game.getUnits(ownTeam);
    const selectedUnits = [];

    for (const unit of units) {
      const screenPos = this.worldToScreen(unit.getPosition(), camera);
      if (screenPos &&
          screenPos.x >= x1 && screenPos.x <= x2 &&
          screenPos.y >= y1 && screenPos.y <= y2) {
        selectedUnits.push(unit);
      }
    }

    if (selectedUnits.length > 0) {
      this.selectEntities(selectedUnits);
    }
  }

  worldToScreen(worldPos, camera) {
    const vector = worldPos.clone().project(camera);

    // Check if behind camera
    if (vector.z > 1) return null;

    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vector.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  clearSelection() {
    for (const entity of this.selected) {
      entity.setSelected(false);
    }
    this.selected = [];
    this.game.eventBus.emit('selection:changed', { entities: [] });
  }

  selectEntities(entities) {
    // Deselect currently selected that are not in the new set
    for (const entity of this.selected) {
      if (!entities.includes(entity)) {
        entity.setSelected(false);
      }
    }

    this.selected = [...entities];
    for (const entity of this.selected) {
      entity.setSelected(true);
    }

    this.game.eventBus.emit('selection:changed', { entities: [...this.selected] });
  }

  getSelected() {
    // Filter out dead entities
    this.selected = this.selected.filter(e => e.alive);
    return this.selected;
  }

  // Remove dead entities from selection
  cleanup() {
    const before = this.selected.length;
    this.selected = this.selected.filter(e => e.alive);
    if (this.selected.length !== before) {
      this.game.eventBus.emit('selection:changed', { entities: [...this.selected] });
    }
  }
}
