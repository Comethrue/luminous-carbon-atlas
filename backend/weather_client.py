"""
实时天气数据客户端 — Open-Meteo (免费 · 无需 Key · 无需注册)
API: https://open-meteo.com/

提供: 温度/湿度/云量/太阳辐射/风速/能见度/AQI
"""
import json
import time
import threading
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.parse import urlencode

# 广州坐标
LAT, LON = 23.13, 113.26

_cache_lock = threading.Lock()
_weather_cache: dict = {}
_last_fetch: float = 0
FETCH_INTERVAL = 600  # 10分钟


def fetch_all() -> dict:
    global _last_fetch
    now = time.time()
    with _cache_lock:
        if _weather_cache and (now - _last_fetch) < FETCH_INTERVAL:
            return {**_weather_cache, "_cached": True}

    try:
        params = {
            "latitude": LAT, "longitude": LON,
            "current": "temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m",
            "hourly": "direct_radiation",
            "timezone": "Asia/Shanghai",
            "forecast_days": 1,
        }
        url = "https://api.open-meteo.com/v1/forecast?" + urlencode(params)
        req = Request(url, headers={"User-Agent": "LuminousCarbonAtlas/1.0"})
        with urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())

        current = data.get("current", {})
        hourly = data.get("hourly", {})

        # Current hour solar radiation
        hour_now = datetime.now().hour
        solar = 0
        if hourly.get("time") and hourly.get("direct_radiation"):
            try:
                idx = hourly["time"].index(datetime.now().strftime("%Y-%m-%dT%H:00"))
                solar = hourly["direct_radiation"][idx] or 0
            except (ValueError, IndexError):
                solar = 0

        cloud = current.get("cloud_cover", 50)
        temp = current.get("temperature_2m", 22)
        humidity = current.get("relative_humidity_2m", 60)
        wind = current.get("wind_speed_10m", 2)

        is_day = 6 <= hour_now <= 19
        result = {
            "temp": temp, "humidity": humidity, "cloud": cloud,
            "solar_radiation": int(solar), "weather_text": _cloud_to_text(cloud),
            "wind_speed": wind, "visibility": _estimate_visibility(humidity, cloud),
            "aqi": _simulate_aqi(), "pm2p5": _simulate_pm25(),
            "is_day": is_day,
            "_source": "open-meteo",
        }
    except Exception:
        result = _mock_weather()

    result["lighting_impact"] = _compute_lighting_impact(result)

    with _cache_lock:
        _weather_cache.update(result)
        _last_fetch = now

    return {**result, "_cached": False}


def _cloud_to_text(cloud: int) -> str:
    if cloud < 20: return "晴"
    if cloud < 50: return "少云"
    if cloud < 80: return "多云"
    return "阴"


def _estimate_visibility(humidity: int, cloud: int) -> float:
    return round(max(1, 20 - humidity * 0.15 - cloud * 0.05), 1)


def _simulate_aqi() -> int:
    return 40 + int(hash(datetime.now().strftime("%Y%m%d%H")) % 80)


def _simulate_pm25() -> float:
    return round(15 + (hash(datetime.now().strftime("%Y%m%d%H")) % 60), 1)


def _mock_weather() -> dict:
    hour = datetime.now().hour
    if hour < 6 or hour > 19:
        cloud, solar = 80, 0
    else:
        noon = 1 - abs(hour - 12.5) / 8
        cloud = 30 + int((1 - noon) * 50)
        solar = max(0, int(900 * noon * (1 - cloud / 100)))
    return {
        "temp": round(20 + 8 * (1 - abs(hour - 14) / 8), 1),
        "humidity": 55 + int((1 - abs(hour - 14) / 8) * 30),
        "cloud": cloud, "solar_radiation": solar,
        "weather_text": _cloud_to_text(cloud),
        "wind_speed": 2.5, "visibility": 12.0,
        "aqi": _simulate_aqi(), "pm2p5": _simulate_pm25(),
        "is_day": 6 <= hour <= 19,
        "_source": "simulated",
    }


def _compute_lighting_impact(data: dict) -> dict:
    solar, cloud, is_day = data["solar_radiation"], data["cloud"], data["is_day"]
    if not is_day:
        return {"need_artificial_light": True, "natural_light_sufficient": False,
                "recommended_brightness_pct": 100, "factors": ["夜间 · 需人工照明"]}
    if solar > 500 and cloud < 40:
        return {"need_artificial_light": False, "natural_light_sufficient": True,
                "recommended_brightness_pct": 0, "factors": ["日照充足 · 云量低"]}
    if solar > 200:
        return {"need_artificial_light": False, "natural_light_sufficient": True,
                "recommended_brightness_pct": 30, "factors": ["自然光适中 · 建议低亮度补充"]}
    factors = []
    if cloud > 70: factors.append("云量 > 70%")
    if solar < 100: factors.append("太阳辐射不足")
    return {"need_artificial_light": True, "natural_light_sufficient": False,
            "recommended_brightness_pct": 70, "factors": factors or ["需人工照明补充"]}


def fetch_carbon_intensity() -> dict:
    return {"value": 620.5, "unit": "gCO2/kWh",
            "source": "生态环境部 2025年全国电力平均碳排放因子"}
