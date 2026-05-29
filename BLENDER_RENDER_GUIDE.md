# 数智光衡 · 主板产品级 3D 渲染指南

## 你的文件
- `3D_电路板_2026-05-29.obj` (7.3MB) — 在 `frontend/public/models/`
- `3D_电路板_2026-05-29.mtl` — 材质文件
- `3D_电路板_2026-05-29.step` — 备用（如果 OBJ 导入有问题）

---

## 第一步：安装 Blender + 导入模型

### 安装
1. 下载 Blender 4.x：https://www.blender.org/download/
2. 安装后打开，删除默认的立方体（选中 → X → Delete）

### 导入 OBJ
1. File → Import → Wavefront (.obj)
2. 选择 `3D_电路板_2026-05-29.obj`
3. 导入设置：
   - Forward Axis: Y Forward
   - Up Axis: Z Up  
   - ✓ Split by Group（按元件分组）
   - ✓ Image Search
4. 导入后模型可能方向不对，按 `R` → `X` → 输入 `-90` → Enter（绕 X 轴旋转 -90° 让板子平放）

### 检查模型
- 鼠标中键旋转视角
- 滚轮缩放
- Shift+中键平移
- 确认板子上的元件都完整

---

## 第二步：Precision Void 场景搭建

### 场景背景
1. 点击右侧面板的「地球图标」(World Properties)
2. Color → 点击色块，输入 `#060B14`（极暗蓝黑）
3. Strength: 0.1

### 灯光：四灯系统

#### Key Light（主光 — 暖白顶光）
1. Shift+A → Light → Area（面光源，更柔和）
2. 位置：`X: 0, Y: -5, Z: 12`
3. 旋转：`X: -65°, Y: 0, Z: 0`
4. 参数：
   - Power: 800W
   - Color: `#F5F0E8`（暖白）
   - Size: 2m × 2m
   - ✓ Cast Shadow

#### Fill Light（补光 — 底部柔光）
1. Shift+A → Light → Area
2. 位置：`X: 0, Y: 3, Z: 1`
3. 旋转：`X: -15°, Y: 0, Z: 0`
4. 参数：
   - Power: 150W
   - Color: `#8A8578`（暖灰）
   - Size: 4m × 4m

#### Rim Light（轮廓光 — 金色背光，这是高级感的关键）
1. Shift+A → Light → Area
2. 位置：`X: 0, Y: 8, Z: 2`
3. 旋转：`X: 180°, Y: 0, Z: 0`
4. 参数：
   - Power: 400W
   - Color: `#C8A96E`（香槟金）
   - Size: 1.5m × 1.5m

#### Ambient（环境微光 — 让暗面不完全黑）
1. Shift+A → Light → Point
2. 位置：`X: 0, Y: 0, Z: -8`
3. 参数：
   - Power: 50W
   - Color: `#0A0A0C`

### 场景检查点
- 主板正面（贴片元件面）朝向 Z+ 方向
- Key Light 从上方偏前打下来
- Rim Light 从背后打金色轮廓
- 按 `Z` → 选「Rendered」预览效果

---

## 第三步：材质替换（关键 — 这决定逼真度）

EasyEDA 导出的 MTL 材质是基础颜色，需要替换为 PBR 材质：

### PCB 基板材质（深绿 FR4）
1. 在右侧面板找到 PCB 基板对应的物体（通常是最大的那个 mesh）
2. 材质面板（红色球图标）→ 新建材质 → 命名 `PCB_FR4`
3. 参数：
   - Base Color: `#0B3A18`
   - Roughness: 0.35
   - Metallic: 0.0
   - Specular: 0.1

### 焊盘/引脚材质（金色金属）
1. 找到金色焊盘的物体（mtl1/mtl2/mtl17 对应金色材质）
2. 新建材质 → 命名 `Gold_Pad`
3. 参数：
   - Base Color: `#D4C0A0`
   - Roughness: 0.15
   - Metallic: 0.90
   - Specular: 0.5
4. 这个材质应用到所有引脚、焊盘、排针

### 芯片（SoC）材质
1. 新建材质 → 命名 `Chip_Silicon`
2. 参数：
   - Base Color: `#1A1A28`
   - Roughness: 0.12
   - Metallic: 0.30
   - Specular: 0.4

### 塑料连接器（USB/HDMI/排母）
1. 新建材质 → 命名 `Connector_Plastic`
2. 参数：
   - Base Color: `#1A1A20`
   - Roughness: 0.45
   - Metallic: 0.05

