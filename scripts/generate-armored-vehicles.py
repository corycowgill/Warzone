"""Original, detailed WWII-inspired armor for Warzone. Blender 5.2+.
blender --background --python scripts/generate-armored-vehicles.py -- --preview
+X forward, Z up. glTF exports Y up. Static parts merge by material.
"""
import bpy
import math
import json
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/models/units/warzone-original'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def material(name, rgb, metal=0, rough=.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*[linear(v/255) for v in rgb], 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = m.diffuse_color
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

armor = material('Armor', (91, 103, 72), .22, .67)
edge = material('EdgeSteel', (124, 127, 104), .40, .58)
steel = material('Steel', (60, 65, 61), .48, .52)
track = material('Tracks', (39, 42, 38), .28, .83)
team = material('TeamColor', (75, 120, 184), .08, .68)
glass = material('Optics', (44, 100, 113), .28, .25)
mark = material('Markings', (204, 197, 164), .0, .83)
canvas = material('Canvas', (107, 91, 62), .0, .95)
MATERIALS = [armor, edge, steel, track, team, glass, mark, canvas]


def finish(o, name, mat, bevel=0):
    o.name = name
    o.data.materials.append(mat)
    if bevel:
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new('Machined edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = o.modifiers.new('Face normals', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


def box(name, loc, size, mat=armor, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, bevel)


def cyl(name, loc, radius, depth, mat=steel, axis='Z', n=16, radius2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=radius, radius2=radius if radius2 is None else radius2, depth=depth, location=loc)
    o = bpy.context.object
    if axis == 'X': o.rotation_euler.y = math.pi / 2
    if axis == 'Y': o.rotation_euler.x = math.pi / 2
    for p in o.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return finish(o, name, mat)


def beam(name, a, b, radius, mat=steel, n=8):
    a, b = Vector(a), Vector(b)
    o = cyl(name, (a+b)/2, radius, (b-a).length, mat, n=n)
    o.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return o


def mesh(name, vertices, faces, mat=armor, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    # Explicitly recalculate outward normals for authored lofts and track loops.
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return finish(o, name, mat, bevel)


def loft(name, rings, mat=armor, bevel=0):
    count = len(rings[0])
    faces = [tuple(reversed(range(count)))]
    for r in range(len(rings)-1):
        for j in range(count):
            k = (j+1) % count
            faces.append((r*count+j, r*count+k, (r+1)*count+k, (r+1)*count+j))
    faces.append(tuple((len(rings)-1)*count+j for j in range(count)))
    return mesh(name, [v for ring in rings for v in ring], faces, mat, bevel)


def outline(front, back, halfwidth, z, cut=.22):
    return [(front,-halfwidth+cut,z),(front,halfwidth-cut,z),(front-cut,halfwidth,z),
            (back+cut,halfwidth,z),(back,halfwidth-cut,z),(back,-halfwidth+cut,z),
            (back+cut,-halfwidth,z),(front-cut,-halfwidth,z)]


def star(x, y, z, radius):
    v=[(x,y,z)]
    for i in range(10):
        a=math.pi/2+i*math.pi/5
        r=radius if i%2==0 else radius*.43
        v.append((x+math.cos(a)*r,y+math.sin(a)*r,z))
    mesh('Recognition star',v,[(0,i+1,(i+1)%10+1) for i in range(10)],mark)


def path_point(s, a, r, z):
    straight = a*2
    arc = math.pi*r
    if s < straight: return (-a+s,z-r,1,0)
    s -= straight
    if s < arc:
        t=s/r
        return (a+r*math.sin(t),z-r*math.cos(t),math.cos(t),math.sin(t))
    s -= arc
    if s < straight: return (a-s,z+r,-1,0)
    t=(s-straight)/r
    return (-a-r*math.sin(t),z+r*math.cos(t),-math.cos(t),-math.sin(t))


def running_gear(length, width, heavy=False, apc=False):
    a=length/2-.58
    r=.51 if apc else .57
    z=r+.09
    y=width/2-.25
    perimeter=4*a+2*math.pi*r
    links=48 if apc else 54
    for side in [-1,1]:
        yy=side*y
        # Hollow continuous band: the wheels sit inside a real track loop.
        steps=48
        verts=[]
        for rr, lateral in [(r+.035,-.27),(r+.035,.27),(r-.055,-.27),(r-.055,.27)]:
            for i in range(steps):
                xx,zz,_,_=path_point(perimeter*i/steps,a,r,z)
                # Offset outward radially around each end, vertically on the straights.
                cx=max(-a,min(a,xx))
                d=Vector((xx-cx,zz-z)).normalized()*(rr-r)
                verts.append((xx+d.x,yy+lateral,zz+d.y))
        faces=[]
        for i in range(steps):
            j=(i+1)%steps
            for u,v in [(0,1),(1,3),(3,2),(2,0)]:
                faces.append((u*steps+i,u*steps+j,v*steps+j,v*steps+i))
        mesh('Continuous track belt',verts,faces,track)
        for i in range(links):
            xx,zz,tx,tz=path_point(perimeter*(i+.5)/links,a,r,z)
            o=box('Individual track shoe',(xx,yy,zz),(perimeter/links*.91,.60,.07),steel)
            o.rotation_euler.y=-math.atan2(tz,tx)
            o=box('Track grouser',(xx+tz*.055,yy,zz-tx*.055),(.045,.56,.035),edge)
            o.rotation_euler.y=-math.atan2(tz,tx)
        wheels=6 if heavy else 5
        for i in range(wheels):
            xx=-a*.79+i*a*1.58/(wheels-1)
            rad=.43 if heavy else (.37 if apc else .40)
            zz=rad+.17
            cyl('Rubber road wheel',(xx,yy,zz),rad,.41,track,'Y',16)
            cyl('Pressed wheel disc',(xx,yy+side*.225,zz),rad*.79,.055,armor,'Y',16)
            cyl('Wheel hub',(xx,yy+side*.264,zz),rad*.31,.075,steel,'Y',12)
            for j in range(5):
                ang=j*math.tau/5
                cyl('Hub bolt',(xx+math.cos(ang)*rad*.52,yy+side*.26,zz+math.sin(ang)*rad*.52),.026,.025,edge,'Y',6)
            beam('Suspension arm',(xx-.18,yy-side*.17,.95),(xx,yy-side*.17,zz),.065,steel)
        for xx in [-a,a]:
            cyl('Drive sprocket',(xx,yy,z),r*.78,.43,steel,'Y',18)
            cyl('Sprocket hub',(xx,yy+side*.24,z),r*.32,.08,armor,'Y',12)
            for j in range(9):
                ang=j*math.tau/9
                o=box('Sprocket tooth',(xx+math.cos(ang)*r*.79,yy,z+math.sin(ang)*r*.79),(.14,.46,.08),edge)
                o.rotation_euler.y=-ang
        for xx in [-a*.5,a*.5]:
            cyl('Return roller',(xx,yy,z+r-.15),.14,.35,track,'Y',12)
        box('Pressed fender',(0,yy,1.29 if not apc else 1.16),(length+.12,.76,.075),armor,.018)
        # Fender mounting brackets and metal edge, rather than bulky side boxes.
        for xx in [-a*.7,0,a*.7]:
            beam('Fender brace',(xx,side*(width/2-.6),1.10),(xx,side*(width/2+.08),1.25),.028,steel)


def engine_deck(length, width, z, apc=False):
    x=-length/2+.75
    box('Engine cover',(x,0,z),(.95,width*.64,.07),armor,.025)
    for i in range(11):
        box('Cooling louver',(x-.40+i*.08,0,z+.045),(.035,width*.50,.025),steel)
    for side in [-1,1]:
        box('Engine cover hinge',(x+.37,side*width*.22,z+.07),(.1,.20,.045),edge)
    for side in [-1,1]:
        beam('Exhaust pipe',(-length/2-.015,side*.62,z-.45),(-length/2-.14,side*.62,z-.13),.09,steel,12)
        cyl('Exhaust outlet',(-length/2-.14,side*.62,z-.12),.072,.015,track)
    box('Stowed tarp',(-length/2+.40,-width*.33,z+.16),(.65,.30,.22),canvas,.07)
    for xx in [-length/2+.22,-length/2+.57]:
        box('Tarp strap',(xx,-width*.33,z+.275),(.035,.31,.018),steel)


def fittings(length, width, deck):
    # Rear tow eyes and front hooks.
    for side in [-1,1]:
        for xx in [-length/2,length/2-.12]:
            cyl('Tow lug',(xx,side*width*.31,.86),.105,.10,edge,'Y',12)
            cyl('Tow eye recess',(xx,side*(width*.31+.056),.86),.049,.012,track,'Y',12)
        yy=side*width*.30
        cyl('Headlamp body',(length/2-.25,yy,1.26),.12,.16,steel,'X',16)
        cyl('Headlamp lens',(length/2-.162,yy,1.26),.091,.018,mark,'X',16)
        beam('Lamp guard',(length/2-.25,yy-.16,1.18),(length/2-.25,yy-.16,1.43),.018,edge)
        beam('Lamp guard arch',(length/2-.25,yy-.16,1.43),(length/2-.25,yy+.16,1.43),.018,edge)
        beam('Lamp guard',(length/2-.25,yy+.16,1.43),(length/2-.25,yy+.16,1.18),.018,edge)
        # Tools lie along each fender.
        beam('Pioneer tool handle',(-.9,side*(width/2-.10),deck+.04),(.45,side*(width/2-.10),deck+.04),.027,canvas)
        box('Shovel blade',(.61,side*(width/2-.10),deck+.035),(.36,.16,.035),steel,.02)
        box('Tool clamp',(-.65,side*(width/2-.10),deck+.075),(.06,.12,.035),edge)
    # Small chips and welds catch light; deliberately restrained at RTS distance.
    rng=random.Random(7)
    for i in range(14):
        xx=rng.uniform(-length*.38,length*.35)
        side=-1 if i%2 else 1
        box('Worn fender edge',(xx,side*(width/2+.12),1.33),(.04+rng.random()*.10,.018,.012),edge)


def gun(x, z, heavy=False):
    length=3.0 if heavy else 2.25
    # Stepped recoil sleeve and taper, with an actual recessed muzzle opening.
    cyl('Recoil sleeve',(x+.26,0,z),.18 if heavy else .15,.55,armor,'X',20)
    cyl('Tapered gun tube',(x+.45+length/2,0,z),.105 if heavy else .085,length,steel,'X',20,radius2=.073 if heavy else .060)
    end=x+.45+length
    if heavy:
        cyl('Muzzle brake',(end+.11,0,z),.14,.29,steel,'X',16)
        for side in [-1,1]:
            box('Brake vent',(end+.10,side*.137,z),(.13,.008,.10),track)
        end+=.26
    # Four rings define a hollow muzzle lip and recessed black bore.
    n=20
    ro=.095 if heavy else .078
    ri=ro*.66
    verts=[]
    for xx,r in [(end-.03,ro),(end+.035,ro),(end+.035,ri),(end-.17,ri)]:
        verts.extend((xx,math.sin(i*math.tau/n)*r,z+math.cos(i*math.tau/n)*r) for i in range(n))
    faces=[]
    for ring in range(3):
        for i in range(n):
            j=(i+1)%n
            faces.append((ring*n+i,ring*n+j,(ring+1)*n+j,(ring+1)*n+i))
    mesh('Hollow muzzle',verts,faces,edge)
    cyl('Recessed gun bore',(end-.175,0,z),ri,.008,track,'X',20)


def turret(heavy=False):
    x=-.20
    bottom=1.83 if heavy else 1.76
    top=2.83 if heavy else 2.67
    cyl('Turret race',(x,0,bottom-.04),1.05 if heavy else .93,.14,steel,n=32)
    if heavy:
        rings=[outline(1.12,-1.62,1.05,bottom,.28),outline(.94,-1.35,.88,top,.30)]
        loft('Welded heavy turret',rings,armor,.035)
        box('Gun mantlet',(1.08,0,2.26),(.38,.97,.58),armor,.06)
        for side in [-1,1]:
            for i in range(4):
                xx=-1.04+i*.39
                cyl('Spare turret track link',(xx,side*1.03,2.30),.11,.07,steel,'Y',8)
                box('Spare track shoe',(xx,side*1.06,2.30),(.28,.07,.40),steel,.015)
            box('Team recognition panel',(-.55,side*.964,2.58),(.60,.025,.15),team)
            for i in range(3):
                cyl('Smoke launcher',(.62-i*.15,side*.93,2.57),.055,.20,steel,'Y',10)
    else:
        rings=[]
        for zz,rx,ry,offset in [(bottom,1.16,.99,-.25),(bottom+.20,1.30,1.04,-.25),(top-.13,1.08,.83,-.33),(top,.77,.64,-.37)]:
            rings.append([(offset+rx*math.cos(i*math.tau/24),ry*math.sin(i*math.tau/24),zz) for i in range(24)])
        o=loft('Cast rounded turret',rings,armor)
        for p in o.data.polygons:
            if len(p.vertices)==4: p.use_smooth=True
        cyl('Rounded mantlet',(.99,0,2.14),.36,.46,armor,'X',24)
        for side in [-1,1]:
            box('Team recognition stripe',(-.42,side*.91,2.39),(.65,.035,.17),team,.015)
    gun(1.19,2.26 if heavy else 2.14,heavy)
    # Cupola, split hatch, viewports and pintle machine gun.
    cup=(-.70,.35,top+.10)
    cyl('Commander cupola',cup,.37,.22,armor,n=24)
    cyl('Hatch gasket',(cup[0],cup[1],top+.226),.325,.026,steel,n=24)
    cyl('Commander hatch',(cup[0],cup[1],top+.26),.32,.055,armor,n=24)
    for i in range(6):
        ang=i*math.tau/6
        o=box('Cupola vision slit',(cup[0]+math.cos(ang)*.36,cup[1]+math.sin(ang)*.36,top+.11),(.12,.022,.07),glass)
        o.rotation_euler.z=ang-math.pi/2
    beam('Hatch grab handle',(-.82,.32,top+.32),(-.55,.32,top+.32),.023,steel)
    box('Gunner periscope',(.28,-.40,top+.045),(.27,.20,.09),steel,.02)
    box('Periscope glass',(.28,-.505,top+.07),(.18,.015,.045),glass)
    cyl('MG pintle',(-.40,.66,top+.36),.045,.45,steel,n=8)
    box('Machine gun receiver',(-.15,.66,top+.59),(.40,.11,.13),steel,.015)
    beam('Machine gun barrel',(.04,.66,top+.60),(.75,.66,top+.60),.032,steel,10)
    box('Ammunition box',(-.14,.81,top+.54),(.25,.18,.22),canvas,.015)
    cyl('Antenna mount',(-1.02,-.47,top+.09),.085,.18,steel,n=12)
    beam('Whip antenna',(-1.02,-.47,top+.18),(-1.10,-.49,top+1.10),.010,steel,6)
    star(-.13,0,top+.018,.26)


def transport(length,width):
    # M113-inspired troop carrier, low tracked chassis and a properly angled bow.
    loft('Armored troop compartment',[
        outline(2.30,-2.40,1.17,.88,.20),outline(1.83,-2.35,1.04,2.34,.19)
    ],armor,.025)
    # Driver and troop hatches sit flush in the roof.
    for xx in [-1.25,-.30]:
        box('Roof hatch gasket',(xx,0,2.365),(.77,1.15,.025),steel,.025)
        box('Troop roof hatch',(xx,0,2.39),(.71,1.09,.035),armor,.025)
        beam('Hatch handle',(xx-.12,.12,2.44),(xx+.12,.12,2.44),.020,steel)
        for yy in [-.42,.42]:
            box('Hatch hinge',(xx-.36,yy,2.42),(.09,.12,.07),edge)
    cyl('Driver hatch',(1.10,-.54,2.39),.33,.07,armor,n=24)
    for yy in [-.79,-.54,-.29]:
        box('Driver periscope',(1.46,yy,2.40),(.13,.13,.10),steel,.018)
        box('Driver optics',(1.531,yy,2.41),(.012,.085,.045),glass)
    # Thin armored shield and heavy machine gun, not a tank turret.
    cyl('Commander ring',(.48,.37,2.42),.43,.11,steel,n=24)
    cyl('Open hatch recess',(.48,.37,2.48),.32,.025,track,n=24)
    box('Gun shield front',(.93,.37,2.78),(.055,.69,.48),armor,.02)
    for side in [-1,1]:
        box('Gun shield cheek',(.64,.37+side*.35,2.78),(.57,.045,.48),armor,.02)
    box('Heavy MG receiver',(.68,.37,2.77),(.45,.13,.16),steel,.012)
    beam('Heavy MG barrel',(.87,.37,2.79),(1.82,.37,2.79),.039,steel,12)
    cyl('MG muzzle',(1.83,.37,2.79),.046,.055,edge,'X',12)
    box('MG ammunition box',(.58,.59,2.70),(.33,.23,.26),canvas,.02)
    # Rear access ramp with inset border, hinge line and latches.
    box('Rear ramp gasket',(-2.379,0,1.57),(.035,1.58,1.16),steel,.04)
    box('Rear troop ramp',(-2.405,0,1.58),(.025,1.43,1.02),armor,.025)
    for yy in [-.53,.53]:
        box('Ramp latch',(-2.429,yy,1.83),(.035,.055,.23),edge,.01)
    for yy in [-.55,0,.55]:
        cyl('Ramp hinge',(-2.43,yy,1.04),.055,.24,steel,'Y',12)
    for side in [-1,1]:
        # Narrow team band avoids recoloring the vehicle body.
        box('Team side band',(-.33,side*1.12,1.82),(1.20,.025,.16),team)
        for xx in [-1.5,-.6,.4]:
            cyl('Firing port',(xx,side*1.14,1.58),.08,.03,steel,'Y',12)
        box('External stowage bin',(-1.43,side*1.11,1.96),(.55,.17,.32),canvas,.035)
        for xx in [-1.58,-1.29]:
            box('Stowage strap',(xx,side*1.205,1.96),(.028,.02,.32),steel)
    box('Front engine access panel',(1.19,.54,2.365),(.68,.65,.035),armor,.02)
    for i in range(8):
        box('Engine intake louver',(.92+i*.075,.54,2.394),(.025,.49,.024),steel)
    beam('Rear exhaust stack',(-2.10,.84,2.18),(-2.10,.84,2.55),.075,steel,12)
    cyl('Rear exhaust opening',(-2.10,.84,2.56),.055,.015,track,n=12)
    beam('Radio antenna',(-1.87,.68,2.38),(-1.97,.68,3.26),.012,steel,6)
    star(-.9,0,2.412,.25)


def vehicle(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    heavy=kind=='heavy-tank'
    apc=kind=='apc'
    length=6.0 if heavy else (5.0 if apc else 5.4)
    width=3.42 if heavy else (2.76 if apc else 3.02)
    running_gear(length,width,heavy,apc)
    if apc:
        transport(length,width)
        fittings(length,width,1.20)
    else:
        deck=1.83 if heavy else 1.76
        loft('Sloped upper hull',[
            outline(length/2-.10,-length/2+.13,width/2-.50,.78,.25),
            outline(length/2-.68,-length/2+.23,width/2-.54,deck,.18)
        ],armor,.025)
        # Transmission housing and front glacis are genuinely sloped geometry.
        cyl('Final drive housing',(length/2-.35,0,.83),.26,width-.87,armor,'Y',24)
        engine_deck(length,width,deck)
        turret(heavy)
        fittings(length,width,1.33)
        for side in [-1,1]:
            # Driver roof hatches, view slit and side storage.
            cyl('Driver hatch',(1.25,side*.53,deck+.055),.25,.075,armor,n=20)
            box('Driver vision block',(1.48,side*.53,deck+.14),(.18,.25,.16),steel,.02)
            box('Vision glass',(1.578,side*.53,deck+.16),(.012,.16,.06),glass)
            box('Team hull band',(.30,side*(width/2-.525),1.55),(.58,.028,.15),team)
            box('Rear stowage box',(-2.11,side*.64,deck+.18),(.56,.47,.29),canvas,.035)
            box('Stowage lid',(-2.11,side*.64,deck+.345),(.59,.49,.045),edge,.01)
            # Tow cable follows the rear deck edge.
            beam('Tow cable',(-2.25,side*.90,deck+.07),(.63,side*.90,deck+.07),.027,steel)
        if heavy:
            # Separate thin skirt plates, with gaps exposing the running gear.
            for side in [-1,1]:
                for i in range(5):
                    xx=-2.05+i*.97
                    box('Thin side skirt',(xx,side*(width/2+.10),1.10),(.92,.045,.47),armor,.012)
                    cyl('Skirt fastener',(xx,side*(width/2+.13),1.28),.032,.02,edge,'Y',6)
    # Consolidate every static surface by material. Detail does not multiply draw calls.
    for mat in MATERIALS:
        bpy.ops.object.select_all(action='DESELECT')
        objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
        if not objs: continue
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]
        if len(objs)>1: bpy.ops.object.join()
        bpy.context.object.name=mat.name
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    count=sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
    assert count <= 18000, (kind,count)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
    return {'model':kind,'triangles':count,'meshes':len([o for o in bpy.context.scene.objects if o.type=='MESH']),'bytes':(OUT/(kind+'.glb')).stat().st_size}


if __name__ == '__main__':
    report=[vehicle(k) for k in ['tank','heavy-tank','apc']]
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))

    if '--preview' in sys.argv:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        for i,kind in enumerate(['tank','heavy-tank','apc']):
            bpy.ops.import_scene.gltf(filepath=str(OUT/(kind+'.glb')))
            for o in bpy.context.selected_objects: o.location.y+=(i-1)*6.2
        floor=material('Studio floor',(51,57,53))
        box('Ground',(0,0,-.07),(200,200,.10),floor)
        bpy.ops.object.camera_add(location=(15,-22,18))
        cam=bpy.context.object
        cam.rotation_euler=(Vector((.3,0,1))-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO'
        cam.data.ortho_scale=22.5
        bpy.context.scene.camera=cam
        for loc,power,size in [((5,-8,14),2700,9),((-7,-2,10),2100,8),((3,11,12),3200,7)]:
            bpy.ops.object.light_add(type='AREA',location=loc)
            lamp=bpy.context.object
            lamp.data.energy=power
            lamp.data.shape='DISK'
            lamp.data.size=size
            lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
        scene=bpy.context.scene
        scene.render.engine='CYCLES'
        scene.cycles.samples=48
        scene.world.color=(.30,.30,.30)
        scene.render.resolution_x=1800
        scene.render.resolution_y=1250
        scene.render.resolution_percentage=100
        scene.render.filepath=str(ROOT/'docs/armored-vehicles-preview.png')
        bpy.ops.render.render(write_still=True)
