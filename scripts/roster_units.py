"""Distinct infantry, support vehicles, aircraft and naval units for Warzone."""
from roster_common import *


def human(role='infantry',x=0,y=0,crouch=False):
    hip=.70 if crouch else .97
    shoulder=hip+.47
    head=shoulder+.30
    for side in [-1,1]:
        xx=x+side*.13
        knee=(xx,y-.13 if crouch else y,.41)
        beam('Uniform thigh',(xx,y,hip),knee,.105,cloth,12)
        beam('Boot trouser calf',knee,(xx,y+.04,.17),.083,cloth,12)
        box('Leather combat boot',(xx,y-.075,.10),(.19,.34,.18),track,.045)
    loft('Tailored tunic',[
        [(x-.23,y-.13,hip),(x+.23,y-.13,hip),(x+.23,y+.13,hip),(x-.23,y+.13,hip)],
        [(x-.25,y-.13,shoulder),(x+.25,y-.13,shoulder),(x+.25,y+.14,shoulder),(x-.25,y+.14,shoulder)]
    ],cloth,.035)
    box('Webbing belt',(x,y,hip+.08),(.48,.29,.075),canvas,.02)
    for side in [-1,1]:
        beam('Webbing shoulder strap',(x+side*.15,y-.145,hip+.10),(x+side*.18,y-.145,shoulder-.025),.025,canvas,6)
        box('Belt ammunition pouch',(x+side*.18,y-.19,hip+.13),(.13,.10,.16),canvas,.02)
        box('Team shoulder patch',(x+side*.264,y,shoulder-.09),(.014,.13,.12),team,.012)
    cyl('Neck',(x,y,shoulder+.09),.075,.15,skin,n=12)
    sphere('Sculpted face',(x,y-.015,head),(.125,.115,.16),skin,16,10)
    sphere('Nose',(x,y-.127,head+.005),(.031,.033,.04),skin,10,6)
    for side in [-1,1]:
        box('Brow shadow',(x+side*.045,y-.120,head+.045),(.035,.012,.014),track)
    if role=='commander':
        cyl('Officer cap',(x,y,head+.13),.145,.09,cloth,n=20)
        box('Officer cap peak',(x,y-.12,head+.105),(.23,.13,.025),steel,.02)
        box('Cap insignia',(x,y-.146,head+.15),(.055,.015,.037),mark)
    else:
        # Hemispherical steel helmet with a flared rolled rim.
        verts=[]; n=20
        for z,r in [(head+.02,.16),(head+.06,.172),(head+.16,.13),(head+.22,.055)]:
            verts.extend((x+r*math.cos(i*math.tau/n),y+r*math.sin(i*math.tau/n),z) for i in range(n))
        faces=[]
        for row in range(3):
            for i in range(n):faces.append((row*n+i,row*n+(i+1)%n,(row+1)*n+(i+1)%n,(row+1)*n+i))
        faces.append(tuple(3*n+i for i in range(n)))
        o=mesh('Formed steel helmet',verts,faces,armor)
        for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
        beam('Helmet chin strap',(x-.14,y,head+.02),(x-.07,y-.09,head-.12),.012,canvas,6)
    box('Field pack',(x,y+.20,shoulder-.12),(.32,.18,.35),canvas,.06)
    if role=='engineer':
        beam('Entrenching tool',(x+.19,y+.28,hip+.04),(x+.19,y+.28,shoulder+.22),.026,wood)
        box('Spade head',(x+.19,y+.29,shoulder+.24),(.16,.05,.20),steel,.025)
    for side in [-1,1]:
        elbow=(x+side*.30,y-.12,shoulder-.22)
        hand=(x+side*.12,y-.36,shoulder-.13)
        beam('Tunic upper sleeve',(x+side*.27,y,shoulder-.045),elbow,.085,cloth,12)
        beam('Tunic forearm',elbow,hand,.068,cloth,12)
        sphere('Gloved hand',hand,(.07,.07,.075),skin,12,6)
    if role=='commander':
        for side in [-1,1]:cyl('Binocular barrel',(x+side*.065,y-.39,shoulder-.10),.05,.14,steel,'Y',12)
        box('Map case',(x-.23,y-.15,hip-.035),(.15,.11,.23),canvas,.025)
        box('Officer shoulder rank',(x-.18,y,shoulder+.018),(.12,.14,.025),mark)
    elif role=='engineer':
        box('Repair tool case',(x,y-.43,shoulder-.22),(.34,.16,.22),steel,.03)
        beam('Spanner',(x+.12,y-.40,shoulder-.1),(x+.12,y-.40,shoulder+.17),.023,edge)
        tube('Spanner jaw',(x+.12,y-.40,shoulder+.19),.049,.025,.025,edge,'Y',8)
    else:
        box('Wooden rifle stock',(x+.1,y-.24,shoulder-.16),(.07,.42,.09),wood,.018)
        box('Rifle receiver',(x+.1,y-.48,shoulder-.125),(.065,.25,.065),steel,.008)
        cyl('Rifle barrel',(x+.1,y-.72,shoulder-.12),.022,.36,steel,'Y',12)
        box('Rifle magazine',(x+.1,y-.48,shoulder-.20),(.045,.09,.12),steel,.008)


