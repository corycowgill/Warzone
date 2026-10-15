// Bounded resolution control; never changes simulation state or saved preferences.
export class RenderQuality {
  constructor(sceneManager, onResize = () => {}) {
    this.sceneManager=sceneManager;this.onResize=onResize;this.scale=1;this.resetSampling();
  }
  resetSampling(){this.elapsed=0;this.samples=0;this.total=0;this.stable=0;this.warmup=4;}
  configure(graphics, deviceRatio=1){this.graphics=graphics;this.deviceRatio=deviceRatio;this.scale=1;this.resetSampling();this.apply();}
  apply(){
    const cap=this.graphics?.quality==='ultra'?1.5:1.25;
    const ratio=Math.min(2,Math.max(.5,Math.min(this.deviceRatio,cap)*(this.graphics?.resolution??1)*this.scale));
    const renderer=this.sceneManager.renderer;
    if(Math.abs(renderer.getPixelRatio()-ratio)>.005){renderer.setPixelRatio(ratio);this.onResize();}
    this.pixelRatio=ratio;
  }
  sample(seconds){
    if(!this.graphics?.adaptiveResolution||seconds<=0||seconds>.25)return;
    if(this.warmup>0){this.warmup-=seconds;return;}
    this.elapsed+=seconds;this.total+=seconds;this.samples++;
    if(this.elapsed<2)return;
    const average=this.total/this.samples;
    if(average>.022&&this.scale>.6){this.scale=Math.max(.6,Math.round((this.scale-.1)*100)/100);this.stable=0;this.apply();}
    else if(average<.0182){this.stable+=this.elapsed;if(this.stable>=10&&this.scale<1){this.scale=Math.min(1,Math.round((this.scale+.05)*100)/100);this.stable=0;this.apply();}}
    else this.stable=0;
    this.elapsed=0;this.total=0;this.samples=0;
  }
}
