import * as THREE from 'three';
import {isEditing,screenToNDC} from './InputPolicy.js';
import { LockstepManager } from '../networking/LockstepManager.js';

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

    this._listeners=[];
    this.setupListeners();
  }

  setupListeners() {
    const canvas = this.game.sceneManager.renderer.domElement;

    this.listen(canvas,'mousedown', (e) => {
      if(this.game.state!=='PLAYING')return;
      this.lastGestureWasDrag=false;
      Object.assign(this.mouseScreen,{x:e.clientX,y:e.clientY});
      if (e.button === 0) {
        this.mouseDown = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
      }
      if (e.button === 2) this.rightMouseDown = true;
    });

    this.listen(canvas,'mousemove', (e) => {
      this.mouseScreen.x = e.clientX;
      this.mouseScreen.y = e.clientY;
      const ndc=screenToNDC(canvas,e.clientX,e.clientY);this.mouse.set(ndc.x,ndc.y);

      if (this.mouseDown && this.dragStart) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.isDragging = true;
        }
      }

      // Update ghost building preview during placement mode
      const hud = this.game.uiManager?.hud;
      if (hud && hud.buildPlacementMode) {
        const worldPos = this.getWorldPosition(e.clientX, e.clientY);
        if (worldPos) {
          hud.updateGhostPosition(worldPos);
        }
      }
    });

    this.listen(canvas,'mouseup', (e) => {
      if(this.game.state!=='PLAYING'){this.reset();return;}
      if((e.button===0&&!this.mouseDown)||(e.button===2&&!this.rightMouseDown))return;
      if (e.button === 0) {
        this.lastGestureWasDrag=this.isDragging;
        const panel=this.game.uiManager?.hud?.buildPanel;
        const targeting=panel?.buildPlacementMode||panel?._superweaponTargetMode||this.game.commandSystem.abilityTargetMode;
        if (this.game.mode !== 'SPECTATE'&&!targeting) {
          // Attack-move on left-click (A + left-click is standard RTS convention)
          if(!this.isDragging&&this.game.commandSystem.moveMode){
            const ownTeam=this.game.isMultiplayer?this.game.getLocalTeam():this.game.mode==='2P'?this.game.activeTeam:'player';
            const units=this.game.selectionManager.getSelected().filter(u=>u.alive&&u.isUnit&&u.team===ownTeam);
            const point=this.getWorldPosition(e.clientX,e.clientY);
            if(point&&units.length){if(this.game.isMultiplayer&&this.game.lockstepManager?.enabled)this.game.lockstepManager.queueCommand(LockstepManager.moveCommand(units.map(u=>u.id),point));else this.game.commandSystem.moveUnits(units,point);}
            this.game.commandSystem.moveMode=false;document.body.style.cursor='default';
          } else if (!this.isDragging && this.game.commandSystem.attackMoveMode) {
            const selected = this.game.selectionManager.getSelected();
            const ownTeam = this.game.isMultiplayer ? this.game.getLocalTeam() : (this.game.mode === '2P' ? this.game.activeTeam : 'player');
            const selectedUnits = selected.filter(u => u.isUnit && u.team === ownTeam);
            if (selectedUnits.length > 0) {
              const worldPos = this.getWorldPosition(e.clientX, e.clientY);
              if (worldPos) {
                if (this.game.isMultiplayer && this.game.lockstepManager?.enabled) {
                  this.game.lockstepManager.queueCommand(
                    LockstepManager.attackMoveCommand(selectedUnits.map(u => u.id), worldPos)
                  );
                } else {
                  this.game.commandSystem.attackMoveUnits(selectedUnits, worldPos);
                }
              }
            }
            this.game.commandSystem.attackMoveMode = false;
            document.body.style.cursor = 'default';
          } else if(!this.isDragging&&this.game.commandSystem.patrolMode){
            this.game.commandSystem.handleRightClick(e);
          } else if (!this.isDragging) {
            this.game.selectionManager.handleClick(e);
            if (this.game.soundManager) {
              const selected = this.game.selectionManager.getSelected();
              const unitType = selected.length > 0 && selected[0].isUnit ? selected[0].type : null;
              this.game.soundManager.play('select', { unitType });
            }
          } else {
            this.game.selectionManager.handleBoxSelectEnd(e);
          }
        }
        this.mouseDown = false;
        this.isDragging = false;
        this.dragStart = null;
      }
      if (e.button === 2) {
        this.rightMouseDown = false;
        if (this.game.mode !== 'SPECTATE') {
          const command=this.game.commandSystem,panel=this.game.uiManager?.hud?.buildPanel;
          if(command.moveMode||command.attackMoveMode||command.patrolMode||command.abilityTargetMode||panel?.buildPlacementMode||panel?._superweaponTargetMode){
            command.handleKeyPress({key:'Escape'});
            this.game.uiManager?.hud?.cancelBuildPlacement?.();
            if(panel)panel._superweaponTargetMode=false;
            return;
          }
          this.game.commandSystem.handleRightClick(e);
        }
      }
    });

    this.listen(canvas,'contextmenu', (e) => e.preventDefault());

    this.listen(window,'keydown', (e) => {
      if(this.game.state!=='PLAYING'||isEditing(e)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
      this.keys[e.key.toLowerCase()] = true;
      // Forward to command system for game commands (not in spectate mode)
      if (this.game.mode !== 'SPECTATE') {
        this.game.commandSystem.handleKeyPress(e);
      }
    });
    this.listen(window,'blur',()=>this.reset());
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.reset();});
    this.listen(window,'mouseup',e=>{if(e.target!==canvas)this.reset();});
    this.listen(window,'keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  listen(target,type,handler){target.addEventListener(type,handler);this._listeners.push(()=>target.removeEventListener(type,handler));}
  reset(){this.mouseDown=false;this.rightMouseDown=false;this.isDragging=false;this.dragStart=null;this.keys={};if(this.game.selectionManager?.selectionBoxEl)this.game.selectionManager.selectionBoxEl.style.display='none';}
  dispose(){this.reset();for(const remove of this._listeners)remove();this._listeners=[];}

  getWorldPosition(screenX, screenY) {
    const ndc=screenToNDC(this.game.sceneManager.renderer.domElement,screenX,screenY);
    const mouse=new THREE.Vector2(ndc.x,ndc.y);
    this.raycaster.setFromCamera(mouse, this.game.sceneManager.camera);

    // Intersect with terrain if available, otherwise ground plane
    if (this.game.terrain && this.game.terrain.mesh) {
      const intersects = this.raycaster.intersectObject(this.game.terrain.mesh.children[0], false);
      if (intersects.length > 0) {
        return intersects[0].point;
      }
    }

    // Fallback to ground plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, target);
  }
}
