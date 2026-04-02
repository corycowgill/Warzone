import * as THREE from 'three';

export class InputManager {
  constructor(game) {
    this.game = game;
    this.mouse = new THREE.Vector2();
    this.mouseScreen = { x: 0, y: 0 };
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.dragStart = null;
    this.isDragging = false;
    this.keys = {};
    this.raycaster = new THREE.Raycaster();

    this.setupListeners();
  }

  setupListeners() {
    const canvas = this.game.sceneManager.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
      }
      if (e.button === 2) this.rightMouseDown = true;
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouseScreen.x = e.clientX;
      this.mouseScreen.y = e.clientY;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.mouseDown && this.dragStart) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.isDragging = true;
        }
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        if (!this.isDragging) {
          this.game.selectionManager.handleClick(e);
          // Play selection sound with unit type from newly selected entity
          if (this.game.soundManager) {
            const selected = this.game.selectionManager.getSelected();
            const unitType = selected.length > 0 && selected[0].isUnit ? selected[0].type : null;
            this.game.soundManager.play('select', { unitType });
          }
        } else {
          this.game.selectionManager.handleBoxSelectEnd(e);
        }
        this.mouseDown = false;
        this.isDragging = false;
        this.dragStart = null;
      }
      if (e.button === 2) {
        this.rightMouseDown = false;
        this.game.commandSystem.handleRightClick(e);
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      // Forward to command system for game commands
      this.game.commandSystem.handleKeyPress(e);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  getWorldPosition(screenX, screenY) {
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.game.sceneManager.camera);

    // Intersect with terrain if available, otherwise ground plane
    if (this.game.terrain && this.game.terrain.mesh) {
      const intersects = this.raycaster.intersectObject(this.game.terrain.mesh, true);
      if (intersects.length > 0) {
        return intersects[0].point;
      }
    }

    // Fallback to ground plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    return target;
  }
}
