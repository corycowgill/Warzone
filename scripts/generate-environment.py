"""Original Warzone scenery GLBs. Run with Blender --background --python."""
import sys,random,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import roster_common as c
from roster_common import *
rng=random.Random(6819)
bark=a.material('Bark',(95,77,53),0,.96)
leaves=a.material('Foliage shadow',(70,88,49),0,.96)
leaflight=a.material('Foliage sun',(114,126,65),0,.91)
leafmid=a.material('Foliage middle',(88,107,55),0,.94)
stone=a.material('Limestone',(119,123,111),0,.97)
stoneLight=a.material('Stone ledges',(159,155,133),0,.95)
grass=a.material('Meadow blades',(116,130,66),0,.97)
dry=a.material('Dry grass',(168,149,92),0,.97)
for m in [bark,leaves,leaflight,leafmid,stone,stoneLight,grass,dry]:c.MATERIALS.append(m)

def rock(loc,size,seed=1,mat=stone):
    r=random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc)
    o=bpy.context.object
    for v in o.data.vertices:
        v.co*=r.uniform(.82,1.13)
        v.co.z=max(v.co.z,-.55)
    o.scale=size
    return a.finish(o,'Sculpted weathered stone',mat)

def tree(kind):
    pine=kind in ['pine','fir'];palm=kind=='palm'
    height=5.8 if pine else 4.5
    beam('Tapered trunk',(0,0,0),(.12,.04,height*.88),.20 if not palm else .14,bark,9)
    for i in range(5):
        angle=i*math.tau/5
        beam('Root flare',(math.cos(angle)*.48,math.sin(angle)*.48,.05),(0,0,.65),.08,bark,7)
    if pine:
        for level in range(5):
            z=1.4+level*.78;radius=1.6-level*.24
            for j in range(6):
                angle=j*math.tau/6+level*.6
                tip=(math.cos(angle)*radius,math.sin(angle)*radius,z-.15)
                beam('Pine bough',(0,0,z+.2),tip,.055,bark,6)
                rock((tip[0]*.65,tip[1]*.65,z+.22),(radius*.65,radius*.54,.62),j+level*13,[leaves,leafmid,leaflight][level%3])
        rock((0,0,5.3),(.45,.45,.9),42,leaflight)
    elif palm:
        for j in range(9):
            angle=j*math.tau/9
            p0=(.12,0,3.9);p1=(math.cos(angle)*1.1,math.sin(angle)*1.1,4.45);p2=(math.cos(angle)*2.1,math.sin(angle)*2.1,3.5)
            beam('Palm leaf stem',p0,p2,.025,bark)
            side=Vector((-math.sin(angle)*.32,math.cos(angle)*.32,0))
            mesh('Broad palm frond',[p0,tuple(Vector(p1)+side),p2,tuple(Vector(p1)-side)],[(0,1,2),(0,2,3)],leafmid)
    else:
        for j in range(9):
            angle=j*2.4;rr=.9 if kind=='oak' else .65
            center=(math.cos(angle)*rr,math.sin(angle)*rr,2.8+(j%3)*.55)
            beam('Branch',(0,0,1.5),center,.07,bark,7)
            rock(center,(1.05 if kind=='oak' else .8,.95,.85),j*7,[leaves,leafmid,leaflight][j%3])
        rock((0,0,4.2),(.95,.85,.70),123,leaflight)

def cluster(kind):
    if kind=='cliff':
        for i in range(5):
            rock(((i-2)*.68,rng.uniform(-.25,.25),1.2+(i%2)*.36),(.85,.85,1.7+(i%2)*.4),i)
            box('Sedimentary ledge',((i-2)*.68,-.44,.8),(.85,.7,.17),stoneLight,.06)
    elif kind=='mountain':
        for i in range(5):rock(((i-2)*1.8,rng.uniform(-1,1),1.5),(2.6,2.5,3.3+(i%3)),i+5)
    else:
        for i in range(4):rock((rng.uniform(-.8,.8),rng.uniform(-.6,.6),.32),(.6,.55,.65),i+9,stoneLight if i==2 else stone)