def mortar_team():
    human(x=-.66,y=.15,crouch=True)
    human(x=.66,y=.28,crouch=True)
    cyl('Mortar base plate',(0,-.25,.08),.39,.10,steel,n=20)
    beam('Mortar tube',(0,-.23,.18),(0,-.62,1.12),.078,armor,16)
    for xx in [-.26,.26]:beam('Mortar bipod',(xx,-.67,.10),(0,-.49,.79),.028,steel)
    beam('Mortar elevation brace',(-.26,-.67,.11),(.26,-.67,.11),.024,steel)
    crate((.56,-.46,.19),.32)
    plaque((0,-.265,.15),.18,.08)


def wheels(x,y,z,r=.38):
    cyl('All-terrain tire',(x,y,z),r,.24,track,'Y',20)
    cyl('Pressed wheel rim',(x,y+(1 if y>0 else -1)*.135,z),r*.65,.055,armor,'Y',16)
    cyl('Axle cap',(x,y+(1 if y>0 else -1)*.17,z),r*.22,.07,steel,'Y',12)
    for j in range(10):
        t=j*math.tau/10
        o=box('Tire tread block',(x+math.cos(t)*r*.98,y,z+math.sin(t)*r*.98),(.12,.255,.055),track)
        o.rotation_euler.y=-t


def scoutcar():
    for xx in [-1.18,1.12]:
        for yy in [-.87,.87]:wheels(xx,yy,.48)
    box('Chassis',(0,0,.63),(3.25,1.52,.19),steel,.04)
    loft('Sloped reconnaissance hull',[a.outline(1.58,-1.55,.78,.72,.2),a.outline(1.05,-1.36,.58,1.46,.22)],armor,.035)
    box('Angled bonnet',(1.05,0,1.12),(.9,1.22,.14),armor,.045)
    for yy in [-.37,.37]:
        box('Armored windscreen',(.73,yy,1.54),(.06,.45,.29),steel,.025)
        box('Vision glass',(.771,yy,1.56),(.012,.34,.13),glass)
        cyl('Headlight',(1.59,yy,1.01),.10,.05,mark,'X',14)
    for side in [-1,1]:
        box('Fender',(.05,side*.84,.91),(3.1,.30,.065),armor,.025)
        plaque((-.47,side*.644,1.23),.55,.14)
    cyl('Scout cupola',(-.48,0,1.57),.40,.27,armor,n=20)
    box('MG receiver',(-.19,0,1.81),(.4,.13,.14),steel,.015)
    tube('Scout MG',(.35,0,1.81),.038,.021,.68)
    beam('Radio antenna',(-1.12,.39,1.45),(-1.19,.39,2.26),.012,steel,6)
    crate((-1.23,-.15,1.6),.36)


