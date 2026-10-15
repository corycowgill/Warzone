// Rolling wall-frame and CPU stage telemetry. Render submission is not GPU time.
export class FrameMetrics {
  constructor(limit=240){this.limit=limit;this.samples=[];this.last=0;this.mark=0;}
  begin(now){this.current={frameMs:this.last?now-this.last:0,simulationMs:0,visualMs:0,renderMs:0};this.last=now;this.mark=now;}
  stage(name,now){this.current[name]=now-this.mark;this.mark=now;}
  end(renderer){const s=this.current;if(!s||s.frameMs<=0||s.frameMs>250)return;s.draws=renderer.info.render.calls;s.triangles=renderer.info.render.triangles;this.samples.push(s);if(this.samples.length>this.limit)this.samples.shift();}
  summary(){
    const items=this.samples;if(!items.length)return null;
    const mean=key=>items.reduce((n,s)=>n+s[key],0)/items.length;
    const sorted=items.map(s=>s.frameMs).sort((a,b)=>a-b);
    return {frames:items.length,fps:1000/mean('frameMs'),frameMs:mean('frameMs'),p95Ms:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],simulationMs:mean('simulationMs'),visualMs:mean('visualMs'),renderMs:mean('renderMs'),draws:Math.round(mean('draws')),triangles:Math.round(mean('triangles'))};
  }
}
