import { useMemo, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { useInView } from '../lib/useInView';
import { KpiCard } from './KpiCard';
import { EChartsWrapper } from './EChartsWrapper';
import { ZoneLightMap } from './ZoneLightMap';
import { EnvironmentCard } from './EnvironmentCard';
import { CampusEnergyMap } from './CampusEnergyMap';
import type { OverviewData, TimeSeriesPoint, DailyTrend, MonthlyTrend, Scenario } from './types';

function R({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, revealed } = useInView({ delay: delay * 120 });
  return (
    <div ref={ref} className={`${revealed ? 'reveal-visible' : 'reveal-hidden'} ${className}`}
      style={{ transitionDelay: `${delay * 0.12}s` }}>
      {children}
    </div>
  );
}

interface Props {
  overview: OverviewData;
  live: any;
  timeSeries24h: TimeSeriesPoint[];
  weekly: DailyTrend[];
  monthly: MonthlyTrend[];
  scenarios: Scenario[];
  env: any;
}

const axisStyle = {
  axisLine: { lineStyle: { color: '#1A2A44' } },
  axisTick: { show: false },
  axisLabel: { color: '#5A7090', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', margin: 8 },
  splitLine: { lineStyle: { color: 'rgba(0,136,255,0.04)' } },
};

export function ObservatorySection({ overview, live, timeSeries24h, weekly, monthly, scenarios, env }: Props) {
  const times = timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.time);
  const baselineArr = timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.baselinePower);
  const aiArr = timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.aiPower);

  // ── Environment-driven chart modifications ──
  const envSolar = env?.weather?.solar_radiation ?? 500;
  const envCloud = env?.weather?.cloud ?? 50;
  const naturalLightFactor = env?.weather?.is_day ? (1 - envCloud / 100) * (envSolar / 900) : 0;
  // Adjusted AI power: natural light reduces the need for artificial lighting
  const adjustedAiArr = useMemo(() =>
    aiArr.map(v => Math.max(0, v * (1 - naturalLightFactor * 0.25))),
    [aiArr, naturalLightFactor]
  );
  // Saved energy = baseline - adjusted AI (gap between the two lines)
  const savedArr = useMemo(() =>
    baselineArr.map((b, i) => Math.max(0, b - adjustedAiArr[i])),
    [baselineArr, adjustedAiArr]
  );
  // Static average — computed once, never jumps
  const avgSaved = useMemo(() => {
    const nonZero = savedArr.filter(v => v > 0);
    return nonZero.length > 0 ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length) : 0;
  }, [savedArr]);
  // Current carbon intensity
  const carbonIntensity = env?.carbonIntensity?.value ?? 620.5;

  return (
    <section className="min-h-screen px-6 py-24">
      <div className="max-w-[1440px] mx-auto">
        {/* Section title */}
        <R delay={0}><div className="text-center mb-10">
          <h2 className="text-2xl font-display tracking-[0.2em] text-text-primary mb-2 reveal-title">OBSERVATORY</h2>
          <p className="text-xs text-text-muted tracking-[0.3em] uppercase">主监测舱 · 实时数据中枢</p>
        </div></R>

        {/* Top KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          {[0,1,2,3,4].map(i => (
            <R key={i} delay={1+i}>
              {i===0 && <KpiCard label="累计节电" value={overview.totalSavedKwh} unit="kWh" color="cyan" decimals={1} />}
              {i===1 && <KpiCard label="节能率" value={overview.savingRate} unit="%" color="gold" trend={2.1} />}
              {i===2 && <KpiCard label="CO₂ 减排" value={overview.co2ReducedKg} unit="kg" color="green" subtitle="0.6205 kgCO₂/kWh · 生态环境部2025" />}
              {i===3 && <KpiCard label="等效植树" value={overview.treeEquivalent} unit="棵" color="green" decimals={2} subtitle="21.77 kgCO₂/株/年 · 国家林草局" />}
              {i===4 && <KpiCard label="节省电费" value={overview.costSavedYuan} unit="元" color="gold" decimals={0} subtitle="0.55 元/kWh · 湖北省发改委" />}
            </R>
          ))}
        </div>

        {/* Environment + Zone Map row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <R delay={6}><EnvironmentCard /></R>
          <R delay={7}><div className="glass-card rounded-xl p-4 glow-border">
            <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-3">数字孪生 · 三区灯控</div>
            <ZoneLightMap zoneStates={live.zoneStates} zonePowers={live.zonePowers} persons={live.persons} strategy={live.strategy} />
          </div></R>
        </div>

        {/* 24h Chart — full width */}
        <R delay={8}><div className="glass-card rounded-xl p-5 glow-border chart-glow relative overflow-hidden mb-4">
          <div className="absolute inset-0 pointer-events-none z-10" style={{background:'linear-gradient(180deg,transparent 0%,rgba(0,180,255,0.015) 50%,transparent 100%)',backgroundSize:'100% 60px',animation:'chartScan 6s linear infinite'}} />
          <div className="flex items-center justify-between mb-3 relative z-20">
            <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase">24小时能耗对比</div>
            <div className="flex gap-5 text-[10px] font-mono">
              <span className="text-red">--- 传统全亮 480W</span>
              <span className="text-cyan">── AI智能控制</span>
              <span className="text-green/60">▓ 已节能</span>
            </div>
          </div>
          <div className="relative z-20">
          <EChartsWrapper
            className="w-full" style={{ height: 400 }}
            option={{
              tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(9,16,31,0.96)',
                borderColor: 'rgba(0,200,255,0.3)',
                borderWidth: 1,
                textStyle: { color: '#E8EDF5', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
                extraCssText: 'animation:tooltipIn 0.3s ease-out;box-shadow:0 8px 32px rgba(0,0,0,0.5);border-radius:10px;',
                formatter: (ps: any) => {
                  const t = ps[0]?.axisValue || '';
                  const base = ps.find((p:any) => p.seriesName?.includes('传统'))?.value ?? 0;
                  const ai = ps.find((p:any) => p.seriesName?.includes('AI'))?.value ?? 0;
                  const saved = base - ai;
                  return `<div style="font-weight:700;margin-bottom:4px">${t}</div>
                    <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF3B30;margin-right:6px"></span>传统全亮 <b>${base}W</b></div>
                    <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00D4FF;margin-right:6px"></span>AI控制 <b>${ai}W</b></div>
                    ${saved > 0 ? `<div style="margin-top:4px;color:#34C759">节省 <b>${saved}W</b> (${base>0?Math.round(saved/base*100):0}%)</div>` : ''}`;
                },
              },
              legend: { show: false },
              grid: { left: 62, right: 34, top: 32, bottom: 38 },
              xAxis: {
                type: 'category', data: times,
                ...axisStyle,
                axisLabel: { ...axisStyle.axisLabel, interval: 3 },
                axisLine: { lineStyle: { color: '#1A2A44' } },
              },
              yAxis: {
                type: 'value', name: 'W', nameTextStyle: { color: '#4A6080', fontSize: 10 },
                min: 0, max: 500, interval: 100,
                ...axisStyle,
              },
              animationDuration: 1000,
              animationEasing: 'cubicOut',
              series: [
                // ── Background: night/day zones ──
                {
                  type: 'line', data: [], symbol: 'none',
                  markArea: {
                    silent: true,
                    data: [
                      [{ xAxis: '00:00', itemStyle: { color: 'rgba(0,0,0,0.25)' } }, { xAxis: '07:00' }],
                      [{ xAxis: '21:00', itemStyle: { color: 'rgba(0,0,0,0.25)' } }, { xAxis: '23:45' }],
                    ],
                  },
                  z: 0,
                },
                // ── Red baseline ──
                {
                  name: '传统全亮 480W', type: 'line', data: baselineArr,
                  lineStyle: { color: '#FF3B30', type: 'dashed', width: 1.5, shadowBlur: 4, shadowColor: 'rgba(255,59,48,0.3)' },
                  symbol: 'none',
                  animationDelay: (idx: number) => idx,
                  markLine: {
                    silent: true, symbol: ['none', 'none'],
                    lineStyle: { color: 'rgba(255,59,48,0.2)', type: 'solid', width: 1 },
                    label: { show: false },
                    data: [{ yAxis: 480, name: '全亮480W' }],
                  },
                  z: 2,
                },
                // ── Cyan AI line ──
                {
                  name: 'AI智能控制', type: 'line', data: adjustedAiArr,
                  lineStyle: { color: '#00D4FF', width: 2.5, shadowBlur: 14, shadowColor: 'rgba(0,212,255,0.6)' },
                  symbol: 'none',
                  animationDelay: (idx: number) => idx,
                  areaStyle: {
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(0,212,255,0.10)' },
                        { offset: 0.6, color: 'rgba(0,180,255,0.03)' },
                        { offset: 1, color: 'rgba(0,136,255,0.0)' },
                      ],
                    },
                  },
                  z: 3,
                },
                // ── Green savings fill (no animation — prevents markLine text flicker) ──
                {
                  name: '已节能', type: 'line', data: savedArr,
                  lineStyle: { color: 'transparent', width: 0 }, symbol: 'none',
                  animation: false,
                  areaStyle: {
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(52,199,89,0.45)' },
                        { offset: 0.4, color: 'rgba(52,199,89,0.20)' },
                        { offset: 1, color: 'rgba(52,199,89,0.03)' },
                      ],
                    },
                  },
                  // ── Average savings annotation ──
                  markLine: {
                    silent: true, symbol: ['none', 'none'],
                    lineStyle: { color: 'rgba(52,199,89,0.35)', type: 'dotted', width: 1 },
                    label: { color: '#34C759', fontSize: 10, fontWeight: 'bold', formatter: `平均节能 ${avgSaved}W`, position: 'insideEndTop', distance: 8 },
                    data: [{ yAxis: avgSaved, name: '平均节能' }],
                  },
                  z: 1,
                },
              ],
            }}
          />
          </div>
        </div></R>

        {/* Bottom charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Strategy pie — glow ring */}
          <R delay={9}><div className="glass-card rounded-xl p-4 glow-border chart-glow relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-10" style={{background:'linear-gradient(180deg,transparent 0%,rgba(0,180,255,0.015) 50%,transparent 100%)',backgroundSize:'100% 50px',animation:'chartScan 5s linear infinite'}} />
            <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2 relative z-20">控制策略分布</div>
            <div className="relative z-20">
            <EChartsWrapper className="w-full" style={{ height: 220 }}
              option={{
                tooltip: { trigger: 'item', backgroundColor: 'rgba(9,16,31,0.96)', borderColor:'rgba(0,200,255,0.3)', textStyle:{color:'#E8EDF5',fontSize:11} },
                legend: { bottom: 6, textStyle: { color: '#8899BB', fontSize: 10 } },
                animationDuration: 1000,
                animationEasing: 'elasticOut',
                series: [{
                  type: 'pie', radius: ['55%', '78%'], center: ['50%', '45%'],
                  itemStyle: { borderRadius:4, borderColor:'#060B14', borderWidth:3, shadowBlur:12, shadowColor:'rgba(0,180,255,0.2)' },
                  label: { color:'#8899BB',fontSize:10,formatter:'{b}\n{d}%' },
                  emphasis: { scale:true,scaleSize:14, label:{fontSize:14,fontWeight:'bold'} },
                  data: [
                    { value:45, name:'ALL_OFF 全关', itemStyle:{color:'#3A5070'} },
                    { value:30, name:'ZONE_PARTIAL', itemStyle:{color:'#FFD700',shadowBlur:10,shadowColor:'rgba(255,215,0,0.3)'} },
                    { value:20, name:'ALL_ON 全亮', itemStyle:{color:'#00D4FF',shadowBlur:14,shadowColor:'rgba(0,212,255,0.4)'} },
                    { value:5, name:'HOLD 维持', itemStyle:{color:'#FF9500'} },
                  ],
                }],
              }}
            />
            </div>
          </div></R>

          {/* Weekly bar — shimmer gradient */}
          <R delay={10}><div className="glass-card rounded-xl p-4 glow-border chart-glow relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-10" style={{background:'linear-gradient(180deg,transparent 0%,rgba(0,180,255,0.015) 50%,transparent 100%)',backgroundSize:'100% 50px',animation:'chartScan 7s linear infinite'}} />
            <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2 relative z-20">七日能耗趋势</div>
            <div className="relative z-20">
            <EChartsWrapper className="w-full" style={{ height: 220 }}
              option={{
                tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor:'rgba(0,200,255,0.3)', textStyle:{color:'#E8EDF5',fontSize:11} },
                legend: { bottom: 6, textStyle: { color: '#8899BB', fontSize: 10 } },
                grid: { left: 52, right: 16, top: 12, bottom: 38 },
                xAxis: { type: 'category', data: weekly.map(d => d.day), ...axisStyle },
                yAxis: { type: 'value', name: 'kWh', ...axisStyle },
                animationDuration: 1000,
                animationEasing: 'cubicOut',
                series: [
                  { name: '全亮基线', type: 'bar', data: weekly.map(d => d.baseline),
                    itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#FF3B30'},{offset:1,color:'#991D18'}]), borderRadius:[3,3,0,0], shadowBlur:4, shadowColor:'rgba(255,59,48,0.25)' },
                    barWidth: '35%', animationDelay: idx=>idx*60 },
                  { name: 'AI节能', type: 'bar', data: weekly.map(d => d.ai),
                    itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#00D4FF'},{offset:1,color:'#004D88'}]), borderRadius:[3,3,0,0], shadowBlur:8, shadowColor:'rgba(0,212,255,0.3)' },
                    barWidth: '35%', animationDelay: idx=>idx*60 },
                ],
              }}
            />
            </div>
          </div></R>

          {/* Scenarios compare */}
          <R delay={11}><div className="glass-card rounded-xl p-4 glow-border chart-glow relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-10" style={{background:'linear-gradient(180deg,transparent 0%,rgba(0,180,255,0.015) 50%,transparent 100%)',backgroundSize:'100% 50px',animation:'chartScan 5.5s linear infinite'}} />
            <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2 relative z-20">方案对比 · 日能耗</div>
            <div className="relative z-20">
            <EChartsWrapper className="w-full" style={{ height: 220 }}
              option={{
                tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor:'rgba(0,200,255,0.3)', textStyle:{color:'#E8EDF5',fontSize:11} },
                grid: { left: 52, right: 16, top: 12, bottom: 36 },
                xAxis: { type: 'category', data: scenarios.map(s => s.name), axisLabel: { color:'#4A6080',fontSize:9,rotate:15 }, axisLine:{lineStyle:{color:'#1A2A44'}} },
                yAxis: { type: 'value', name: 'kWh/天', ...axisStyle },
                animationDuration: 1000,
                animationEasing: 'elasticOut',
                series: [{
                  type: 'bar', data: scenarios.map((s,i) => ({
                    value: s.dailyKwh,
                    itemStyle: {
                      color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:s.color},{offset:1,color:s.color+'88'}]),
                      borderRadius: [4,4,0,0],
                      shadowBlur: i===3?14:6,
                      shadowColor: s.color+'66',
                    }
                  })),
                  barWidth: '45%',
                  animationDelay: idx=>idx*80,
                  label: { show:true,position:'top',color:'#8899BB',fontSize:10,fontWeight:600, formatter:p=>p.value+' kWh' },
                  emphasis: { itemStyle:{shadowBlur:20,shadowColor:'rgba(0,212,255,0.5)'} },
                }],
              }}
            />
            </div>
          </div></R>
        </div>

        {/* Campus Energy-Carbon Topology Map */}
        <R delay={12}><div className="mt-4">
          <CampusEnergyMap overview={overview} live={live} />
        </div></R>

        {/* Environment data annotation */}
        {env && (
          <div className="mt-3 text-center text-[10px] font-mono text-text-muted">
            实时环境数据 · 自然光
            <span className="text-gold">{env.weather?.solar_radiation ?? '--'}W/m²</span> ·
            碳强度 <span className="text-cyan">{carbonIntensity}gCO₂/kWh</span> ·
            照明建议 <span className="text-green">{env.weather?.lighting_impact?.recommended_brightness_pct ?? '--'}%</span>
            {env.weather?._source && env.weather._source !== 'simulated' && (
              <span className="ml-2 text-cyan">· {env.weather._source === 'open-meteo' ? 'Open-Meteo LIVE' : env.weather._source + ' LIVE'}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
