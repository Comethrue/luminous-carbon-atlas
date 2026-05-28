"""
Luminous Carbon Atlas — Backend API Server
数智光衡 · 碳能观测舱 · Mock Data API + Real-time Weather Crawler

Run: uvicorn server:app --reload --port 8000
"""

import math
import random
import time
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

# Real-time environmental data crawler
from weather_client import fetch_all as fetch_weather, fetch_carbon_intensity
from crawler_service import fetch_all_live

# Startup crawler — runs once when server boots
from startup_crawler import run_startup_crawl, load_cache

app = FastAPI(title="Luminous Carbon Atlas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup crawler — runs once when server boots
_STARTUP_REPORT = None

@app.on_event("startup")
async def on_startup():
    global _STARTUP_REPORT
    print("\n" + "=" * 50)
    print("  Luminous Carbon Atlas - Startup Crawler")
    print("=" * 50)
    _STARTUP_REPORT = run_startup_crawl()
    print("=" * 50)

# ═══════════════════════════════════════════════════════════
# CONSTANTS (mirrored from shared/constants.ts)
# ═══════════════════════════════════════════════════════════
CARBON_FACTOR = 0.6205
ELECTRICITY_PRICE = 0.55
TREE_CO2_PER_YEAR = 21.77
COAL_PER_KWH = 0.330
BASELINE_POWER_W = 480
ZONE_POWER_W = 160
OPERATION_DAYS = 280
OPERATION_HOURS = 14
SYSTEM_START_DATE = date(2026, 4, 11)
BASELINE_DAILY_KWH = (BASELINE_POWER_W / 1000) * OPERATION_HOURS
CAMPUS_CLASSROOM_COUNT = 200

# ═══════════════════════════════════════════════════════════
# REALISTIC DATA MODELS
# ═══════════════════════════════════════════════════════════

# University classroom hourly occupancy rate — Source: 中国高校教室使用率调研
HOURLY_RATE = {
    7:0.05,8:0.85,9:0.82,10:0.80,11:0.70,
    12:0.10,13:0.15,14:0.78,15:0.75,16:0.60,
    17:0.40,18:0.20,19:0.45,20:0.40,21:0.15,22:0.05,
}
MAX_SEATS = 40  # standard classroom capacity

def _stable_rand(seed: float) -> float:
    x = (seed * 127.1 + 311.7) % 1
    return (x * 43758.5453) % 1

def system_days() -> int:
    return (date.today() - SYSTEM_START_DATE).days


def generate_24h_data() -> list[dict]:
    data = []
    for h in range(24):
        for m in (0, 15, 30, 45):
            hour = h + m / 60
            rate = HOURLY_RATE.get(h, 0)
            seed = h * 100 + m
            variation = (_stable_rand(seed) - 0.5) * 0.3
            adj = max(0, min(1, rate + variation * rate))
            occ = round(MAX_SEATS * adj)
            zones = 0 if occ <= 0 else (1 if occ <= 5 else (2 if occ <= 15 else 3))
            ai_power = zones * ZONE_POWER_W
            baseline = BASELINE_POWER_W if 7 <= hour <= 21.5 else 0
            data.append({
                "time": f"{h:02d}:{m:02d}", "hour": round(hour, 2),
                "baselinePower": round(baseline, 1), "aiPower": round(ai_power, 1),
                "occupancy": occ, "zonesActive": zones,
            })
    return data


def generate_weekly_data() -> list[dict]:
    days = ["周一","周二","周三","周四","周五","周六","周日"]
    daily_rates = [0.92, 0.88, 0.95, 0.85, 0.72, 0.18, 0.10]
    result = []
    for name, rate in zip(days, daily_rates):
        ai = BASELINE_DAILY_KWH * (1 - 0.72 * rate)
        result.append({
            "day": name, "baseline": round(BASELINE_DAILY_KWH, 2),
            "ai": round(ai, 2), "saved": round(BASELINE_DAILY_KWH - ai, 2),
        })
    return result


def generate_monthly_data() -> list[dict]:
    data = []
    for d in range(1, 31):
        wd = (d + 1) % 7
        rate = 0.12 if wd >= 5 else 0.70 + _stable_rand(d) * 0.20
        occ = round(MAX_SEATS * rate)
        ai = BASELINE_DAILY_KWH * (1 - 0.72 * rate)
        data.append({
            "day": d, "ai": round(ai, 2),
            "baseline": round(BASELINE_DAILY_KWH, 2), "occupancy": occ,
        })
    return data


def compute_overview() -> dict:
    """Compute KPI overview from 24h data."""
    d24 = generate_24h_data()
    total_saved = sum(max(0, d["baselinePower"] - d["aiPower"]) for d in d24) / 4 / 1000
    total_baseline = sum(d["baselinePower"] for d in d24) / 4 / 1000
    rate = (total_saved / total_baseline * 100) if total_baseline > 0 else 0
    cumulative = total_saved * system_days()
    co2 = cumulative * CARBON_FACTOR
    trees = co2 / TREE_CO2_PER_YEAR
    cost = cumulative * ELECTRICITY_PRICE
    # Derived from 24h data — no random jitter
    hour_now = datetime.now().hour
    current_rate = HOURLY_RATE.get(hour_now, 0)
    current_persons = round(MAX_SEATS * current_rate)
    current_zones = 0 if current_persons <= 0 else (1 if current_persons <= 5 else (2 if current_persons <= 15 else 3))

    return {
        "totalSavedKwh": round(cumulative, 1),
        "savingRate": round(rate, 1),
        "co2ReducedKg": round(co2, 1),
        "treeEquivalent": round(trees, 2),
        "costSavedYuan": round(cost, 2),
        "aiControlRate": round(87 + _stable_rand(system_days()) * 8, 1),
        "activeZones": current_zones,
        "lowCarbonScore": round(78 + _stable_rand(system_days() / 7) * 10, 1),
        "currentPowerW": round(current_zones * ZONE_POWER_W + _stable_rand(hour_now) * 15, 1),
        "currentPersons": current_persons,
        "systemDays": system_days(),
        "timestamp": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.get("/api/overview")
def overview():
    return compute_overview()


@app.get("/api/timeseries/24h")
def timeseries_24h():
    return generate_24h_data()


@app.get("/api/trends/weekly")
def trends_weekly():
    return generate_weekly_data()


@app.get("/api/trends/monthly")
def trends_monthly():
    return generate_monthly_data()


@app.get("/api/scenarios")
def scenarios():
    return [
        {
            "name": "全亮基线",
            "dailyKwh": round(BASELINE_DAILY_KWH, 2),
            "annualKwh": round(BASELINE_DAILY_KWH * OPERATION_DAYS, 1),
            "annualCost": round(BASELINE_DAILY_KWH * OPERATION_DAYS * ELECTRICITY_PRICE, 1),
            "color": "#FF3B30",
        },
        {
            "name": "手动控制",
            "dailyKwh": round(BASELINE_DAILY_KWH * 0.5, 2),
            "annualKwh": round(BASELINE_DAILY_KWH * 0.5 * OPERATION_DAYS, 1),
            "annualCost": round(BASELINE_DAILY_KWH * 0.5 * OPERATION_DAYS * ELECTRICITY_PRICE, 1),
            "color": "#FF9500",
        },
        {
            "name": "传感器方案",
            "dailyKwh": round(BASELINE_DAILY_KWH * 0.4, 2),
            "annualKwh": round(BASELINE_DAILY_KWH * 0.4 * OPERATION_DAYS, 1),
            "annualCost": round(BASELINE_DAILY_KWH * 0.4 * OPERATION_DAYS * ELECTRICITY_PRICE, 1),
            "color": "#FFD700",
        },
        {
            "name": "AI智能(本项目)",
            "dailyKwh": round(BASELINE_DAILY_KWH * 0.28, 2),
            "annualKwh": round(BASELINE_DAILY_KWH * 0.28 * OPERATION_DAYS, 1),
            "annualCost": round(BASELINE_DAILY_KWH * 0.28 * OPERATION_DAYS * ELECTRICITY_PRICE, 1),
            "color": "#00D4FF",
        },
    ]


@app.get("/api/carbon-ledger")
def carbon_ledger():
    d24 = generate_24h_data()
    total_saved = sum(max(0, d["baselinePower"] - d["aiPower"]) for d in d24) / 4 / 1000
    cumulative = total_saved * system_days()
    co2 = cumulative * CARBON_FACTOR
    coal = cumulative * COAL_PER_KWH
    trees = co2 / TREE_CO2_PER_YEAR
    cost = cumulative * ELECTRICITY_PRICE
    classrooms_powered = round(cumulative / BASELINE_DAILY_KWH)
    campus_potential_kwh = cumulative * CAMPUS_CLASSROOM_COUNT
    campus_potential_co2 = campus_potential_kwh * CARBON_FACTOR

    return {
        "totalSavedKwh": round(cumulative, 1),
        "co2ReducedKg": round(co2, 1),
        "coalSavedKg": round(coal, 1),
        "treeEquivalent": round(trees, 2),
        "costSavedYuan": round(cost, 2),
        "classroomsPowered": classrooms_powered,
        "campusAnnualPotentialKwh": round(campus_potential_kwh, 1),
        "campusAnnualPotentialCo2Kg": round(campus_potential_co2, 1),
    }


@app.get("/api/sources")
def sources():
    return [
        {
            "id": "carbon", "label": "碳排放因子", "value": f"{CARBON_FACTOR} kgCO₂/kWh",
            "source": "生态环境部 2024年第10号公告",
        },
        {
            "id": "lighting", "label": "照明标准", "value": "LPD ≤ 9 W/m², 桌面 ≥ 300 lux",
            "source": "GB 50034-2013 建筑照明设计标准",
        },
        {
            "id": "coal", "label": "标准煤折算", "value": f"{COAL_PER_KWH} kgce/kWh",
            "source": "GB/T 2589-2020 综合能耗计算通则",
        },
        {
            "id": "price", "label": "电价基准", "value": f"{ELECTRICITY_PRICE} 元/kWh",
            "source": "湖北省发改委",
        },
        {
            "id": "tree", "label": "碳汇换算", "value": f"{TREE_CO2_PER_YEAR} kgCO₂/株/年",
            "source": "国家林草局 LY/T 2988-2018",
        },
    ]


@app.get("/api/live")
async def live_sse():
    """Server-Sent Events endpoint for realistic live data."""
    async def event_stream():
        while True:
            hour_now = datetime.now().hour
            rate = HOURLY_RATE.get(hour_now, 0)
            persons = round(MAX_SEATS * rate)
            zones_active = 0 if persons <= 0 else (1 if persons <= 5 else (2 if persons <= 15 else 3))
            data = {
                "timestamp": datetime.now().isoformat(),
                "powerW": round(zones_active * ZONE_POWER_W + _stable_rand(datetime.now().second) * 10, 1),
                "persons": persons,
                "zonesActive": zones_active,
                "zoneStates": {
                    "left": zones_active >= 1,
                    "center": zones_active >= 2,
                    "right": zones_active >= 3,
                },
                "zonePowers": {
                    "left": ZONE_POWER_W if zones_active >= 1 else 0,
                    "center": ZONE_POWER_W if zones_active >= 2 else 0,
                    "right": ZONE_POWER_W if zones_active >= 3 else 0,
                },
                "strategy": ["ALL_OFF","ZONE_PARTIAL","ALL_ON","HOLD"][zones_active],
                "lightAdc": round(150 + (1 - rate) * 700 + _stable_rand(hour_now) * 100),
                "co2Ppm": round(420 + persons * 8),
                "temperature": round(22 + _stable_rand(datetime.now().hour) * 6, 1),
            }
            yield {"event": "live", "data": data}
            await asyncio.sleep(5)

    return EventSourceResponse(event_stream())


# ═══════════════════════════════════════════════════════
# REAL-TIME ENVIRONMENTAL ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.get("/api/environment")
def environment():
    """综合环境数据：天气 + 空气质量 + 光照影响评估"""
    weather = fetch_weather()
    carbon = fetch_carbon_intensity()
    return {
        "weather": weather,
        "carbonIntensity": carbon,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/environment/lighting")
def lighting_advice():
    """自然光评估 + 照明建议（供AI控制策略参考）"""
    weather = fetch_weather()
    impact = weather.get("lighting_impact", {})
    return {
        "timestamp": datetime.now().isoformat(),
        "solarRadiation": weather.get("solar_radiation", 0),
        "cloudCover": weather.get("cloud", 50),
        "visibility": weather.get("visibility", 10),
        "isDay": weather.get("is_day", True),
        **impact,
    }


@app.get("/api/broadcast")
def broadcast():
    """
    数据播报 — 返回最近的系统事件和环境变化摘要。
    前端可作为滚动播报条展示。
    """
    weather = fetch_weather()
    impact = weather.get("lighting_impact", {})
    carbon = fetch_carbon_intensity()
    ov = compute_overview()

    announcements = []

    # 环境事件
    if weather.get("cloud", 50) > 80:
        announcements.append({
            "type": "weather", "icon": "☁",
            "text": f"云量 {weather['cloud']}% · 自然光不足 · 建议增加人工照明",
            "time": datetime.now().strftime("%H:%M"),
        })
    elif weather.get("solar_radiation", 0) > 600:
        announcements.append({
            "type": "weather", "icon": "☀",
            "text": f"太阳辐射 {weather['solar_radiation']}W/m² · 自然光充足 · 可减少人工照明",
            "time": datetime.now().strftime("%H:%M"),
        })

    if weather.get("aqi", 50) > 100:
        announcements.append({
            "type": "aqi", "icon": "😷",
            "text": f"AQI {weather['aqi']} · PM2.5 {weather.get('pm2p5', 0)}μg/m³ · 雾霾影响室外光照",
            "time": datetime.now().strftime("%H:%M"),
        })

    # 碳强度变化
    if abs(carbon.get("value", 620) - 620) > 30:
        direction = "↑" if carbon["value"] > 620 else "↓"
        announcements.append({
            "type": "carbon", "icon": "🏭",
            "text": f"实时碳强度 {carbon['value']}gCO₂/kWh {direction} · {carbon['source']}",
            "time": datetime.now().strftime("%H:%M"),
        })

    # 系统节能里程碑
    if ov["savingRate"] > 70:
        announcements.append({
            "type": "system", "icon": "🎯",
            "text": f"节能率突破 {ov['savingRate']}% · 累计节电 {ov['totalSavedKwh']}kWh",
            "time": datetime.now().strftime("%H:%M"),
        })

    return {
        "announcements": announcements,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/live-data")
def live_data():
    """综合实时数据: 碳交易 + 电网负荷 + 10试点城市"""
    return fetch_all_live()


@app.get("/api/crawl-report")
def crawl_report():
    """启动爬虫报告 — 每次服务器启动时的数据源状态"""
    cache = load_cache()
    live = cache.get("live", {})
    return {
        "started_at": live.get("started_at"),
        "sources": live.get("sources", {}),
        "cache_updated": cache.get("_updated_at"),
    }


@app.get("/")
def root():
    return {
        "name": "Luminous Carbon Atlas API",
        "status": "operational",
        "systemDays": system_days(),
        "endpoints": [
            "/api/overview", "/api/timeseries/24h", "/api/trends/weekly",
            "/api/trends/monthly", "/api/scenarios", "/api/carbon-ledger",
            "/api/sources", "/api/live (SSE)", "/api/environment",
            "/api/environment/lighting", "/api/broadcast",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
