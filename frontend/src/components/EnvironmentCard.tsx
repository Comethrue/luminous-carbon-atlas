import { useEffect, useState, useMemo } from 'react';
import { Sun, Zap, CloudSun, TrendingUp } from 'lucide-react';
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

// ── SVG Ring Gauge (enlarged) ──
function RingGauge({ pct, size = 160, stroke = 10, colorOverride }: { pct: number; size?: number; stroke?: number; colorOverride?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const color = colorOverride || (pct < 30 ? '#FF3B30' : pct < 60 ? '#FFD700' : '#34C759');

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Background ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      {/* Active ring */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#ringGrad)`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 8px ${color}50)` }} />
      {/* Tick marks */}
      {[0, 25, 50, 75].map(t => {
        const angle = (t / 100) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const x1 = size/2 + (r - stroke - 2) * Math.cos(rad);
        const y1 = size/2 + (r - stroke - 2) * Math.sin(rad);
        const x2 = size/2 + (r - stroke - 8) * Math.cos(rad);
        const y2 = size/2 + (r - stroke - 8) * Math.sin(rad);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
      })}
    </svg>
  );
}

const BASELINE_POWER_W = 480;

// ── Data bar for the flow visualization ──
function FlowBar({ left, right, leftLabel, rightLabel, leftColor = '#FFD700', rightColor = '#00D4FF' }: {
  left: number; right: number; leftLabel: string; rightLabel: string;
  leftColor?: string; rightColor?: string;
}) {
  const leftPct = Math.min(100, Math.max(0, left));
  const rightPct = Math.min(100, Math.max(0, right));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-text-secondary">{leftLabel}</span>
        <span className="text-text-secondary">{rightLabel}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        <div className="transition-all duration-1000 rounded-l-full" style={{ width: `${leftPct}%`, background: leftColor }} />
        <div className="transition-all duration-1000 rounded-r-full" style={{ width: `${rightPct}%`, background: rightColor }} />
      </div>
      <div className="flex justify-between text-[11px] font-mono font-bold">
        <span style={{ color: leftColor }}>{left}</span>
        <span style={{ color: rightColor }}>{right}</span>
      </div>
    </div>
  );
}

