"""Original military architecture with legible role-specific silhouettes."""
from roster_common import *


def foundation(width=5,depth=4):
    box('Cast concrete foundation',(0,0,.16),(width,depth,.32),concrete,.055)
    # Expansion joints prevent the base reading as an undetailed slab.
    for xx in [-width*.25,width*.25]:box('Foundation expansion joint',(xx,0,.325),(.018,depth*.94,.006),steel)


def gable(x,y,z,width,depth,height=.65):
    rings=[]
    for yy in [y-depth/2,y+depth/2]:
        rings.append([(x-width/2,yy,z),(x,yy,z+height),(x+width/2,yy,z)])
    loft('Standing-seam pitched roof',rings,roof,.018)
    for i in range(max(4,int(depth/.45))):
        yy=y-depth/2+i*.45
        for side in [-1,1]:beam('Roof standing seam',(x,yy,z+height+.018),(x+side*width/2,yy,z+.018),.016,edge,6)
    beam('Roof ridge cap',(x,y-depth/2-.02,z+height+.04),(x,y+depth/2+.02,z+height+.04),.045,steel)


def window(x,y,z,width=.56,height=.53):
    box('Window surround',(x,y,z),(width+.10,.07,height+.10),edge,.012)
    box('Recessed window glass',(x,y-.041,z),(width,.014,height),glass)
    box('Window mullion',(x,y-.052,z),(.028,.018,height),steel)
    box('Window transom',(x,y-.053,z),(width,.018,.025),steel)
    box('Concrete window sill',(x,y-.08,z-height/2-.05),(width+.16,.18,.055),concrete,.012)


def room(x,y,width,depth,height=2.1,wall=concrete,pitched=True):
    box('Masonry walls',(x,y,.32+height/2),(width,depth,height),wall,.04)
    # Corner piers give structure and scale cues.
    for xx in [x-width/2+.07,x+width/2-.07]:
        for yy in [y-depth/2-.025,y+depth/2+.025]:box('Corner pier',(xx,yy,.32+height/2),(.15,.10,height),concrete,.015)
    if pitched:gable(x,y,height+.34,width+.26,depth+.28,.62)
    else:
        box('Flat roof coping',(x,y,height+.36),(width+.18,depth+.18,.13),roof,.025)
        box('Roof ventilator',(x+.20,y+.15,height+.53),(.55,.46,.24),steel,.035)
    return height+.34


def door(x,y,z=.96,width=.72,height=1.3):
    box('Door frame',(x,y,z),(width+.12,.12,height+.12),edge,.02)
    box('Inset steel door',(x,y-.068,z),(width,.035,height),armor,.018)
    box('Door handle',(x+width*.3,y-.10,z),(.035,.035,.14),mark,.008)
    box('Entrance step',(x,y-.24,.38),(width+.36,.40,.12),concrete,.025)


def garage_door(x,y,width=2.0,height=1.7):
    box('Garage door frame',(x,y,.34+height/2),(width+.22,.17,height+.18),concrete,.02)
    box('Garage opening recess',(x,y-.09,.33+height/2),(width,.025,height),track)
    for i in range(10):
        box('Roll-up door slat',(x,y-.12,.37+i*height/10),(width-.12,.045,height/11),steel,.007)
    box('Garage lintel lamp',(x,y-.16,height+.51),(.38,.12,.07),mark,.015)


def vents(x,y,z,width=.65):
    box('Vent frame',(x,y,z),(width,.08,.45),steel,.02)
    for i in range(5):box('Vent louver',(x,y-.045,z-.16+i*.08),(width-.08,.035,.02),edge)


def antenna(x,y,z,height=2.0):
    for side in [-1,1]:beam('Lattice mast leg',(x+side*.20,y,z),(x+side*.07,y,z+height),.034,steel)
    for i in range(5):
        zz=z+i*height/5
        beam('Mast cross brace',(x-.17,y,zz),(x+.17,y,zz+height/5),.018,edge)
    beam('Antenna crossbar',(x-.66,y,z+height-.2),(x+.66,y,z+height-.2),.025,steel)


