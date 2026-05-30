"""
实时数据爬虫调度器 — 碳交易价格 + 10城市环境数据 + 电网负荷

数据源:
  1. 碳交易价格 — 模拟上海环境能源交易所 CEA 碳配额价格
  2. 10城市实时天气 — 内置仿真模型
  3. 电网负荷指数 — 模拟国家电网实时负荷率
"""

import json
import random
import time
import threading
from datetime import datetime

# 城市天气使用内置仿真模型（无需外部API）

# ═══════════════════════════════════════════════════════
# GDP TOP 10 城市坐标 + 高校数
# ═══════════════════════════════════════════════════════
GDP_TOP10 = [
    {"name":"上海", "lon":121.47, "lat":31.23, "universities":64, "gdp_rank":1},
    {"name":"北京", "lon":116.41, "lat":39.90, "universities":92, "gdp_rank":2},
    {"name":"深圳", "lon":114.06, "lat":22.54, "universities":14, "gdp_rank":3},
    {"name":"广州", "lon":113.26, "lat":23.13, "universities":83, "gdp_rank":4},
    {"name":"重庆", "lon":106.55, "lat":29.57, "universities":71, "gdp_rank":5},
    {"name":"苏州", "lon":120.59, "lat":31.30, "universities":25, "gdp_rank":6},
    {"name":"成都", "lon":104.07, "lat":30.57, "universities":58, "gdp_rank":7},
    {"name":"杭州", "lon":120.15, "lat":30.28, "universities":47, "gdp_rank":8},
    {"name":"武汉", "lon":114.30, "lat":30.60, "universities":83, "gdp_rank":9},
    {"name":"南京", "lon":118.79, "lat":32.06, "universities":53, "gdp_rank":10},
]

# Cache
_cache: dict = {}
_lock = threading.Lock()
_last_update: float = 0
CACHE_TTL = 120  # 2分钟


def _simulate_carbon_price() -> dict:
    """
    模拟上海环境能源交易所碳配额(CEA)价格。
    实际价格范围: 50-90 元/吨CO₂ (2025-2026年区间)
    """
    base = 72.5  # 基准价
    hour = datetime.now().hour
    # 日内小幅波动 + 趋势
    variation = (hour - 12) * 0.3 + random.uniform(-3, 3)
    price = round(max(55, min(92, base + variation)), 2)
    trend = "↑" if variation > 0 else "↓"

    return {
        "market": "上海环境能源交易所",
        "product": "CEA 碳配额",
        "price": price,
        "unit": "元/吨CO₂",
        "change": round(variation, 2),
        "trend": trend,
        "source": "simulated (基于上海环交所实际价格区间模拟)",
        "update_time": datetime.now().isoformat(),
    }


def _simulate_grid_load() -> dict:
    """模拟国家电网实时负荷率"""
    hour = datetime.now().hour
    # 负荷曲线: 低谷0-6h, 高峰9-12h/14-17h/19-21h
    if hour < 6:
        load = 45 + random.uniform(0, 10)
    elif 9 <= hour <= 11 or 14 <= hour <= 17:
        load = 75 + random.uniform(5, 20)
    elif 19 <= hour <= 21:
        load = 70 + random.uniform(5, 15)
    else:
        load = 55 + random.uniform(10, 20)

    return {
        "loadRate": round(load, 1),
        "unit": "%",
        "status": "高峰" if load > 80 else ("平稳" if load > 60 else "低谷"),
        "source": "simulated (基于国家电网典型负荷曲线模拟)",
        "update_time": datetime.now().isoformat(),
    }


def _get_city_env(city: dict) -> dict:
    """获取城市环境数据（内置仿真模型）"""
    hour = datetime.now().hour
    lat_factor = 1 - abs(city["lat"] - 30) / 20
    if hour < 6 or hour > 19:
        cloud = random.randint(50, 95)
    else:
        cloud = random.randint(10, 75)
    temp_base = 20 + lat_factor * 8
    temp = round(temp_base - abs(hour - 14) * 0.5 + random.uniform(-3, 3), 1)
    source = "simulated"

    if hour < 6 or hour > 19:
        solar = 0
    else:
        noon_factor = 1 - abs(hour - 12.5) / 8
        solar = max(0, int(850 * noon_factor * (1 - cloud / 100) + random.randint(-60, 60)))

    savings_potential = round(city["universities"] * 1.88 / 10, 1)

    return {
        "name": city["name"],
        "lon": city["lon"],
        "lat": city["lat"],
        "gdpRank": city["gdp_rank"],
        "universities": city["universities"],
        "temp": temp,
        "cloud": cloud,
        "solarRadiation": solar,
        "savingsPotential": savings_potential,
        "co2Potential": round(savings_potential * 6.205, 0),
        "isDay": 6 <= hour <= 19,
        "source": source,
    }


def fetch_all_live() -> dict:
    """获取全部实时数据"""
    global _last_update

    now = time.time()
    with _lock:
        if _cache and (now - _last_update) < CACHE_TTL:
            return {**_cache, "cached": True}

    data = {
        "carbonPrice": _simulate_carbon_price(),
        "gridLoad": _simulate_grid_load(),
        "pilotCities": [_get_city_env(c) for c in GDP_TOP10],
        "timestamp": datetime.now().isoformat(),
    }

    with _lock:
        _cache.update(data)
        _last_update = now

    return {**data, "cached": False}


if __name__ == "__main__":
    import json
    print(json.dumps(fetch_all_live(), ensure_ascii=False, indent=2))
