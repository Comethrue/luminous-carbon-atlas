# 数据真实化操作指南

## 当前状态

| 数据层 | 现状 | 真实化难度 |
|--------|------|-----------|
| 静态常量（碳排因子、电价、标准） | ✅ 已是真实数据 | 无需操作 |
| 实时天气/辐射/AQI | ❌ 模拟 | ⭐ 5分钟，免费 |
| 碳交易价格 | ❌ 模拟 | ⭐⭐ 需注册 |
| 10城环境数据 | ❌ 模拟 | ⭐ 同天气API |
| 24h/7日/月度能耗 | ❌ 模拟 | ⭐⭐⭐ 需硬件 |
| 检测人数/分区状态 | ❌ 模拟 | ⭐⭐⭐ 需AI推理管线 |

---

## 第一步：天气数据真实化（5分钟，免费）

### 1. 注册和风天气 API

打开 https://dev.qweather.com/ → 注册 → 控制台 → 创建应用 → 选择"免费订阅"（1000次/天，足够用）

### 2. 获取 Key 和城市 ID

- API Key 在控制台查看
- 广州城市 ID: `101280101`
- 其他城市 ID 查询: https://github.com/qwd/LocationList

### 3. 设置环境变量并启动

```bash
# Windows PowerShell
$env:QWEATHER_KEY="你的API_Key"
$env:QWEATHER_CITY_ID="101280101"

# 启动后端
cd backend
python server.py
```

### 4. 验证

浏览器打开 http://localhost:8000/api/environment

返回的 `_source` 字段从 `"simulated"` 变为 `"qweather"` 即成功。

---

## 第二步：碳交易价格真实化（可选）

### 注册 Electricity Maps

打开 https://www.electricitymaps.com/ → 注册 → 获取 API token（免费层每月1000次）

```bash
$env:ELECTRICITY_MAPS_KEY="你的token"
```

### 验证

http://localhost:8000/api/live-data

`carbonPrice.source` 变为 `"Electricity Maps · 实时电网数据"`。

---

## 第三步：能耗数据真实化（需要硬件）

### 需要的硬件

- INA226 功率监测模块 ×3（每区一个）— ¥12×3=¥36
- 已焊接在感知底板上，I2C 连接到 Q6A

### 后端改造

在 `backend/server.py` 中新增真实能耗读取端点：

```python
# 读取 INA226 功率数据（I2C 地址 0x40/0x41/0x42）
import smbus

INA226_ADDR = { 'left': 0x40, 'center': 0x41, 'right': 0x42 }
bus = smbus.SMBus(0)  # /dev/i2c-0

def read_ina226_power(addr):
    """读取 INA226 功率寄存器（地址 0x03）"""
    raw = bus.read_word_data(addr, 0x03)
    # INA226 数据格式转换
    return (raw >> 8 | raw << 8) & 0xFFFF  # 字节交换

@app.get("/api/energy/realtime")
def energy_realtime():
    powers = {}
    for zone, addr in INA226_ADDR.items():
        try:
            raw = read_ina226_power(addr)
            powers[zone] = raw * 1.25  # 根据采样电阻计算实际功率
        except:
            powers[zone] = 0
    return {
        "total_w": sum(powers.values()),
        "zones": powers,
        "timestamp": datetime.now().isoformat(),
    }
```

---

## 第四步：AI检测数据真实化（需要完整系统）

### 需要的组件

- USB 摄像头（UVC 协议）
- YOLOv8n QNN 模型（已部署在 Q6A NPU）
- 完整的 `main.py` 推理管线

### 数据流

```
USB摄像头 → OpenCV → QNN NPU推理 → 检测结果(detections[])
                                    ↓
                            controller.process()
                                    ↓
                            分区功率 + 策略 → /api/status
                                    ↓
                            INA226 功耗验证
```

当完整的 `main.py --qnn` 启动后，`/api/status` 返回的就是真实的 AI 检测数据，不再使用 mock。

---

## 真实化后的完整数据流

```
真实数据源                    后端端点               前端展示
──────────                   ────────              ────────
和风天气 API ─────────→  /api/environment ────→  EnvironmentCard
                           /api/environment/lighting
                           
Electricity Maps ──────→  /api/live-data ──────→  ChinaEnergyMap
                          (carbonPrice)            碳交易价格显示
                          
INA226 ×3 ─────────────→  /api/energy/realtime ─→  KpiCard + 24h图
(真实功率测量)             /api/energy/today
                          
USB Camera + NPU ──────→  /api/status ──────────→  ZoneLightMap
(YOLOv8n 人员检测)                                  人数 + 分区状态
                          
SQLite 累积记录 ───────→  /api/trends/* ────────→  7日/月度图表
                          /api/carbon-ledger       碳账本
```

## 优先级建议

竞赛提交前至少完成：
1. ✅ **天气 API**（5分钟免费，立即提升真实感）
2. ⬜ **碳交易 API**（5分钟免费，锦上添花）
3. ⬜ 能耗/检测数据（需要硬件，可比赛现场演示时接入）
