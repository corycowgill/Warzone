import {GENERATED_SFX} from './GeneratedAudio.js';
// Generated recordings are the game default; synthesis is retained for legacy callers and diagnostics.
export const SOUND_PROFILES = {
  rifle: [.18, 150, .025, 2600], auto: [.24, 115, .035, 1700],
  cannon: [.65, 82, .18, 850], heavy: [.85, 64, .25, 650],
  artillery: [1.05, 52, .38, 500], naval: [1.2, 43, .45, 420],
  torpedo: [.65, 180, .22, 900], aircraft: [.32, 125, .06, 2100],
  electric: [.22, 700, .045, 3200], explosion: [1.35, 58, .48, 700],
  impact: [.27, 270, .045, 2400],
  ui: [.065, 680, .012, 1700],
  casualty: [.32, 95, .075, 650],
};
export function weaponFamily(type) {
  if (['tank','turret'].includes(type)) return 'cannon';
  if (['heavytank','commander'].includes(type)) return 'heavy';
  if (['mortar','spg','bomber'].includes(type)) return 'artillery';
  if (type === 'battleship') return 'naval';
  if (type === 'submarine') return 'torpedo';
  if (type === 'plane') return 'aircraft';
  if (type === 'drone') return 'electric';
  if (['scoutcar','apc','aahalftrack','aaturret','patrolboat','carrier'].includes(type)) return 'auto';
  return 'rifle';
}
export function synthesizeBattleSound(family, sampleRate = 44100, variant = 0) {
  const [duration, frequency, bodyDecay, cutoff] = SOUND_PROFILES[family] || SOUND_PROFILES.rifle;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 5197 + variant * 7919, low = 0, phase = 0, previous = 0, dc = 0;
  const coefficient = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = (seed >>> 0) / 2147483648 - 1;
    low += coefficient * (noise - low);
    const t = i / sampleRate, attack = Math.min(1, t / .0015);
    const rate = 1 + (variant - 1) * .035;
    phase += 2 * Math.PI * frequency * rate * (.42 + .58 * Math.exp(-t * 18)) / sampleRate;
    let value = low * Math.exp(-t / (duration * .21)) * .65
      + (noise - low) * Math.exp(-t / .013) * .28
      + Math.sin(phase) * Math.exp(-t / bodyDecay) * .48;
    if (family === 'auto' || family === 'aircraft') value *= .35 + .65 * Math.pow(Math.cos(t * Math.PI * 28), 8);
    if (family === 'torpedo') value = low * Math.sin(Math.PI * t / duration) * .38 + Math.sin(phase) * Math.exp(-t * 7) * .13;
    // Short attack and tail ramps prevent clicks; remove DC from low-frequency layers.
    value *= attack * Math.min(1, (duration - t) / .035);
    dc = value - previous + .995 * dc; previous = value;
    samples[i] = Math.tanh(dc * 1.4) * .78;
  }
  return samples;
}

export class BattleAudio {
  constructor(context, destination, game, bank=null) {
    this.context=context;this.destination=destination;this.game=game;
    this.buffers=new Map();this.voices=new Set();this.last=new Map();
    this.bank=bank;
    if(bank){
      this.ready=Promise.all(GENERATED_SFX.map(async family=>{
        const buffer=await bank.load(family);
        if(buffer)this.buffers.set(family,[buffer]);
      }));return;
    }
    for (const family of Object.keys(SOUND_PROFILES)) {
      this.buffers.set(family, [0,1,2].map(variant=>{
        const data=synthesizeBattleSound(family,context.sampleRate,variant);
        const buffer=context.createBuffer(1,data.length,context.sampleRate);
        buffer.getChannelData(0).set(data);return buffer;
      }));
    }
  }
  play(family, position) {
    const ctx=this.context, now=ctx.currentTime;
    const buffers=this.buffers.get(family)||(!this.bank?this.buffers.get('rifle'):null);
    if(!buffers?.length)return false;
    if (this.voices.size>=24 || now-(this.last.get(family)??-Infinity)<.055) return false;
    this.last.set(family,now);
    const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
    source.buffer=buffers[Math.floor(Math.random()*buffers.length)];
    source.playbackRate.value=.96+Math.random()*.08;
    const target=this.game?.cameraController?.target, camera=this.game?.sceneManager?.camera;
    let attenuation=1,panning=0;
    if(position&&target){
      const dx=position.x-target.x,dz=position.z-target.z,distance=Math.hypot(dx,dz);
      attenuation=1/(1+(distance/65)**2);
      const right=camera?.matrixWorld?.elements;
      panning=Math.max(-.85,Math.min(.85,(dx*(right?.[0]??1)+dz*(right?.[2]??0))/65));
    }
    gain.gain.value=(family==='ui' ? .18 : family==='rifle'||family==='auto' ? .33 : .52)*attenuation;
    pan.pan.value=panning;
    source.connect(gain);gain.connect(pan);pan.connect(this.destination);
    this.voices.add(source);
    let ended=false;
    source.onended=()=>{if(ended)return;ended=true;source.disconnect();gain.disconnect();pan.disconnect();this.voices.delete(source);};
    source.start();return true;
  }
  stop(){for(const source of [...this.voices]){source.stop();source.onended?.();}this.voices.clear();}
}
