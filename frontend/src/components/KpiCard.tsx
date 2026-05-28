import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  label: string;
  value: number;
  unit?: string;
  trend?: number;
  color?: 'cyan' | 'green' | 'gold' | 'white' | 'red';
  decimals?: number;
  subtitle?: string;
  className?: string;
}

const colorMap = {
  cyan:   { text: 'text-cyan', glow: 'text-glow-cyan', bg: 'rgba(0,212,255,0.08)' },
  green:  { text: 'text-green', glow: 'text-glow-green', bg: 'rgba(52,199,89,0.08)' },
  gold:   { text: 'text-gold', glow: 'text-glow-gold', bg: 'rgba(255,215,0,0.08)' },
  white:  { text: 'text-text-primary', glow: '', bg: 'rgba(255,255,255,0.04)' },
  red:    { text: 'text-red', glow: '', bg: 'rgba(255,59,48,0.08)' },
};

export function KpiCard({ label, value, unit, trend, color = 'cyan', decimals = 1, subtitle, className }: Props) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card rounded-xl p-5 relative overflow-hidden glow-border ${className || ''}`}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.bg}, transparent)` }} />
      {/* Corner glow */}
      <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${c.bg} 0%, transparent 70%)` }} />

      <div className="relative z-10">
        <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2">{label}</div>
        <div className={`kpi-number text-3xl ${c.text} ${c.glow}`}>
          <AnimatedNumber value={value} decimals={decimals} />
          {unit && <span className="text-sm ml-1 text-text-muted">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend >= 0
              ? <TrendingUp size={12} className="text-green" />
              : <TrendingDown size={12} className="text-red" />
            }
            <span className={trend >= 0 ? 'text-green' : 'text-red'}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-text-muted ml-1">vs 上月</span>
          </div>
        )}
        {subtitle && (
          <div className="mt-1.5 text-[10px] text-text-muted font-mono">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}
