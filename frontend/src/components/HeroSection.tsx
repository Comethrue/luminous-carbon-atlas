import { motion } from 'framer-motion';
import { ChevronDown, Cpu, Zap } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import type { OverviewData } from './types';

interface Props { overview: OverviewData; live: any; }

export function HeroSection({ overview, live }: Props) {
  return (
    <section className="section-full relative flex-col text-center pt-16">
      {/* Energy Core visual (CSS-only 2.5D) */}
      <div className="relative w-80 h-80 mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-dim animate-spin"
          style={{ animationDuration: '20s' }} />
        {/* Middle ring */}
        <div className="absolute inset-4 rounded-full border border-cyan/20 animate-spin"
          style={{ animationDuration: '14s', animationDirection: 'reverse' }} />
        {/* Inner core */}
        <div className="absolute inset-12 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,136,255,0.05) 40%, transparent 70%)',
            boxShadow: '0 0 60px rgba(0,180,255,0.2), inset 0 0 40px rgba(0,180,255,0.1)',
          }}
        />
        {/* Center glow */}
        <div className="absolute inset-20 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 60%)',
            animationDuration: '3s',
          }}
        />
        {/* Energy particles orbit */}
        {[0, 120, 240].map((deg, i) => (
          <div key={i} className="absolute inset-0 animate-spin"
            style={{ animationDuration: `${6 + i * 4}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan"
              style={{ boxShadow: '0 0 12px rgba(0,212,255,0.8)' }} />
          </div>
        ))}
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <h1 className="text-6xl font-display font-bold tracking-widest text-glow-cyan mb-3">
          数智光衡
        </h1>
        <p className="text-lg text-text-secondary tracking-[0.3em] uppercase mb-2">
          Luminous Carbon Atlas
        </p>
        <p className="text-sm text-text-muted tracking-wider">
          AI-Driven Classroom Energy &amp; Carbon Intelligence
        </p>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="mt-8 text-base text-text-secondary tracking-wider"
      >
        让每一束光，都被数据精确衡量
      </motion.p>

      {/* Quick stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-10 flex gap-10 text-center"
      >
        <div>
          <div className="kpi-number text-3xl text-cyan text-glow-cyan">
            <AnimatedNumber value={overview.savingRate} decimals={1} />%
          </div>
          <div className="text-[10px] text-text-muted tracking-widest mt-1">节能率</div>
        </div>
        <div className="w-px bg-border" />
        <div>
          <div className="kpi-number text-3xl text-green text-glow-green">
            <AnimatedNumber value={overview.co2ReducedKg} decimals={1} />
          </div>
          <div className="text-[10px] text-text-muted tracking-widest mt-1">kg CO₂ 减排</div>
        </div>
        <div className="w-px bg-border" />
        <div>
          <div className="kpi-number text-3xl text-gold text-glow-gold">
            ¥<AnimatedNumber value={overview.costSavedYuan} decimals={0} />
          </div>
          <div className="text-[10px] text-text-muted tracking-widest mt-1">节省电费</div>
        </div>
      </motion.div>

      {/* Live indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="mt-8 flex items-center gap-6 text-xs font-mono text-text-muted"
      >
        <span className="flex items-center gap-1.5">
          <Cpu size={12} className="text-green" />
          AI 控制率 {overview.aiControlRate}%
        </span>
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-gold" />
          当前功率 {live.powerW}W
        </span>
        <span>活跃分区 {live.zonesActive}/3</span>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 text-text-muted"
      >
        <ChevronDown size={24} />
        <div className="text-[10px] tracking-widest mt-1">SCROLL TO OBSERVE</div>
      </motion.div>
    </section>
  );
}