def headquarters():
    foundation(7.4,6.3)
    room(-.75,.35,4.2,3.7,3.1,concrete,False)
    room(2.0,.22,1.7,3.9,2.2,brick,True)
    for xx in [-2.12,-.77,.60]:
        for zz in [1.28,2.56]:window(xx,-1.54,zz,.62,.64)
    door(-.8,-1.57,.99,.94,1.36)
    plaque((-.8,-1.665,2.02),1.2,.22)
    box('Entrance canopy',(-.8,-1.98,1.93),(1.65,.93,.13),roof,.025)
    for xx in [-1.50,-.10]:beam('Canopy support',(xx,-2.28,.38),(xx,-2.28,1.88),.045,steel)
    antenna(-1.85,.75,3.55,1.95)
    box('Roof communications cabinet',(.30,.75,3.62),(.83,.63,.47),armor,.04)
    for i in range(3):crate((2.18-i*.7,-2.3,.66),.62)
    sandbag_wall(2.3,y=2.57,z=.49,rows=2)
    cyl('Flagpole',(2.80,2.25,2.45),.04,4.2,steel,n=10)
    box('Command flag',(3.18,2.25,4.22),(.75,.025,.42),team)


def barracks():
    foundation(5.6,4.8)
    room(-.38,.34,3.7,2.9,1.8,concrete,True)
    door(-.4,-1.15,.97)
    for xx in [-1.47,.69]:window(xx,-1.15,1.4,.57,.47)
    plaque((-.4,-1.229,1.86),.83,.17)
    for xx in [-1.4,-.3,.8]:
        box('Field bed kit',(xx,1.95,.55),(.72,.50,.40),canvas,.065)
    crate((2.18,-.33,.63),.59)
    barrel((2.2,.6,.33))
    box('Notice board',(1.2,-1.31,1.12),(.48,.08,.51),wood,.018)
    box('Notice paper',(1.2,-1.36,1.12),(.36,.012,.35),mark)


def factory(abandoned=False):
    foundation(6.5,5.5)
    room(-.55,.10,4.6,3.7,2.2,brick,False)
    for xx in [-1.72,.55]:garage_door(xx,-1.80,1.60,1.75)
    for xx in [-1.76,-.16,1.22]:
        gable(xx,.10,2.57,1.55,3.95,.53)
        window(xx,-1.91,2.56,.60,.25)
    box('Service annex',(2.42,.3,1.20),(1.10,3.7,1.76),concrete,.04)
    for z in [1.1,1.8]:vents(2.42,-1.60,z,.72)
    cyl('Brick chimney',(-2.45,1.65,2.40),.29,4.15,brick,n=16)
    cyl('Chimney cap',(-2.45,1.65,4.53),.34,.15,steel,n=16)
    for i in range(4):crate((-2.4+i*.66,-2.28,.60),.49)
    plaque((.65,-1.95,2.08),.95,.18)
    if abandoned:
        for xx in [-1.6,.5]:
            o=box('Boarded door brace',(xx,-1.95,1.15),(1.28,.06,.12),wood)
            o.rotation_euler.y=.5


def hangar(x=0,y=0,width=4.4,depth=4.2):
    # Hollow curved roof shell and visible arch ribs.
    verts=[];n=20
    for yy,r in [(y-depth/2,width/2),(y+depth/2,width/2),(y+depth/2,width/2-.09),(y-depth/2,width/2-.09)]:
        verts.extend((x+math.cos(i*math.pi/n)*r,yy,.65+math.sin(i*math.pi/n)*r) for i in range(n+1))
    faces=[]
    for k in range(4):
        for i in range(n):faces.append((k*(n+1)+i,k*(n+1)+i+1,((k+1)%4)*(n+1)+i+1,((k+1)%4)*(n+1)+i))
    mesh('Corrugated arched hangar',verts,faces,roof)
    for j in range(8):
        yy=y-depth/2+j*depth/7
        for i in range(16):
            a1=i*math.pi/16;a2=(i+1)*math.pi/16
            beam('Hangar arch rib',(x+math.cos(a1)*width/2,yy,.65+math.sin(a1)*width/2),(x+math.cos(a2)*width/2,yy,.65+math.sin(a2)*width/2),.023,edge,6)
    # Sliding door leaves frame an open central bay.
    for side in [-1,1]:
        box('Hangar sliding door',(x+side*width*.29,y-depth/2-.02,1.15),(width*.37,.09,1.65),armor,.018)
        for i in range(5):box('Sliding door rib',(x+side*width*.29,y-depth/2-.085,.48+i*.32),(width*.35,.025,.018),edge)
    box('Hangar rear wall',(x,y+depth/2-.02,1.20),(width-.10,.08,1.24),armor,.025)
    plaque((x,y-depth/2-.09,2.22),.9,.22)


