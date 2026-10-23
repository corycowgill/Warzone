"""Trim, loop, normalize and encode locally generated audio for the browser."""
import hashlib,json,pathlib,subprocess
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1];work=ROOT/'.tmp/audio-generation';dest=ROOT/'assets/audio/generated';dest.mkdir(parents=True,exist_ok=True)
plans=json.loads((ROOT/'scripts/audio-prompts.json').read_text());manifest={}
for name,plan in plans.items():
    marker=work/(name+'.json')
    if not marker.exists():continue
    info=json.loads(marker.read_text());file=info['files'][0];source=work/info['raw'] if info.get('raw') else work/'output'/file['subfolder']/file['filename']
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ar','44100','-ac','2','pipe:1'])
    data=np.frombuffer(raw,dtype=np.float32).reshape(-1,2).copy();data-=data.mean(axis=0)
    if not np.isfinite(data).all() or np.sqrt(np.mean(data**2))<.0003:raise ValueError('Invalid/silent generated audio: '+name)
    if plan.get('trim'):
        envelope=np.sqrt(np.mean(data[:len(data)//441*441].reshape(-1,441,2)**2,axis=(1,2)))
        active=np.flatnonzero(envelope>envelope.max()*.12)
        begin=max(0,int(active[0]*441)-441)
        data=data[begin:begin+int(plan['trim']*44100)]
        ramp=min(220,len(data)//8);data[:ramp]*=np.linspace(0,1,ramp)[:,None];data[-ramp:]*=np.linspace(1,0,ramp)[:,None]
    elif plan.get('loop'):
        overlap=int((2.5 if plan['model']=='music' else 1)*44100)
        weight=np.linspace(0,1,overlap)[:,None]
        blend=data[-overlap:]*(1-weight)+data[:overlap]*weight
        data=np.concatenate([data[overlap:-overlap],blend])
    else:
        ramp=min(4410,len(data)//8);data[:220]*=np.linspace(0,1,220)[:,None];data[-ramp:]*=np.linspace(1,0,ramp)[:,None]
    peak=float(np.max(np.abs(data)));rms=float(np.sqrt(np.mean(data**2)))
    gain=min(.85/peak,(.14 if plan['model']=='music' else .22)/rms);data=(data*gain).astype(np.float32)
    output=dest/(name+'.ogg')
    for attempt in range(4):
        subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar','44100','-ac','2','-i','pipe:0','-ac','2' if plan['model']=='music' or plan.get('loop') else '1','-c:a','libvorbis','-q:a','5','-metadata','artist=Hallucinated Games','-metadata','title=Warzone '+name,str(output)],input=data.tobytes(),check=True)
        decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(output),'-f','f32le','pipe:1']),dtype=np.float32)
        encoded_peak=float(np.max(np.abs(decoded)))
        if encoded_peak<=.94:break
        data*=.9/encoded_peak
    else:raise ValueError('Codec peak failed validation: '+name)
    manifest[name]={'file':name+'.ogg','model':'stable-audio-3-small-'+plan['model'],'seed':plan['seed'],'prompt':plan['prompt'],'seconds':len(data)/44100,'loop':plan.get('loop',False),'sampleRate':44100,'peak':float(np.max(np.abs(data))),'decodedPeak':encoded_peak,'rms':float(np.sqrt(np.mean(data**2))),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
    print(name,round(manifest[name]['seconds'],2),'seconds',output.stat().st_size,'bytes',flush=True)
(dest/'manifest.json').write_text(json.dumps({'generator':'Local ComfyUI Stable Audio 3, lcm/simple, 8 steps, cfg 1','textEncoder':'t5gemma_b_b_ul2','assets':manifest},indent=2)+'\n')
