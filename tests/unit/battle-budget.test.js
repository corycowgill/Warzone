import {it,expect,vi} from 'vitest';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Scene,Vector3} from 'three';
import {EffectsManager} from '../../js/rendering/EffectsManager.js';
import {trimCorpses} from '../../js/rendering/CorpseBudget.js';

it('bounds wrecks by quality while retaining the nearest detail and releasing evicted GPU resources',()=>{
 const scene=new Scene(),corpses=Array.from({length:30},(_,i)=>{
  const mesh=new Group();mesh.position.x=i;mesh.add(new Mesh(new BoxGeometry(),new MeshBasicMaterial()));scene.add(mesh);return {mesh};
 });
 const removed=corpses.at(-1),dispose=vi.spyOn(removed.mesh.children[0].geometry,'dispose');
 trimCorpses(corpses,scene,{position:new Vector3()},'high');
 expect(corpses).toHaveLength(12);expect(corpses.map(c=>c.mesh.position.x)).toEqual(Array.from({length:12},(_,i)=>i));expect(dispose).toHaveBeenCalledOnce();expect(removed.mesh.parent).toBeNull();
 trimCorpses(corpses,scene,{position:new Vector3()},'low');expect(corpses).toHaveLength(4);
});
it('reuses damage textures, bounds label bursts, and retains cached textures until manager disposal',()=>{
 const create=vi.fn(()=>({getContext:()=>({strokeText(){},fillText(){}})}));vi.stubGlobal('document',{createElement:create});
 try{
  const fx=Object.assign(Object.create(EffectsManager.prototype),{game:{},scene:new Scene(),activeEffects:[],_spritePool:[],_canSpawn:()=>true});
  fx.createDamageNumber(new Vector3(),10,'normal');fx.createDamageNumber(new Vector3(),10,'normal');
  expect(create).toHaveBeenCalledOnce();expect(fx.activeEffects[0].texture).toBe(fx.activeEffects[1].texture);
  const texture=fx.activeEffects[0].texture,disposed=vi.spyOn(texture,'dispose');
  for(let i=0;i<100;i++)fx.createDamageNumber(new Vector3(),10,'normal');expect(fx.activeEffects).toHaveLength(24);
  fx.createSalvageText(new Vector3(),25);expect(fx.activeEffects).toHaveLength(24);
  fx.update(2);expect(disposed).not.toHaveBeenCalled();
  for(let i=0;i<60;i++){fx.createDamageNumber(new Vector3(),i,'high');fx.update(2);}
  expect(fx._damageTextCache.size).toBe(32);fx.dispose();expect(disposed).toHaveBeenCalledOnce();expect(fx._damageTextCache.size).toBe(0);
 }finally{vi.unstubAllGlobals();}
});
