"""
数智光衡 · PCB 产品级 3D 场景自动生成脚本
用法：blender --python blender_setup_scene.py
"""
import bpy
import os
import math
from mathutils import Vector

OBJ_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "models", "3D_电路板_2026-05-29.obj")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BLEND = os.path.join(OUTPUT_DIR, "PCB_Product_Showcase.blend")
OUTPUT_VIDEO = os.path.join(OUTPUT_DIR, "PCB_Showcase")

print("=" * 60)
print("  数智光衡 · PCB 产品级 3D 场景生成 v2")
print("=" * 60)

# ═══════════ STEP 1: 清场 ═══════════
print("\n[1/8] 清理默认场景...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_confirm=False)
for mat in bpy.data.materials:
    bpy.data.materials.remove(mat)

# ═══════════ STEP 2: 导入 OBJ ═══════════
print(f"[2/8] 导入 OBJ...")
bpy.ops.wm.obj_import(filepath=OBJ_PATH, forward_axis='Y', up_axis='Z')
all_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
print(f"  导入了 {len(all_objects)} 个网格物体")

# ═══════════ STEP 3: 计算包围盒 + 缩放 + 居中 ═══════════
print("[3/8] 计算模型尺寸并缩放...")

# 合并所有物体计算总包围盒
min_corner = Vector((float('inf'), float('inf'), float('inf')))
max_corner = Vector((float('-inf'), float('-inf'), float('-inf')))
for obj in all_objects:
    for corner in obj.bound_box:
        world_corner = obj.matrix_world @ Vector(corner)
        min_corner.x = min(min_corner.x, world_corner.x)
        min_corner.y = min(min_corner.y, world_corner.y)
        min_corner.z = min(min_corner.z, world_corner.z)
        max_corner.x = max(max_corner.x, world_corner.x)
        max_corner.y = max(max_corner.y, world_corner.y)
        max_corner.z = max(max_corner.z, world_corner.z)

size = max_corner - min_corner
center = (min_corner + max_corner) / 2
print(f"  原始尺寸: X={size.x:.3f}m Y={size.y:.3f}m Z={size.z:.3f}m")
print(f"  中心点: ({center.x:.3f}, {center.y:.3f}, {center.z:.3f})")

# 目标: 让最长边缩放到 5 米
target_size = 5.0
longest = max(size.x, size.y, size.z)
scale_factor = target_size / longest
print(f"  缩放系数: {scale_factor:.2f}x")

# 创建父级空物体
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
parent = bpy.context.active_object
parent.name = "PCB_Model"

# 归入父级、缩放、居中
for obj in all_objects:
    if obj != parent:
        obj.select_set(True)
parent.select_set(True)
bpy.context.view_layer.objects.active = parent

# 把位置移到原点
parent.location = (-center.x * scale_factor, -center.y * scale_factor, -center.z * scale_factor)
parent.scale = (scale_factor, scale_factor, scale_factor)

# Apply transform
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = parent
bpy.ops.object.transform_apply(location=True, scale=True)

# 旋转让主板平放（Z轴向上）
parent.rotation_euler = (math.radians(0), 0, math.radians(90))

print(f"  缩放后模型尺寸约: X={size.x*scale_factor:.1f}m Y={size.y*scale_factor:.1f}m Z={size.z*scale_factor:.1f}m")

# ═══════════ STEP 4: 材质 ═══════════
print("[4/8] 创建 PBR 材质...")

def make_mat(name, color, rough=0.35, metal=0.0, emit=(0,0,0,1), emit_str=0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit_str > 0:
        bsdf.inputs['Emission Color'].default_value = emit
        bsdf.inputs['Emission Strength'].default_value = emit_str
    return mat

mats = {
    'PCB_FR4':      make_mat('PCB_FR4',      (0.043, 0.227, 0.094), 0.30, 0.0),
    'Gold_Pad':     make_mat('Gold_Pad',     (0.831, 0.753, 0.627), 0.12, 0.92),
    'Gold_Pin':     make_mat('Gold_Pin',     (0.880, 0.800, 0.650), 0.10, 0.94),
    'Chip_Silicon': make_mat('Chip_Silicon', (0.102, 0.102, 0.157), 0.10, 0.32),
    'Plastic':      make_mat('Plastic',      (0.090, 0.090, 0.118), 0.42, 0.04),
    'Silkscreen':   make_mat('Silkscreen',   (0.88, 0.88, 0.88), 0.38, 0.0, (1,1,1,1), 0.06),
    'Silver_Metal': make_mat('Silver_Metal', (0.65, 0.65, 0.68), 0.22, 0.75),
    'Copper':       make_mat('Copper',       (0.78, 0.55, 0.35), 0.18, 0.88),
    'Dark_IC':      make_mat('Dark_IC',      (0.06, 0.06, 0.10), 0.45, 0.06),
    'White_Label':  make_mat('White_Label',  (0.92, 0.92, 0.94), 0.35, 0.02),
}

# EasyEDA MTL 编号 → PBR 材质映射
mtl_map = {
    'mtl1':  'Gold_Pad',      # 金色1
    'mtl2':  'Gold_Pad',      # 金色2
    'mtl3':  'Silver_Metal',  # 银色金属
    'mtl4':  'White_Label',   # 白色
    'mtl5':  'Gold_Pin',      # 暗金
    'mtl6':  'Dark_IC',       # 深色
    'mtl7':  'White_Label',   # 白色
    'mtl8':  'Dark_IC',       # 黑色
    'mtl9':  'Silver_Metal',  # 银色2
    'mtl10': 'Dark_IC',       # 深灰
    'mtl11': 'Copper',        # 红棕
    'mtl12': 'PCB_FR4',       # 深绿
    'mtl13': 'Silver_Metal',  # 亮银
    'mtl14': 'Dark_IC',       # 暗
    'mtl15': 'Silver_Metal',  # 银灰
    'mtl16': 'Gold_Pin',      # 暗金2
    'mtl17': 'Gold_Pad',      # 亮金
    'mtl18': 'Dark_IC',       # 深灰2
    'mtl19': 'Chip_Silicon',  # 青色
    'mtl20': 'Chip_Silicon',  # 蓝色
    'mtl21': 'Silver_Metal',  # 灰银
    'mtl22': 'Silver_Metal',  # 中灰银
    'mtl23': 'Copper',        # 铜色
    'mtl24': 'Gold_Pin',      # 黄
    'mtl25': 'Silver_Metal',  # 银灰2
}

applied = 0
for obj in all_objects:
    if obj.type != 'MESH':
        continue
    if obj.active_material:
        name = obj.active_material.name.lower()
        if name in mtl_map:
            obj.active_material = mats[mtl_map[name]]
            applied += 1
        elif name.startswith('mtl'):
            obj.active_material = mats['PCB_FR4']
            applied += 1
    else:
        obj.active_material = mats['PCB_FR4']
        applied += 1

# 找出最大的物体 → 肯定是 PCB 基板，给它 PCB 材质
largest = max(all_objects, key=lambda o: max(o.dimensions))
largest.active_material = mats['PCB_FR4']

print(f"  应用了 {applied} 个材质")

# ═══════════ STEP 5: 灯光 ═══════════
print("[5/8] 搭建灯光...")

# 模型现在约 5 米宽 → 灯光匹配这个尺度

# Key Light — 顶部暖白主光（靠近模型）
bpy.ops.object.light_add(type='AREA', location=(0, -2, 6))
kl = bpy.context.active_object
kl.name = "Key_Light"
kl.data.energy = 3000
kl.data.color = (0.961, 0.941, 0.910)
kl.data.size = 5.0
kl.rotation_euler = (math.radians(-50), 0, 0)

# Fill Light — 正面补光
bpy.ops.object.light_add(type='AREA', location=(0, -4, 1))
fl = bpy.context.active_object
fl.name = "Fill_Light"
fl.data.energy = 800
fl.data.color = (0.541, 0.525, 0.471)
fl.data.size = 6.0
fl.rotation_euler = (math.radians(-15), 0, 0)

# Rim Light — 金色轮廓光（背后）
bpy.ops.object.light_add(type='AREA', location=(0, 5, 2))
rl = bpy.context.active_object
rl.name = "Rim_Light"
rl.data.energy = 2000
rl.data.color = (0.784, 0.663, 0.431)
rl.data.size = 3.0
rl.rotation_euler = (math.radians(165), 0, 0)

# Top Fill — 正上方柔光
bpy.ops.object.light_add(type='AREA', location=(0, 0, 8))
tl = bpy.context.active_object
tl.name = "Top_Fill"
tl.data.energy = 500
tl.data.color = (0.90, 0.88, 0.85)
tl.data.size = 6.0
tl.rotation_euler = (0, 0, 0)

# Side accent — 侧面金色点光
bpy.ops.object.light_add(type='POINT', location=(4, 0, 1))
sl = bpy.context.active_object
sl.name = "Side_Accent"
sl.data.energy = 3000
sl.data.color = (0.784, 0.663, 0.431)

print("  5 盏灯: 顶光 3000W + 补光 800W + 轮廓光 2000W + 天光 500W + 侧光 3000W")

# ═══════════ STEP 6: World ═══════════
print("[6/8] 设置环境...")
world = bpy.data.worlds['World']
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.015, 0.018, 0.040, 1.0)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.2

# ═══════════ STEP 7: 摄像机 + 渲染 ═══════════
print("[7/8] 设置摄像机与渲染...")

scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.frame_start = 0
scene.frame_end = 1800
scene.render.engine = 'CYCLES'
scene.cycles.device = 'GPU'
scene.cycles.samples = 128  # 预览用低采样，最终渲染改 512+
scene.cycles.use_denoising = True
scene.render.filepath = OUTPUT_VIDEO
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'HIGH'

# 摄像机 — 放在模型前方，抬头看
bpy.ops.object.camera_add(location=(0, -6, 2.5))
cam = bpy.context.active_object
cam.name = "Camera_Main"
# 让摄像机抬头看模型
look_dir = Vector((0, 0, 0)) - cam.location
cam.rotation_euler = look_dir.to_track_quat('-Y', 'Z').to_euler()
scene.camera = cam

# 单帧测试：F12 渲染
# 动画：Ctrl+F12

print(f"  摄像机: {cam.location} → 看向原点")
print(f"  渲染: {scene.render.resolution_x}x{scene.render.resolution_y} @ 30fps")

# ═══════════ STEP 8: 添加背景平面（承接阴影） ═══════════
print("[8/8] 添加背景...")
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -2.8))
floor = bpy.context.active_object
floor.name = "Floor_Shadow"
floor_mat = make_mat('Floor', (0.03, 0.03, 0.04), 0.6, 0.0)
floor.active_material = floor_mat

# ═══════════ SAVE ═══════════
print(f"\n保存: {OUTPUT_BLEND}")
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)

print("\n" + "=" * 60)
print("  ✅ 场景生成完成 v2")
print(f"  📁 {OUTPUT_BLEND}")
print(f"  📸 按 F12 渲染单帧测试")
print(f"  🎬 按 Ctrl+F12 渲染完整 60s 动画")
print(f"  ⚠️  测试满意后，把渲染采样数从128调到512再最终渲染")
print("=" * 60)