def support_vehicle(kind):
    if kind=='aahalftrack':
        a.running_gear(3.25,2.5,False,False)
        for part in list(bpy.context.scene.objects):part.location.x-=.70
        for side in [-1,1]:wheels(1.72,side*1.04,.49,.42)
    else:
        a.running_gear(5.2,2.8,False,False)
    loft('Armored fighting chassis',[a.outline(2.48,-2.48,.98,.72,.25),a.outline(1.95,-2.24,.89,1.55,.2)],armor,.035)
    for side in [-1,1]:plaque((-.1,side*.925,1.24),.65,.18)
    if kind=='spg':a.engine_deck(5.2,2.8,1.55)
    else:
        box('Half-track bonnet',(1.60,0,1.43),(1.08,1.62,.20),armor,.055)
        box('Driver cab rear',(.63,0,1.77),(.16,1.7,.65),armor,.035)
        for side in [-1,1]:
            box('Cab windscreen',(.73,side*.40,1.89),(.04,.62,.35),steel,.025)
            box('Cab vision glass',(.757,side*.40,1.90),(.012,.49,.22),glass)
        for i in range(7):box('Engine bonnet louver',(1.35+i*.10,0,1.54),(.035,1.15,.025),steel)
    if kind=='spg':
        loft('Sloped artillery casemate',[a.outline(1.12,-1.35,.89,1.56,.15),a.outline(.84,-1.12,.71,2.60,.12)],armor,.03)
        cyl('Howitzer mantlet',(1.13,0,2.14),.34,.35,steel,'X',20)
        beam('Recoil sleeve',(1.28,0,2.14),(1.92,0,2.39),.18,armor,16)
        beam('Elevated artillery barrel',(1.79,0,2.34),(4.15,0,3.25),.085,steel,20)
        for side in [-1,1]:plaque((-.30,side*.79,2.12),.50,.17)
        cyl('Gunner hatch',(-.5,0,2.65),.28,.07,steel,n=20)
    else:
        # Dedicated twin-barrel anti-air carriage, visibly different from transport.
        before=set(bpy.context.scene.objects)
        cyl('AA traverse ring',(-.15,0,1.63),.69,.16,steel,n=24)
        for side in [-1,1]:
            box('AA armor shield',(-.06,side*.55,2.02),(1.45,.08,.75),armor,.035)
            beam('AA barrel',(0,side*.20,1.95),(1.39,side*.20,2.84),.048,steel,12)
            box('Ammunition magazine',(-.2,side*.37,2.0),(.47,.24,.45),canvas,.025)
        box('Crew seat',(-.73,0,1.80),(.30,.45,.11),canvas,.03)
        plaque((-.42,-.603,2.18),.45,.14)
        for part in set(bpy.context.scene.objects)-before:part.location.x-=.85
    a.fittings(5.2,2.8,1.33)


def fuselage(length,radius,z):
    rings=[]
    for xx,r in [(-length*.50,.06),(-length*.32,radius*.55),(-length*.08,radius),(length*.27,radius*.84),(length*.46,radius*.45),(length*.50,.05)]:
        rings.append([(xx,math.sin(i*math.tau/20)*r,z+math.cos(i*math.tau/20)*r) for i in range(20)])
    o=loft('Streamlined fuselage',rings,armor)
    for p in o.data.polygons:
        p.use_smooth=len(p.vertices)==4


def wing(x,span,chord,z,mat=armor):
    for side in [-1,1]:
        contour=[(x+chord*.5,side*.18,z),(x+chord*.12,side*span*.46,z+.10),(x-chord*.30,side*span*.5,z+.10),(x-chord*.55,side*.18,z)]
        loft('Tapered wing',[[(a,b,c-.045) for a,b,c in contour],[(a,b,c+.045) for a,b,c in contour]],mat,.018)
        beam('Aileron seam',(x-chord*.32,side*span*.26,z+.057),(x-chord*.27,side*span*.45,z+.157),.008,steel,6)
        box('Wing team recognition',(x-.13,side*span*.36,z+.161),(.38,.22,.012),team)


def aircraft(kind):
    bomber=kind=='bomber'
    length=7.7 if bomber else 5.5
    span=10 if bomber else 6.8
    z=.85
    fuselage(length,.40 if bomber else .31,z)
    wing(.10,span,1.48 if bomber else 1.12,z-.05)
    wing(-length*.38,span*.35,.62,z+.20)
    loft('Vertical tail fin',[[(-length*.42,-.045,z+.10),(-length*.20,-.045,z+.12),(-length*.36,-.045,z+1.05),(-length*.49,-.045,z+.62)], [(-length*.42,.045,z+.10),(-length*.20,.045,z+.12),(-length*.36,.045,z+1.05),(-length*.49,.045,z+.62)]],armor,.018)
    sphere('Framed glazed canopy',(.32,0,z+.29),(.68 if bomber else .48,.25,.28),glass,20,10)
    for xx in [-.1,.3,.7]:beam('Canopy frame',(xx,-.20,z+.37),(xx,.20,z+.37),.018,edge)
    engines=[-2.1,2.1] if bomber else [0]
    for yy in engines:
        xx=.8 if bomber else length*.45
        cyl('Engine nacelle',(xx,yy,z),.30,.70,armor,'X',20,radius2=.25)
        cyl('Propeller hub',(xx+.40,yy,z),.13,.23,edge,'X',16,radius2=.035)
        for angle in [0,math.tau/3,math.tau*2/3]:
            end=(xx+.46,yy+math.sin(angle)*.88,z+math.cos(angle)*.88)
            beam('Propeller blade',(xx+.46,yy,z),end,.052,steel,8)
        if bomber:
            for i in range(4):cyl('Engine exhaust',(xx-.1+i*.10,yy+.29,z+.05),.027,.10,steel,'Y',8)
    for side in [-1,1]:
        plaque((-length*.18,side*.307,z+.05),.44,.17)
    if bomber:
        sphere('Dorsal gun turret',(-1.1,0,z+.44),(.30,.30,.26),glass,16,8)
        beam('Turret gun',(-.90,0,z+.53),(-.1,0,z+.57),.026,steel)
        for side in [-1,1]:box('Bomb bay seam',(-.5,side*.12,z-.405),(1.4,.035,.018),steel)


