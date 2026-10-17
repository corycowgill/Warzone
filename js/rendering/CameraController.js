import {isEditing} from '../systems/InputPolicy.js';
import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement, isEnabled=()=>true) {
    this.camera = camera;
    this.isEnabled=isEnabled;
    this.domElement = domElement;

    // Camera target (look-at point on ground)
    this.target = new THREE.Vector3(50, 0, 80);

    this.moveSpeed = 100; // units per second
    this.rotateSpeed = 2.0; // radians per second
    this.zoomSpeed = 15;
    this.edgePanSize = 50; // pixels from edge
    this.minZoom = 30;
    this.maxZoom = 200;
    this.zoom = 60;
    this.rotation = Math.PI; // North-up: +X points right, -Z points up, matching the minimap.

    this.keys = {};
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.pointerOverBattlefield = false;
    this.isPanning = false;
    this.isRotating = false;
    this.lastMouse = { x: 0, y: 0 };

    // Camera shake
    this._shakeIntensity = 0;
    this._shakeDecay = 5;

    // Map bounds (256x256 world)
    this.bounds = { minX: 0, maxX: 256, minZ: 0, maxZ: 256 };

    // Touch state
    this._touches = [];
    this._lastTouchDist = 0;
    this._lastTouchAngle = 0;
    this._lastTouchCenter = { x: 0, y: 0 };
    this._isTouching = false;

    this._listeners = [];
    this.setupListeners();
    this.setupTouchListeners();
    this.updateCamera();
  }

  setupListeners() {
    this.listen(window, 'keydown', e => {
      if (!this.isEnabled()||isEditing(e)||e.ctrlKey||e.metaKey||e.altKey) return;
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      if (['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) e.preventDefault();
      if (key === 'home') { e.preventDefault(); this.resetOrientation(); }
    });
    this.listen(window,'focusin',e=>{if(isEditing(e))this.keys={};});
    this.listen(this.domElement,'mouseleave',()=>{this.pointerOverBattlefield=false;});
    this.listen(window, 'keyup', e => this.keys[e.key.toLowerCase()] = false);
    this.listen(window, 'mousemove', e => {
      if(!this.isEnabled()){this.isPanning=false;this.isRotating=false;this.pointerOverBattlefield=false;return;}
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      this.pointerOverBattlefield = e.target === this.domElement;
      if (this.isRotating) {
        this.rotateBy(-(e.clientX - this.lastMouse.x) * 0.008);
        this.lastMouse = { x: e.clientX, y: e.clientY };
      } else if (this.isPanning) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.panBy(dx, dy, 0.5);
        this.lastMouse.x = e.clientX;
        this.lastMouse.y = e.clientY;
      }
    });
    this.listen(this.domElement, 'mousedown', e => {
      if(!this.isEnabled())return;
      if (e.button === 1) { e.preventDefault(); this.isRotating = !e.shiftKey; this.isPanning = e.shiftKey; this.lastMouse = { x: e.clientX, y: e.clientY }; }
    });
    this.listen(window, 'mouseup', e => {
      if (e.button === 1) { this.isPanning = false; this.isRotating = false; }
    });
    this.listen(this.domElement, 'auxclick', e => { if (e.button === 1) e.preventDefault(); });
    this.listen(window, 'blur', () => { this.keys = {}; this.isPanning = false; this.isRotating = false; this.pointerOverBattlefield = false; });
    for (const [id, action] of [
      ['camera-rotate-left', () => this.rotateBy(-Math.PI / 4)],
      ['camera-rotate-right', () => this.rotateBy(Math.PI / 4)],
      ['camera-reset', () => this.resetOrientation()]
    ]) {
      const button = document.getElementById(id);
      if (button) this.listen(button, 'click', ()=>{if(this.isEnabled())action();});
    }
    this.listen(this.domElement, 'wheel', e => {
      if(!this.isEnabled())return;
      this.zoom += e.deltaY * 0.05;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
      e.preventDefault();
    }, { passive: false });
  }

  setupTouchListeners() {
    const el = this.domElement;

    this.listen(el, 'touchstart', (e) => {
      if(!this.isEnabled())return;
      e.preventDefault();
      this._isTouching = true;
      this._touches = Array.from(e.touches);

      if (e.touches.length === 2) {
        const t0 = e.touches[0], t1 = e.touches[1];
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        this._lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        this._lastTouchAngle = Math.atan2(dy, dx);
        this._lastTouchCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2
        };
      } else if (e.touches.length === 1) {
        this._lastTouchCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });

    this.listen(el, 'touchmove', (e) => {
      if(!this.isEnabled())return;
      e.preventDefault();
      const touches = e.touches;

      if (touches.length === 1 && this._touches.length <= 1) {
        // Single finger drag = pan
        const dx = touches[0].clientX - this._lastTouchCenter.x;
        const dy = touches[0].clientY - this._lastTouchCenter.y;
        const panScale = this.zoom * 0.005;
        this.panBy(dx, dy, panScale);
        this._lastTouchCenter = { x: touches[0].clientX, y: touches[0].clientY };
      } else if (touches.length === 2) {
        const t0 = touches[0], t1 = touches[1];
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const center = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2
        };

        // Pinch zoom
        if (this._lastTouchDist > 0) {
          const zoomDelta = (this._lastTouchDist - dist) * 0.3;
          this.zoom += zoomDelta;
          this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
        }

        // Two-finger rotation
        const angleDelta = angle - this._lastTouchAngle;
        if (Math.abs(angleDelta) < Math.PI) {
          this.rotation += angleDelta;
        }

        // Two-finger pan
        const panDx = center.x - this._lastTouchCenter.x;
        const panDy = center.y - this._lastTouchCenter.y;
        const panScale = this.zoom * 0.003;
        this.panBy(panDx, panDy, panScale);

        this._lastTouchDist = dist;
        this._lastTouchAngle = angle;
        this._lastTouchCenter = center;
      }

      // Clamp
      this.target.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.target.x));
      this.target.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.target.z));
      this.updateCamera();
    }, { passive: false });

    this.listen(el,'touchcancel',()=>{this._isTouching=false;this._touches=[];this._lastTouchDist=0;});
    this.listen(el, 'touchend', (e) => {
      this._touches = Array.from(e.touches);
      if (e.touches.length === 0) {
        this._isTouching = false;
        this._lastTouchDist = 0;
      } else if (e.touches.length === 1) {
        this._lastTouchCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this._lastTouchDist = 0;
      }
    }, { passive: false });
  }

  update(delta) {
    if(!this.isEnabled()){this.keys={};this.isPanning=false;this.isRotating=false;return;}
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
    if (!this.isPanning && !this.isRotating && !this._isTouching) {
      if (this.pointerOverBattlefield && this.mousePos.x < this.edgePanSize) dx -= 1;
      if (this.pointerOverBattlefield && this.mousePos.x > window.innerWidth - this.edgePanSize) dx += 1;
      if (this.pointerOverBattlefield && this.mousePos.y < this.edgePanSize) dz += 1;
      if (this.pointerOverBattlefield && this.mousePos.y > window.innerHeight - this.edgePanSize) dz -= 1;
    }

    const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}

    // Move relative to camera rotation
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const moveX = (-dx * cos + dz * sin) * this.moveSpeed * delta;
    const moveZ = (dx * sin + dz * cos) * this.moveSpeed * delta;

    this.target.x += moveX;
    this.target.z += moveZ;

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

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push(() => target.removeEventListener(type, handler, options));
  }

  dispose() {
    for (const remove of this._listeners) remove();
    this._listeners = [];
    this.keys = {};
  }

  panBy(dx, dy, scale) {
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    this.target.x += (dx * cos + dy * sin) * scale;
    this.target.z += (-dx * sin + dy * cos) * scale;
  }

  rotateBy(angle) {
    this.rotation += angle;
    this.updateCamera();
  }

  resetOrientation() {
    this.rotation = Math.PI;
    this.updateCamera();
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
    const heading = document.getElementById('camera-reset');
    const degrees = ((this.rotation - Math.PI) * 180 / Math.PI % 360 + 360) % 360;
    if (heading) {
      const text = degrees < 0.5 || degrees > 359.5 ? 'N / Reset' : `${Math.round(degrees)}° / Reset`;
      if (heading.textContent !== text) heading.textContent = text;
      const label = `Reset camera to north. Current rotation ${Math.round(degrees)} degrees`;
      if (heading.getAttribute('aria-label') !== label) heading.setAttribute('aria-label', label);
    }
  }

  moveTo(x, z) {
    this.target.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    this.target.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z));
    this.updateCamera();
  }
}
