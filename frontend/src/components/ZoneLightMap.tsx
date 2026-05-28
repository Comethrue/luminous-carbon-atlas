import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, Lightbulb, Gauge } from 'lucide-react';

interface Props {
  zoneStates: Record<string, boolean>;
  zonePowers: Record<string, number>;
  persons: number;
  strategy: string;
}

const ZONES = [
  { id: 'left', label: '左区', x: 20, y: 130, w: 70, h: 90 },
  { id: 'center', label: '中区', x: 100, y: 130, w: 70, h: 90 },
  { id: 'right', label: '右区', x: 180, y: 130, w: 70, h: 90 },
];

const strategyLabels: Record<string, string> = {
  ALL_OFF: '全关', ZONE_PARTIAL: '分区控制', ALL_ON: '全亮', HOLD: '维持',
};

const strategyDescriptions: Record<string, string> = {
  ALL_OFF: '教室无人，所有区域已自动关闭',
  ZONE_PARTIAL: '按人数精准控灯，仅点亮有人的区域',
  ALL_ON: '教室满员，三区全功率运行',
  HOLD: '光照条件稳定，维持当前亮度不变',
};

const SEAT_POSITIONS = [
  { cx: 44, cy: 92 }, { cx: 100, cy: 88 }, { cx: 156, cy: 94 }, { cx: 212, cy: 90 },
  { cx: 58, cy: 124 }, { cx: 128, cy: 120 }, { cx: 184, cy: 126 }, { cx: 226, cy: 122 },
  { cx: 44, cy: 156 }, { cx: 100, cy: 152 }, { cx: 156, cy: 158 }, { cx: 212, cy: 154 },
  { cx: 58, cy: 188 }, { cx: 128, cy: 184 }, { cx: 184, cy: 190 }, { cx: 226, cy: 186 },
];

function ZonePowerBar({ label, active, power, color = '#00D4FF' }: { label: string; active: boolean; power: number; color?: string }) {
  const pct = active ? Math.min(100, (power / 160) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted w-8 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: active ? color : 'transparent', boxShadow: active ? `0 0 6px ${color}40` : 'none' }} />
      </div>
      <span className="text-[10px] font-mono w-10 text-right flex-shrink-0" style={{ color: active ? color : '#4A6080' }}>
        {active ? `${power}W` : 'OFF'}
      </span>
    </div>
  );
}

