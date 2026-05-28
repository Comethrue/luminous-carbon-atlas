import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';

// Simplified China geojson outline + major city coordinates (lite version)
const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: '北京', lat: 39.9, lon: 116.4 },
  { name: '上海', lat: 31.2, lon: 121.5 },
  { name: '武汉', lat: 30.6, lon: 114.3 },
  { name: '广州', lat: 23.1, lon: 113.3 },
  { name: '成都', lat: 30.6, lon: 104.1 },
  { name: '西安', lat: 34.3, lon: 108.9 },
  { name: '南京', lat: 32.1, lon: 118.8 },
  { name: '杭州', lat: 30.3, lon: 120.2 },
  { name: '重庆', lat: 29.6, lon: 106.5 },
  { name: '长沙', lat: 28.2, lon: 113.0 },
  { name: '郑州', lat: 34.8, lon: 113.6 },
  { name: '济南', lat: 36.7, lon: 117.0 },
];

interface EnvData {
  solar_radiation: number;
  cloud: number;
  temp: number;
  weather_text: string;
  aqi: number;
  is_day: boolean;
  lighting_impact: { recommended_brightness_pct: number };
}

interface Props {
  env: EnvData | null;
}

export function SolarMap({ env }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Generate solar radiation scatter data (simulated for regions)
  const scatterData = CITIES.map(c => {
    const baseRadiation = Math.max(50, 800 - Math.abs(c.lat - 30) * 40);
    const cloudFactor = env ? (1 - env.cloud / 100) : 0.6;
    const value = Math.round(baseRadiation * cloudFactor * (0.6 + Math.random() * 0.8));
    return {
      name: c.name,
      value: [c.lon, c.lat, value],
      highlight: c.name === '武汉',
    };
  });

  useEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const observer = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;
        if (r && r.width > 0 && r.height > 0) {
          observer.disconnect();
          initChart();
        }
      });
      observer.observe(ref.current);
      return () => observer.disconnect();
    }

    initChart();
    return () => { chartRef.current?.dispose(); chartRef.current = null; };

    function initChart() {
      if (chartRef.current) chartRef.current.dispose();
      chartRef.current = echarts.init(ref.current!, undefined, { renderer: 'canvas' });

      const wuhan = scatterData.find(d => d.highlight);
      const maxVal = Math.max(...scatterData.map(d => d.value[2]), 1);

      chartRef.current.setOption({
        backgroundColor: 'transparent',
        // Use scatter geo for city-level solar visualization
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: {
          type: 'value', min: 100, max: 125, show: false,
        },
        yAxis: {
          type: 'value', min: 18, max: 42, show: false,
        },
        series: [
          // Background: connection lines (energy flow network)
          {
            type: 'lines',
            coordinateSystem: 'cartesian2d',
            polyline: false,
            data: CITIES.filter(c => c.name !== '武汉').map(c => ({
              coords: [[114.3, 30.6], [c.lon, c.lat]],
            })),
            lineStyle: {
              color: 'rgba(0,136,255,0.08)',
              width: 0.5,
              curveness: 0.15,
            },
            effect: {
              show: true,
              period: 8,
              trailLength: 0.15,
              symbol: 'circle',
              symbolSize: 2,
              color: 'rgba(0,180,255,0.3)',
            },
            z: 1,
          },
          // All cities: solar radiation bubbles
          {
            type: 'scatter',
            coordinateSystem: 'cartesian2d',
            data: scatterData,
            symbolSize: (val: number[]) => {
              const v = val[2] / maxVal;
              return 6 + v * 24;
            },
            itemStyle: {
              color: (params: any) => {
                const v = params.value[2];
                if (v > 600) return '#34C759';
                if (v > 300) return '#FFD700';
                return '#FF9500';
              },
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              shadowBlur: 12,
              shadowColor: 'rgba(0,180,255,0.3)',
            },
            label: {
              show: true,
              formatter: (p: any) => p.name,
              position: 'right',
              color: '#8899BB',
              fontSize: 9,
              distance: 6,
            },
            emphasis: {
              scale: 2,
              itemStyle: { shadowBlur: 25, shadowColor: 'rgba(0,212,255,0.6)' },
            },
            z: 2,
          },
          // Wuhan: pulsing center
          {
            type: 'effectScatter',
            coordinateSystem: 'cartesian2d',
            data: wuhan ? [wuhan] : [],
            symbolSize: 18,
            rippleEffect: {
              brushType: 'stroke',
              scale: 4,
              period: 3,
              color: 'rgba(0,212,255,0.5)',
            },
            itemStyle: { color: '#00D4FF', shadowBlur: 20, shadowColor: 'rgba(0,212,255,0.7)' },
            label: {
              show: true,
              formatter: '武汉 · 监测站',
              position: 'top',
              color: '#00D4FF',
              fontSize: 11,
              fontWeight: 'bold',
              distance: 10,
              textShadowBlur: 8,
              textShadowColor: 'rgba(0,212,255,0.5)',
            },
            z: 3,
          },
        ],
      }, true);
    }
  }, [env?.solar_radiation, env?.cloud]);

  // Resize
  useEffect(() => {
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl p-4 glow-border"
    >
      <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2">
        太阳辐射态势 · 区域监测网络
      </div>
      <div ref={ref} className="w-full" style={{ height: 240 }} />
      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green" /> 强辐射 &gt;600</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold" /> 中等 300-600</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#FF9500'}} /> 弱 &lt;300</span>
        </div>
        {env && (
          <span>
            当前武汉: {env.solar_radiation}W/m² · {env.weather_text} · {env.cloud}%云量
          </span>
        )}
      </div>
    </motion.div>
  );
}
