"""
数智光衡 · PCB 产品级 3D 场景自动生成脚本
用法：blender --python blender_setup_scene.py

生成完成后会在同目录下保存 setup_scene.blend
打开后按 F12 渲染单帧，Ctrl+F12 渲染动画
"""
import bpy
import os
import math

# ═══════════════════════════════════════════════════
# CONFIG — 修改这里的路径
# ═══════════════════════════════════════════════════
OBJ_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "models", "3D_电路板_2026-05-29.obj")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BLEND = os.path.join(OUTPUT_DIR, "PCB_Product_Showcase.blend")
OUTPUT_VIDEO = os.path.join(OUTPUT_DIR, "PCB_Showcase.mp4")

# ═══════════════════════════════════════════════════
# COLOR PALETTE
# ═══════════════════════════════════════════════════
BG_COLOR = (0.024, 0.028, 0.055, 1.0)     # #060B14
KEY_LIGHT_COLOR = (0.961, 0.941, 0.910)    # #F5F0E8
FILL_LIGHT_COLOR = (0.541, 0.525, 0.471)   # #8A8578
RIM_LIGHT_COLOR = (0.784, 0.663, 0.431)    # #C8A96E
GOLD_COLOR = (0.784, 0.663, 0.431)
PCB_GREEN = (0.043, 0.227, 0.094)          # #0B3A18
CHIP_COLOR = (0.102, 0.102, 0.157)         # #1A1A28
PAD_GOLD = (0.831, 0.753, 0.627)           # #D4C0A0

print("=" * 50)
print("  数智光衡 · PCB 产品级 3D 场景生成")
print("=" * 50)

# ═══════════════════════════════════════════════════
# STEP 1: 清理默认场景
# ═══════════════════════════════════════════════════
print("\n[1/7] 清理默认场景...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_confirm=False)

# 清理默认材质
for mat in bpy.data.materials:
    bpy.data.materials.remove(mat)

# ═══════════════════════════════════════════════════
# STEP 2: 导入 OBJ 模型
# ═══════════════════════════════════════════════════
print(f"[2/7] 导入 OBJ: {OBJ_PATH}")
bpy.ops.wm.obj_import(
    filepath=OBJ_PATH,
    forward_axis='Y',
    up_axis='Z',
)

# 选中所有导入的物体
pcb_objects = [obj for obj in bpy.context.selected_objects]
all_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"  导入了 {len(all_objects)} 个网格物体")

# 把所有物体归入一个父级空物体
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
parent = bpy.context.active_object
parent.name = "PCB_Model"
parent.scale = (0.8, 0.8, 0.8)
for obj in all_objects:
    if obj != parent:
        obj.select_set(True)
parent.select_set(True)
bpy.context.view_layer.objects.active = parent
bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

# ═══════════════════════════════════════════════════
# STEP 3: 创建 PBR 材质
# ═══════════════════════════════════════════════════
print("[3/7] 创建 PBR 材质...")

