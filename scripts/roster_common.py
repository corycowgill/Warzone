"""Shared mesh helpers and exporter for Warzone's original roster. Blender 5.2+."""
import importlib.util
import math
import json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('armor_source',ROOT/'scripts/generate-armored-vehicles.py')
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
box,cyl,beam,loft,mesh=a.box,a.cyl,a.beam,a.loft,a.mesh
armor,edge,steel,track,team,glass,mark,canvas=a.MATERIALS
concrete=a.material('Concrete',(135,132,112),0,.93)
wood=a.material('Timber',(112,85,53),0,.9)
brick=a.material('Masonry',(118,91,72),0,.94)
skin=a.material('Skin',(176,137,103),0,.88)
cloth=a.material('Uniform',(98,108,74),0,.96)
navy=a.material('NavalPaint',(112,128,128),.22,.65)
roof=a.material('RoofMetal',(82,96,85),.3,.75)
MATERIALS=a.MATERIALS+[concrete,wood,brick,skin,cloth,navy,roof]


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def sphere(name,loc,size,mat,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object
    o.scale=size
    for p in o.data.polygons: p.use_smooth=True
    return a.finish(o,name,mat)


def tube(name,loc,outer,inner,length,mat=steel,axis='X',n=16):
    verts=[]
    for x,r in [(-length/2,outer),(length/2,outer),(length/2,inner),(-length/2,inner)]:
        for i in range(n):
            ang=i*math.tau/n
            v=Vector((x,math.sin(ang)*r,math.cos(ang)*r))
            if axis=='Y':v=Vector((v.y,v.x,v.z))
            if axis=='Z':v=Vector((v.y,v.z,v.x))
            verts.append(tuple(v+Vector(loc)))
    faces=[]
    for ring in range(4):
        for i in range(n):
            faces.append((ring*n+i,ring*n+(i+1)%n,((ring+1)%4)*n+(i+1)%n,((ring+1)%4)*n+i))
    return mesh(name,verts,faces,mat)


def crate(loc,size=.65):
    x,y,z=loc
    box('Slatted supply crate',loc,(size,size,size),wood,.025)
    for yy in [-1,1]:
        for xx in [-.32,.32]:box('Crate strap',(x+xx*size,y+yy*size*.505,z),(.045,size*.025,size*.91),steel)
        o=box('Diagonal crate batten',(x,y+yy*size*.52,z),(size*.80,.035,.055),edge)
        o.rotation_euler.y=.75
    box('Crate stencil',(x,y-size*.53,z),(.20,.008,.12),mark)


def barrel(loc,r=.23,h=.65):
    x,y,z=loc
    cyl('Fuel drum',(x,y,z+h/2),r,h,armor,n=18)
    for zz in [.12,h-.12]:cyl('Drum retaining band',(x,y,z+zz),r*1.045,.045,edge,n=18)
    cyl('Drum filler',(x+r*.4,y,z+h+.015),.035,.025,steel,n=10)


def sandbag_wall(length=3,y=0,z=.25,rows=2):
    count=max(3,int(length/.52))
    for row in range(rows):
        for i in range(count):
            xx=(i-(count-1)/2)*.53+(row%2)*.16
            box('Canvas sandbag',(xx,y,z+row*.27),(.57,.37,.29),canvas,.10)


def plaque(loc,width=.7,height=.20,axis='Y'):
    x,y,z=loc
    size=(width,.025,height) if axis=='Y' else (.025,width,height)
    box('Team recognition plate',(x,y,z),size,team,.012)


def railing(a0,b0,z,mat=steel):
    aa=Vector((*a0,z)); bb=Vector((*b0,z))
    length=(bb-aa).length
    count=max(2,int(length/.7)+1)
    for i in range(count):
        p=aa.lerp(bb,i/(count-1))
        beam('Safety rail post',p,p+Vector((0,0,.65)),.025,mat)
    for h in [.30,.65]:beam('Safety rail',aa+Vector((0,0,h)),bb+Vector((0,0,h)),.023,mat)


def export(key,category='units',budget=22000):
    bpy.ops.object.select_all(action='DESELECT')
    used=[]
    for mat in MATERIALS:
        objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials) and o.data.materials[0]==mat]
        if not objs:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]
        if len(objs)>1:bpy.ops.object.join()
        o=bpy.context.object
        o.name=mat.name
        used.append(o)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    triangles=sum(len(p.vertices)-2 for o in used for p in o.data.polygons)
    assert triangles<=budget,(key,triangles,budget)
    assert len(used)<=12,(key,len(used))
    path=ROOT/f'assets/models/{category}/warzone-original/{key}.glb'
    path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
    assert path.stat().st_size<1500000,(key,path.stat().st_size)
    return {'model':key,'category':category,'triangles':triangles,'meshes':len(used),'bytes':path.stat().st_size,'path':path.relative_to(ROOT).as_posix()}
