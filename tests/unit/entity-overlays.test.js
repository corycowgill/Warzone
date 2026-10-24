import {it,expect,vi} from 'vitest';
import {Group,PerspectiveCamera,Vector3,Quaternion} from 'three';
import {Entity} from '../../js/entities/Entity.js';
import {needsHealthOverlay,updateEntityOverlays} from '../../js/rendering/EntityOverlays.js';
const camera=()=>{const c=new PerspectiveCamera(60,1,.1,500);c.position.set(0,20,40);c.lookAt(0,0,0);return c;};
const entity=()=>{const e=new Entity('tank','player',new Vector3());e.mesh=new Group();e.createHealthBar();return e;};
it('hides healthy idle units but retains useful selection, damage, combat and state information',()=>{
 const e=entity();expect(needsHealthOverlay(e)).toBeFalsy();
 for(const state of [{selected:true},{health:50},{attackTarget:{alive:true}},{isRetreating:true},{empDisabledTimer:1},{_constructing:true}])expect(needsHealthOverlay({...e,...state})).toBeTruthy();
 expect(needsHealthOverlay({...e,selected:true,isGarrisoned:true})).toBeFalsy();expect(needsHealthOverlay({...e,selected:true,alive:false})).toBeFalsy();
});
it('culls overlays outside the current view and restores them after a camera move',()=>{
 const e=entity(),c=camera();e.health=50;e.mesh.position.x=1000;e._typeLabel={visible:true};updateEntityOverlays([e],c);expect(e.healthBar.visible).toBe(false);expect(e._typeLabel.visible).toBe(false);
 c.position.x=1000;c.lookAt(1000,0,0);updateEntityOverlays([e],c);expect(e.healthBar.visible).toBe(true);
});
it('does not reveal fog-hidden units through their overlays',()=>{
 const e=entity();e.selected=true;e.mesh.visible=false;updateEntityOverlays([e],camera());expect(e.healthBar.visible).toBe(false);
});
it('faces the camera even when the unit parent rotates',()=>{
 const e=entity(),c=camera();e.mesh.rotation.y=Math.PI*.65;e.updateHealthBar(c);
 const actual=e.healthBar.getWorldQuaternion(new Quaternion()),expected=c.getWorldQuaternion(new Quaternion());
 expect(actual.angleTo(expected)).toBeLessThan(.000001);
});
it('avoids redundant fill updates but immediately reflects damage and healing',()=>{
 const e=entity(),c=camera(),fill=e.healthBar.getObjectByName('healthFill'),setColor=vi.spyOn(fill.material.color,'setHex');
 e.updateHealthBar(c);e.updateHealthBar(c);expect(setColor).toHaveBeenCalledOnce();e.health=25;e.updateHealthBar(c);expect(fill.scale.x).toBe(.25);expect(setColor).toHaveBeenCalledTimes(2);e.health=100;e.updateHealthBar(c);expect(fill.scale.x).toBe(1);
});
it('reduces visible health meshes in a 500-unit idle army without changing simulation state',()=>{
 const army=Array.from({length:500},entity),c=camera();const count=()=>{let n=0;for(const e of army)e.healthBar.traverseVisible(child=>{if(child.isMesh)n++;});return n;};
 expect(count()).toBe(1500);updateEntityOverlays(army,c);expect(count()).toBe(0);
 army.slice(0,20).forEach(e=>e.health=50);army.slice(20,40).forEach(e=>e.selected=true);updateEntityOverlays(army,c);expect(count()).toBe(120);expect(army.every(e=>e.alive)).toBe(true);
});