export function ZoneLightMap({ zoneStates, zonePowers, persons, strategy }: Props) {
  const visibleDots = useMemo(() => {
    const count = Math.min(persons, SEAT_POSITIONS.length);
    return SEAT_POSITIONS.slice(0, count);
  }, [persons]);

  const totalPower = Object.values(zonePowers).reduce((a: number, b: number) => a + b, 0);
  const activeZones = Object.values(zoneStates).filter(Boolean).length;
  // Efficiency: watts per person (lower is better; 0 when no one is present is optimal)
  const wPerPerson = persons > 0 ? (totalPower / persons).toFixed(1) : '0';
  const isEfficient = persons > 0 && totalPower / persons <= 12;

  return (
    <div className="flex flex-col items-center">
      {/* Subtitle description */}
      <p className="text-[11px] text-text-secondary text-center leading-relaxed mb-4 px-1">
        AI 视觉实时定位教室内人员位置，按
        <span className="text-cyan font-semibold">左·中·右</span>三区独立控灯。
        有人即亮、无人即灭，精准到分区级别。
      </p>

      {/* Classroom top-down SVG */}
      <svg viewBox="0 0 280 280" className="w-full max-w-[260px]">
        <defs>
          <pattern id="seatGrid" x="0" y="0" width="28" height="32" patternUnits="userSpaceOnUse">
            <rect width="28" height="32" fill="none" />
          </pattern>
        </defs>

        {/* Classroom outline */}
        <rect x="10" y="10" width="260" height="260" rx="8"
          fill="none" stroke="rgba(0,136,255,0.2)" strokeWidth="2" strokeDasharray="6,3" />
        <rect x="10" y="10" width="260" height="260" rx="8" fill="none"
          stroke="rgba(0,212,255,0.15)" strokeWidth="1" strokeDasharray="80,180"
          className="[stroke-dashoffset:0] animate-[dashMove_4s_linear_infinite]"
          style={{ strokeDashoffset: 0 }} />

        {/* Podium */}
        <rect x="60" y="20" width="160" height="40" rx="4"
          fill="rgba(0,212,255,0.05)" stroke="rgba(0,212,255,0.15)" strokeWidth="1" />
        <text x="140" y="44" textAnchor="middle" fill="#4A6080" fontSize="10" fontFamily="sans-serif">讲台</text>

        {/* Seating rows */}
        {[0, 1, 2, 3, 4].map(row => (
          <g key={row}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(col => (
              <rect key={col} x={30 + col * 28} y={80 + row * 32} width="22" height="18" rx="2"
                fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            ))}
          </g>
        ))}

        {/* Zone dividers */}
        <line x1="93" y1="70" x2="93" y2="265" stroke="rgba(0,180,255,0.3)" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="187" y1="70" x2="187" y2="265" stroke="rgba(0,180,255,0.3)" strokeWidth="1" strokeDasharray="4,4" />

        {/* Zone labels */}
        <text x="55" y="82" textAnchor="middle" fill="rgba(0,212,255,0.4)" fontSize="9">左区</text>
        <text x="140" y="82" textAnchor="middle" fill="rgba(0,212,255,0.4)" fontSize="9">中区</text>
        <text x="225" y="82" textAnchor="middle" fill="rgba(0,212,255,0.4)" fontSize="9">右区</text>

        {/* Zone highlights */}
        {ZONES.map(zone => {
          const active = zoneStates[zone.id];
          const power = zonePowers[zone.id];
          return (
            <g key={zone.id}>
              <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="6"
                fill={active ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.01)'}
                stroke={active ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.06)'}
                strokeWidth={active ? '1.5' : '0.5'}
                style={{ transition: 'all 0.8s ease' }}
              />
              <rect x={zone.x + 22} y={zone.y + 8} width="26" height="5" rx="2"
                fill={active ? '#00D4FF' : '#1A2A44'}
                style={{
                  transition: 'all 0.6s ease',
                  filter: active ? 'drop-shadow(0 0 8px rgba(0,212,255,0.7))' : 'none',
                }}
              />
              <text x={zone.x + 35} y={zone.y + 55} textAnchor="middle"
                fill={active ? '#E8EDF5' : '#4A6080'} fontSize="11" fontWeight="600"
                fontFamily="sans-serif">{zone.label}</text>
              <text x={zone.x + 35} y={zone.y + 70} textAnchor="middle"
                fill={active ? '#00D4FF' : '#4A6080'} fontSize="10" fontFamily="JetBrains Mono, monospace">
                {active ? `${power}W` : 'OFF'}
              </text>
            </g>
          );
        })}

        {/* Person dots */}
        {visibleDots.map((pos, i) => (
          <motion.circle key={i}
            cx={pos.cx} cy={pos.cy} r="5" fill="#34C759"
            initial={{ opacity: 0, r: 0 }}
            animate={{ opacity: [0.4, 0.9, 0.4], r: [4, 6, 4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25 }}
            style={{ filter: 'drop-shadow(0 0 5px rgba(52,199,89,0.7))' }}
          />
        ))}
      </svg>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-6 mt-4 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Users size={14} className="text-green" />
          <span className="text-white font-bold">{persons}</span> 人
        </span>
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Lightbulb size={14} className="text-cyan" />
          <span className="text-white font-bold">{activeZones}/3</span> 区活跃
        </span>
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Zap size={14} className="text-gold" />
          <span className="text-white font-bold">{totalPower}W</span>
        </span>
      </div>

      {/* ── Per-zone power bars ── */}
      <div className="w-full max-w-[260px] space-y-1.5 mt-4">
        <ZonePowerBar label="左区" active={zoneStates.left} power={zonePowers.left} color="#00D4FF" />
        <ZonePowerBar label="中区" active={zoneStates.center} power={zonePowers.center} color="#00B8FF" />
        <ZonePowerBar label="右区" active={zoneStates.right} power={zonePowers.right} color="#0098FF" />
      </div>

      {/* ── Strategy badge + description ── */}
      <div className="w-full max-w-[260px] mt-4 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full border border-cyan-dim text-[10px] text-cyan font-mono">
            {strategyLabels[strategy] || strategy}
          </span>
          <span className={`px-2 py-1 rounded-full border text-[10px] font-mono ${isEfficient ? 'border-green/20 text-green bg-green/5' : 'border-gold/20 text-gold bg-gold/5'}`}>
            <Gauge size={10} className="inline mr-1" />
            {wPerPerson}W/人
          </span>
        </div>
        <p className="text-[10px] text-text-muted text-center leading-relaxed">
          {strategyDescriptions[strategy] || 'AI 根据人数和自然光动态调节'}
        </p>
      </div>

      {/* ── Energy saving note ── */}
      {activeZones < 3 && totalPower < 480 && (
        <div className="w-full max-w-[260px] mt-3 rounded-lg px-3 py-2 text-[10px] flex items-center justify-between"
          style={{ background: 'rgba(52,199,89,0.06)', border: '1px solid rgba(52,199,89,0.12)' }}>
          <span className="text-green">⚡ 分区控制节能中</span>
          <span className="font-mono text-text-muted">
            省 <span className="text-green font-bold">{480 - totalPower}W</span> · {((480 - totalPower) / 480 * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
