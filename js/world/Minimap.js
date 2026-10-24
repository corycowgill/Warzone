import {visibleMinimapContact,canShowCombatPing,pushMinimapPing} from './MinimapPolicy.js';
import {localTeam} from '../systems/InputPolicy.js';
import {LockstepManager} from '../networking/LockstepManager.js';
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
    this._redrawElapsed = .1;
    this._fogCanvas = document.createElement('canvas');
    this._fogCanvas.width = this._fogCanvas.height = this.mapSize;
    this._fogCtx = this._fogCanvas.getContext('2d');
    this._fogPixels = this._fogCtx.createImageData(this.mapSize, this.mapSize);

    this._listeners=[];
    this.setupListeners();
    this.setupCombatPings();
  }

  setupListeners() {
    // Left-click on minimap to move camera
    this.listen(this.canvas,'mousedown', (e) => {
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
    this.listen(this.canvas,'mousemove', (e) => {
      if (this._drawingActive && this._currentDrawing) {
        const { x, z } = this.minimapToWorld(e);
        const previous=this._currentDrawing.at(-1);
        if(this._currentDrawing.length<256&&Math.hypot(x-previous.x,z-previous.z)>=1)this._currentDrawing.push({x,z});
        return;
      }
      if (e.buttons === 1) this.handleClick(e);
    });
    // End drawing on mouseup
    const finishDrawing = () => {
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
    };
    this.listen(this.canvas,'mouseup', finishDrawing);
    this.listen(window,'mouseup', finishDrawing);
    this.listen(window,'blur', () => {this._drawingActive=false;this._currentDrawing=null;});
    // Prevent browser context menu on minimap
    this.listen(this.canvas,'contextmenu', (e) => e.preventDefault());
  }

  setupCombatPings() {
    // Listen for combat to create minimap pings
    this._onCombatKill = (data) => {
      if (data.defender && canShowCombatPing(this.game, data.defender)) {
        const pos = data.defender.getPosition();
        pushMinimapPing(this._pings, {
          x: pos.x,
          z: pos.z,
          time: 2.0, // seconds to display
          color: data.defender.team === localTeam(this.game) ? '#db8378' : '#83b7d2'
        });
      }
    };
    this.game.eventBus.on('combat:kill', this._onCombatKill);
  }

  listen(target,type,handler){target.addEventListener(type,handler);this._listeners.push(()=>target.removeEventListener(type,handler));}

  dispose() {
    for(const remove of this._listeners)remove();this._listeners=[];
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
      x: Math.max(0, Math.min(1, mx / rect.width)) * this.worldSize,
      z: Math.max(0, Math.min(1, my / rect.height)) * this.worldSize
    };
  }

  handleClick(e) {
    const { x, z } = this.minimapToWorld(e);
    if (this.game.cameraController) {
      this.game.cameraController.moveTo(x, z);
    }
  }

  handleRightClick(e) {
    if(this.game.state!=='PLAYING'||this.game.mode==='SPECTATE')return;
    const selected = this.game.selectionManager
      ? this.game.selectionManager.getSelected()
      : [];
    const owned = selected.filter(entity => entity.alive && entity.team === localTeam(this.game));
    const units = owned.filter(entity => entity.isUnit),buildings=owned.filter(entity=>entity.isBuilding&&entity.setRallyPoint);
    if (!units.length && !buildings.length) return;
    const {x,z}=this.minimapToWorld(e),worldPos=new THREE.Vector3(x,0,z);
    const network=this.game.isMultiplayer&&this.game.lockstepManager?.enabled,commands=this.game.commandSystem;
    if(units.length&&commands){
      const ids=units.map(unit=>unit.id);
      if(commands.attackMoveMode){
        if(network)this.game.lockstepManager.queueCommand(LockstepManager.attackMoveCommand(ids,worldPos));
        else commands.attackMoveUnits(units,worldPos);
      }else if(e.shiftKey){
        if(network)this.game.lockstepManager.queueCommand({type:'WAYPOINT',entityIds:ids,target:{x,y:0,z}});
        else commands.queueWaypoint(units,worldPos);
      }else if(network)this.game.lockstepManager.queueCommand(LockstepManager.moveCommand(ids,worldPos));
      else commands.moveUnits(units,worldPos);
      commands.attackMoveMode=false;commands.moveMode=false;
      if(globalThis.document?.body)document.body.style.cursor='default';
      if(network)this.game.soundManager?.play('move',{unitType:units[0].type});
    }
    for(const building of buildings){
      if(network)this.game.lockstepManager.queueCommand(LockstepManager.setRallyCommand(building.id,worldPos));
      else building.setRallyPoint(worldPos.clone());
    }
    pushMinimapPing(this._pings,{x,z,time:1.5,color:buildings.length&&!units.length?'#cfaa67':'#83b7d2'});
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

    // Biome-aware minimap color palettes
    const biomePalettes = {
      temperate: {
        water: [26, 107, 196],
        beach: [194, 178, 128],
        grass: [51, 115, 38],
        highGrass: [76, 128, 51]
      },
      desert: {
        water: [26, 136, 102],
        beach: [209, 184, 128],
        grass: [184, 158, 102],
        highGrass: [153, 128, 77]
      },
      arctic: {
        water: [51, 136, 170],
        beach: [199, 204, 214],
        grass: [209, 217, 224],
        highGrass: [191, 199, 209]
      }
    };
    const biome = terrain.biome || 'temperate';
    const pal = biomePalettes[biome] || biomePalettes.temperate;

    for (let py = 0; py < this.size; py++) {
      for (let px = 0; px < this.size; px++) {
        // Map minimap pixel to grid cell
        const gx = Math.floor((px / this.size) * this.mapSize);
        const gz = Math.floor((py / this.size) * this.mapSize);
        const height = terrain.heightData[gz] ? terrain.heightData[gz][gx] : 0;

        let r, g, b;

        if (height < -0.5) {
          r = pal.water[0]; g = pal.water[1]; b = pal.water[2];
        } else if (height < 0.5) {
          r = pal.beach[0]; g = pal.beach[1]; b = pal.beach[2];
        } else if (height < 3) {
          r = pal.grass[0]; g = pal.grass[1]; b = pal.grass[2];
        } else {
          r = pal.highGrass[0]; g = pal.highGrass[1]; b = pal.highGrass[2];
        }

        const idx = (py * this.size + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imageData, 0, 0);

    // Render props (trees and cliffs) onto the terrain image
    const offCtx2 = offscreen.getContext('2d');

    // Draw trees as small green/olive dots
    if (terrain.treePositions) {
      const treeColor = biome === 'desert' ? '#6a8a3a' : biome === 'arctic' ? '#3a7a5a' : '#1a5a1a';
      offCtx2.fillStyle = treeColor;
      for (const tree of terrain.treePositions) {
        const mx = (tree.x / this.mapSize) * this.size;
        const my = (tree.z / this.mapSize) * this.size;
        offCtx2.fillRect(mx, my, 1.5, 1.5);
      }
    }

    // Draw cliffs as small gray dots
    if (terrain.cliffPositions) {
      offCtx2.fillStyle = '#8a8a7a';
      const maxCliffs = Math.min(terrain.cliffPositions.length, 50);
      for (let i = 0; i < maxCliffs; i++) {
        const cliff = terrain.cliffPositions[i];
        const mx = (cliff.x / this.mapSize) * this.size;
        const my = (cliff.z / this.mapSize) * this.size;
        offCtx2.fillRect(mx, my, 2, 2);
      }
    }

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
    this._redrawElapsed += delta || 0;
    if (this._redrawElapsed < .1 && !this._drawingActive) return;
    delta = this._redrawElapsed;
    this._redrawElapsed = 0;
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
      const data = this._fogPixels.data;
      for (let z=0;z<this.mapSize;z++) for(let x=0;x<this.mapSize;x++) {
        const state=fog.getStateAtGrid(x,z),i=(z*this.mapSize+x)*4;
        data[i]=data[i+1]=data[i+2]=0;
        data[i+3]=state===0?230:state===1?140:0;
      }
      this._fogCtx.putImageData(this._fogPixels,0,0);
      ctx.drawImage(this._fogCanvas,0,0,this.size,this.size);
    }

    // Draw entities
    if (this.game.entities) {
      const entities = this.game.entities;

      const ownTeam=localTeam(this.game);let rallyMarkers=0;
      for(const entity of entities){
        const visibility=visibleMinimapContact(this.game,entity);
        if(visibility==='hidden')continue;
        const remembered=visibility==='remembered',pos=remembered?entity._lastSeenPosition:entity.getPosition(),mp=this.worldToMinimap(pos.x,pos.z);
        ctx.globalAlpha=remembered ? .3 : 1;
        ctx.fillStyle=entity.team===ownTeam?'#83b7d2':entity.team==='neutral'?'#c2c5b7':'#db8378';
        if(entity.isBuilding){const size=Math.max(3,entity.size||3);ctx.fillRect(mp.x-size/2,mp.y-size/2,size,size);}
        else if(entity.isUnit){ctx.beginPath();ctx.arc(mp.x,mp.y,1.5,0,Math.PI*2);ctx.fill();}
        if(!remembered&&entity.team===ownTeam&&(entity.selected||entity.isRetreating)){
          ctx.strokeStyle=entity.selected?'#fff1cc':'#cfaa67';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mp.x,mp.y,3,0,Math.PI*2);ctx.stroke();
        }
        if(!remembered&&entity.team===ownTeam&&entity.selected&&entity.isBuilding&&entity.rallyPoint&&rallyMarkers++<8){
          const rally=this.worldToMinimap(entity.rallyPoint.x,entity.rallyPoint.z);
          ctx.strokeStyle='#cfaa67';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mp.x,mp.y);ctx.lineTo(rally.x,rally.y);ctx.stroke();
          ctx.beginPath();ctx.arc(rally.x,rally.y,3,0,Math.PI*2);ctx.stroke();
        }
        ctx.globalAlpha=1;
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

    // Project the actual screen corners onto the ground so the indicator follows rotation.
    if (this.game.cameraController) {
      const camera = this.game.cameraController.camera;
      camera.updateMatrixWorld();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const raycaster = new THREE.Raycaster();
      const corners = [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y]) => {
        raycaster.setFromCamera(new THREE.Vector2(x,y), camera);
        return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      });
      if (corners.every(Boolean)) {
        ctx.beginPath();
        corners.forEach((p,i) => { const m=this.worldToMinimap(p.x,p.z); if(i===0)ctx.moveTo(m.x,m.y);else ctx.lineTo(m.x,m.y); });
        ctx.closePath(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.5; ctx.stroke();
      }
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
