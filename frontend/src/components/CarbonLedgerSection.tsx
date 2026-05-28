import { useEffect, useState } from 'react';
import { Leaf, Factory, TreePine, Banknote, Building2, Scale } from 'lucide-react';
import { useInView } from '../lib/useInView';
import { AnimatedNumber } from './AnimatedNumber';
import { ChinaEnergyMap } from './ChinaEnergyMap';
import type { CarbonLedger, OverviewData } from './types';

function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, revealed } = useInView({ delay: delay * 150 });
  return (
    <div ref={ref} className={revealed ? 'reveal-visible' : 'reveal-hidden'}
      style={{ transitionDelay: `${delay * 0.15}s` }}>
      {children}
    </div>
  );
}

interface Props { ledger: CarbonLedger; overview: OverviewData; }

export function CarbonLedgerSection({ ledger, overview }: Props) {
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try { const r = await fetch('/api/live-data'); if (r.ok) setLiveData(await r.json()); } catch {}
    };
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);
  const entries = [
    { icon: Factory, label: '节约标准煤', value: ledger.coalSavedKg, unit: 'kg', color: '#FF9500', source: 'GB/T 2589-2020 · 0.330 kgce/kWh' },
    { icon: Leaf, label: 'CO₂ 减排', value: ledger.co2ReducedKg, unit: 'kg', color: '#34C759', source: '生态环境部 2024 · 0.6205 kgCO₂/kWh' },
    { icon: TreePine, label: '等效植树', value: ledger.treeEquivalent, unit: '棵', color: '#34C759', source: '国家林草局 · 21.77 kgCO₂/株/年', decimals: 2 },
    { icon: Banknote, label: '节省电费', value: ledger.costSavedYuan, unit: '元', color: '#FFD700', source: '湖北省发改委 · 0.55 元/kWh', decimals: 0 },
    { icon: Building2, label: '可供电教室', value: ledger.classroomsPowered, unit: '天', color: '#00D4FF', source: '等效全亮天数', decimals: 0 },
    { icon: Scale, label: '全校年潜力', value: ledger.campusAnnualPotentialKwh, unit: 'kWh', color: '#00D4FF', source: '×200间教室推广', decimals: 0 },
  ];

  return (
    <section className="min-h-screen px-6 py-24">
      <div className="max-w-[1200px] mx-auto">
        <R delay={0}><div className="text-center mb-12">
          <h2 className="text-2xl font-display tracking-[0.2em] text-text-primary mb-2">CARBON LEDGER</h2>
          <p className="text-xs text-text-muted tracking-[0.3em] uppercase">生态碳账本 · 每一度电都有一笔生态账</p>
        </div></R>

        {/* Ledger grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {entries.map((entry, i) => (
            <R key={entry.label} delay={1 + i}><div className="hud-card p-5 glow-border">
              <div className="flex items-start justify-between mb-3">
                <entry.icon size={20} style={{ color: entry.color, opacity: 0.8 }} />
                <span className="text-[10px] text-text-muted uppercase tracking-wider">{entry.source.split('·')[0]}</span>
              </div>
              <div className="kpi-number text-3xl mb-1" style={{ color: entry.color }}>
                <AnimatedNumber value={entry.value} decimals={(entry as any).decimals ?? 1} />
                <span className="text-sm ml-1 text-text-muted">{entry.unit}</span>
              </div>
              <div className="text-xs text-text-secondary">{entry.label}</div>
              <div className="mt-2 text-[10px] text-text-muted font-mono leading-relaxed">{entry.source}</div>
            </div></R>
          ))}
        </div>

        {/* China energy potential map with live pilot city data */}
        <R delay={8}><ChinaEnergyMap liveData={liveData} /></R>

        {/* Campus potential callout */}
        <R delay={9}><div className="glass-card rounded-xl p-10 text-center glow-border max-w-4xl mx-auto">
          <div className="text-xs text-text-muted tracking-[0.2em] uppercase mb-4">Campus-Scale Carbon Impact</div>
          <div className="kpi-number text-5xl text-cyan text-glow-cyan mb-3">
            <AnimatedNumber value={ledger.campusAnnualPotentialCo2Kg / 1000} decimals={1} />
            <span className="text-xl ml-2 text-text-muted">吨 CO₂/年</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            若推广至全校 <span className="text-cyan font-bold">200</span> 间教室，
            年减排二氧化碳 <span className="text-green font-bold">{(ledger.campusAnnualPotentialCo2Kg / 1000).toFixed(1)} 吨</span>，
            等效植树 <span className="text-green font-bold">{Math.round(ledger.campusAnnualPotentialCo2Kg / 21.77)} 棵</span>。
            这不仅是节能，是校园碳中和基础设施的关键一步。
          </p>
        </div></R>
      </div>
    </section>
  );
}
