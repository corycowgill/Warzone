import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EffectsManager} from '../js/rendering/EffectsManager.js';
import {Projectile} from '../js/entities/Projectile.js';
import {CombatSystem} from '../js/systems/CombatSystem.js';

// Canvas drawing is validated in the browser; lifecycle tests use actual Three objects.
globalThis.document={createElement:()=>({getContext:()=>({
  createRadialGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},ellipse(){},fill(){}
})})};
const scene=new THREE.Scene();
const game={sceneManager:{scene},terrain:{getHeightAt:()=>3,isWater:()=>false},
  settingsManager:{settings:{graphics:{particles:'high'}}}};
const fx=new EffectsManager(game),origin=new THREE.Vector3(0,3,0);
const sprite=fx._getPooledSprite(fx._smokeTexture,0x333333,3);
sprite.position.set(9,8,7);sprite.userData.flickerPhase=3;fx._returnToPool(sprite);
const reused=fx._getPooledSprite(fx._sparkTexture,0xffffff,.3);
assert.equal(sprite,reused);assert.equal(reused.position.length(),0);
assert.equal(reused.userData.isSmoke,false);assert.equal(reused.userData.flickerPhase,undefined);
assert.equal(reused.userData.baseSize,.3);fx._returnToPool(reused);

fx.createImpactWave(origin,5);
const wave=fx.activeEffects[0];
assert.ok(Array.from(wave.group.geometry.attributes.position.array).every(Number.isFinite));
for(let i=0;i<wave.group.geometry.attributes.position.count;i++)assert.ok(Math.abs(wave.group.geometry.attributes.position.getY(i)-3.09)<1e-5);
fx.update(.2);assert.ok(wave.material.uniforms.uProgress.value>0);
for(let i=0;i<20;i++)fx.createImpactWave(origin,4,true);
assert.equal(fx.activeEffects.filter(e=>e.type==='impactWave').length,12);
const ripple=fx.activeEffects.find(e=>e.group.name==='Impact ripple');
assert.ok(Math.abs(ripple.group.geometry.attributes.position.getY(0)+.16)<1e-5);
let waveDisposed=0;wave.group.geometry.addEventListener('dispose',()=>waveDisposed++);
fx.update(2);assert.equal(waveDisposed,1);assert.equal(scene.children.length,0);
fx.createImpactEffect(origin,'laser');const laser=fx.activeEffects[0].particles[0];const laserColor=laser.material.color.clone();fx.update(.05);assert.ok(laser.material.color.equals(laserColor));fx.update(1);
fx.createImpactEffect(origin,'shell');const flame=fx.activeEffects.find(e=>e.particles).particles[0];fx.update(.05);const hot=flame.material.color.g;fx.update(.2);assert.ok(flame.material.color.g<hot,'fire cools over its lifetime');fx.update(2);

fx.createSmoke(origin);const smoke=fx.activeEffects[0].particles[0];
fx.update(.1);assert.ok(smoke.userData.velocity.y>0);assert.ok(smoke.scale.x>=smoke.userData.baseSize);
fx.update(3);assert.equal(scene.children.length,0);
fx.createMuzzleFlash(origin,new THREE.Vector3(10,3,0),'shell');
assert.ok(fx.activeEffects[0].group.position.x>0);
assert.equal(fx.activeEffects[0].group.children.some(o=>o.isLight),false);
fx.update(.03);assert.ok(fx.activeEffects[0].flash.scale.x<1.8);fx.update(1);

fx.createProjectileTrail(origin,new THREE.Vector3(40,3,0),'shell');
const trail=fx.activeEffects.find(e=>e.type==='trail');fx.update(.15);
assert.ok(trail.head.distanceTo(trail.tail)<=5.001);
assert.ok(trail.head.x>0&&trail.head.x<40);fx.update(2);

for(let i=0;i<40;i++)fx.createDeathExplosion(origin);
assert.ok(fx._spritePool.length<=500);assert.ok(fx.activeEffects.length<=180);
const first=fx.activeEffects.find(e=>e.particles)?.particles[0];
const parent=first.parent;fx.createDeathExplosion(origin);assert.equal(first.parent,parent,'live particles never stolen');
fx.update(12);assert.equal(fx.activeEffects.length,0);
assert.ok(fx._spritePool.every(s=>!s.visible&&!s.parent));
game.settingsManager.settings.graphics.particles='low';
for(let i=0;i<30;i++)fx.createExplosion(origin);
assert.ok(fx._spritePool.filter(s=>s.visible).length<=100);
let disposed=0;fx._fireTexture.addEventListener('dispose',()=>disposed++);
fx.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);

const source={type:'tank',getPosition:()=>new THREE.Vector3()},target={getPosition:()=>new THREE.Vector3(10,0,0)};
const projectile=new Projectile(source,target,0,80);let impacts=0;
projectile.onImpact=()=>impacts++;projectile.update(.01);assert.equal(impacts,0);
projectile.update(2);projectile.update(2);assert.equal(impacts,1);
assert.ok(projectile.mesh.position.distanceTo(projectile.endPos)<1e-6,'projectile stops at impact');projectile.dispose();
const mortar=new Projectile({...source,type:'mortar'},target,0,80);
mortar.update(mortar.distanceTotal/160);assert.ok(mortar.mesh.position.y>2,'artillery follows an arc');mortar.dispose();
const torpedo=new Projectile({...source,type:'submarine'},target,0,80);
torpedo.update(.02);assert.equal(torpedo.mesh.position.y,-.18);torpedo.dispose();
let landHits=0,waterHits=0;
const combat={game:{effectsManager:{createImpactEffect(){landHits++;},createWaterSplash(){waterHits++;}},terrain:{isWater:()=>false}}};
const delayed=new Projectile(source,target,0,80);
CombatSystem.prototype._attachImpact.call(combat,delayed,'shell');assert.equal(landHits,0);
delayed.update(1);assert.equal(landHits,1);delayed.dispose();
combat.game.terrain.isWater=()=>true;
const naval=new Projectile(source,target,0,80);
CombatSystem.prototype._attachImpact.call(combat,naval,'shell');naval.update(1);
assert.equal(waterHits,1);assert.equal(landHits,1,'water hits do not also create land explosions');naval.dispose();
console.log('PASS VFX pool reset, sizes, rising smoke, light-free muzzle flashes, short tracers, budgets, cleanup and arrival timing.');
