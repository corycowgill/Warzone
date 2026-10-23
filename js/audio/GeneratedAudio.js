export const GENERATED_SFX=['rifle','auto','cannon','heavy','artillery','naval','torpedo','aircraft','electric','explosion','impact','ui','casualty','produce','build','ability','error','victory','defeat'];
const names=new Set([...GENERATED_SFX,'menu','game','combat','wind','water','distant']);
export class GeneratedAudio {
  constructor(context){this.context=context;this.buffers=new Map();this.pending=new Map();this.failed=new Set();}
  load(name){
    if(!names.has(name)||this.failed.has(name))return Promise.resolve(null);
    if(this.buffers.has(name))return Promise.resolve(this.buffers.get(name));
    if(this.pending.has(name))return this.pending.get(name);
    const promise=fetch(new URL(`../../assets/audio/generated/${name}.ogg`,import.meta.url))
      .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.arrayBuffer();})
      .then(data=>this.context.decodeAudioData(data))
      .then(buffer=>{this.buffers.set(name,buffer);return buffer;})
      .catch(error=>{this.failed.add(name);console.warn(`Generated audio unavailable: ${name}`,error);return null;})
      .finally(()=>this.pending.delete(name));
    this.pending.set(name,promise);return promise;
  }
  loop(name,destination,volume=1){
    const context=this.context,gain=context.createGain();gain.gain.value=volume;gain.connect(destination);
    const obj={nodes:[],gain,cancelled:false,cleanup:()=>this.buffers.delete(name)};
    obj.stop=()=>{
      if(obj.cancelled)return;obj.cancelled=true;
      gain.gain.setTargetAtTime?.(0,context.currentTime,.025);
      setTimeout(()=>{for(const source of obj.nodes){try{source.stop();}catch{}source.disconnect();}gain.disconnect();obj.cleanup();},120);
    };
    this.load(name).then(buffer=>{
      if(obj.cancelled){obj.cleanup();return;}
      if(!buffer){gain.disconnect();return;}
      const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
      const level=gain.gain.value;gain.gain.value=0;gain.gain.setTargetAtTime?.(level,context.currentTime,.1);
      source.connect(gain);obj.nodes.push(source);source.start();
    });return obj;
  }
}
