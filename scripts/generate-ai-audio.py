"""Generate original Warzone audio through an existing local ComfyUI installation."""
import argparse, json, pathlib, time, urllib.request, urllib.parse

ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8191');parser.add_argument('--only');args=parser.parse_args()
args.url=args.url.rstrip('/')
if urllib.parse.urlparse(args.url).hostname not in ('127.0.0.1','localhost','::1'):parser.error('Use a local ComfyUI server URL.')
work=ROOT/'.tmp/audio-generation';work.mkdir(parents=True,exist_ok=True)
plans=json.loads((ROOT/'scripts/audio-prompts.json').read_text(encoding='utf-8'))
def request(path,data=None):
    raw=None if data is None else json.dumps(data).encode()
    req=urllib.request.Request(args.url+path,data=raw,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
def graph(name,p):
    return {
      '1':{'class_type':'CheckpointLoaderSimple','inputs':{'ckpt_name':f"stable_audio_3_small_{p['model']}.safetensors"}},
      '2':{'class_type':'CLIPLoader','inputs':{'clip_name':'t5gemma_b_b_ul2.safetensors','type':'stable_audio','device':'default'}},
      '3':{'class_type':'CLIPTextEncode','inputs':{'text':p['prompt'],'clip':['2',0]}},
      '4':{'class_type':'CLIPTextEncode','inputs':{'text':'','clip':['2',0]}},
      '5':{'class_type':'ConditioningStableAudio','inputs':{'positive':['3',0],'negative':['4',0],'seconds_start':0,'seconds_total':p['seconds']}},
      '6':{'class_type':'EmptyLatentAudio','inputs':{'seconds':p['seconds'],'batch_size':1}},
      '7':{'class_type':'KSampler','inputs':{'model':['1',0],'seed':p['seed'],'steps':8,'cfg':1,'sampler_name':'lcm','scheduler':'simple','denoise':1,'positive':['5',0],'negative':['5',1],'latent_image':['6',0]}},
      '8':{'class_type':'VAEDecodeAudio','inputs':{'samples':['7',0],'vae':['1',2]}},
      '9':{'class_type':'SaveAudio','inputs':{'audio':['8',0],'filename_prefix':'warzone/'+name}}
    }
for name,p in plans.items():
    if args.only and name not in args.only.split(','):continue
    marker=work/(name+'.json')
    if marker.exists() and json.loads(marker.read_text(encoding='utf-8')).get('plan')==p:print('Already generated',name,flush=True);continue
    workflow=graph(name,p);submitted=request('/prompt',{'prompt':workflow,'client_id':'warzone-local-audio'})
    prompt_id=submitted['prompt_id'];print('Generating',name,prompt_id,flush=True);deadline=time.time()+1800
    while time.time()<deadline:
        history=request('/history/'+prompt_id).get(prompt_id)
        if history:
            if history.get('status',{}).get('status_str')=='error':raise RuntimeError(json.dumps(history['status']))
            files=history.get('outputs',{}).get('9',{}).get('audio',[])
            if files:
                raw=work/'raw'/(name+'.flac');raw.parent.mkdir(parents=True,exist_ok=True)
                with urllib.request.urlopen(args.url+'/view?'+urllib.parse.urlencode(files[0]),timeout=60) as response:raw.write_bytes(response.read())
                marker.write_text(json.dumps({'name':name,'plan':p,'workflow':workflow,'prompt_id':prompt_id,'files':files,'raw':'raw/'+name+'.flac'},indent=2))
                print('Saved',name,files,flush=True);break
        time.sleep(1)
    else:raise TimeoutError(name)