def airfield():
    foundation(7.2,6.0)
    hangar(-1.15,1.05,3.7,3.0)
    box('Apron',(0,-1.73,.35),(6.7,2.05,.04),steel,.015)
    for xx in [-2.6,-1.7,-.8,.1,1.,1.9,2.8]:box('Apron guide stripe',(xx,-1.7,.377),(.45,.045,.009),mark)
    box('Air traffic cabin',(2.35,1.4,1.45),(1.5,1.5,2.2),concrete,.04)
    box('Control glazing',(2.35,.63,2.19),(1.25,.025,.47),glass)
    box('Control roof',(2.35,1.4,2.63),(1.75,1.75,.16),roof,.02)
    antenna(2.36,1.4,2.76,.8)
    for x in [1.7,2.3,2.9]:barrel((x,-.25,.34),.20,.55)


def depot(kind):
    exchange=kind=='supplyexchange'; resource=kind=='resourcedepot'; munition=kind=='munitionscache'
    foundation(5.0 if exchange else 4.3,4.1)
    if munition:
        room(0,.40,3.0,2.3,1.5,concrete,False)
        door(0,-.78,.98,.78,1.25)
        for side in [-1,1]:
            sandbag_wall(2.9,y=side*1.66,z=.49,rows=2)
        for xx in [-.85,.0,.85]:crate((xx,-1.35,.59),.48)
        plaque((0,-.867,1.66),.80,.18)
        for xx in [-.30,.0,.30]:box('Ammunition warning stripe',(xx,-.887,1.66),(.08,.012,.11),mark)
    else:
        room(-.40,.35,2.6 if resource else 3.1,2.5,1.75,brick if exchange else concrete,True)
        garage_door(-.40,-.96,1.45,1.37)
        plaque((-.40,-1.061,1.95),.84,.17)
        for i in range(4 if exchange else 3):crate((1.40,-1.3+i*.69,.60),.54)
        barrel((-1.55,-1.46,.33))
        if exchange:
            box('Trade office',(1.65,.60,1.1),(1.08,1.65,1.5),concrete,.03)
            window(1.65,-.27,1.25,.55,.55)
            cyl('Loading crane mast',(1.9,1.60,1.70),.065,2.75,steel,n=12)
            beam('Loading boom',(1.9,1.60,2.95),(.25,1.60,2.95),.055,edge)
            beam('Crane cable',(.30,1.60,2.95),(.30,1.60,1.45),.013,steel,6)


def techlab():
    foundation(5.7,4.8)
    room(-.25,.1,4.25,3.0,2.0,concrete,False)
    for xx in [-1.55,-.28,1.0]:window(xx,-1.44,1.40,.73,.70)
    door(1.78,-.78,1.03,.67,1.4)
    antenna(-1.4,.50,2.43,1.8)
    box('Radar pedestal',(.90,.44,2.57),(.46,.46,.40),steel,.025)
    dish=sphere('Radar reflector',(.9,.44,3.00),(.67,.16,.67),edge,20,10)
    dish.rotation_euler.x=-.35
    beam('Radar feed arm',(.9,-.18,2.7),(.9,-.18,3.30),.025,steel)
    for xx in [-1.1,-.1,.9]:box('Instrument cabinet',(xx,1.95,.85),(.60,.55,1.0),armor,.025)
    plaque((-.3,-1.56,2.03),1.0,.20)


def superweapon():
    foundation(6.7,5.6)
    room(-2.12,.3,1.75,3.6,1.6,concrete,False)
    door(-2.12,-1.55,1.0,.72,1.25)
    plaque((-2.12,-1.64,1.76),.80,.17)
    # Raised launch gantry, missile body and stabilizer fins.
    box('Launch pad',(.8,.3,.49),(3.4,4.45,.30),steel,.035)
    cyl('Launch rocket',(.8,.45,2.59),.36,3.5,armor,n=24,radius2=.30)
    cyl('Rocket ogive',(.8,.45,4.68),.30,.72,mark,n=24,radius2=.015)
    for i in range(4):
        t=i*math.pi/2
        xx=.8+math.cos(t)*.40; yy=.45+math.sin(t)*.40
        o=box('Rocket stabilizer',(xx,yy,1.05),(.65,.055,.65),steel,.025)
        o.rotation_euler.z=t
    for xx in [-.28,1.88]:
        beam('Launch gantry upright',(xx,1.38,.70),(xx,1.38,4.67),.075,edge)
    for z in [.9,1.7,2.5,3.3,4.1]:beam('Gantry brace',(-.28,1.38,z),(1.88,1.38,z+.55),.032,steel)
    railing((-.25,-1.8),(1.92,-1.8),.68)
    for i in range(3):barrel((2.65,-1.3+i*.73,.33),.23,.66)


