import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Camera target (look-at point on ground)
    this.target = new THREE.Vector3(50, 0, 80);

    this.moveSpeed = 100; // units per second
    this.rotateSpeed = 2.0; // radians per second
    this.zoomSpeed = 15;
    this.edgePanSize = 50; // pixels from edge
    this.minZoom = 30;
    this.maxZoom = 200;
    this.zoom = 80;
    this.rotation = 0; // Camera rotation angle around target (radians)

    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    this.isPanning = false;
    this.lastMouse = { x: 0, y: 0 };

    // Camera shake
    this._shakeIntensity = 0;
    this._shakeDecay = 5;

    // Map bounds (256x256 world)
    this.bounds = { minX: 0, maxX: 256, minZ: 0, maxZ: 256 };

    this.setupListeners();
    this.updateCamera();
  }

  setupListeners() {
    window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', e => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      if (this.isPanning) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        // Pan relative to camera rotation
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        this.target.x -= (dx * cos - dy * sin) * 0.5;
        this.target.z -= (dx * sin + dy * cos) * 0.5;
        this.lastMouse.x = e.clientX;
        this.lastMouse.y = e.clientY;
      }
    });
    this.domElement.addEventListener('mousedown', e => {
      if (e.button === 1) { this.isPanning = true; this.lastMouse = { x: e.clientX, y: e.clientY }; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 1) this.isPanning = false;
    });
    this.domElement.addEventListener('wheel', e => {
      this.zoom += e.deltaY * 0.05;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
      e.preventDefault();
    }, { passive: false });
  }

  update(delta) {
    let dx = 0, dz = 0;

    // Arrow keys + W for camera movement (A/S/D reserved for unit commands)
    if (this.keys['w'] || this.keys['arrowup']) dz += 1;
    if (this.keys['arrowdown']) dz -= 1;
    if (this.keys['arrowleft']) dx -= 1;
    if (this.keys['arrowright']) dx += 1;

    // Q/E for camera rotation
    if (this.keys['q']) this.rotation -= this.rotateSpeed * delta;
    if (this.keys['e']) this.rotation += this.rotateSpeed * delta;

    // Edge panning
    if (!this.isPanning) {
      if (this.mousePos.x < this.edgePanSize) dx += 1;
      if (this.mousePos.x > window.innerWidth - this.edgePanSize) dx -= 1;
      if (this.mousePos.y < this.edgePanSize) dz -= 1;
      if (this.mousePos.y > window.innerHeight - this.edgePanSize) dz += 1;
    }

    // Move relative to camera rotation
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const moveX = (dx * cos - dz * sin) * this.moveSpeed * delta;
    const moveZ = (dx * sin + dz * cos) * this.moveSpeed * delta;

    this.target.x += moveX;
    this.target.z -= moveZ;

    // Clamp to bounds
    this.target.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.target.x));
    this.target.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.target.z));

    this.updateCamera();

    // Apply camera shake
    if (this._shakeIntensity > 0.01) {
      const sx = (Math.random() - 0.5) * this._shakeIntensity;
      const sy = (Math.random() - 0.5) * this._shakeIntensity * 0.5;
      this.camera.position.x += sx;
      this.camera.position.y += sy;
      this._shakeIntensity *= Math.max(0, 1 - this._shakeDecay * delta);
    }
  }

  shake(intensity) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  updateCamera() {
    // Position camera based on zoom and rotation
    const distance = this.zoom * 0.7;
    this.camera.position.set(
      this.target.x - Math.sin(this.rotation) * distance,
      this.target.y + this.zoom,
      this.target.z - Math.cos(this.rotation) * distance
    );
    this.camera.lookAt(this.target);
  }

  moveTo(x, z) {
    this.target.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    this.target.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z));
    this.updateCamera();
  }
}
