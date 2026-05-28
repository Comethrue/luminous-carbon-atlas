import { useEffect, useState, useMemo } from 'react';
import { Sun, Zap, CloudSun } from 'lucide-react';
import { API_BASE } from '../lib/api';

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

const defaultEnv: EnvData = {
  weather: {
    temp: 24, humidity: 58, cloud: 45, solar_radiation: 520,
    weather_text: '多云', wind_speed: 3, visibility: 12,
    aqi: 68, pm2p5: 32, is_day: true,
    lighting_impact: { need_artificial_light: false, natural_light_sufficient: true, recommended_brightness_pct: 30, factors: ['自然光适中'] },
    _source: '',
  },
  carbonIntensity: { value: 620, unit: 'gCO2/kWh', source: '' },
  timestamp: '',
};

function useEnv<T>(path: string, init: T, interval = 30000) {
  const [data, setData] = useState<T>(init);
  useEffect(() => {
    const load = async () => { try { const r = await fetch(`${API_BASE}${path}`); if (r.ok) setData(await r.json()); } catch {} };
    load();
    const t = setInterval(load, interval);
    return () => clearInterval(t);
  }, []);
  return data;
}

// ── SVG Ring Gauge ──
function RingGauge({ pct, size = 120, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  // Color transitions: 0-30% red, 30-60% gold, 60-100% green
  const color = pct < 30 ? '#FF3B30' : pct < 60 ? '#FFD700' : '#34C759';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Background ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* Active ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 6px ${color}40)` }} />
    </svg>
  );
}

export function EnvironmentCard() {
  const env = useEnv<EnvData>('/environment', defaultEnv, 30000);
  const w = env.weather;
  const impact = w.lighting_impact;
  const isLive = w._source === 'open-meteo';

  // 自然光贡献率 = 自然光能满足的照明比例
  // 推荐亮度 30% → 自然光贡献 70%
  const contribution = useMemo(() => {
    if (!w.is_day) return 0;
    return Math.round(100 - impact.recommended_brightness_pct);
  }, [w.is_day, impact.recommended_brightness_pct]);

  // 基于贡献率估算今日省电 (假设白天10小时, AI功率480W, 贡献率=省电比例)
  const todaySavedKwh = useMemo(() => {
    if (!w.is_day) return 0;
    const daylightHours = Math.max(0, 19 - new Date().getHours());
    return +(BASELINE_POWER_W / 1000 * daylightHours * contribution / 100).toFixed(2);
  }, [w.is_day, contribution]);

  // Status text
  const statusLabel = w.is_day
    ? contribution >= 60 ? '自然光充沛，大幅节能中' : contribution >= 30 ? '自然光适中，部分补偿' : '自然光不足，需人工补光'
    : '夜间模式，全人工照明';

  const statusColor = w.is_day
    ? contribution >= 60 ? '#34C759' : contribution >= 30 ? '#FFD700' : '#FF9500'
    : '#5A7090';

  const statusBg = w.is_day
    ? contribution >= 60 ? 'rgba(52,199,89,0.08)' : contribution >= 30 ? 'rgba(255,215,0,0.08)' : 'rgba(255,149,0,0.08)'
    : 'rgba(90,112,144,0.08)';

  return (
    <div className="glass-card rounded-xl p-4 glow-border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase">
          自然光协同 · 光贡献
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-[10px] text-cyan font-mono">
            {isLive ? 'Open-Meteo LIVE' : w._source === 'qweather' ? '和风天气 LIVE' : '模拟 LIVE'}
          </span>
        </div>
      </div>

      {/* Main ring gauge + data */}
      <div className="flex items-center gap-4 flex-1">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <RingGauge pct={contribution} size={110} stroke={9} />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono" style={{ color: contribution >= 60 ? '#34C759' : contribution >= 30 ? '#FFD700' : '#FF3B30' }}>
              {contribution}
            </span>
            <span className="text-[9px] text-text-muted">%贡献</span>
          </div>
        </div>

        {/* Right side data */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Solar radiation — input */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,215,0,0.08)' }}>
              <Sun size={14} style={{ color: '#FFD700' }} />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] text-text-muted">太阳辐射 · 自然光输入</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-gold font-mono tabular-nums">{w.solar_radiation}</span>
                <span className="text-[10px] text-text-muted">W/m²</span>
              </div>
            </div>
          </div>

          {/* Artificial brightness — output */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,212,255,0.08)' }}>
              <Zap size={14} style={{ color: '#00D4FF' }} />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] text-text-muted">人工补光 · 系统输出</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-cyan font-mono tabular-nums">{impact.recommended_brightness_pct}</span>
                <span className="text-[10px] text-text-muted">%亮度</span>
              </div>
            </div>
          </div>

          {/* Cloud cover — obstruction */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(138,153,175,0.08)' }}>
              <CloudSun size={14} style={{ color: '#8899BB' }} />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] text-text-muted">云量遮挡</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-text-primary font-mono tabular-nums">{w.cloud}</span>
                <span className="text-[10px] text-text-muted">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-3 rounded-lg px-3 py-2 text-[10px] font-medium flex items-center justify-between"
        style={{ background: statusBg, color: statusColor }}>
        <span>{w.is_day ? '☀' : '🌙'} {statusLabel}</span>
        <span className="font-mono tabular-nums text-text-muted">
          约省 <span style={{ color: contribution >= 30 ? '#34C759' : '#8899BB' }}>{todaySavedKwh}</span> kWh
        </span>
      </div>
    </div>
  );
}

const BASELINE_POWER_W = 480;
