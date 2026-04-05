/**
 * MapEditor - Main editor system for creating custom Warzone maps.
 * Manages terrain editing, entity placement, undo/redo, and integration with Game.
 */

import * as THREE from 'three';
import { GAME_CONFIG, BUILDING_STATS, UNIT_STATS, NEUTRAL_STRUCTURES } from '../core/Constants.js';
import { MapSerializer } from './MapSerializer.js';
import { EditorUI } from './EditorUI.js';
import { EXAMPLE_MAPS } from './ExampleMaps.js';

// Terrain type constants
export const TERRAIN_TYPES = {
  GRASS: 0,
  DIRT: 1,
  SAND: 2,
  ROCK: 3,
  SNOW: 4
};

export const TERRAIN_TYPE_NAMES = ['Grass', 'Dirt', 'Sand', 'Rock', 'Snow'];

export const TERRAIN_COLORS = {
  0: [0.20, 0.45, 0.14], // grass
  1: [0.42, 0.32, 0.18], // dirt
  2: [0.76, 0.68, 0.45], // sand
  3: [0.42, 0.40, 0.32], // rock
  4: [0.85, 0.88, 0.92], // snow
};

const TOOLS = {
  SELECT: 'select',
  RAISE: 'raise',
  LOWER: 'lower',
  PAINT: 'paint',
  WATER: 'water',
  TREES: 'trees',
  PLACE_ENTITY: 'place_entity',
  PLACE_RESOURCE: 'place_resource',
  PLACE_START: 'place_start',
  PLACE_NEUTRAL: 'place_neutral',
  ERASE: 'erase'
};

export { TOOLS };

export class MapEditor {
  constructor(game) {
    this.game = game;
    this.active = false;

    // Map properties
    this.mapName = 'Untitled Map';
    this.mapDescription = '';
    this.mapSize = 128;
    this.author = '';

    // Terrain data
    this.heightData = null;
    this.terrainTypeGrid = null;
    this.treePositions = [];
    this.waterZones = [];

    // Placed entities
    this.entities = [];
    this.resourceNodes = [];
    this.playerStartPositions = [];
    this.neutralStructures = [];

    // Tool state
    this.currentTool = TOOLS.SELECT;
    this.brushSize = 3; // 1, 3, 5, 7
    this.brushStrength = 1.0;
    this.selectedTerrainType = TERRAIN_TYPES.GRASS;
    this.selectedEntityType = null;
    this.selectedEntityTeam = 'player';
    this.selectedEntityIsBuilding = false;
    this.selectedNeutralType = null;

    // Undo/redo
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;

    // Editor state
    this.showGrid = false;
    this.gridHelper = null;
    this.brushIndicator = null;
    this.mouseDown = false;
    this.lastPaintGrid = null; // Prevent double-painting same cell per stroke

    // Three.js objects owned by editor
    this._editorObjects = [];
    this._entityMarkers = [];
    this._startMarkers = [];
    this._resourceMarkers = [];
    this._neutralMarkers = [];

    // Current save id (for overwriting)
    this._saveId = null;

    // UI
    this.ui = null;

    // Camera state
    this._cameraListenersSetup = false;
  }

  /**
   * Open the map editor (alias for enter, called from UIManager).
   */
  open(loadMapJson = null) {
    return this.enter(loadMapJson);
  }