### 丝印标记
1. 新建材质 → 命名 `Silkscreen`
2. 参数：
   - Base Color: `#FFFFFF`
   - Emission Color: `#FFFFFF`
   - Emission Strength: 0.05（微弱的自发光模拟白色油墨）

### 批量应用材质
- 选择所有同类型的物体（按住 Shift 多选）
- 在材质面板选择对应材质 → Assign

---

## 第四步：粒子效果（空气中漂浮的微尘）

1. Shift+A → Mesh → Plane（一个平面发射器）
2. 放在 PCB 周围，尺寸约 5m × 5m
3. Particle Properties → + 新建粒子系统
4. 参数：
   - Number: 100
   - Start Frame: 0, End Frame: 600
   - Lifetime: 300
   - Velocity → Normal: 0.02
   - Gravity: 0
   - Render as: Object（用小球做粒子）
   - Scale: 0.008
5. 给粒子一个金色自发光材质

---

## 第五步：摄像机动画（60 秒时间线）

### 设置输出
1. Output Properties → Resolution: `1920 × 1080`, 30fps
2. Frame End: `1800`（60秒 × 30fps）

### 摄像机 1：全景 → 推进（0-10s / Frame 0-300）
1. Shift+A → Camera
2. Frame 0：位置 `X:0, Y:-8, Z:5`，指向 PCB 中心
3. 在 Position 和 Rotation 上按 `I` 插入关键帧
4. Frame 300：位置 `X:0, Y:-3, Z:1.5`
5. 再次按 `I` 插入关键帧
6. 曲线编辑器：选中关键帧，`T` → Ease In Out

### 摄像机 2：特写芯片（10-20s / Frame 300-600）
1. Frame 300：新建一个 Camera
2. 位置推到 RK3588 芯片上方 0.5m 处
3. Frame 300-600：缓慢环绕芯片 90°（Y 轴旋转）
4. 时间线标记：在 View 菜单绑定摄像机切换

### 摄像机 3：侧面飞过（20-30s / Frame 600-900）
1. 摄像机从 PCB 左侧飞到右侧
2. 贴着元件表面（间距约 0.3m）
3. 展示焊点、排针、连接器的侧面细节

### 摄像机 4：NPU 特写 → 拉远（30-50s / Frame 900-1500）
1. 聚焦 RK3588 散热片
2. 缓慢拉远到能看到整个 PCB
3. 周围叠加金色数据流粒子（用 Curve+粒子）

### 摄像机 5：收尾全景（50-60s / Frame 1500-1800）
1. 回到正面中景
2. 轻微旋转 + 微小的上下浮动
3. 收尾暗场（降低环境光到 0）

### 摄像机切换（Timeline Marker）
1. Timeline 面板 → Marker → Add Marker
2. 在 Frame 300/600/900/1500 处添加标记
3. 渲染时手动绑定（或使用 VSE 视频编辑器拼接）

---

## 第六步：渲染设置

### 渲染引擎
1. Render Properties → Render Engine: **Cycles**（不是 Eevee）
2. Device: GPU Compute（如果有独立显卡）

### 采样
1. Max Samples: 256（预览）/ 1024（最终输出）
2. ✓ Denoise（降噪）

### 输出
1. File Format: FFmpeg Video
2. Container: MPEG-4
3. Video Codec: H.264
4. Output Quality: High
5. 渲染时间：约 3-6 小时（取决于显卡）

### 如果不追求极致画质
1. 用 Eevee 引擎（实时渲染，速度极快）
2. ✓ Ambient Occlusion, ✓ Bloom, ✓ Screen Space Reflections
3. 效果也很好，渲染只需 10-30 分钟

---

## 第七步：后期合成（Blender Compositor）

1. 在顶部切换到 Compositing 工作区
2. ✓ Use Nodes
3. 添加节点：
   - Render Layers → Color Balance（微调色温偏暖）
   - → Glare（Fog Glow, Threshold: 0.8, Size: 6）→ 给金色高光加光晕
   - → Lens Distortion（Dispersion: 0.01）→ 极微的色散，增加"镜头感"
   - → Composite Output

---

## 快速验证流程（30 分钟出预览）

如果你只想先看效果：

1. 导入 OBJ
2. 只设置 Key Light + Rim Light
3. 材质全用默认（先不调 PBR）
4. 渲染引擎选 Eevee
5. 只设一台摄像机（正面中景，不移动）
6. 渲染单帧 → F12

看到效果满意后，再做完整的 60 秒动画。

---

## 输出后使用

- 直接嵌入答辩 PPT（插入 → 视频 → 此设备）
- 上传到 B 站/网盘作为作品附件
- 截取关键帧作为海报/封面
