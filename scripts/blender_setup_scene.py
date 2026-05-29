"""
数智光衡 · PCB 产品级 3D 场景自动生成脚本 v3
用法：blender --python blender_setup_scene.py
"""
import bpy
import os
import math

OBJ_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "models", "3D_电路板_2026-05-29.obj")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BLEND = os.path.join(OUTPUT_DIR, "PCB_Product_Showcase.blend")

print("=" * 60)
print("  数智光衡 · PCB Product Showcase v3")
print("=" * 60)

# ═══ [1] 清场 ═══
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_confirm=False)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)

# ═══ [2] 导入 OBJ ═══
print("[1/6] 导入 OBJ...")
bpy.ops.wm.obj_import(filepath=OBJ_PATH, forward_axis='Y', up_axis='Z')

# 收集所有 mesh 物体
all_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"  {len(all_meshes)} 个 mesh 物体")

# ═══ [3] 缩放 ═══
print("[2/6] 缩放到合适大小...")
# EasyEDA 导出是 mm 单位, 100mm → 需要放大 100× = 10m
# 直接用 world matrix 缩放
for obj in all_meshes:
    obj.scale = (100, 100, 100)
    # Apply scale to mesh data
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(scale=True)

# 居中: 把所有物体作为一个整体平移
# 先选中所有物体
bpy.ops.object.select_all(action='DESELECT')
for obj in all_meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = all_meshes[0]

# 用 cursor 居中
bpy.ops.view3d.snap_cursor_to_center()
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
bpy.ops.view3d.snap_selected_to_cursor()

print(f"  缩放: 100x, 已居中")

# ═══ [4] 材质 ═══
print("[3/6] 创建材质...")

def mkmat(name, color, rough=0.35, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return mat

pcb = mkmat('PCB', (0.043, 0.227, 0.094), 0.30, 0.0)
gold = mkmat('Gold', (0.831, 0.753, 0.627), 0.12, 0.92)
gold2 = mkmat('Gold_Pin', (0.880, 0.800, 0.650), 0.10, 0.94)
chip = mkmat('Chip', (0.102, 0.102, 0.157), 0.10, 0.32)
plast = mkmat('Plastic', (0.090, 0.090, 0.118), 0.42, 0.04)
silver = mkmat('Silver', (0.65, 0.65, 0.68), 0.22, 0.75)
white = mkmat('White_Silk', (0.88, 0.88, 0.88), 0.38, 0.02)
dark = mkmat('Dark', (0.06, 0.06, 0.10), 0.45, 0.06)

mtl_map = {
    'mtl1': gold, 'mtl2': gold, 'mtl3': silver, 'mtl4': white,
    'mtl5': gold2, 'mtl6': dark, 'mtl7': white, 'mtl8': dark,
    'mtl9': silver, 'mtl10': dark, 'mtl11': gold2, 'mtl12': pcb,
    'mtl13': silver, 'mtl14': dark, 'mtl15': silver, 'mtl16': gold2,
    'mtl17': gold, 'mtl18': dark, 'mtl19': chip, 'mtl20': chip,
    'mtl21': silver, 'mtl22': silver, 'mtl23': gold2, 'mtl24': gold2,
    'mtl25': silver,
}

n = 0
for obj in all_meshes:
    if obj.active_material:
        k = obj.active_material.name.lower()
        if k in mtl_map:
            obj.active_material = mtl_map[k]
            n += 1
        elif k.startswith('mtl'):
            obj.active_material = pcb
            n += 1
    else:
        obj.active_material = pcb
        n += 1
print(f"  {n} 个材质已应用")

# ═══ [5] 灯光 ═══
print("[4/6] 灯光...")

def light(ptype, loc, energy, color, size=3):
    bpy.ops.object.light_add(type=ptype, location=loc)
    l = bpy.context.active_object
    l.data.energy = energy
    l.data.color = color
    if ptype == 'AREA':
        l.data.size = size
    return l

light('AREA',  (0, -8, 8),   4000, (0.96, 0.94, 0.91), 6)
light('AREA',  (0, -5, 2),   1500, (0.54, 0.52, 0.47), 8)
light('AREA',  (0, 6, 3),    2500, (0.78, 0.66, 0.43), 4)
light('AREA',  (0, 0, 10),   1000, (0.90, 0.88, 0.85), 8)
light('POINT', (6, 0, 2),    4000, (0.78, 0.66, 0.43))

# ═══ [6] 场景 + 摄像机 ═══
print("[5/6] 场景设置...")

world = bpy.data.worlds['World']
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.015, 0.018, 0.040, 1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.15

s = bpy.context.scene
s.render.resolution_x = 1920
s.render.resolution_y = 1080
s.render.fps = 30
s.frame_end = 1800
s.render.engine = 'CYCLES'
s.cycles.device = 'GPU'
s.cycles.samples = 128
s.cycles.use_denoising = True

bpy.ops.object.camera_add(location=(6, -8, 5))
cam = bpy.context.active_object
cam.name = "Camera"
# look at origin
from mathutils import Vector
d = Vector((0, 0, 0)) - cam.location
cam.rotation_euler = d.to_track_quat('-Y', 'Z').to_euler()
s.camera = cam

# 地板
bpy.ops.mesh.primitive_plane_add(size=50, location=(0, 0, -6))
floor = bpy.context.active_object
floor.name = "Floor"
fm = bpy.data.materials.new("FloorMat")
fm.use_nodes = True
fm.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (0.02, 0.02, 0.03, 1)
fm.node_tree.nodes.get("Principled BSDF").inputs['Roughness'].default_value = 0.7
floor.active_material = fm

# ═══ 保存 ═══
print("[6/6] 保存...")
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)

print(f"\n✅ Done! → {OUTPUT_BLEND}")
print("  打开后按 F12 渲染测试")
print("  满意后把采样数从128调到512 → Ctrl+F12 渲染动画")