def drone():
    box('Recon drone body',(0,0,.36),(.66,.91,.28),armor,.11)
    for xx in [-1,1]:
        for yy in [-1,1]:
            beam('Rotor spar',(xx*.23,yy*.28,.37),(xx*.75,yy*.70,.42),.045,steel)
            cyl('Electric motor',(xx*.75,yy*.70,.49),.11,.16,steel,n=16)
            for angle in [.35,.35+math.pi]:
                beam('Rotor blade',(xx*.75,yy*.70,.60),(xx*.75+math.cos(angle)*.43,yy*.70+math.sin(angle)*.43,.60),.034,edge,8)
    sphere('Camera gimbal',(0,-.30,.12),(.14,.14,.14),steel,16,8)
    cyl('Camera lens',(0,-.43,.12),.083,.06,glass,'Y',16)
    for xx in [-.31,.31]:beam('Landing skid',(xx,-.42,.04),(xx,.45,.04),.025,steel)
    plaque((0,-.467,.40),.33,.12)


def ship_outline(length,width,z):
    return [(length*.50,0,z),(length*.38,width*.35,z),(length*.19,width*.50,z),(-length*.33,width*.50,z),(-length*.48,width*.30,z),(-length*.50,0,z),(-length*.48,-width*.30,z),(-length*.33,-width*.50,z),(length*.19,-width*.50,z),(length*.38,-width*.35,z)]


def naval_gun(x,z,scale=1):
    cyl('Naval turret ring',(x,0,z),.43*scale,.16*scale,steel,n=20)
    box('Naval gunhouse',(x,0,z+.27*scale),(.95*scale,.8*scale,.46*scale),navy,.10*scale)
    for yy in [-.20,.20]:tube('Naval gun barrel',(x+.95*scale,yy*scale,z+.34*scale),.045*scale,.028*scale,1.35*scale)