def blades(reed=False):
    for i in range(22 if reed else 28):
        x,y=rng.uniform(-.6,.6),rng.uniform(-.6,.6);h=rng.uniform(.6,1.7) if reed else rng.uniform(.15,.65)
        angle=rng.random()*math.tau;w=.035 if reed else .06
        mesh('Reed blade' if reed else 'Grass blade',[(x-w,y,0),(x+w,y,0),(x+math.cos(angle)*.25,y+math.sin(angle)*.25,h)],[(0,1,2)],[grass,dry][i%4==0])
        if reed and i%3==0:cyl('Seed head',(x,y,h),.045,.28,dry,n=6)

def bush():
    for i in range(5):rock((rng.uniform(-.5,.5),rng.uniform(-.5,.5),.4),(.6,.55,.5),i,[leafmid,leaflight][i%2])

def stump():
    cyl('Broken stump',(0,0,.35),.32,.7,bark,n=9)
    cyl('Cut growth rings',(0,0,.71),.27,.025,wood,n=12)
    for i in range(5):beam('Stump root',(0,0,.3),(math.cos(i)*.7,math.sin(i)*.7,0),.10,bark,7)

def log():
    cyl('Fallen timber',(0,0,.28),.28,2.8,bark,axis='X',n=10)
    for x in [-1.41,1.41]:cyl('Exposed end grain',(x,0,.28),.25,.025,wood,axis='X',n=12)
    beam('Broken branch',(.4,0,.3),(.5,.6,.6),.07,bark)

def prop(kind):
    if kind in ['rocks','rocks-large']:return cluster('cliff' if kind=='rocks-large' else 'boulder')
    if kind=='wood-structure':return log()
    if kind=='wireless':
        box('Field radio case',(0,0,.35),(.9,.65,.7),armor,.07)
        for x in [-.25,0,.25]:box('Radio dial',(x,-.335,.40),(.11,.04,.11),steel,.02)
        beam('Whip aerial',(.3,0,.7),(.3,0,2),.018,steel)
    elif kind in ['barrel-machine','rocket-fuel']:
        for i in range(3):barrel(((i-1)*.55,0,0),.23,.8 if kind=='rocket-fuel' else .65)
        box('Pallet',(0,0,.05),(1.8,.8,.10),wood,.015)
    elif kind=='generator':
        box('Engine housing',(0,0,.52),(1.4,.8,.8),armor,.10)
        for i in range(7):box('Cooling fins',(-.5+i*.15,-.43,.55),(.045,.06,.55),steel)
        cyl('Exhaust',(.35,.20,1.13),.055,.55,steel,n=10)
        box('Skid',(0,0,.10),(1.7,1.0,.20),steel,.03)
    elif kind=='hangar-round':
        for i in range(5):box('Supply crate',((i%3-1)*.75,(i//3)*.8,.35),(.7,.7,.7),wood,.04)
    else:
        from roster_buildings import defense
        defense('aaturret' if kind=='weapon-turret' else 'turret')

builders={**{f'tree-{k}':lambda k=k:tree(k) for k in ['oak','birch','pine','fir','broadleaf','palm']},
'boulder':lambda:cluster('boulder'),'cliff':lambda:cluster('cliff'),'mountain':lambda:cluster('mountain'),
'resource-outcrop':lambda:cluster('boulder'),'supply-cache':lambda:crate((0,0,.6),1.2),'grass':blades,'reeds':lambda:blades(True),'bush':bush,'stump':stump,'fallen-log':log,
**{f'prop-{k}':lambda k=k:prop(k) for k in ['generator','wireless','barrel-machine','rocket-fuel','hangar-round','wood-structure','rocks-large','rocks','weapon-cannon','weapon-turret']}}
report=[]
for key,build in builders.items():
    reset();build();report.append(export(key,'environment',12000));print('ENVIRONMENT_ASSET',key,flush=True)
(ROOT/'assets/models/environment/warzone-original/manifest.json').write_text(json.dumps(report,indent=2))
