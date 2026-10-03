"""Rebuild the editable Ronaldinho study and game GLB with Blender 4.5 LTS.

blender -b --factory-startup --python scripts/build-player.py
All body geometry and joint weights derive from the vendored CC0 MakeHuman core.
Coordinates: Blender Z up, forward -Y; exported glTF Y up, forward +Z.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/3d/source'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
vertices, faces, groups = [], [], {}
group = ''
for line in (SOURCE / 'base.obj').read_text().splitlines():
    fields = line.split()
    if not fields:
        continue
    if fields[0] == 'v':
        vertices.append(Vector(tuple(map(float, fields[1:4]))))
    elif fields[0] == 'g':
        group = fields[1]
        groups[group] = set()
    elif fields[0] == 'f':
        indices = [int(v.split('/')[0]) - 1 for v in fields[1:]]
        groups[group].update(indices)
        if group == 'body':
            faces.append(indices)

# Core macro targets convert the neutral base into an adult athletic male.
for filename, influence in [('african-male-young.target', .75),
                            ('caucasian-male-young.target', .25),
                            ('universal-male-young-maxmuscle-averageweight.target', .40),
                            ('universal-male-young-averagemuscle-averageweight.target', .60)]:
    for line in (SOURCE / filename).read_text().splitlines():
        parts = line.split()
        if len(parts) == 4 and not line.startswith('#'):
            vertices[int(parts[0])] += Vector(tuple(map(float, parts[1:]))) * influence

# Sculpt proportions consistently for mesh and skeleton. No disconnected body parts.
def sculpt(v):
    x, y, z = v
    height = (y + 8.18305) * .106
    if height > 1.55:
        height = 1.55 + (height - 1.55) * 1.08
    head = max(0, min(1, (height - 1.48) / .12))
    chest = math.exp(-((height - 1.30) / .19) ** 2)
    x *= 1.0 + .20 * head + .10 * chest
    depth = z * (1 + .10 * head)
    return Vector((x * .106, -depth * .106, height))

points = [sculpt(v) for v in vertices]
rig_data = json.loads((SOURCE / 'rig.game_engine.json').read_text())
weights = json.loads((SOURCE / 'weights.game_engine.json').read_text())['weights']

def endpoint(data):
    ids = groups[data['cube_name']] if data['strategy'] == 'CUBE' else data['vertex_indices']
    return sum((points[i] for i in ids), Vector()) / len(ids)

armature = bpy.data.armatures.new('Legend shared deform rig')
rig = bpy.data.objects.new('Ronaldinho', armature)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, data in rig_data.items():
    bone = armature.edit_bones.new(name)
    bone.head = endpoint(data['head'])
    bone.tail = endpoint(data['tail'])
    if (bone.tail - bone.head).length < .001:
        bone.tail = bone.head + Vector((0, 0, .05))
    bone.roll = data['roll']
for name, data in rig_data.items():
    if data['parent']:
        armature.edit_bones[name].parent = armature.edit_bones[data['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)

def material(name, color, roughness=.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return m

skin = material('Warm umber skin', (.29, .115, .048))
yellow = material('Brazil gold cloth', (.82, .46, .009))
blue = material('Royal blue shorts', (.018, .08, .36))
green = material('Forest green trim', (.012, .16, .065))
white = material('Warm white', (.88, .90, .82))
black = material('Black leather boots', (.014, .019, .023), .36)
hair_mat = material('Dark curls', (.018, .009, .006))
eye_white = material('Eye whites', (.84, .80, .69), .3)
iris = material('Dark brown eyes', (.028, .012, .005), .22)

def skin_mesh(name, source_faces, mat, expand=0):
    ids = sorted(set(i for face in source_faces for i in face))
    remap = {old: new for new, old in enumerate(ids)}
    coords = [points[i].copy() for i in ids]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(coords, [], [[remap[i] for i in face] for face in source_faces])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    if expand:
        for v in mesh.vertices:
            v.co += v.normal * expand
    for name, values in weights.items():
        vg = obj.vertex_groups.new(name=name)
        for old, weight in values:
            if old in remap:
                vg.add([remap[old]], weight, 'REPLACE')
    deform = obj.modifiers.new('Weighted joint deformation', 'ARMATURE')
    deform.object = rig
    deform.use_deform_preserve_volume = True
    obj.parent = rig
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj

body = skin_mesh('Anatomical continuous core mesh', faces, skin)

def center(face):
    return sum((points[i] for i in face), Vector()) / len(face)

# Garments follow anatomical topology and use exactly the underlying skin weights.
shirt_faces, shorts_faces, socks_faces, boot_faces = [], [], [], []
for face in faces:
    x, y, z = center(face)
    if .96 < z < 1.655 and (abs(x) < .255 or z > 1.285):
        shirt_faces.append(face)
    if .635 < z < 1.015 and abs(x) < .285:
        shorts_faces.append(face)
    if .15 < z < .51:
        socks_faces.append(face)
    if z < .16:
        boot_faces.append(face)
shirt = skin_mesh('Tailored gold jersey', shirt_faces, yellow, .016)
shorts = skin_mesh('Blue football shorts', shorts_faces, blue, .024)
socks = skin_mesh('White football socks', socks_faces, white, .008)
boots = skin_mesh('Sculpted leather boots', boot_faces, black, .014)
# Covered anatomy is retained in the source OBJ, but omitted beneath kit in the game
# mesh to avoid z-fighting as independently tailored surfaces bend at the joints.
covered={tuple(f) for f in shirt_faces+shorts_faces+socks_faces+boot_faces}
bpy.data.objects.remove(body,do_unlink=True)
body=skin_mesh('Visible anatomical core', [f for f in faces if tuple(f) not in covered], skin)

def finish_garment(obj, bottom, top=None):
    """Flatten open edge loops into sewn hems, then relax the cloth surface."""
    bm=bmesh.new();bm.from_mesh(obj.data)
    for v in bm.verts:
        if any(e.is_boundary for e in v.link_edges):
            if v.co.z < bottom + .10: v.co.z=bottom
            elif top and v.co.z > top - .05: v.co.z=top
    # Smooth cloth independently of the body; preserve the now clean borders.
    inside=[v for v in bm.verts if not any(e.is_boundary for e in v.link_edges)]
    for _ in range(5):
        bmesh.ops.smooth_vert(bm,verts=inside,factor=.55,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    solid=obj.modifiers.new('Sewn fabric thickness','SOLIDIFY');solid.thickness=.004

finish_garment(shirt,.97,1.655)
finish_garment(shorts,.65,1.02)
finish_garment(socks,.15,.51)
# A looser jersey front and shorts hide anatomical surface detail under fabric.
for v in shirt.data.vertices:
    x,y,z=v.co
    if abs(x)<.255 and 1.02<z<1.49 and y<0:
        v.co.y=-.205*math.sqrt(max(.10,1-(x/.30)**2))
    elif abs(x)<.255 and 1.02<z<1.49 and y>0:
        v.co.y=.13*math.sqrt(max(.10,1-(x/.30)**2))
for v in shorts.data.vertices:
    if v.co.y<0:v.co.y-=.012
for obj in [shirt, shorts, socks]:
    obj.data.materials.append(green)
    for p in obj.data.polygons:
        z = sum(obj.data.vertices[i].co.z for i in p.vertices) / len(p.vertices)
        if (obj == shirt and z > 1.625) or (obj == socks and z > .49):
            p.material_index = 1

def bind(obj, bone):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    mod = obj.modifiers.new('Follow skeleton', 'ARMATURE')
    mod.object = rig
    obj.parent = rig
    return obj

def sphere(name, position, scale, mat, bone='head'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    bind(obj, bone)
    return obj

for side in ['l', 'r']:
    eye = sum((points[i] for i in groups['joint-' + side + '-eye']), Vector()) / 8
    sphere('Eye.' + side, eye, (.022, .018, .013), eye_white)
    sphere('Iris.' + side, eye + Vector((0, -.016, 0)), (.010, .004, .010), iris)

# Hair cap taken directly from the scalp, with authored curved ponytail locks.
scalp = [f for f in faces if center(f).z > 1.88 or
         (center(f).z > 1.69 and center(f).y > .005)]
cap=skin_mesh('Swept back scalp', scalp, hair_mat, .008)
finish_garment(cap,1.64)

def tube(name, path, radii, mat, bone='head', sides=10):
    verts, fs = [], []
    for i, pos in enumerate(path):
        tangent = Vector(path[min(i + 1, len(path)-1)]) - Vector(path[max(0, i-1)])
        tangent.normalize()
        u = tangent.cross(Vector((1, 0, 0))).normalized()
        v = tangent.cross(u).normalized()
        for j in range(sides):
            a = 2 * math.pi * j / sides
            verts.append(Vector(pos) + radii[i] * (math.cos(a)*u + math.sin(a)*v))
        if i:
            for j in range(sides):
                a=(i-1)*sides+j; b=(i-1)*sides+(j+1)%sides
                fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))), tuple(range(len(verts)-sides,len(verts)))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],fs);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return bind(obj,bone)

for i in range(17):
    theta=2*math.pi*i/17
    x=.048*math.cos(theta);z=1.73+.06*math.sin(theta)
    path=[(x,.063,z),(x*1.1,.12,z-.01),(x*.8,.18,z-.10),
          (x*.9+.009*math.sin(i),.17,z-.20),(x*.5,.15,z-.24)]
    tube('Ponytail lock %02d'%i,path,[.017,.019,.021,.017,.002],hair_mat)
# Thin fitted elastic band, following the head instead of floating over it.
band_faces=[f for f in faces if 1.86<center(f).z<1.89]
band=skin_mesh('Fitted black headband',band_faces,black,.013)
finish_garment(band,1.863,1.89)
for i in range(11):
    x=(i-5)*.014
    tube('Swept crown lock %02d'%i,[(x,-.080,1.888),(x*1.1,-.040,1.933),
         (x*.9,.015,1.937),(x*.7,.070,1.898)], [.007,.009,.010,.005],hair_mat)

def text_badge(text, pos, size, mat, bone):
    curve=bpy.data.curves.new('Kit lettering','FONT');curve.body=text;curve.align_x='CENTER'
    curve.size=size;curve.extrude=.0004
    obj=bpy.data.objects.new('Kit '+text,curve);bpy.context.collection.objects.link(obj)
    obj.location=pos;obj.rotation_euler=(math.pi/2,0,0);curve.materials.append(mat)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.convert(target='MESH');obj.select_set(False);bind(obj,bone)
text_badge('10',(0,-.212,1.15),.14,green,'spine_02')
text_badge('BRASIL',(0,-.211,1.40),.038,green,'spine_03')

rest={b.name:b.matrix_local.copy() for b in armature.bones}
lengths={b.name:b.length for b in armature.bones}
head_pos={b.name:b.head_local.copy() for b in armature.bones}

def aim(name, head, tail):
    """Pose a deform bone without changing its length or scale."""
    head,tail=Vector(head),Vector(tail)
    original=rest[name].to_quaternion()
    direction=original @ Vector((0,1,0))
    rotation=direction.rotation_difference((tail-head).normalized()) @ original
    rig.pose.bones[name].matrix=Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()

def two_bone(hip, ankle, a, b):
    delta=ankle-hip;dist=delta.length
    along=delta.normalized()
    dist=min(a+b-.0001,max(abs(a-b)+.0001,dist))
    u=(a*a-b*b+dist*dist)/(2*dist)
    v=math.sqrt(max(0,a*a-u*u))
    forward=Vector((0,-1,0));pole=(forward-along*forward.dot(along)).normalized()
    return hip+along*u+pole*v

def smooth(x):return x*x*(3-2*x)

def envelope(t):
    keys=[(0,0),(.18,0),(.46,.68),(.64,1),(.73,.90),(1.05,0),(1.4,0)]
    for (a,av),(b,bv) in zip(keys,keys[1:]):
        if a<=t<=b:return av+(bv-av)*smooth((t-a)/(b-a))
    return 0

def pose(kind,t):
    for pb in rig.pose.bones:
        pb.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    env=envelope(t)
    side='l' if kind.endswith('_l') else 'r'
    sign=1 if side=='l' else -1
    is_leg=kind.startswith(('foot','knee','recover','miss'))
    weight=env if is_leg else 0
    shift=Vector((-sign*.072*weight,0,-.033-.010*weight))
    recover=smooth(max(0,min(1,(t-.64)/.30)))*env if kind.startswith('recover') else 0
    shift.x-=sign*.016*recover
    pelvis=rig.pose.bones['pelvis'];pelvis.matrix=Matrix.Translation(shift) @ rest['pelvis']
    bpy.context.view_layer.update()
    for s in ['l','r']:
        hip=rig.pose.bones['thigh_'+s].head.copy()
        ankle=head_pos['foot_'+s].copy()
        if s==side and is_leg:
            lift=.265 if not kind.startswith('knee') else .425
            forward=.215 if not kind.startswith('knee') else .145
            if kind.startswith('recover'):forward+=.025*recover
            if kind.startswith('miss'):forward-=.05
            ankle+=Vector((0,-forward*env,lift*env))
        knee=two_bone(hip,ankle,lengths['thigh_'+s],lengths['calf_'+s])
        aim('thigh_'+s,hip,knee);aim('calf_'+s,knee,ankle)
        toe=ankle+(armature.bones['foot_'+s].tail_local-head_pos['foot_'+s])
        if s==side and is_leg and not kind.startswith('knee'):toe.z+=.045*env
        aim('foot_'+s,ankle,toe)
    # Shoulder and elbow movement counterbalance the lifted leg.
    for s,sgn in [('l',1),('r',-1)]:
        shoulder=rig.pose.bones['upperarm_'+s].head.copy()
        arm=Vector((sgn*(.30+.12*weight),-.04-.13*weight*(s==side),-.92)).normalized()
        if kind=='celebrate':arm=Vector((sgn*.70,0,.70)).normalized()*envelope(t)+arm*(1-envelope(t))
        elbow=shoulder+arm.normalized()*lengths['upperarm_'+s]
        wrist=elbow+Vector((sgn*.06,-.13-.12*weight,-.19)).normalized()*lengths['lowerarm_'+s]
        aim('upperarm_'+s,shoulder,elbow);aim('lowerarm_'+s,elbow,wrist)
    head=rig.pose.bones['head']
    tilt=-.09
    if kind=='header':tilt+=.20*env
    if kind=='defeat':tilt+=.34*env
    head.rotation_mode='XYZ';head.rotation_euler.x+=tilt
    if kind=='ready':
        chest=rig.pose.bones['spine_03'];chest.rotation_mode='XYZ'
        chest.rotation_euler.x+=.008*math.sin(t*math.pi*2/1.4)
    bpy.context.view_layer.update()

# Contact markers are children of the actual deform bones, exported as glTF nodes.
markers={}
for s in ['l','r']:
    ankle=head_pos['foot_'+s]
    dorsal=[v.co.z for v in boots.data.vertices if abs(v.co.x-ankle.x)<.035
            and abs(v.co.y-(ankle.y-.088))<.025]
    foot=Vector((ankle.x,ankle.y-.088,max(dorsal)))
    knee=head_pos['calf_'+s]+Vector((0,-.041,.014))
    markers['foot_'+s]=('foot_'+s,foot)
    markers['knee_'+s]=('calf_'+s,knee)
markers['header']=('head',Vector((0,-.053,max(p.z for p in points[:13380])+.003)))
for name,(bone,position) in markers.items():
    obj=bpy.data.objects.new('contact_'+name,None);bpy.context.collection.objects.link(obj)
    obj.parent=rig;obj.parent_type='BONE';obj.parent_bone=bone
    obj.matrix_world=Matrix.Translation(position)

# Project instep markers onto the deformed boot, not just its bone or rest mesh.
# The small offset prevents floating-point z-fighting at the spherical contact.
for name in ['foot_l','foot_r']:
    pose(name,.64)
    bpy.context.view_layer.update()
    marker=bpy.data.objects['contact_'+name]
    origin=marker.matrix_world.translation+Vector((0,0,.5))
    evaluated=boots.evaluated_get(bpy.context.evaluated_depsgraph_get())
    hit,location,normal,_=evaluated.ray_cast(origin,Vector((0,0,-1)),distance=1)
    if not hit:raise RuntimeError('No boot surface under '+name)
    marker.matrix_world=Matrix.Translation(location+Vector((0,0,.001)))
    bpy.context.view_layer.update()
pose('ready',0)

scene=bpy.context.scene;scene.render.fps=60
clips=['ready','foot_l','foot_r','knee_l','knee_r','header','recover_l','recover_r','miss_l','miss_r','celebrate','defeat']
manifest={'version':1,'player':'ronaldinho','rig':'makehuman-game-engine','duration':1.4,
          'contactTime':.64,'ballRadius':.105,'clips':{},'qualityStatus':'study-awaiting-visual-review'}
for kind in clips:
    rig.animation_data_clear()
    action=bpy.data.actions.new(kind);action.use_fake_user=True
    rig.animation_data_create();rig.animation_data.action=action
    for frame in range(85):
        scene.frame_set(frame)
        pose(kind,frame/60)
        for pb in rig.pose.bones:
            pb.rotation_mode='QUATERNION'
            pb.keyframe_insert('location',frame=frame,group=pb.name)
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
            pb.keyframe_insert('scale',frame=frame,group=pb.name)
    if kind in markers:
        scene.frame_set(38, subframe=.4)
        pose(kind,.64)
        obj=bpy.data.objects['contact_'+kind]
        p=obj.matrix_world.translation
        manifest['clips'][kind]={'point':[round(p.x,5),round(p.z+.105,5),round(-p.y,5)],
                                  'limb':markers[kind][0],'contactTime':.64}

# Keep a clean, editable .blend with source topology, weights, materials and actions.
rig.animation_data.action=bpy.data.actions['ready']
scene.frame_start=0;scene.frame_end=84;scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/3d/blender/ronaldinho.blend'), compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/ronaldinho.glb'),
    export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',
    export_force_sampling=True,export_skins=True,export_all_influences=False,
    export_yup=True,export_cameras=False,export_lights=False)
(ROOT/'public/models/ronaldinho.contacts.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PLAYER_BUILD_COMPLETE',json.dumps(manifest))
