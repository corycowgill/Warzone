"""Generate Warzone's original armored vehicle set with Blender.
Run: blender --background --python scripts/generate-armored-vehicles.py
Coordinates: +X forward, Z up; glTF export converts to Y up.
"""
import bpy
import math
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/models/units/warzone-original'
OUT.mkdir(parents=True, exist_ok=True)

def material(name, color, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = 0.72
    return m

armor = material('Armor', (0.24, 0.30, 0.22))
team = material('TeamColor', (0.30, 0.49, 0.80))
steel = material('Steel', (0.12, 0.15, 0.17), 0.15)
rubber = material('Tracks', (0.035, 0.045, 0.05))
glass = material('Optics', (0.12, 0.48, 0.57), 0.1)
mark = material('Markings', (0.8, 0.76, 0.59))

# Beveled silhouettes, no image textures or external dependencies.
def box(name, loc, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('Armor edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cylinder(name, loc, radius, depth, mat, axis='Z', vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if axis == 'X': o.rotation_euler.y = math.pi / 2
    if axis == 'Y': o.rotation_euler.x = math.pi / 2
    o.data.materials.append(mat)
    return o

def vehicle(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    heavy = kind == 'heavy-tank'
    apc = kind == 'apc'
    length = 3.5 if heavy else 3.0
    width = 2.4 if heavy else 2.0
    for side in [-1, 1]:
        y = side * width / 2
        box('Track belt', (0, y, .39), (length, .38, .66), rubber, .15)
        for i in range(5):
            cylinder('Road wheel', (-length*.37+i*length*.185, y+side*.20, .38), .235, .06, steel, 'Y', 10)
        # Tread plates on the top and bottom provide detail without excessive geometry.
        for i in range(8):
            x = -length*.44+i*length*.126
            for z in [.10, .69]:
                box('Tread link', (x,y,z), (.095,.42,.065), steel)
        box('Fender', (0,y,.79), (length+.12,.54,.13), armor, .04)
        for i in range(3):
            box('Side armor panel', (-.95+i*.86, y+side*.25,.95), (.78,.10,.42), team, .04)
    box('Lower hull', (0,0,.85), (length-.14,width-.12,.65), armor, .16)
    if apc:
        box('Troop compartment', (-.25,0,1.29), (2.4,1.65,.83), armor, .17)
        box('Sloped cab', (1.03,0,1.23), (.65,1.62,.64), team, .14)
        for y in [-.4,.4]:
            box('Vision block', (1.365,y,1.36), (.025,.40,.16), glass)
        for x in [-.95,-.25,.45]:
            box('Roof hatch', (x,0,1.735), (.5,.76,.06), steel, .03)
        box('Rear ramp', (-1.48,0,1.22), (.08,1.28,.63), steel, .04)
        cylinder('Cupola', (.40,0,1.85), .32,.20, team)
        cylinder('Machine gun', (.95,0,1.91), .045,.78,steel,'X',8)
    else:
        box('Upper glacis', (.35,0,1.18), (length-.4,width-.35,.48), armor, .17)
        cylinder('Turret ring', (-.25,0,1.49), .66,.15,steel,vertices=12)
        box('Turret', (-.22,0,1.74), (1.72 if heavy else 1.42,1.50 if heavy else 1.28,.59), team, .18)
        box('Mantlet', (.58,0,1.75), (.36,.65,.37),armor,.08)
        barrel_len = 1.8 if heavy else 1.45
        cylinder('Main gun', (.70+barrel_len/2,0,1.76), .10 if heavy else .08,barrel_len,steel,'X',10)
        box('Muzzle brake', (.78+barrel_len,0,1.76), (.26,.26,.21),steel,.035)
        box('Dark bore', (.916+barrel_len,0,1.76), (.008,.14,.10),rubber)
        cylinder('Commander hatch', (-.40,.18,2.075), .23,.075,steel)
        box('Periscope', (.05,.38,2.065), (.23,.15,.10),glass,.02)
        cylinder('Antenna', (-.80,-.42,2.21), .015,.72,steel,vertices=6)
        for i in range(4):
            box('Engine grille', (-1.15+i*.12,0,1.445), (.055,.85,.035),steel)
        for y in [-.57,.57]:
            cylinder('Rear fuel drum', (-1.36,y,1.28), .18,.52,armor,'Y')
        if heavy:
            for side in [-1,1]:
                for i in range(3):
                    box('Applique armor', (-.64+i*.44,side*.72,1.75), (.35,.13,.32),armor)
    for y in [-.64,.64]:
        box('Headlamp', (length/2-.02,y,1.06), (.05,.14,.12),mark,.02)
    # Merge static parts by material: at most six meshes/draw calls per vehicle.
    for mat in [armor,team,steel,rubber,glass,mark]:
        bpy.ops.object.select_all(action='DESELECT')
        objs = [o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
        for o in objs: o.select_set(True)
        if objs:
            bpy.context.view_layer.objects.active = objs[0]
            if len(objs) > 1: bpy.ops.object.join()
            bpy.context.object.name = mat.name
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    triangles = sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
    assert triangles <= 2000, (kind,triangles)
    bpy.ops.export_scene.gltf(filepath=str(OUT / (kind+'.glb')), export_format='GLB', export_yup=True, export_cameras=False, export_lights=False)
    return {'model':kind, 'triangles':triangles, 'meshes':len([o for o in bpy.context.scene.objects if o.type=='MESH']), 'bytes':(OUT/(kind+'.glb')).stat().st_size}

report = [vehicle(k) for k in ['tank','heavy-tank','apc']]
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))

# Optional studio contact sheet generated from the exported GLBs themselves.
import sys
if '--preview' in sys.argv:
    from mathutils import Vector
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for i, kind in enumerate(['tank', 'heavy-tank', 'apc']):
        bpy.ops.import_scene.gltf(filepath=str(OUT / (kind+'.glb')))
        for o in bpy.context.selected_objects:
            o.location.y += (i-1)*4.1
    floor = material('Studio floor', (.075,.09,.105))
    box('Ground', (0,0,-.07), (200,200,.10), floor)
    bpy.ops.object.camera_add(location=(10,-13,12))
    cam = bpy.context.object
    cam.rotation_euler = (Vector((0,0,.6))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 14.3
    bpy.context.scene.camera = cam
    for loc, power, size in [((2,-5,10),2000,8),((-6,0,7),1600,7),((3,8,8),2200,6)]:
        bpy.ops.object.light_add(type='AREA',location=loc)
        lamp=bpy.context.object
        lamp.data.energy=power
        lamp.data.shape='DISK'
        lamp.data.size=size
        lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.world.color=(.25,.25,.25)
    scene.render.resolution_x=1400
    scene.render.resolution_y=1000
    scene.render.resolution_percentage=100
    scene.render.filepath=str(ROOT/'docs/armored-vehicles-preview.png')
    bpy.ops.render.render(write_still=True)