def ship(kind):
    sizes={'battleship':(14,2.7),'destroyer':(11,1.95),'patrolboat':(6,1.7),'carrier':(16,3.9)}
    length,width=sizes[kind]
    loft('Shaped displacement hull',[ship_outline(length*.86,width*.56,.15),ship_outline(length,width,1.03)],navy,.035)
    loft('Boot-top waterline',[ship_outline(length*.94,width*.85,.34),ship_outline(length*.95,width*.87,.43)],steel)
    loft('Weather deck',[ship_outline(length*.98,width*.96,1.04),ship_outline(length*.98,width*.96,1.10)],wood)
    if kind=='carrier':
        loft('Flight deck',[a.outline(7.7,-7.6,2.2,1.58,.6),a.outline(7.7,-7.6,2.2,1.69,.6)],roof,.025)
        for xx in range(-6,7):box('Flight deck center marking',(xx,0,1.697),(.55,.08,.012),mark)
        for yy in [-1.5,1.5]:box('Landing strip line',(0,yy,1.699),(13,.045,.012),mark)
        box('Island superstructure',(-.5,1.4,2.17),(3.1,.88,.95),navy,.07)
        box('Island bridge',(-.1,1.43,2.85),(1.55,1.05,.45),navy,.04)
        box('Bridge glazing',(.71,1.43,2.87),(.02,.86,.18),glass)
        cyl('Island funnel',(-1.42,1.44,3.05),.28,.75,steel,n=16)
        for xx in [-4.6,-2.6]:
            # Parked aircraft are small but shaped, not rectangular deck clutter.
            box('Parked plane fuselage',(xx,-.60,1.86),(1.4,.14,.14),armor,.06)
            box('Parked plane wing',(xx+.15,-.60,1.87),(.28,1.2,.045),armor,.015)
            box('Parked plane tail',(xx-.55,-.60,1.99),(.24,.04,.25),team,.02)
        plaque((-.5,1.965,2.4),.70,.20)
    else:
        bridge_x=-.35 if kind!='patrolboat' else -.55
        box('Bridge block',(bridge_x,0,1.62),(2.6 if kind!='patrolboat' else 1.7,width*.62,1.0),navy,.08)
        box('Bridge pilothouse',(bridge_x+.25,0,2.22),(1.8 if kind!='patrolboat' else 1.25,width*.70,.43),navy,.05)
        box('Bridge windows',(bridge_x+1.16 if kind!='patrolboat' else bridge_x+.89,0,2.27),(.02,width*.54,.20),glass)
        for yy in [-1,1]:plaque((bridge_x,yy*width*.355,2.23),.58,.16)
        if kind!='patrolboat':
            for xx in [-1.7,-2.7] if kind=='battleship' else [-1.9]:
                cyl('Ship funnel',(xx,0,2.38),.36,.96,steel,n=20)
                cyl('Funnel cap',(xx,0,2.88),.39,.12,track,n=20)
            for xx in [length*.31,-length*.34]:naval_gun(xx,1.16,1.05 if kind=='battleship' else .72)
            if kind=='battleship':naval_gun(length*.17,1.64,.88)
        else:naval_gun(1.72,1.15,.55)
        beam('Signal mast',(-.4,0,2.46),(-.4,0,3.84),.04,steel)
        beam('Signal yard',(-.4,-.55,3.40),(-.4,.55,3.40),.028,steel)
        box('Radar array',(-.4,0,3.81),(.08,1.13,.35),steel,.015)
    for side in [-1,1]:
        railing((-length*.38,side*width*.45),(length*.24,side*width*.45),1.12)
        for xx in [-length*.2,length*.03]:
            sphere('Lifeboat',(xx,side*width*.40,1.42),(.60,.18,.17),canvas,12,6)
    for xx in [length*.34,-length*.38]:cyl('Mooring bollard',(xx,.35,1.23),.07,.22,steel,n=10)


def submarine():
    # Axisymmetric tapered pressure hull, deck casing and conning tower.
    rings=[]
    for xx,r in [(-4.5,.04),(-3.8,.43),(-2.3,.60),(1.9,.60),(3.6,.39),(4.35,.06)]:
        rings.append([(xx,math.sin(i*math.tau/24)*r,.68+math.cos(i*math.tau/24)*r) for i in range(24)])
    o=loft('Pressure hull',rings,navy)
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    box('Deck casing',(-.2,0,1.18),(6.35,.77,.12),steel,.05)
    loft('Conning tower',[a.outline(.65,-1.0,.39,1.25,.23),a.outline(.42,-.85,.31,2.10,.20)],navy,.04)
    for xx in [-.42,-.09]:
        beam('Periscope',(xx,0,2.12),(xx,0,2.70),.035,steel)
        beam('Periscope head',(xx,0,2.70),(xx+.14,0,2.70),.035,steel)
    for side in [-1,1]:
        plaque((-.22,side*.36,1.72),.55,.16)
        for i in range(12):box('Deck drainage slot',(-2.8+i*.45,side*.403,1.16),(.17,.012,.07),track)
    naval_gun(1.5,1.25,.32)
    for side in [-1,1]:box('Diving plane',(3.0,side*.82,.71),(.65,1.06,.07),navy,.03)
    beam('Propeller shaft',(-4.3,0,.68),(-4.84,0,.68),.09,steel)
    for i in range(4):
        t=i*math.pi/2
        beam('Screw blade',(-4.72,0,.68),(-4.72,math.sin(t)*.42,.68+math.cos(t)*.42),.08,edge)


UNIT_BUILDERS={
    'infantry':lambda:human(), 'engineer':lambda:human('engineer'), 'commander':lambda:human('commander'),
    'mortarteam':mortar_team,'scoutcar':scoutcar,'aahalftrack':lambda:support_vehicle('aahalftrack'),
    'spg':lambda:support_vehicle('spg'),'plane':lambda:aircraft('plane'),'bomber':lambda:aircraft('bomber'),
    'drone':drone,'battleship':lambda:ship('battleship'),'destroyer':lambda:ship('destroyer'),
    'patrolboat':lambda:ship('patrolboat'),'carrier':lambda:ship('carrier'),'submarine':submarine,
}