def create_pbr_mat(name, base_color, roughness=0.35, metallic=0.0, emission=(0,0,0,1), emission_strength=0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = (*base_color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Emission Color'].default_value = emission
    bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat

# 材质库
materials = {
    'PCB_FR4':         create_pbr_mat('PCB_FR4',         (0.043, 0.227, 0.094), 0.35, 0.0),
    'Gold_Pad':        create_pbr_mat('Gold_Pad',        (0.831, 0.753, 0.627), 0.15, 0.90),
    'Gold_Pin':        create_pbr_mat('Gold_Pin',        (0.880, 0.800, 0.650), 0.12, 0.92),
    'Chip_Silicon':    create_pbr_mat('Chip_Silicon',    (0.102, 0.102, 0.157), 0.12, 0.30),
    'Connector_Plastic': create_pbr_mat('Connector_Plastic', (0.102, 0.102, 0.125), 0.45, 0.05),
    'Silkscreen':      create_pbr_mat('Silkscreen',      (0.90, 0.90, 0.90), 0.40, 0.0, (1,1,1,1), 0.08),
    'Metal_Shield':    create_pbr_mat('Metal_Shield',    (0.20, 0.20, 0.22), 0.25, 0.70),
    'Dark_Plastic':    create_pbr_mat('Dark_Plastic',    (0.06, 0.06, 0.10), 0.50, 0.02),
    'Copper_Trace':    create_pbr_mat('Copper_Trace',    (0.78, 0.66, 0.43), 0.20, 0.85),
    'Heatsink_Alum':   create_pbr_mat('Heatsink_Alum',   (0.24, 0.24, 0.27), 0.22, 0.72),
}

# 分析 MTL 材质 → 映射到 PBR
# EasyEDA 导出的材质编号 → 实际含义
mtl_mapping = {
    'mtl1':  'Gold_Pad',       # Ka 1.0 0.67 0.51 — 金色
    'mtl2':  'Gold_Pad',       # Ka 1.0 0.71 0.55 — 金色变体
    'mtl3':  'Metal_Shield',   # Ka 0.85 0.85 0.85 — 银色金属
    'mtl4':  'Silkscreen',     # Ka 1.0 1.0 1.0 — 白色
    'mtl5':  'Gold_Pin',       # Ka 0.59 0.46 0.00 — 暗金色
    'mtl6':  'Dark_Plastic',   # Ka 0.25 0.25 0.25 — 深色
    'mtl7':  'Silkscreen',     # Ka 1.0 1.0 1.0 — 白色
    'mtl8':  'Dark_Plastic',   # Ka 0.0 0.0 0.0 — 黑色
    'mtl17': 'Gold_Pad',       # Ka 0.95 0.76 0.18 — 亮金色
    'mtl19': 'Chip_Silicon',   # Ka 0.0 1.0 1.0 — 青色（芯片标识色）
    'mtl20': 'Chip_Silicon',   # Ka 0.15 0.61 1.0 — 蓝色芯片
}

# 应用材质映射
applied_count = 0
for obj in all_objects:
    if obj.type != 'MESH':
        continue
    if not obj.active_material:
        continue
    mtl_name = obj.active_material.name.lower()
    if mtl_name in mtl_mapping:
        target_mat = materials[mtl_mapping[mtl_name]]
        obj.active_material = target_mat
        applied_count += 1
    elif mtl_name.startswith('mtl'):
        # 未匹配的默认给 PCB 材质
        obj.active_material = materials['PCB_FR4']
        applied_count += 1

# 没有材质的物体给 PCB 材质
for obj in all_objects:
    if obj.type == 'MESH' and not obj.active_material:
        obj.active_material = materials['PCB_FR4']
        applied_count += 1

print(f"  应用了 {applied_count} 个材质")

# ═══════════════════════════════════════════════════
# STEP 4: 四灯系统
# ═══════════════════════════════════════════════════
print("[4/7] 搭建四灯系统...")

# Key Light — 暖白顶光
bpy.ops.object.light_add(type='AREA', location=(0, -5, 10))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 800
key_light.data.color = KEY_LIGHT_COLOR
key_light.data.size = 3.0
key_light.rotation_euler = (math.radians(-60), 0, 0)

# Fill Light — 底部补光
bpy.ops.object.light_add(type='AREA', location=(0, 3, 1))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 150
fill_light.data.color = FILL_LIGHT_COLOR
fill_light.data.size = 5.0
fill_light.rotation_euler = (math.radians(-15), 0, 0)

# Rim Light — 金色轮廓光
bpy.ops.object.light_add(type='AREA', location=(0, 8, 2))
rim_light = bpy.context.active_object
rim_light.name = "Rim_Light"
rim_light.data.energy = 400
rim_light.data.color = RIM_LIGHT_COLOR
rim_light.data.size = 2.0
rim_light.rotation_euler = (math.radians(180), 0, 0)

# Ambient — 极暗环境球
bpy.ops.object.light_add(type='POINT', location=(0, 0, -8))
ambient = bpy.context.active_object
ambient.name = "Ambient"
ambient.data.energy = 50
ambient.data.color = (0.04, 0.04, 0.06)

# ═══════════════════════════════════════════════════
# STEP 5: World 背景
# ═══════════════════════════════════════════════════
print("[5/7] 设置世界背景...")
world = bpy.data.worlds['World']
world.use_nodes = True
bg_node = world.node_tree.nodes.get('Background')
bg_node.inputs['Color'].default_value = (0.024, 0.028, 0.055, 1.0)
bg_node.inputs['Strength'].default_value = 0.3

# ═══════════════════════════════════════════════════
# STEP 6: 摄像机动画 (60秒 × 30fps = 1800帧)
# ═══════════════════════════════════════════════════
print("[6/7] 设置摄像机动画...")

# 渲染设置
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = 0
bpy.context.scene.frame_end = 1800
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.device = 'GPU'
bpy.context.scene.cycles.samples = 256
bpy.context.scene.cycles.use_denoising = True
bpy.context.scene.render.filepath = OUTPUT_VIDEO
bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
bpy.context.scene.render.ffmpeg.format = 'MPEG4'
bpy.context.scene.render.ffmpeg.codec = 'H264'
bpy.context.scene.render.ffmpeg.constant_rate_factor = 'HIGH'

# 摄像机 1: 全景 → 中景 (Frame 0-300, 0-10s)
bpy.ops.object.camera_add(location=(0, -8, 5))
cam1 = bpy.context.active_object
cam1.name = "Camera_Main"
cam1.rotation_euler = (math.radians(65), 0, 0)
bpy.context.scene.camera = cam1

# Frame 0 关键帧
cam1.location = (0, -8, 5)
cam1.keyframe_insert(data_path='location', frame=0)

# Frame 300 关键帧（推近）
cam1.location = (0, -3, 2)
cam1.keyframe_insert(data_path='location', frame=300)

# Frame 600 关键帧（微环绕）
cam1.location = (4, -2.5, 1.5)
cam1.rotation_euler = (math.radians(70), 0, math.radians(15))
cam1.keyframe_insert(data_path='location', frame=600)
cam1.keyframe_insert(data_path='rotation_euler', frame=600)

# Frame 1200 关键帧（回到正面中景）
cam1.location = (0, -4, 2.5)
cam1.rotation_euler = (math.radians(68), 0, 0)
cam1.keyframe_insert(data_path='location', frame=1200)
cam1.keyframe_insert(data_path='rotation_euler', frame=1200)

# Frame 1800 关键帧（缓慢拉远收尾）
cam1.location = (0, -7, 4)
cam1.keyframe_insert(data_path='location', frame=1800)

# 设置所有关键帧为缓入缓出
for fcurve in cam1.animation_data.action.fcurves:
    for keyframe in fcurve.keyframe_points:
        keyframe.interpolation = 'BEZIER'
        keyframe.easing = 'EASE_IN_OUT'

print("  摄像机动画: 0-300(推进) 300-600(环绕) 600-1200(中景) 1200-1800(拉远)")

# ═══════════════════════════════════════════════════
# STEP 7: 保存 .blend 文件
# ═══════════════════════════════════════════════════
print(f"[7/7] 保存: {OUTPUT_BLEND}")
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)

print("\n" + "=" * 50)
print("  ✅ 场景生成完成！")
print(f"  📁 文件: {OUTPUT_BLEND}")
print(f"  🎬 渲染动画: 打开后按 Ctrl+F12")
print(f"  📸 渲染单帧: 打开后按 F12")
print(f"  ⚙️  渲染引擎: CYCLES GPU")
print(f"  ⏱️  预计渲染时间: 2-5 小时(取决于GPU)")
print("=" * 50)