export function EnvironmentCard() {
  const env = useEnv<EnvData>('/environment', defaultEnv, 30000);
  const w = env.weather;
  const impact = w.lighting_impact;
  const isLive = w._source === 'open-meteo';

  const contribution = useMemo(() => {
    return Math.round(100 - impact.recommended_brightness_pct);
  }, [impact.recommended_brightness_pct]);

  const todaySavedKwh = useMemo(() => {
    if (!w.is_day) return 0;
    const daylightHours = Math.max(0, 19 - new Date().getHours());
    return +(BASELINE_POWER_W / 1000 * daylightHours * contribution / 100).toFixed(2);
  }, [w.is_day, contribution]);

  const isNight = !w.is_day;
  const statusLabel = isNight
    ? '夜间模式 · 全人工照明'
    : contribution >= 60 ? '自然光充沛，大幅节能中'
    : contribution >= 30 ? '自然光适中，部分补偿中'
    : '自然光不足，需人工补光';

  const statusColor = isNight
    ? '#5A7090'
    : contribution >= 60 ? '#34C759'
    : contribution >= 30 ? '#FFD700'
    : '#FF9500';

  const statusBg = isNight
    ? 'rgba(90,112,144,0.08)'
    : contribution >= 60 ? 'rgba(52,199,89,0.08)'
    : contribution >= 30 ? 'rgba(255,215,0,0.08)'
    : 'rgba(255,149,0,0.08)';

  // Scale solar radiation to 0-100 for the bar (max ~900 W/m²)
  const solarScale = Math.min(100, Math.round((w.solar_radiation / 900) * 100));

  // Gauge color logic: nighttime = gray, otherwise color by contribution
  const gaugePct = isNight ? 0 : contribution;
  const gaugeColor = isNight ? '#5A7090'
    : contribution >= 60 ? '#34C759'
    : contribution >= 30 ? '#FFD700'
    : '#FF3B30';

  return (
    <div className="glass-card rounded-xl p-6 glow-border h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-text-muted tracking-[0.15em] uppercase mb-0.5">
            自然光协同
          </div>
          <div className="text-sm font-semibold text-text-primary tracking-wide">
            光贡献率监测
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-[10px] text-cyan font-mono">
            {isLive ? 'Open-Meteo LIVE' : '模拟'}
          </span>
        </div>
      </div>

      {/* ── Center: Large Ring Gauge ── */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <RingGauge pct={gaugePct} size={160} stroke={10} colorOverride={gaugeColor} />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[36px] font-bold font-mono leading-none tracking-tighter"
              style={{ color: gaugeColor }}>
              {isNight ? '🌙' : contribution}
            </span>
            <span className="text-[11px] text-text-muted mt-1">
              {isNight ? '夜间' : '%'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Subtitle ── */}
      <p className="text-center text-[11px] text-text-secondary leading-relaxed mb-5 px-2">
        {isNight ? (
          <>日落之后，教室照明<span className="text-cyan font-semibold">100%</span>由人工光源提供</>
        ) : contribution >= 50 ? (
          <>当前教室所需照明中，<span className="text-gold font-semibold">{contribution}%</span> 由自然光提供，仅需 <span className="text-cyan font-semibold">{impact.recommended_brightness_pct}%</span> 人工补光</>
        ) : (
          <>自然光仅能提供 <span className="text-gold font-semibold">{contribution}%</span> 照度，需 <span className="text-cyan font-semibold">{impact.recommended_brightness_pct}%</span> 人工照明补偿</>
        )}
      </p>

      {/* ── Flow bars ── */}
      <div className="space-y-4 mb-5">
        <FlowBar
          left={solarScale}
          right={impact.recommended_brightness_pct}
          leftLabel="自然光输入 (太阳辐射)"
          rightLabel="人工光输出 (推荐亮度)"
          leftColor="#FFD700"
          rightColor="#00D4FF"
        />
        <FlowBar
          left={100 - (w.cloud || 0)}
          right={w.cloud || 0}
          leftLabel="晴空占比"
          rightLabel="云量遮挡"
          leftColor="#34C759"
          rightColor="#8899BB"
        />
      </div>

      {/* ── 3-column data ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center glass-card rounded-lg p-3">
          <Sun size={16} className="mx-auto mb-1.5 text-gold" />
          <div className="text-[10px] text-text-muted mb-0.5">太阳辐射</div>
          <div className="text-base font-bold text-gold font-mono tabular-nums">{w.solar_radiation}</div>
          <div className="text-[9px] text-text-muted">W/m²</div>
        </div>
        <div className="text-center glass-card rounded-lg p-3">
          <Zap size={16} className="mx-auto mb-1.5 text-cyan" />
          <div className="text-[10px] text-text-muted mb-0.5">推荐亮度</div>
          <div className="text-base font-bold text-cyan font-mono tabular-nums">{impact.recommended_brightness_pct}</div>
          <div className="text-[9px] text-text-muted">%</div>
        </div>
        <div className="text-center glass-card rounded-lg p-3">
          <TrendingUp size={16} className="mx-auto mb-1.5 text-green" />
          <div className="text-[10px] text-text-muted mb-0.5">今日省电</div>
          <div className="text-base font-bold text-green font-mono tabular-nums">{todaySavedKwh}</div>
          <div className="text-[9px] text-text-muted">kWh</div>
        </div>
      </div>

      {/* ── Factors tags ── */}
      {impact.factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {impact.factors.map((f, i) => (
            <span key={i} className="px-2 py-1 rounded text-[10px] bg-cyan-dim text-cyan">{f}</span>
          ))}
          <span className="px-2 py-1 rounded text-[10px] bg-white/5 text-text-muted">
            {w.cloud > 60 ? '多云' : w.cloud > 30 ? '少云' : '晴朗'} · 云量{w.cloud}%
          </span>
        </div>
      )}

      {/* ── Status bar ── */}
      <div className="mt-auto rounded-lg px-4 py-2.5 text-[11px] font-medium flex items-center justify-between"
        style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}20` }}>
        <span className="flex items-center gap-1.5">
          <span className="text-sm">{w.is_day ? '☀' : '🌙'}</span>
          {statusLabel}
        </span>
        <span className="font-mono tabular-nums opacity-70">
          贡献率 <span className="font-bold">{contribution}%</span>
        </span>
      </div>
    </div>
  );
}
