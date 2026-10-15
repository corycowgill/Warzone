import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CameraController} from '../js/rendering/CameraController.js';
import {Minimap} from '../js/world/Minimap.js';
class Surface extends EventTarget { closest(){return null;} }
globalThis.window=new Surface();window.innerWidth=1280;window.innerHeight=720;
const buttons=new Map(['camera-rotate-left','camera-rotate-right','camera-reset'].map(k=>[k,Object.assign(new Surface(),{setAttribute(){},getAttribute(){return null;}})]));
globalThis.document={getElementById:id=>buttons.get(id)};
const canvas=new Surface(),camera=new THREE.PerspectiveCamera(50,16/9,.1,1000),control=new CameraController(camera,canvas);
function emit(target,type,fields={}){const e=new Event(type,{cancelable:true});Object.assign(e,fields);target.dispatchEvent(e);return e;}
function project(p){camera.updateMatrixWorld();return p.clone().project(camera);}
control.moveTo(128,128);
assert.ok(project(control.target.clone().add(new THREE.Vector3(10,0,0))).x>0,'east appears right at north-up');
assert.ok(project(control.target.clone().add(new THREE.Vector3(0,0,-10))).y>0,'north appears up');
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 control.rotation=angle;control.moveTo(128,128);const old=control.target.clone();emit(window,'keydown',{key:'ArrowRight'});control.update(.05);emit(window,'keyup',{key:'ArrowRight'});const displacement=control.target.clone().sub(old);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);assert.ok(displacement.dot(right)>4.9,'right arrow follows screen at every heading');
 control.moveTo(128,128);control.pointerOverBattlefield=true;control.mousePos={x:1,y:360};control.update(.05);assert.ok(control.target.clone().sub(old).dot(right)<-4.9,'left edge follows screen');control.pointerOverBattlefield=false;
}
const target=control.target.clone(),zoom=control.zoom;
buttons.get('camera-rotate-right').dispatchEvent(new Event('click'));assert.ok(control.target.equals(target)&&control.zoom===zoom,'rotation preserves focus and zoom');
buttons.get('camera-reset').dispatchEvent(new Event('click'));assert.equal(control.rotation,Math.PI);
emit(canvas,'mousedown',{button:1,shiftKey:false,clientX:100,clientY:100});emit(window,'mousemove',{clientX:150,clientY:100});
assert.notEqual(control.rotation,Math.PI,'middle drag rotates');
emit(window,'mouseup',{button:1});assert.equal(control.isRotating,false);
emit(window,'keydown',{key:'q'});emit(window,'blur');assert.deepEqual(control.keys,{});
emit(window,'keydown',{key:'e'});
emit(window,'keyup',{key:'e'});
const minimap=Object.create(Minimap.prototype);minimap.worldSize=256;minimap.canvas={getBoundingClientRect:()=>({left:10,top:20,width:100,height:150})};
assert.deepEqual(minimap.minimapToWorld({clientX:60,clientY:95}),{x:128,z:128},'scaled minimap click lands at correct location');
control.dispose();const previous=control.rotation;buttons.get('camera-rotate-right').dispatchEvent(new Event('click'));assert.equal(control.rotation,previous,'old sessions release controls');
console.log('Camera checks passed: north-up projection, rotated key/edge panning, orbit, reset, blur, disposal and scaled minimap picking.');
