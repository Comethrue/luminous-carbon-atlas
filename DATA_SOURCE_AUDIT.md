# 数据源审计：真实 vs 模拟

## 当前状态

| 数据 | 来源 | 真实性 | 说明 |
|------|------|--------|------|
| 碳排因子 0.6205 kgCO₂/kWh | `scraper/carbon_factor.py` | ✅ 真实 | 生态环境部2024公告，硬编码常量 |
| 电价 0.55 元/kWh | `scraper/electricity_price.py` | ✅ 真实 | 湖北省发改委，硬编码常量 |
| 树木碳汇 21.77 kgCO₂/年 | `scraper/tree_carbon.py` | ✅ 真实 | 国家林草局标准，硬编码常量 |
| 照明标准 LPD≤9W/m² | `scraper/lighting_standard.py` | ✅ 真实 | GB 50034-2013，硬编码常量 |
| 实时天气/辐射/AQI | `backend/weather_client.py` | ❌ 模拟 | `_mock_weather()` 基于时间模式生成 |
| 碳交易价格 | `backend/crawler_service.py` | ❌ 模拟 | `_simulate_carbon_price()` 随机波动 |
| 电网负荷 | `backend/crawler_service.py` | ❌ 模拟 | `_simulate_grid_load()` 随机波动 |
| 10城环境数据 | `backend/crawler_service.py` | ❌ 模拟 | `_simulate_city_env()` 随机生成 |
| 24h/7日/月度能耗 | `frontend/src/lib/api.ts` | ❌ 模拟 | `getMock()` Math.random() |

**结论：静态参考数据（碳排放因子、电价、标准）是真实的；所有"实时变化"的数据都是模拟的。**

## 竞赛可行性

这是完全正常的。绝大多数竞赛项目的"实时数据"都是模拟的，评委关注的是：
1. 数据模型是否正确（公式引用真实标准）✅
2. 可视化是否专业 ✅
3. 系统架构是否支持接入真实数据源 ✅

## 如何接入真实爬虫数据

### 5分钟变真实：和风天气 API（免费）

1. 注册 https://dev.qweather.com/
2. 创建应用 → 获取 API Key（免费版 1000次/天）
3. 设置环境变量：
```bash
set QWEATHER_KEY=你的key
set QWEATHER_CITY_ID=101280101  # 广州
```
4. 重启后端 → 天气数据自动从模拟切到真实

### 可选：Electricity Maps 碳强度（免费层）

1. 注册 https://www.electricitymaps.com/
2. 获取 API token
3. 设置 `ELECTRICITY_MAPS_KEY=你的token`
4. 重启 → 碳强度数据变真实