def bunker():
    foundation(4.3,3.7)
    loft('Chamfered concrete bunker',[a.outline(1.8,-1.8,1.5,.33,.45),a.outline(1.48,-1.48,1.30,1.70,.35)],concrete,.04)
    box('Firing slit',(0,-1.402,1.14),(2.28,.035,.20),track,.025)
    box('Armored firing shutter',(0,-1.42,1.33),(2.45,.12,.08),steel,.025)
    tube('Bunker MG',(.08,-1.69,1.14),.035,.017,.60,steel,'Y',12)
    box('Bunker roof cap',(0,0,1.78),(3.22,2.80,.23),concrete,.08)
    plaque((0,-1.43,.68),.70,.16)
    sandbag_wall(3.4,y=1.55,z=.48,rows=2)
    crate((1.6,-1.45,.59),.48)


def defense(kind):
    aa=kind=='aaturret'
    cyl('Reinforced gun foundation',(0,0,.28),1.65,.52,concrete,n=24,radius2=1.53)
    cyl('Steel traverse track',(0,0,.59),.89,.14,steel,n=32)
    cyl('Gun pedestal',(0,0,.84),.36,.40,armor,n=20)
    for side in [-1,1]:
        box('Gun shield',(-.15,side*.48,1.31),(1.14,.08,.75),armor,.03)
        plaque((-.20,side*.531,1.40),.50,.15)
    if aa:
        for yy in [-.20,.20]:beam('Elevated AA barrel',(.10,yy,1.40),(1.45,yy,2.23),.056,steel,16)
        box('AA magazine',(-.45,0,1.29),(.60,.65,.25),canvas,.03)
        box('Gunner seat',(-.85,0,1.02),(.35,.42,.10),canvas,.025)
    else:
        box('Autocannon receiver',(.05,0,1.33),(.9,.28,.30),steel,.025)
        tube('Autocannon barrel',(1.10,0,1.35),.07,.042,1.40)
        crate((-.86,.91,.64),.49)
    sandbag_wall(2.7,y=-1.20,z=.49,rows=2)


def fortification(kind):
    wall=kind=='wall'
    foundation(3.8,1.6 if wall else 3.0)
    if wall:
        loft('Tapered concrete barrier',[[(-1.65,-.43,.32),(1.65,-.43,.32),(1.65,.43,.32),(-1.65,.43,.32)],[(-1.65,-.22,1.50),(1.65,-.22,1.50),(1.65,.22,1.50),(-1.65,.22,1.50)]],concrete,.03)
        for xx in [-1.58,1.58]:box('Barrier end pier',(xx,0,.93),(.18,.78,1.23),concrete,.03)
        for xx in [-1.08,-.36,.36,1.08]:
            o=box('Barrier caution stripe',(xx,-.314,1.03),(.28,.02,.47),steel)
            o.rotation_euler.y=.35
        plaque((0,-.42,.55),.68,.13)
    else:
        # Revetment trench with a visible dark floor, timber lining and sandbags.
        box('Trench floor',(0,0,.34),(3.45,1.50,.06),wood)
        for side in [-1,1]:
            for xx in [-1.5,-.9,-.3,.3,.9,1.5]:box('Timber revetment',(xx,side*.80,.61),(.55,.08,.56),wood,.01)
            sandbag_wall(3.3,y=side*1.04,z=.49,rows=2)
        crate((1.18,.10,.61),.48)
        plaque((0,-1.245,.56),.65,.13)


