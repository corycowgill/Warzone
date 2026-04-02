import * as THREE from 'three';

/**
 * GD-109: Strategic Zoom Overlay
 * When camera zooms past a threshold, units transition to NATO-style military symbols.
 * Uses flat billboarded sprites with team-colored backgrounds and black outlines.
 */

const ZOOM_THRESHOLD = 140; // Start transitioning at this zoom level
const FULL_ICON_ZOOM = 170; // Fully icons at this zoom level

// NATO-style symbol shapes (simple geometry definitions)
const UNIT_SYMBOLS = {
  // Infantry: crossed lines (X) in rectangle
  infantry: 'infantry',
  mortar: 'infantry',
  engineer: 'infantry',
  commander: 'commander',
  // Armor: diagonal line in rectangle
  tank: 'armor',
  heavytank: 'armor',
  scoutcar: 'armor',
  aahalftrack: 'armor',
  apc: 'armor',
  spg: 'armor',
  // Air: wing shape
  drone: 'air',
  plane: 'air',
  bomber: 'air',
  // Naval: anchor-like
  battleship: 'naval',
  carrier: 'naval',
  submarine: 'naval',
  patrolboat: 'naval'
};

export class StrategicOverlay {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.blendFactor = 0; // 0 = 3D models, 1 = icons
    this.iconSprites = new Map(); // entity id -> sprite

    // Pre-create icon textures
    this._textures = {};
    this._createIconTextures();
  }

  _createIconTextures() {
    const types = ['infantry', 'armor', 'air', 'naval', 'commander', 'building'];
    const teams = ['player', 'enemy'];
    const teamColors = { player: '#3366ff', enemy: '#ff3333' };

    for (const type of types) {
      for (const team of teams) {
        const key = `${type}_${team}`;
        this._textures[key] = this._createIconCanvas(type, teamColors[team]);
      }
    }
  }

  _createIconCanvas(symbolType, teamColor) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background with team color
    ctx.fillStyle = teamColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(4, 4, size - 8, size - 8);
    ctx.globalAlpha = 1;

    // Black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, size - 8, size - 8);

    // Draw symbol in white
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';

    const cx = size / 2;
    const cy = size / 2;

    switch (symbolType) {
      case 'infantry':
        // X mark (infantry symbol)
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.lineTo(size - 12, size - 12);
        ctx.moveTo(size - 12, 12);
        ctx.lineTo(12, size - 12);
        ctx.stroke();
        break;

      case 'armor':
        // Diagonal line (armor symbol)
        ctx.beginPath();
        ctx.moveTo(12, size - 12);
        ctx.lineTo(size - 12, 12);
        ctx.stroke();
        // Ellipse (track symbol)
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'air':
        // Wing shape
        ctx.beginPath();
        ctx.moveTo(cx, 12);
        ctx.lineTo(size - 8, cy);
        ctx.lineTo(cx, size - 12);
        ctx.lineTo(8, cy);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'naval':
        // Anchor-like
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 6);
        ctx.lineTo(cx, size - 12);
        ctx.moveTo(12, size - 16);
        ctx.lineTo(size - 12, size - 16);
        ctx.stroke();
        break;

      case 'commander':
        // Star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
          const x = cx + Math.cos(angle) * 18;
          const y = cy + Math.sin(angle) * 18;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'building':
        // Filled square with dot
        ctx.fillRect(12, 12, size - 24, size - 24);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  update(delta) {
    const zoom = this.game.cameraController?.zoom || 80;

    // Calculate blend factor
    if (zoom >= FULL_ICON_ZOOM) {
      this.blendFactor = 1;
    } else if (zoom > ZOOM_THRESHOLD) {
      this.blendFactor = (zoom - ZOOM_THRESHOLD) / (FULL_ICON_ZOOM - ZOOM_THRESHOLD);
    } else {
      this.blendFactor = 0;
    }

    const wasActive = this.active;
    this.active = this.blendFactor > 0;

    // If just deactivated, clean up all sprites
    if (!this.active && wasActive) {
      this.removeAllSprites();
      this.setModelsVisibility(1);
      return;
    }

    if (!this.active) return;

    const camera = this.game.sceneManager?.camera;
    if (!camera) return;

    // Update entity visibility and sprites
    const entities = this.game.entities;
    const activeIds = new Set();

    for (const entity of entities) {
      if (!entity.alive || !entity.mesh) continue;
      activeIds.add(entity.id);

      // Set 3D model opacity based on blend
      const modelOpacity = 1 - this.blendFactor;
      entity.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          if (!child.material._origOpacity && child.material._origOpacity !== 0) {
            child.material._origOpacity = child.material.opacity;
          }
          child.material.transparent = true;
          child.material.opacity = (child.material._origOpacity || 1) * modelOpacity;
        }
      });

      // Create or update icon sprite
      let sprite = this.iconSprites.get(entity.id);
      if (!sprite) {
        sprite = this.createIconSprite(entity);
        if (sprite) {
          this.iconSprites.set(entity.id, sprite);
          this.game.sceneManager.scene.add(sprite);
        }
      }

      if (sprite) {
        // Update position
        const pos = entity.getPosition();
        sprite.position.set(pos.x, pos.y + 5, pos.z);

        // Scale based on zoom (larger icons when zoomed out more)
        const baseScale = entity.isBuilding ? 8 : 5;
        sprite.scale.set(baseScale, baseScale, 1);

        // Fade in icon
        sprite.material.opacity = this.blendFactor * 0.9;
      }
    }

    // Remove sprites for dead entities
    for (const [id, sprite] of this.iconSprites) {
      if (!activeIds.has(id)) {
        this.game.sceneManager.scene.remove(sprite);
        sprite.material.dispose();
        this.iconSprites.delete(id);
      }
    }
  }

  createIconSprite(entity) {
    let symbolType;
    if (entity.isBuilding) {
      symbolType = 'building';
    } else {
      symbolType = UNIT_SYMBOLS[entity.type] || 'infantry';
    }

    const textureKey = `${symbolType}_${entity.team}`;
    const texture = this._textures[textureKey];
    if (!texture) return null;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    });

    return new THREE.Sprite(material);
  }

  setModelsVisibility(opacity) {
    for (const entity of this.game.entities) {
      if (!entity.alive || !entity.mesh) continue;
      entity.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          const orig = child.material._origOpacity || 1;
          child.material.opacity = orig * opacity;
          if (opacity >= 1) {
            child.material.transparent = orig < 1;
            delete child.material._origOpacity;
          }
        }
      });
    }
  }

  removeAllSprites() {
    for (const [id, sprite] of this.iconSprites) {
      this.game.sceneManager.scene.remove(sprite);
      sprite.material.dispose();
    }
    this.iconSprites.clear();
  }

  dispose() {
    this.removeAllSprites();
    for (const key in this._textures) {
      this._textures[key].dispose();
    }
  }
}