  /**
   * Enter the editor mode.
   */
  async enter(loadMapJson = null) {
    this.active = true;
    this.game.setState('EDITOR');

    // Ensure scene and renderer exist
    if (!this.game.sceneManager) {
      const { SceneManager } = await import('../rendering/SceneManager.js');
      this.game.sceneManager = new SceneManager();
    }

    // Clear existing scene objects (in case returning from gameplay)
    this._clearScene();

    // Initialize or load map data
    if (loadMapJson) {
      this._loadFromJson(loadMapJson);
    } else {
      this._initBlankMap();
    }

    // Build terrain mesh
    this._rebuildTerrainMesh();

    // Build water mesh
    this._rebuildWaterMesh();

    // Rebuild entity markers
    this._rebuildEntityMarkers();

    // Setup camera for free-flying editor mode
    this._setupEditorCamera();

    // Create brush indicator
    this._createBrushIndicator();

    // Create UI
    if (!this.ui) {
      this.ui = new EditorUI(this);
    }
    this.ui.show();

    // Reset undo/redo
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Exit editor mode, return to main menu.
   */
  exit() {
    this.active = false;
    this._clearScene();
    this._removeInput();

    if (this.ui) {
      this.ui.hide();
    }

    // Remove brush indicator
    if (this.brushIndicator) {
      this.game.sceneManager.scene.remove(this.brushIndicator);
      this.brushIndicator = null;
    }

    // Remove grid
    if (this.gridHelper) {
      this.game.sceneManager.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }

    this.game.setState('MENU');
    this.game.uiManager.showMainMenu();
  }

  /**
   * Test play the current map by launching a game on it.
   */
  testPlay() {
    const serialized = MapSerializer.serializeMap(this._getEditorState());
    const gameplayData = MapSerializer.exportForGameplay(serialized);

    // Store for game to pick up
    this.game._pendingCustomMap = gameplayData;
    this.game._editorReturnState = this._getEditorState();

    // Hide editor UI
    if (this.ui) this.ui.hide();
    this._clearScene();
    this._removeInput();
    this.active = false;

    // Show nation select with custom map preset
    this.game.uiManager.showNationSelect();
    this.game.uiManager.selectedMap = 'custom_editor';
  }

  // ===================== Map Initialization =====================

  _initBlankMap() {
    const s = this.mapSize;
    this.heightData = [];
    this.terrainTypeGrid = [];
    for (let z = 0; z <= s; z++) {
      this.heightData[z] = new Float32Array(s + 1);
      if (z < s) this.terrainTypeGrid[z] = new Uint8Array(s);
      for (let x = 0; x <= s; x++) {
        this.heightData[z][x] = 2.0; // flat ground
      }
    }
    this.treePositions = [];
    this.waterZones = [];
    this.entities = [];
    this.resourceNodes = [];
    this.playerStartPositions = [
      { team: 'player', x: 30, z: s },
      { team: 'enemy', x: s * 2 - 30, z: s }
    ];
    this.neutralStructures = [];
    this.mapName = 'Untitled Map';
    this.mapDescription = '';
  }

  _loadFromJson(json) {
    const state = MapSerializer.deserializeMap(json);
    this.mapName = state.mapName;
    this.mapDescription = state.mapDescription;
    this.mapSize = state.mapSize;
    this.author = state.author;
    this.heightData = state.heightData;
    this.terrainTypeGrid = state.terrainTypeGrid;
    this.treePositions = state.treePositions || [];
    this.waterZones = state.waterZones || [];
    this.entities = state.entities || [];
    this.resourceNodes = state.resourceNodes || [];
    this.playerStartPositions = state.playerStartPositions || [];
    this.neutralStructures = state.neutralStructures || [];
  }

  _getEditorState() {
    return {
      mapName: this.mapName,
      mapDescription: this.mapDescription,
      mapSize: this.mapSize,
      author: this.author,
      heightData: this.heightData,
      terrainTypeGrid: this.terrainTypeGrid,
      waterZones: this.waterZones,
      treePositions: this.treePositions,
      entities: this.entities,
      resourceNodes: this.resourceNodes,
      playerStartPositions: this.playerStartPositions,
      neutralStructures: this.neutralStructures
    };
  }

  // ===================== Terrain Mesh =====================

  _rebuildTerrainMesh() {
    // Remove old terrain mesh
    if (this._terrainMesh) {
      this.game.sceneManager.scene.remove(this._terrainMesh);
      this._terrainMesh.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }

    const s = this.mapSize;
    const ws = GAME_CONFIG.worldScale;
    const worldSize = s * ws;

    const geometry = new THREE.PlaneGeometry(worldSize, worldSize, s, s);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length / 3; i++) {
      const x = i % (s + 1);
      const z = Math.floor(i / (s + 1));
      const height = this.heightData[z]?.[x] || 0;

      positions[i * 3 + 1] = height;

      // Color based on terrain type grid (use nearest cell)
      const gx = Math.min(x, s - 1);
      const gz = Math.min(z, s - 1);
      const terrainType = this.terrainTypeGrid[gz]?.[gx] || 0;

      // Check if water zone
      const isWater = this._isWaterAt(gx, gz);

      if (height < -0.5 || isWater) {
        colors[i * 3] = 0.08;
        colors[i * 3 + 1] = 0.15;
        colors[i * 3 + 2] = 0.25;
      } else {
        const tc = TERRAIN_COLORS[terrainType] || TERRAIN_COLORS[0];
        // Add slight noise for visual variety
        const noise = Math.sin(x * 0.3 + z * 0.3) * 0.04;
        colors[i * 3] = tc[0] + noise;
        colors[i * 3 + 1] = tc[1] + noise;
        colors[i * 3 + 2] = tc[2] + noise;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.translate(worldSize / 2, 0, worldSize / 2);

    const material = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    this._terrainMesh = mesh;
    this._terrainGeometry = geometry;
    this.game.sceneManager.scene.add(mesh);

    // Rebuild tree meshes
    this._rebuildTreeMeshes();
  }

  _updateTerrainMeshPartial() {
    // Fast path: update vertex positions and colors without rebuilding geometry
    if (!this._terrainGeometry) return;
    const s = this.mapSize;
    const positions = this._terrainGeometry.attributes.position.array;
    const colors = this._terrainGeometry.attributes.color.array;

    for (let i = 0; i < positions.length / 3; i++) {
      const x = i % (s + 1);
      const z = Math.floor(i / (s + 1));
      const height = this.heightData[z]?.[x] || 0;

      positions[i * 3 + 1] = height;

      const gx = Math.min(x, s - 1);
      const gz = Math.min(z, s - 1);
      const terrainType = this.terrainTypeGrid[gz]?.[gx] || 0;
      const isWater = this._isWaterAt(gx, gz);

      if (height < -0.5 || isWater) {
        colors[i * 3] = 0.08;
        colors[i * 3 + 1] = 0.15;
        colors[i * 3 + 2] = 0.25;
      } else {
        const tc = TERRAIN_COLORS[terrainType] || TERRAIN_COLORS[0];
        const noise = Math.sin(x * 0.3 + z * 0.3) * 0.04;
        colors[i * 3] = tc[0] + noise;
        colors[i * 3 + 1] = tc[1] + noise;
        colors[i * 3 + 2] = tc[2] + noise;
      }
    }

    this._terrainGeometry.attributes.position.needsUpdate = true;
    this._terrainGeometry.attributes.color.needsUpdate = true;
    this._terrainGeometry.computeVertexNormals();
  }

  _rebuildWaterMesh() {
    if (this._waterMesh) {
      this.game.sceneManager.scene.remove(this._waterMesh);
      this._waterMesh.geometry.dispose();
      this._waterMesh.material.dispose();
    }

    const worldSize = this.mapSize * GAME_CONFIG.worldScale;
    const waterGeo = new THREE.PlaneGeometry(worldSize, worldSize, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x22aaaa,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 80
    });

    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.position.set(worldSize / 2, -0.3, worldSize / 2);
    this.game.sceneManager.scene.add(this._waterMesh);
  }

  _rebuildTreeMeshes() {
    // Remove old tree meshes
    if (this._treeMeshGroup) {
      this.game.sceneManager.scene.remove(this._treeMeshGroup);
      this._treeMeshGroup.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }

    if (this.treePositions.length === 0) return;

    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 5);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
    const foliageGeo = new THREE.ConeGeometry(1.2, 2.5, 6);
    const foliageMat = new THREE.MeshPhongMaterial({ color: 0x2a6a1a });

    const count = this.treePositions.length;
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, count);
    trunkMesh.castShadow = true;
    foliageMesh.castShadow = true;