def watchtower():
    foundation(3.7,3.7)
    for xx in [-1.05,1.05]:
        for yy in [-1.05,1.05]:beam('Watchtower timber leg',(xx,yy,.33),(xx*.72,yy*.72,3.45),.105,wood)
    for side in [-1,1]:
        beam('Tower cross brace',(-1.02,side*1.02,.6),(.78,side*.78,3.25),.055,wood)
        beam('Tower cross brace',(.99,side*.99,.6),(-.78,side*.78,3.25),.055,wood)
    box('Observation platform',(0,0,3.39),(2.14,2.14,.16),wood,.025)
    room(0,0,1.78,1.78,1.05,wood,True)
    # Move the small cabin only, keeping its local construction detailing intact.
    cabin=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('Masonry','Corner','Standing','Roof'))]
    for o in cabin:o.location.z+=3.15
    for side in [-1,1]:window(side*.43,-.93,4.04,.48,.37)
    plaque((0,-.99,3.62),.58,.16)
    for i in range(10):beam('Ladder rung',(.98,-1.12,.5+i*.29),(1.36,-1.12,.5+i*.29),.025,steel)
    for xx in [.96,1.38]:beam('Ladder stringer',(xx,-1.12,.35),(xx,-1.12,3.4),.032,steel)


def dock(port=False):
    foundation(6.5,5.8)
    room(-1.58,.65,2.35,3.15,1.65,brick,True)
    door(-1.58,-.99,.99,.68,1.26)
    plaque((-1.58,-1.09,1.85),.84,.17)
    for xx in [-.10,.48,1.06,1.64,2.22,2.8]:box('Timber wharf plank',(xx,.20,.42),(.54,4.8,.18),wood,.012)
    for xx in [.12,2.62]:
        for yy in [-1.8,1.8]:cyl('Dock mooring post',(xx,yy,.70),.10,.65,steel,n=12)
    # Cantilever cargo crane over the berth.
    for xx in [.25,2.47]:beam('Crane leg',(xx,1.80,.52),(xx,1.80,3.8),.10,steel)
    beam('Crane overhead beam',(-.15,1.80,3.83),(3.2,1.80,3.83),.11,edge)
    beam('Crane suspension',(2.60,1.80,3.82),(2.60,1.80,1.10),.022,steel)
    tube('Crane hook',(2.60,1.80,1.05),.12,.075,.06,steel,'Y',12)
    for i in range(4 if port else 2):crate((.35+(i%2)*.8,-1.5+(i//2)*.75,.79),.64)
    barrel((-2.78,-1.65,.33))


def comm_relay():
    foundation(4.3,4.1)
    room(-.45,.15,2.5,2.6,1.5,concrete,False)
    door(-.45,-1.22,.96,.68,1.22)
    plaque((-.45,-1.32,1.67),.82,.17)
    antenna(.95,.9,.38,4.0)
    for z in [2.4,3.2,4.1]:
        box('Radio antenna panel',(1.08,.84,z),(.36,.13,.51),edge,.025)
    for i in range(2):box('Radio equipment rack',(1.35,-.66+i*.7,.89),(.68,.60,1.1),armor,.025)


def repair_bay():
    foundation(5.2,4.8)
    for xx in [-1.85,1.85]:
        for yy in [-1.55,1.55]:beam('Repair gantry column',(xx,yy,.35),(xx,yy,2.35),.09,steel)
    gable(0,0,2.4,4.15,3.75,.60)
    box('Service pit',(0,0,.337),(1.35,2.85,.02),track)
    for yy in [-1,0,1]:box('Pit cross member',(0,yy,.36),(1.42,.06,.05),steel)
    box('Tool cabinet',(-1.55,.89,.85),(.64,.60,1.04),armor,.035)
    for z in [.5,.75,1.,1.25]:box('Cabinet drawer',(-1.55,.577,z),(.52,.025,.10),edge,.008)
    beam('Hoist crossbar',(-1.83,0,2.34),(1.83,0,2.34),.06,edge)
    beam('Chain hoist',(0,0,2.33),(0,0,1.1),.025,steel)
    for x in [.95,1.55]:barrel((x,.95,.33),.21,.65)
    plaque((0,-1.95,2.43),1.0,.22)


BUILDING_BUILDERS={
    'headquarters':headquarters,'barracks':barracks,'warfactory':factory,'airfield':airfield,
    'shipyard':dock,'shippingport':lambda:dock(True),'resourcedepot':lambda:depot('resourcedepot'),
    'supplydepot':lambda:depot('supplydepot'),'supplyexchange':lambda:depot('supplyexchange'),
    'munitionscache':lambda:depot('munitionscache'),'techlab':techlab,'superweapon':superweapon,
    'bunker':bunker,'turret':lambda:defense('turret'),'aaturret':lambda:defense('aaturret'),
    'wall':lambda:fortification('wall'),'ditch':lambda:fortification('ditch'),'watchtower':watchtower,
    'abandonedfactory':lambda:factory(True),'commrelay':comm_relay,'repairbay':repair_bay,
}
