import {it,expect,vi} from 'vitest';
import {GeneratedAudio,GENERATED_SFX} from '../../js/audio/GeneratedAudio.js';
import {BattleAudio} from '../../js/audio/BattleAudio.js';
const node=()=>({gain:{value:1},playbackRate:{value:1},pan:{value:0},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop(){this.onended?.();}});
function context(){return {currentTime:0,decodeAudioData:vi.fn(async()=>({duration:2})),createGain:node,createBufferSource:vi.fn(node),createStereoPanner:node};}
it('deduplicates recording loads and remembers failures without fetch storms',async()=>{
 const fetch=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}));vi.stubGlobal('fetch',fetch);
 try{
  const ctx=context(),bank=new GeneratedAudio(ctx);const [a,b]=await Promise.all([bank.load('rifle'),bank.load('rifle')]);expect(a).toBe(b);expect(fetch).toHaveBeenCalledOnce();expect(ctx.decodeAudioData).toHaveBeenCalledOnce();
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});fetch.mockResolvedValue({ok:false,status:404});try{expect(await bank.load('impact')).toBeNull();expect(await bank.load('impact')).toBeNull();expect(fetch).toHaveBeenCalledTimes(2);}finally{warn.mockRestore();}
 }finally{vi.unstubAllGlobals();}
});
it('does not start a loop after a state change cancels its pending load',async()=>{
 vi.useFakeTimers();
 try{
 const ctx=context(),bank=new GeneratedAudio(ctx);let finish;bank.load=()=>new Promise(resolve=>finish=resolve);
 const loop=bank.loop('menu',node());loop.stop();finish({duration:60});await Promise.resolve();expect(ctx.createBufferSource).not.toHaveBeenCalled();vi.runAllTimers();expect(loop.gain.disconnect).toHaveBeenCalled();
 }finally{vi.useRealTimers();}
});
it('uses decoded generated samples without building oscillator/noise buffers and keeps the voice budget',async()=>{
 const ctx=context(),bank={load:vi.fn(async()=>({duration:1}))},battle=new BattleAudio(ctx,node(),{},bank);await battle.ready;
 expect(bank.load).toHaveBeenCalledTimes(GENERATED_SFX.length);expect(battle.play('produce')).toBe(true);expect(battle.play('not-a-track')).toBe(false);
 for(let i=0;i<100;i++){ctx.currentTime+=.1;battle.play('rifle');}expect(battle.voices.size).toBe(24);battle.stop();expect(battle.voices.size).toBe(0);
});
