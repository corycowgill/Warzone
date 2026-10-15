"""Render contact sheets directly from the exported roster GLBs."""
import sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from roster_common import *

groups={
 'ground': ['infantry','engineer','commander','mortarteam','scoutcar','aahalftrack','spg','tank','heavy-tank','apc','drone'],
 'air-naval':['plane','bomber','battleship','destroyer','patrolboat','carrier','submarine'],
 'buildings':json.loads((ROOT/'assets/models/buildings/warzone-original/roster-manifest.json').read_text())
}
for label,items in groups.items():
    reset()
    if label=='buildings':items=[d['model'] for d in items]
    cols=5 if label=='buildings' else 4
    rows=math.ceil(len(items)/cols)
    for i,name in enumerate(items):
        category='buildings' if label=='buildings' else 'units'
        bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/models/{category}/warzone-original/{name}.glb'))
        objects=list(bpy.context.selected_objects)
        coords=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
        lo=Vector(tuple(min(c[j] for c in coords) for j in range(3)))
        hi=Vector(tuple(max(c[j] for c in coords) for j in range(3)))
        scale=3.65/max(hi-lo)
        parent=bpy.data.objects.new('Model display',None)
        bpy.context.collection.objects.link(parent)
        for o in objects:o.parent=parent
        parent.scale=(scale,)*3
        gx=(i%cols-(cols-1)/2)*5.15
        gy=(i//cols-(rows-1)/2)*5.25
        parent.location=(gx-(lo.x+hi.x)*scale/2,gy-(lo.y+hi.y)*scale/2,-lo.z*scale)
        bpy.ops.object.text_add(location=(gx-1.85,gy-2.1,.01))
        text=bpy.context.object
        text.data.body=name.replace('-',' ').upper()
        text.data.size=.22
        text.data.materials.append(mark)
    bpy.context.view_layer.update()
    frame_points=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type in ['MESH','FONT'] for c in o.bound_box]
    floor=a.material('Gallery floor '+label,(43,51,48))
    box('Studio floor',(0,0,-.09),(200,200,.12),floor)
    bpy.ops.object.camera_add(location=(14,-20,26))
    cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.update_tag()
    bpy.context.view_layer.update()
    view=[cam.matrix_world.inverted()@v for v in frame_points]
    low=Vector((min(v.x for v in view),min(v.y for v in view),0))
    high=Vector((max(v.x for v in view),max(v.y for v in view),0))
    cam.location+=cam.matrix_world.to_quaternion()@((low+high)/2)
    aspect=(2000/1800) if label=='buildings' else (1600/(1100 if rows==3 else 900))
    cam.data.ortho_scale=max(high.x-low.x,(high.y-low.y)*aspect)*1.10
    bpy.context.scene.camera=cam
    for loc,power,size in [((4,-10,16),3200,10),((-9,3,14),2800,10),((8,13,12),3000,9)]:
        bpy.ops.object.light_add(type='AREA',location=loc)
        lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
        lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene
    scene.world.color=(.32,.32,.32)
    scene.render.engine='CYCLES';scene.cycles.samples=20
    scene.render.resolution_x=2000 if label=='buildings' else 1600
    scene.render.resolution_y=1800 if label=='buildings' else (1100 if rows==3 else 900)
    scene.render.resolution_percentage=100
    scene.render.filepath=str(ROOT/f'docs/roster-{label}.png')
    bpy.ops.render.render(write_still=True)
