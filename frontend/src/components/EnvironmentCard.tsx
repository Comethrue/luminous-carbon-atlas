import { motion } from 'framer-motion';
import { Sun, Cloud, Wind, Eye, Thermometer, Droplets, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LightingImpact {
  need_artificial_light: boolean;
  natural_light_sufficient: boolean;
  recommended_brightness_pct: number;
  factors: string[];
}

interface EnvData {
  weather: {
    temp: number; humidity: number; cloud: number; solar_radiation: number;
    weather_text: string; wind_speed: number; visibility: number;
    aqi: number; pm2p5: number; is_day: boolean;
    lighting_impact: LightingImpact;
    _source: string;
  };
  carbonIntensity: { value: number; unit: string; source: string };
  timestamp: string;
}

function useEnv<T>(path: string, init: T, interval = 60000) {
  const [data, setData] = useState<T>(init);
  useEffect(() => {
    const load = async () => { try { const r = await fetch(`/api${path}`); if (r.ok) setData(await r.json()); } catch { /* fallback */ } };
    load();
    const t = setInterval(load, interval);
    return () => clearInterval(t);
  }, []);
  return data;
}

const defaultEnv: EnvData = {
  weather: {
    temp: 24, humidity: 58, cloud: 45, solar_radiation: 520,
    weather_text: '多云', wind_speed: 3, visibility: 12,
    aqi: 68, pm2p5: 32, is_day: true,
    lighting_impact: { need_artificial_light: false, natural_light_sufficient: true, recommended_brightness_pct: 30, factors: [] },
    _source: '',
  },
  carbonIntensity: { value: 620, unit: 'gCO2/kWh', source: '' },
  timestamp: '',
};

export function EnvironmentCard() {
  const env = useEnv<EnvData>('/environment', defaultEnv, 30000);
  const w = env.weather;
  const ci = env.carbonIntensity;
  const impact = w.lighting_impact;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl p-4 glow-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase">
          实时环境 · 数据播报
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-[10px] text-cyan font-mono">
            {w._source === 'open-meteo' ? 'Open-Meteo LIVE' : w._source === 'qweather' ? '和风天气 LIVE' : '模拟 LIVE'}
          </span>
        </div>
      </div>

      {/* Weather row */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center">
          <Sun size={16} className="mx-auto mb-1 text-gold" />
          <div className="kpi-number text-lg text-gold">{w.solar_radiation}</div>
          <div className="text-[9px] text-text-muted">W/m² 辐射</div>
        </div>
        <div className="text-center">
          <Cloud size={16} className="mx-auto mb-1 text-text-secondary" />
          <div className="kpi-number text-lg text-text-primary">{w.cloud}%</div>
          <div className="text-[9px] text-text-muted">云量</div>
        </div>
        <div className="text-center">
          <Thermometer size={16} className="mx-auto mb-1 text-red" />
          <div className="kpi-number text-lg text-text-primary">{w.temp}°</div>
          <div className="text-[9px] text-text-muted">温度</div>
        </div>
        <div className="text-center">
          <Droplets size={16} className="mx-auto mb-1 text-cyan" />
          <div className="kpi-number text-lg text-text-primary">{w.humidity}%</div>
          <div className="text-[9px] text-text-muted">湿度</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
        <div className="flex items-center gap-1 text-text-muted">
          <Wind size={11} /> {w.wind_speed}m/s
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <Eye size={11} /> {w.visibility}km
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <Radio size={11} /> AQI {w.aqi}
        </div>
      </div>

      {/* Carbon intensity */}
      <div className="border-t border-border pt-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted tracking-wider">实时碳强度</span>
          <span className="text-[9px] text-text-muted font-mono">{ci.source.split('·')[0]}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="kpi-number text-2xl text-cyan text-glow-cyan">{ci.value}</span>
          <span className="text-xs text-text-muted">{ci.unit}</span>
        </div>
      </div>

      {/* Lighting recommendation */}
      <div className={`rounded-lg p-3 ${impact.natural_light_sufficient ? 'bg-green/10 border border-green/20' : 'bg-gold/10 border border-gold/20'}`}>
        <div className="text-[10px] font-semibold mb-1"
          style={{ color: impact.natural_light_sufficient ? '#34C759' : '#FFD700' }}>
          {impact.natural_light_sufficient ? '☀ 自然光充足' : '💡 建议人工照明'}
        </div>
        <div className="text-[10px] text-text-secondary mb-1">
          推荐亮度 <span className="text-cyan font-bold">{impact.recommended_brightness_pct}%</span>
        </div>
        {impact.factors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {impact.factors.map((f, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-dim text-cyan">{f}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
