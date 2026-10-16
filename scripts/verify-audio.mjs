import assert from 'node:assert/strict';
import {BattleAudio,SOUND_PROFILES,synthesizeBattleSound,weaponFamily} from '../js/audio/BattleAudio.js';
import {SoundManager} from '../js/systems/SoundManager.js';
const param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
const nodes=[];
const node=()=>{const n={gain:param(),pan:param(),playbackRate:param(),connections:[],connect(to){this.connections.push(to);},disconnect(){this.connections=[];},start(){},stop(){this.onended?.();}};nodes.push(n);return n;};
let allocations=0;
const ctx={currentTime:0,sampleRate:22050,createGain:node,createStereoPanner:node,createBufferSource:node,
 createBuffer(channels,length){allocations++;const data=new Float32Array(length);return {getChannelData:()=>data};}};
for(const family of Object.keys(SOUND_PROFILES)){
 const a=synthesizeBattleSound(family,22050,0),b=synthesizeBattleSound(family,22050,1);
 assert.ok(a.every(Number.isFinite));assert.ok(a.every(n=>Math.abs(n)<.8));
 assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.005);
 assert.ok(a.some(n=>Math.abs(n)>.04));assert.notDeepEqual(a,b);
 assert.deepEqual(a,synthesizeBattleSound(family,22050,0));
}
assert.equal(weaponFamily('heavytank'),'heavy');assert.equal(weaponFamily('spg'),'artillery');
assert.equal(weaponFamily('aahalftrack'),'auto');assert.equal(weaponFamily('submarine'),'torpedo');
const game={state:'PLAYING',cameraController:{target:{x:0,z:0}},sceneManager:{camera:{matrixWorld:{elements:[1,0,0]}}}};
const destination=node(),battle=new BattleAudio(ctx,destination,game),built=allocations;
assert.equal(battle.play('cannon',{x:30,z:0}),true);
assert.ok(nodes.at(-1).pan.value>0,'camera-relative right pan');
assert.equal(battle.play('cannon'),false,'same-family burst throttle');
for(let i=0;i<50;i++){ctx.currentTime+=.06;battle.play('rifle');}
assert.equal(battle.voices.size,24);assert.equal(allocations,built,'shots reuse cached buffers');
battle.stop();assert.equal(battle.voices.size,0);

globalThis.document={addEventListener(){},hidden:false};
globalThis.window={speechSynthesis:{cancel(){}}};
const manager=new SoundManager(game);manager.audioContext=ctx;manager.initialized=true;
manager.masterGain=node();manager.musicGain=node();manager.sfxGain=node();manager.ambientGain=node();manager.battleAudio=battle;
let musicStops=0,musicStarts=0;
manager.stopAllMusic=()=>musicStops++;manager.startGameMusic=()=>musicStarts++;
manager.applySettings({masterVolume:.6,sfxVolume:.4,musicVolume:.2,voiceVolume:.3,ambientVolume:.1,sfxEnabled:false,musicEnabled:true,ambientEnabled:false,voiceEnabled:false});
assert.equal(manager.sfxGain.gain.value,0);assert.equal(manager.musicVolume,.2);
assert.equal(manager.ambientGain.gain.value,0);assert.equal(manager.voiceEnabled,false);
assert.equal(manager.masterGain.gain.value,.6);assert.equal(manager.voiceVolume,.3);
assert.equal(musicStops,0,'SFX mute preserves music');assert.equal(musicStarts,0,'slider changes do not restart music');
manager.applySettings({masterVolume:.6,sfxVolume:.4,musicVolume:.2,ambientVolume:.1,sfxEnabled:true,musicEnabled:false,ambientEnabled:false});
assert.equal(manager.sfxGain.gain.value,.4);assert.equal(musicStops,1);
manager.play('attack',{unitType:'tank'});assert.equal(battle.voices.size,1);
manager.onStateChange('GAME_OVER');assert.equal(battle.voices.size,0);
document.hidden=true;ctx.state='suspended';ctx.resume=()=>{throw new Error('hidden audio resumed');};
ctx.currentTime+=1;manager.play('attack',{unitType:'tank'});assert.equal(battle.voices.size,0);
document.hidden=false;ctx.state='running';
const noise=manager._makeNoiseBuffer(.08),noiseAllocations=allocations;
assert.equal(manager._makeNoiseBuffer(.08),noise);assert.equal(allocations,noiseAllocations);
console.log('PASS original sound buffers, finite envelopes, variation, caching, spatial pan, 24-voice budget, independent mixer controls and state cleanup.');
