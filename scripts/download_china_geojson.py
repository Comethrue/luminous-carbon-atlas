#!/usr/bin/env python3
"""
下载中国地图 GeoJSON 到 frontend/public/，本地托管，彻底避开 CORS。

数据源: DataV.GeoAtlas (阿里云)
输出: frontend/public/china.json
"""

import json
import urllib.request
import os
import sys

# 中国全境 GeoJSON (DataV 在线服务，约 2-5MB)
URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "china.json")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"正在下载中国地图 GeoJSON...")
    print(f"  源: {URL}")
    print(f"  目标: {OUTPUT_PATH}")

    try:
        req = urllib.request.Request(URL, headers={
            "User-Agent": "Mozilla/5.0 (compatible; LuminousCarbonAtlas/1.0)",
            "Referer": "https://datav.aliyun.com/",
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()

        # 验证是合法 JSON
        geo = json.loads(data)
        feature_count = len(geo.get("features", []))
        print(f"  下载成功: {len(data) / 1024:.0f} KB, {feature_count} 个区域")

        # 保存
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(geo, f, ensure_ascii=False)
        print(f"  已保存: {OUTPUT_PATH}")

        # 验证文件
        size = os.path.getsize(OUTPUT_PATH)
        print(f"  文件大小: {size / 1024:.0f} KB")

    except Exception as e:
        print(f"  [ERROR] 下载失败: {e}")
        print(f"  请手动下载并放到 {OUTPUT_PATH}")
        print(f"  浏览器访问 {URL} 下载 JSON，保存为 china.json")
        sys.exit(1)


if __name__ == "__main__":
    main()
