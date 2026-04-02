import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export class Minimap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = 200;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.mapSize = GAME_CONFIG.mapSize;       // 128
    this.worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale; // 256

    // Scale factor: minimap pixels per grid cell
    this.scale = this.size / this.mapSize;

    // Pre-render terrain image once
    this.terrainImage = null;
    this.terrainRendered = false;

    // Combat ping markers
    this._pings = [];

    this.setupListeners();
    this.setupCombatPings();
  }

  setupListeners() {
    // Left-click on minimap to move camera
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.ctrlKey && e.button === 0) {
        // Ctrl+click: start tactical drawing
        this._drawingActive = true;
        const { x, z } = this.minimapToWorld(e);
        this._currentDrawing = [{ x, z }];
        return;
      }
      if (e.ctrlKey && e.button === 2) {
        // Ctrl+right-click: clear all drawings
        this._tacticalDrawings = [];
        return;
      }
      if (e.button === 0) this.handleClick(e);
      if (e.button === 2) this.handleRightClick(e);
    });
    // Drag on minimap to continuously update camera or draw
    this.canvas.addEventListener('mousemove', (e) => {
      if (this._drawingActive && this._currentDrawing) {
        const { x, z } = this.minimapToWorld(e);
        this._currentDrawing.push({ x, z });
        return;
      }
      if (e.buttons === 1) this.handleClick(e);
    });
    // End drawing on mouseup
    this.canvas.addEventListener('mouseup', (e) => {
      if (this._drawingActive && this._currentDrawing && this._currentDrawing.length > 1) {
        if (!this._tacticalDrawings) this._tacticalDrawings = [];
        this._tacticalDrawings.push({
          points: this._currentDrawing,
          timer: 8, // fade out after 8 seconds
          color: '#ffcc00'
        });
        // Max 10 drawings
        while (this._tacticalDrawings.length > 10) {
          this._tacticalDrawings.shift();
        }
      }
      this._drawingActive = false;
      this._currentDrawing = null;
    });
    // Prevent browser context menu on minimap
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setupCombatPings() {
    // Listen for combat to create minimap pings
    this._onCombatKill = (data) => {
      if (data.defender) {
        const pos = data.defender.getPosition();
        this._pings.push({
          x: pos.x,
          z: pos.z,
          time: 2.0, // seconds to display
          color: data.defender.team === 'player' ? '#ff4444' : '#44ff44'
        });
      }
    };
    this.game.eventBus.on('combat:kill', this._onCombatKill);
  }

  dispose() {
    if (this._onCombatKill) {
      this.game.eventBus.off('combat:kill', this._onCombatKill);
      this._onCombatKill = null;
    }
  }

  minimapToWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    return {
      x: (mx / this.size) * this.worldSize,
      z: (my / this.size) * this.worldSize
    };
  }

  handleClick(e) {
    const { x, z } = this.minimapToWorld(e);
    if (this.game.cameraController) {
      this.game.cameraController.moveTo(x, z);
    }
  }

  handleRightClick(e) {
    const selected = this.game.selectionManager
      ? this.game.selectionManager.getSelected()
      : [];
    const units = selected.filter(ent => ent.isUnit && ent.alive);
    if (units.length === 0) return;

    const { x, z } = this.minimapToWorld(e);
    const worldPos = new THREE.Vector3(x, 0, z);

    if (this.game.commandSystem) {
      this.game.commandSystem.moveUnits(units, worldPos);
      if (this.game.soundManager) {
        this.game.soundManager.play('move', { unitType: units[0].type });
      }
    }
  }

  renderTerrain() {
    if (!this.game.terrain) return;

    // Create an offscreen canvas for the terrain
    const offscreen = document.createElement('canvas');
    offscreen.width = this.size;
    offscreen.height = this.size;
    const offCtx = offscreen.getContext('2d');
    const imageData = offCtx.createImageData(this.size, this.size);
    const data = imageData.data;

    const terrain = this.game.terrain;

    for (let py = 0; py < this.size; py++) {
      for (let px = 0; px < this.size; px++) {
        // Map minimap pixel to grid cell
        const gx = Math.floor((px / this.size) * this.mapSize);
        const gz = Math.floor((py / this.size) * this.mapSize);
        const height = terrain.heightData[gz] ? terrain.heightData[gz][gx] : 0;

        let r, g, b;

        if (height < -0.5) {
          // Water - blue
          r = 26;
          g = 107;
          b = 196;
        } else if (height < 0.5) {
          // Beach/shore - tan
          r = 194;
          g = 178;
          b = 128;
        } else if (height < 3) {
          // Grass - green
          r = 51;
          g = 115;
          b = 38;
        } else {
          // Higher ground - darker green
          r = 76;
          g = 128;
          b = 51;
        }

        const idx = (py * this.size + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imageData, 0, 0);
    this.terrainImage = offscreen;
    this.terrainRendered = true;
  }

  worldToMinimap(worldX, worldZ) {
    return {
      x: (worldX / this.worldSize) * this.size,
      y: (worldZ / this.worldSize) * this.size
    };
  }

  update(delta) {
    // Render terrain background once
    if (!this.terrainRendered) {
      this.renderTerrain();
    }

    const ctx = this.ctx;

    // Draw terrain base
    if (this.terrainImage) {
      ctx.drawImage(this.terrainImage, 0, 0);
    } else {
      ctx.fillStyle = '#335522';
      ctx.fillRect(0, 0, this.size, this.size);
    }

    // Draw fog of war overlay on minimap
    const fog = this.game.fogOfWar;
    if (fog) {
      const fogImageData = ctx.getImageData(0, 0, this.size, this.size);
      const fogData = fogImageData.data;
      for (let py = 0; py < this.size; py++) {
        for (let px = 0; px < this.size; px++) {
          const gx = Math.floor((px / this.size) * this.mapSize);
          const gz = Math.floor((py / this.size) * this.mapSize);
          const state = fog.getStateAtGrid(gx, gz);
          const idx = (py * this.size + px) * 4;
          if (state === 0) {
            // Unexplored: darken to near black
            fogData[idx] = Math.floor(fogData[idx] * 0.1);
            fogData[idx + 1] = Math.floor(fogData[idx + 1] * 0.1);
            fogData[idx + 2] = Math.floor(fogData[idx + 2] * 0.1);
          } else if (state === 1) {
            // Explored but not visible: darken somewhat
            fogData[idx] = Math.floor(fogData[idx] * 0.45);
            fogData[idx + 1] = Math.floor(fogData[idx + 1] * 0.45);
            fogData[idx + 2] = Math.floor(fogData[idx + 2] * 0.45);
          }
          // state === 2: visible, no change
        }
      }
      ctx.putImageData(fogImageData, 0, 0);
    }

    // Draw entities
    if (this.game.entities) {
      const entities = this.game.entities;

      // First pass: draw last-seen ghost positions for non-visible enemies
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!entity.alive) continue;
        if (entity.team === 'player') continue;
        if (!entity._lastSeenPosition) continue;

        // Skip if entity is currently visible (will be drawn in full below)
        const pos = entity.getPosition();
        if (fog) {
          const gx = Math.floor(pos.x / GAME_CONFIG.worldScale);
          const gz = Math.floor(pos.z / GAME_CONFIG.worldScale);
          const state = fog.getStateAtGrid(gx, gz);
          const combatRevealed = entity._combatRevealTimer && entity._combatRevealTimer > 0;
          if (state === 2 || combatRevealed) continue; // currently visible, skip ghost
          if (entity.isBuilding && state === 1) continue; // building shown normally
        }

        // Draw faded last-known position
        const lp = this.worldToMinimap(entity._lastSeenPosition.x, entity._lastSeenPosition.z);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff4444';
        if (entity.isBuilding) {
          const bSize = Math.max(3, entity.size || 3);
          ctx.fillRect(lp.x - bSize / 2, lp.y - bSize / 2, bSize, bSize);
        } else {
          ctx.fillRect(lp.x - 1, lp.y - 1, 2, 2);
        }
        ctx.globalAlpha = 1.0;
      }

      // Second pass: draw all currently visible entities
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!entity.alive) continue;

        const pos = entity.getPosition();

        // Respect fog of war for enemy entities on minimap
        if (fog && entity.team !== 'player') {
          const gx = Math.floor(pos.x / GAME_CONFIG.worldScale);
          const gz = Math.floor(pos.z / GAME_CONFIG.worldScale);
          const state = fog.getStateAtGrid(gx, gz);
          const combatRevealed = entity._combatRevealTimer && entity._combatRevealTimer > 0;
          if (state < 2 && !combatRevealed) {
            // Not visible: only show enemy buildings in explored territory
            if (!(entity.isBuilding && state === 1)) {
              continue;
            }
          }
        }

        const mp = this.worldToMinimap(pos.x, pos.z);

        // Team color
        if (entity.team === 'player') {
          ctx.fillStyle = '#4488ff';
        } else if (entity.team === 'enemy') {
          ctx.fillStyle = '#ff4444';
        } else {
          ctx.fillStyle = '#cccccc';
        }

        if (entity.isBuilding) {
          // Buildings as squares
          const bSize = Math.max(3, entity.size || 3);
          ctx.fillRect(mp.x - bSize / 2, mp.y - bSize / 2, bSize, bSize);
        } else if (entity.isUnit) {
          // Units as small dots
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // GD-060: Draw resource nodes on minimap
    if (this.game.resourceNodes) {
      ctx.fillStyle = '#ffdd44';
      for (const node of this.game.resourceNodes) {
        const mp = this.worldToMinimap(node.position.x, node.position.z);
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw camera view frustum as white rectangle
    if (this.game.cameraController) {
      const camCtrl = this.game.cameraController;
      const target = camCtrl.target;
      const zoom = camCtrl.zoom;

      // Approximate visible area based on zoom level
      // Higher zoom = more visible area
      const viewWidth = zoom * 2.0;
      const viewHeight = zoom * 1.5;

      const topLeft = this.worldToMinimap(
        target.x - viewWidth / 2,
        target.z - viewHeight / 2
      );
      const rectW = (viewWidth / this.worldSize) * this.size;
      const rectH = (viewHeight / this.worldSize) * this.size;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(topLeft.x, topLeft.y, rectW, rectH);
    }

    // Draw combat pings
    for (let i = this._pings.length - 1; i >= 0; i--) {
      const ping = this._pings[i];
      ping.time -= delta || 0.016;
      if (ping.time <= 0) {
        this._pings.splice(i, 1);
        continue;
      }
      const mp = this.worldToMinimap(ping.x, ping.z);
      const alpha = Math.min(1, ping.time);
      const radius = 3 + (2 - ping.time) * 3; // expanding ring
      ctx.strokeStyle = ping.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Tactical drawings (GD-072)
    if (this._tacticalDrawings) {
      for (let i = this._tacticalDrawings.length - 1; i >= 0; i--) {
        const drawing = this._tacticalDrawings[i];
        drawing.timer -= delta || 0.016;
        if (drawing.timer <= 0) {
          this._tacticalDrawings.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, drawing.timer / 2); // fade in last 2 seconds
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 0; j < drawing.points.length; j++) {
          const mp = this.worldToMinimap(drawing.points[j].x, drawing.points[j].z);
          if (j === 0) ctx.moveTo(mp.x, mp.y);
          else ctx.lineTo(mp.x, mp.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }

    // Active drawing in progress
    if (this._drawingActive && this._currentDrawing && this._currentDrawing.length > 1) {
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = 0; j < this._currentDrawing.length; j++) {
        const mp = this.worldToMinimap(this._currentDrawing[j].x, this._currentDrawing[j].z);
        if (j === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      }
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.size, this.size);
  }
}