    const ws = GAME_CONFIG.worldScale;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const tree = this.treePositions[i];
      const wx = tree.x * ws + ws / 2;
      const wz = tree.z * ws + ws / 2;
      const h = this.heightData[tree.z]?.[tree.x] || 0;
      const scale = tree.scale || 1;

      dummy.position.set(wx, h + 1 * scale, wz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(wx, h + 2.5 * scale, wz);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);
    }

    const group = new THREE.Group();
    group.add(trunkMesh);
    group.add(foliageMesh);
    this._treeMeshGroup = group;
    this.game.sceneManager.scene.add(group);
  }

  // ===================== Entity Markers =====================

  _rebuildEntityMarkers() {
    // Clear old markers
    for (const m of this._entityMarkers) {
      this.game.sceneManager.scene.remove(m);
      m.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    this._entityMarkers = [];

    for (const m of this._startMarkers) {
      this.game.sceneManager.scene.remove(m);
      m.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    this._startMarkers = [];

    for (const m of this._resourceMarkers) {
      this.game.sceneManager.scene.remove(m);
      m.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    this._resourceMarkers = [];

    for (const m of this._neutralMarkers) {
      this.game.sceneManager.scene.remove(m);
      m.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    this._neutralMarkers = [];

    // Entity markers
    for (const ent of this.entities) {
      this._addEntityMarker(ent);
    }

    // Resource node markers
    for (const rn of this.resourceNodes) {
      this._addResourceMarker(rn);
    }

    // Player start markers
    for (const ps of this.playerStartPositions) {
      this._addStartMarker(ps);
    }

    // Neutral structure markers
    for (const ns of this.neutralStructures) {
      this._addNeutralMarker(ns);
    }
  }

  _addEntityMarker(ent) {
    const color = ent.team === 'player' ? 0x3388ff : ent.team === 'enemy' ? 0xff3333 : 0xcccc44;
    const size = ent.isBuilding ? 3 : 1.5;
    const geo = ent.isBuilding ? new THREE.BoxGeometry(size, size, size) : new THREE.SphereGeometry(size / 2, 8, 8);
    const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);

    const h = this._getHeightAtWorld(ent.x, ent.z);
    mesh.position.set(ent.x, h + size / 2, ent.z);
    mesh.userData = { editorEntity: ent };

    // Label sprite
    const label = this._createTextSprite(ent.type, color);
    label.position.y = size + 1;
    mesh.add(label);

    this.game.sceneManager.scene.add(mesh);
    this._entityMarkers.push(mesh);
  }

  _addResourceMarker(rn) {
    const geo = new THREE.CylinderGeometry(0.5, 0.8, 3, 6);
    const mat = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    const h = this._getHeightAtWorld(rn.x, rn.z);
    mesh.position.set(rn.x, h + 1.5, rn.z);
    mesh.userData = { editorResource: rn };

    const label = this._createTextSprite('Resource', 0x00ff88);
    label.position.y = 3;
    mesh.add(label);

    this.game.sceneManager.scene.add(mesh);
    this._resourceMarkers.push(mesh);
  }

  _addStartMarker(ps) {
    const color = ps.team === 'player' ? 0x3388ff : 0xff3333;
    const geo = new THREE.ConeGeometry(2, 5, 4);
    const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    const h = this._getHeightAtWorld(ps.x, ps.z);
    mesh.position.set(ps.x, h + 2.5, ps.z);
    mesh.userData = { editorStart: ps };

    const label = this._createTextSprite(ps.team + ' Start', color);
    label.position.y = 5;
    mesh.add(label);

    this.game.sceneManager.scene.add(mesh);
    this._startMarkers.push(mesh);
  }

  _addNeutralMarker(ns) {
    const geo = new THREE.OctahedronGeometry(2, 0);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffcc00, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    const h = this._getHeightAtWorld(ns.x, ns.z);
    mesh.position.set(ns.x, h + 2, ns.z);
    mesh.userData = { editorNeutral: ns };

    const label = this._createTextSprite(ns.type, 0xffcc00);
    label.position.y = 4;
    mesh.add(label);

    this.game.sceneManager.scene.add(mesh);
    this._neutralMarkers.push(mesh);
  }

  _createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#' + (color & 0xFFFFFF).toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(8, 2, 1);
    return sprite;
  }

  // ===================== Camera =====================

  _setupEditorCamera() {
    const worldSize = this.mapSize * GAME_CONFIG.worldScale;
    const cam = this.game.sceneManager.camera;
    cam.position.set(worldSize / 2, 120, worldSize / 2 + 80);
    cam.lookAt(worldSize / 2, 0, worldSize / 2);

    // Free-flying camera controls for editor
    this._camTarget = new THREE.Vector3(worldSize / 2, 0, worldSize / 2);
    this._camZoom = 120;
    this._camRotation = 0;
    this._camPitch = 0.8; // angle from top (0=top-down, PI/2=horizon)
    this._camKeys = {};
    this._camMouse = { x: 0, y: 0 };
    this._camPanning = false;
    this._camLastMouse = { x: 0, y: 0 };

    if (!this._cameraListenersSetup) {
      this._onKeyDown = (e) => {
        if (!this.active) return;
        this._camKeys[e.key.toLowerCase()] = true;

        // Grid toggle
        if (e.key.toLowerCase() === 'g' && !e.ctrlKey) {
          this.toggleGrid();
        }

        // Undo/Redo
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          this.undo();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          this.redo();
        }

        // Escape exits editor
        if (e.key === 'Escape') {
          if (this.currentTool !== TOOLS.SELECT) {
            this.setTool(TOOLS.SELECT);
          }
        }

        // Number keys for brush size
        if (e.key === '1') this.setBrushSize(1);
        if (e.key === '2') this.setBrushSize(3);
        if (e.key === '3') this.setBrushSize(5);
        if (e.key === '4') this.setBrushSize(7);
      };

      this._onKeyUp = (e) => {
        if (!this.active) return;
        this._camKeys[e.key.toLowerCase()] = false;
      };

      this._onMouseMove = (e) => {
        if (!this.active) return;
        this._camMouse.x = e.clientX;
        this._camMouse.y = e.clientY;

        if (this._camPanning) {
          const dx = e.clientX - this._camLastMouse.x;
          const dy = e.clientY - this._camLastMouse.y;
          const cos = Math.cos(this._camRotation);
          const sin = Math.sin(this._camRotation);
          this._camTarget.x -= (dx * cos - dy * sin) * 0.5;
          this._camTarget.z -= (dx * sin + dy * cos) * 0.5;
          this._camLastMouse.x = e.clientX;
          this._camLastMouse.y = e.clientY;
        }

        // Update brush indicator
        this._updateBrushPosition(e);

        // Painting while mouse is held
        if (this.mouseDown) {
          this._applyToolAtMouse(e);
        }
      };

      this._onMouseDown = (e) => {
        if (!this.active) return;
        if (e.target.closest('#editor-ui')) return; // Don't paint when clicking UI

        if (e.button === 1) {
          this._camPanning = true;
          this._camLastMouse = { x: e.clientX, y: e.clientY };
        }
        if (e.button === 0) {
          this.mouseDown = true;
          this.lastPaintGrid = null;
          this._beginStroke();
          this._applyToolAtMouse(e);
        }
      };

      this._onMouseUp = (e) => {
        if (!this.active) return;
        if (e.button === 1) this._camPanning = false;
        if (e.button === 0) {
          this.mouseDown = false;
          this._endStroke();
        }
      };

      this._onWheel = (e) => {
        if (!this.active) return;
        if (e.target.closest('#editor-ui')) return;
        this._camZoom += e.deltaY * 0.1;
        this._camZoom = Math.max(20, Math.min(300, this._camZoom));
        e.preventDefault();
      };

      this._onContextMenu = (e) => {
        if (this.active) e.preventDefault();
      };

      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mousedown', this._onMouseDown);
      window.addEventListener('mouseup', this._onMouseUp);
      this.game.sceneManager.renderer.domElement.addEventListener('wheel', this._onWheel, { passive: false });
      this.game.sceneManager.renderer.domElement.addEventListener('contextmenu', this._onContextMenu);

      this._cameraListenersSetup = true;
    }
  }

  _removeInput() {
    // Don't remove listeners - they check this.active
  }

  updateCamera(delta) {
    if (!this.active) return;

    let dx = 0, dz = 0;
    const speed = 100;

    if (this._camKeys['w'] || this._camKeys['arrowup']) dz += 1;
    if (this._camKeys['s'] || this._camKeys['arrowdown']) dz -= 1;
    if (this._camKeys['a'] || this._camKeys['arrowleft']) dx -= 1;
    if (this._camKeys['d'] || this._camKeys['arrowright']) dx += 1;
    if (this._camKeys['q']) this._camRotation -= 2 * delta;
    if (this._camKeys['e']) this._camRotation += 2 * delta;

    const cos = Math.cos(this._camRotation);
    const sin = Math.sin(this._camRotation);
    this._camTarget.x += (dx * cos - dz * sin) * speed * delta;
    this._camTarget.z += (dx * sin + dz * cos) * speed * delta;

    // Update camera position
    const cam = this.game.sceneManager.camera;
    const offX = Math.sin(this._camRotation) * this._camZoom * Math.cos(this._camPitch);
    const offZ = Math.cos(this._camRotation) * this._camZoom * Math.cos(this._camPitch);
    const offY = this._camZoom * Math.sin(this._camPitch);

    cam.position.set(
      this._camTarget.x - offX,
      this._camTarget.y + offY,
      this._camTarget.z - offZ
    );
    cam.lookAt(this._camTarget);
  }

  // ===================== Tool Application =====================

  _getWorldPosFromMouse(e) {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.game.sceneManager.camera);

    // Raycast against a flat ground plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  }

  _worldToGrid(wx, wz) {
    const ws = GAME_CONFIG.worldScale;
    return {
      x: Math.floor(wx / ws),
      z: Math.floor(wz / ws)
    };
  }

  _gridToWorld(gx, gz) {
    const ws = GAME_CONFIG.worldScale;
    return {
      x: gx * ws + ws / 2,
      z: gz * ws + ws / 2
    };
  }

  _beginStroke() {
    // Save state before stroke for undo
    this._strokeUndoState = {
      heightData: this._cloneHeightData(),
      terrainTypeGrid: this._cloneTerrainTypeGrid(),
      waterZones: [...this.waterZones],
      treePositions: [...this.treePositions],
      entities: JSON.parse(JSON.stringify(this.entities)),
      resourceNodes: JSON.parse(JSON.stringify(this.resourceNodes)),
      playerStartPositions: JSON.parse(JSON.stringify(this.playerStartPositions)),
      neutralStructures: JSON.parse(JSON.stringify(this.neutralStructures))
    };
  }

  _endStroke() {
    if (!this._strokeUndoState) return;
    // Push undo state
    this.undoStack.push(this._strokeUndoState);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this._strokeUndoState = null;
  }

  _applyToolAtMouse(e) {
    const worldPos = this._getWorldPosFromMouse(e);
    if (!worldPos) return;

    const grid = this._worldToGrid(worldPos.x, worldPos.z);
    if (grid.x < 0 || grid.x >= this.mapSize || grid.z < 0 || grid.z >= this.mapSize) return;

    switch (this.currentTool) {
      case TOOLS.RAISE:
        this._applyHeightBrush(grid.x, grid.z, this.brushStrength * 0.3);
        this._updateTerrainMeshPartial();
        break;
      case TOOLS.LOWER:
        this._applyHeightBrush(grid.x, grid.z, -this.brushStrength * 0.3);
        this._updateTerrainMeshPartial();
        break;
      case TOOLS.PAINT:
        this._applyPaintBrush(grid.x, grid.z, this.selectedTerrainType);
        this._updateTerrainMeshPartial();
        break;
      case TOOLS.WATER:
        this._applyWaterBrush(grid.x, grid.z);
        this._updateTerrainMeshPartial();
        break;
      case TOOLS.TREES:
        this._applyTreeBrush(grid.x, grid.z);
        break;
      case TOOLS.PLACE_ENTITY:
        this._placeEntity(worldPos.x, worldPos.z);
        break;
      case TOOLS.PLACE_RESOURCE:
        this._placeResourceNode(worldPos.x, worldPos.z);
        break;
      case TOOLS.PLACE_START:
        this._placePlayerStart(worldPos.x, worldPos.z);
        break;
      case TOOLS.PLACE_NEUTRAL:
        this._placeNeutralStructure(worldPos.x, worldPos.z);
        break;
      case TOOLS.ERASE:
        this._eraseAtPosition(worldPos.x, worldPos.z);
        break;
    }
  }

  // ---- Height brush ----
  _applyHeightBrush(cx, cz, amount) {
    const r = Math.floor(this.brushSize / 2);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || x > this.mapSize || z < 0 || z > this.mapSize) continue;

        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;

        // Smooth falloff
        const falloff = 1 - (dist / (r + 1));
        this.heightData[z][x] += amount * falloff;
      }
    }
  }

  // ---- Paint brush ----
  _applyPaintBrush(cx, cz, terrainType) {
    const r = Math.floor(this.brushSize / 2);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || x >= this.mapSize || z < 0 || z >= this.mapSize) continue;

        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;

        this.terrainTypeGrid[z][x] = terrainType;
      }
    }
  }

  // ---- Water brush ----
  _applyWaterBrush(cx, cz) {
    const r = Math.floor(this.brushSize / 2);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || x > this.mapSize || z < 0 || z > this.mapSize) continue;

        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;

        // Lower terrain below water level
        this.heightData[z][x] = Math.min(this.heightData[z][x], -1.0);

        // Track as water zone
        if (!this.waterZones.find(w => w.x === x && w.z === z)) {
          this.waterZones.push({ x, z });
        }
      }
    }
  }

  // ---- Tree brush ----
  _applyTreeBrush(cx, cz) {
    // Only add trees once per grid cell per stroke
    const key = `${cx},${cz}`;
    if (this.lastPaintGrid === key) return;
    this.lastPaintGrid = key;

    const r = Math.floor(this.brushSize / 2);
    let added = false;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || x >= this.mapSize || z < 0 || z >= this.mapSize) continue;

        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;

        // Don't double-place
        if (this.treePositions.find(t => t.x === x && t.z === z)) continue;

        // Only on land
        if (this.heightData[z]?.[x] < 0) continue;

        // Sparse placement
        if (Math.random() < 0.3) {
          this.treePositions.push({ x, z, scale: 0.6 + Math.random() * 0.8 });
          added = true;
        }
      }
    }
    if (added) this._rebuildTreeMeshes();
  }

  // ---- Entity placement ----
  _placeEntity(wx, wz) {
    if (!this.selectedEntityType) return;
    // Don't stack entities at exact same position
    const minDist = this.selectedEntityIsBuilding ? 6 : 3;
    for (const ent of this.entities) {
      const d = Math.sqrt((ent.x - wx) ** 2 + (ent.z - wz) ** 2);
      if (d < minDist) return;
    }

    const ent = {
      type: this.selectedEntityType,
      team: this.selectedEntityTeam,
      x: wx,
      z: wz,
      isBuilding: this.selectedEntityIsBuilding
    };
    this.entities.push(ent);
    this._addEntityMarker(ent);
  }

  _placeResourceNode(wx, wz) {
    // Don't stack
    for (const rn of this.resourceNodes) {
      const d = Math.sqrt((rn.x - wx) ** 2 + (rn.z - wz) ** 2);
      if (d < 10) return;
    }
    const rn = { x: wx, z: wz };
    this.resourceNodes.push(rn);
    this._addResourceMarker(rn);
  }

  _placePlayerStart(wx, wz) {
    // Replace existing start for the selected team
    const team = this.selectedEntityTeam;
    this.playerStartPositions = this.playerStartPositions.filter(p => p.team !== team);
    this.playerStartPositions.push({ team, x: wx, z: wz });
    this._rebuildEntityMarkers();
  }

  _placeNeutralStructure(wx, wz) {
    if (!this.selectedNeutralType) return;
    for (const ns of this.neutralStructures) {
      const d = Math.sqrt((ns.x - wx) ** 2 + (ns.z - wz) ** 2);
      if (d < 10) return;
    }
    const ns = { type: this.selectedNeutralType, x: wx, z: wz };
    this.neutralStructures.push(ns);
    this._addNeutralMarker(ns);
  }

  // ---- Erase ----
  _eraseAtPosition(wx, wz) {
    const eraseRadius = this.brushSize * GAME_CONFIG.worldScale;

    // Erase entities
    const prevEntLen = this.entities.length;
    this.entities = this.entities.filter(e => {
      const d = Math.sqrt((e.x - wx) ** 2 + (e.z - wz) ** 2);
      return d > eraseRadius;
    });

    // Erase resource nodes
    this.resourceNodes = this.resourceNodes.filter(r => {
      const d = Math.sqrt((r.x - wx) ** 2 + (r.z - wz) ** 2);
      return d > eraseRadius;
    });

    // Erase neutral structures
    this.neutralStructures = this.neutralStructures.filter(n => {
      const d = Math.sqrt((n.x - wx) ** 2 + (n.z - wz) ** 2);
      return d > eraseRadius;
    });

    // Erase trees in brush area
    const grid = this._worldToGrid(wx, wz);
    const r = Math.floor(this.brushSize / 2);
    this.treePositions = this.treePositions.filter(t => {
      const dx = t.x - grid.x;
      const dz = t.z - grid.z;
      return Math.sqrt(dx * dx + dz * dz) > r + 0.5;
    });

    // Rebuild visuals if anything changed
    if (this.entities.length !== prevEntLen || true) {
      this._rebuildEntityMarkers();
      this._rebuildTreeMeshes();
    }
  }

  // ===================== Brush Indicator =====================

  _createBrushIndicator() {
    if (this.brushIndicator) {
      this.game.sceneManager.scene.remove(this.brushIndicator);
    }

    const radius = this.brushSize * GAME_CONFIG.worldScale / 2;
    const geo = new THREE.RingGeometry(radius - 0.3, radius, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    this.brushIndicator = new THREE.Mesh(geo, mat);
    this.brushIndicator.position.y = 0.5;
    this.game.sceneManager.scene.add(this.brushIndicator);
  }

  _updateBrushPosition(e) {
    if (!this.brushIndicator) return;
    const worldPos = this._getWorldPosFromMouse(e);
    if (worldPos) {
      const h = this._getHeightAtWorld(worldPos.x, worldPos.z);
      this.brushIndicator.position.set(worldPos.x, h + 0.5, worldPos.z);
    }
  }

  // ===================== Grid =====================

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.showGrid) {
      if (!this.gridHelper) {
        const worldSize = this.mapSize * GAME_CONFIG.worldScale;
        this.gridHelper = new THREE.GridHelper(worldSize, this.mapSize, 0x444444, 0x333333);
        this.gridHelper.position.set(worldSize / 2, 0.2, worldSize / 2);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.3;
      }
      this.game.sceneManager.scene.add(this.gridHelper);
    } else if (this.gridHelper) {
      this.game.sceneManager.scene.remove(this.gridHelper);
    }
  }

  // ===================== Undo / Redo =====================

  undo() {
    if (this.undoStack.length === 0) return;
    // Save current state for redo
    this.redoStack.push({
      heightData: this._cloneHeightData(),
      terrainTypeGrid: this._cloneTerrainTypeGrid(),
      waterZones: [...this.waterZones],
      treePositions: [...this.treePositions],
      entities: JSON.parse(JSON.stringify(this.entities)),
      resourceNodes: JSON.parse(JSON.stringify(this.resourceNodes)),
      playerStartPositions: JSON.parse(JSON.stringify(this.playerStartPositions)),
      neutralStructures: JSON.parse(JSON.stringify(this.neutralStructures))
    });

    const state = this.undoStack.pop();
    this._restoreState(state);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push({
      heightData: this._cloneHeightData(),
      terrainTypeGrid: this._cloneTerrainTypeGrid(),
      waterZones: [...this.waterZones],
      treePositions: [...this.treePositions],
      entities: JSON.parse(JSON.stringify(this.entities)),
      resourceNodes: JSON.parse(JSON.stringify(this.resourceNodes)),
      playerStartPositions: JSON.parse(JSON.stringify(this.playerStartPositions)),
      neutralStructures: JSON.parse(JSON.stringify(this.neutralStructures))
    });

    const state = this.redoStack.pop();
    this._restoreState(state);
  }

  _restoreState(state) {
    this.heightData = state.heightData;
    this.terrainTypeGrid = state.terrainTypeGrid;
    this.waterZones = state.waterZones;
    this.treePositions = state.treePositions;
    this.entities = state.entities;
    this.resourceNodes = state.resourceNodes;
    this.playerStartPositions = state.playerStartPositions;
    this.neutralStructures = state.neutralStructures;
    this._updateTerrainMeshPartial();
    this._rebuildTreeMeshes();
    this._rebuildEntityMarkers();
  }

  _cloneHeightData() {
    const clone = [];
    for (let z = 0; z <= this.mapSize; z++) {
      clone[z] = new Float32Array(this.heightData[z]);
    }
    return clone;
  }

  _cloneTerrainTypeGrid() {
    const clone = [];
    for (let z = 0; z < this.mapSize; z++) {
      clone[z] = new Uint8Array(this.terrainTypeGrid[z]);
    }
    return clone;
  }

  // ===================== Tool Setters =====================

  setTool(tool) {
    this.currentTool = tool;
    this._createBrushIndicator(); // Resize indicator
    if (this.ui) this.ui.updateToolState();
  }

  setBrushSize(size) {
    this.brushSize = size;
    this._createBrushIndicator();
    if (this.ui) this.ui.updateBrushInfo();
  }

  setTerrainType(type) {
    this.selectedTerrainType = type;
    if (this.ui) this.ui.updateToolState();
  }

  setEntityType(type, isBuilding) {
    this.selectedEntityType = type;
    this.selectedEntityIsBuilding = isBuilding;
    this.setTool(TOOLS.PLACE_ENTITY);
  }

  setEntityTeam(team) {
    this.selectedEntityTeam = team;
    if (this.ui) this.ui.updateToolState();
  }

  setNeutralType(type) {
    this.selectedNeutralType = type;
    this.setTool(TOOLS.PLACE_NEUTRAL);
  }

  // ===================== Save / Load =====================

  save() {
    const state = this._getEditorState();
    if (this._saveId) {
      MapSerializer.updateInLocalStorage(this._saveId, state);
    } else {
      this._saveId = MapSerializer.saveToLocalStorage(state);
    }
    return this._saveId;
  }

  exportFile() {
    MapSerializer.exportToFile(this._getEditorState());
  }

  async importFile() {
    try {
      const json = await MapSerializer.importFromFile();
      this._loadFromJson(json);
      this._rebuildTerrainMesh();
      this._rebuildWaterMesh();
      this._rebuildEntityMarkers();
    } catch (e) {
      console.error('Import failed:', e);
    }
  }

  loadMap(mapId) {
    let json = null;

    // Check if it's an example map
    if (mapId.startsWith('example_')) {
      const key = mapId.replace('example_', '');
      json = EXAMPLE_MAPS[key];
    } else {
      json = MapSerializer.loadFromLocalStorage(mapId);
    }

    if (json) {
      this._loadFromJson(json);
      this._saveId = mapId.startsWith('example_') ? null : mapId;
      this._rebuildTerrainMesh();
      this._rebuildWaterMesh();
      this._rebuildEntityMarkers();
      if (this.ui) this.ui.updateMapProperties();
    }
  }

  newMap(size = 128) {
    this.mapSize = size;
    this._saveId = null;
    this._initBlankMap();
    this._rebuildTerrainMesh();
    this._rebuildWaterMesh();
    this._rebuildEntityMarkers();
    this.undoStack = [];
    this.redoStack = [];
    if (this.ui) this.ui.updateMapProperties();
  }

  // ===================== Helpers =====================

  _isWaterAt(gx, gz) {
    return this.waterZones.some(w => w.x === gx && w.z === gz);
  }

  _getHeightAtWorld(wx, wz) {
    const ws = GAME_CONFIG.worldScale;
    const gx = Math.floor(Math.max(0, Math.min(this.mapSize - 1, wx / ws)));
    const gz = Math.floor(Math.max(0, Math.min(this.mapSize - 1, wz / ws)));
    return this.heightData[gz]?.[gx] || 0;
  }

  _clearScene() {
    if (!this.game.sceneManager) return;
    const scene = this.game.sceneManager.scene;

    if (this._terrainMesh) {
      scene.remove(this._terrainMesh);
      this._terrainMesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      this._terrainMesh = null;
    }
    if (this._waterMesh) {
      scene.remove(this._waterMesh);
      this._waterMesh.geometry.dispose();
      this._waterMesh.material.dispose();
      this._waterMesh = null;
    }
    if (this._treeMeshGroup) {
      scene.remove(this._treeMeshGroup);
      this._treeMeshGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      this._treeMeshGroup = null;
    }
    for (const arr of [this._entityMarkers, this._resourceMarkers, this._startMarkers, this._neutralMarkers]) {
      for (const m of arr) {
        scene.remove(m);
        m.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      }
    }
    this._entityMarkers = [];
    this._resourceMarkers = [];
    this._startMarkers = [];
    this._neutralMarkers = [];

    if (this.gridHelper) {
      scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
    if (this.brushIndicator) {
      scene.remove(this.brushIndicator);
      this.brushIndicator = null;
    }
  }

  // ===================== Update (called from game loop) =====================

  update(delta) {
    if (!this.active) return;
    this.updateCamera(delta);
  }
}
