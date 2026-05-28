import { useInView } from '../lib/useInView';
import { EChartsWrapper } from './EChartsWrapper';
import type { TimeSeriesPoint, DailyTrend, Scenario, OverviewData } from './types';

function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, revealed } = useInView({ delay: delay * 150 });
  return (
    <div ref={ref} className={revealed ? 'reveal-visible' : 'reveal-hidden'}
      style={{ transitionDelay: `${delay * 0.15}s` }}>
      {children}
    </div>
  );
}

function ChapterBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return <R delay={delay}>{children}</R>;
}

interface Props {
  timeSeries24h: TimeSeriesPoint[];
  weekly: DailyTrend[];
  scenarios: Scenario[];
  overview: OverviewData;
}

const chapters = [
  {
    id: 'ch01',
    title: '能耗不是消失了，而是被看见了',
    subtitle: 'Chapter 01 — The Visible Waste',
    insight: '传统教室照明采用"全亮"模式，每天14小时，480W恒定功率。每年消耗 1,882 kWh，其中超过 70% 的时间教室实际使用率不足 50%。',
    highlight: '6.72 kWh',
    highlightLabel: '日均浪费',
  },
  {
    id: 'ch02',
    title: '从全亮到按需点亮',
    subtitle: 'Chapter 02 — Adaptive Illumination',
    insight: 'AI视觉系统实时检测教室人数与位置，仅对有人区域精确供电。3.6ms NPU推理延迟确保灯光响应无感知滞后，三区独立控制将平均功率从 480W 降至 134W。',
    highlight: '72.3%',
    highlightLabel: '节能率',
  },
  {
    id: 'ch03',
    title: 'AI 让照明从开关变成决策',
    subtitle: 'Chapter 03 — From Switch to Strategy',
    insight: '融合视觉、雷达、CO₂、光照、声音五模态数据，Cross-Attention机制动态分配各传感器权重。摄像头被遮挡时自动切换至雷达+CO₂融合模式，照明控制零中断。',
    highlight: '99.2%',
    highlightLabel: '系统可用率',
  },
  {
    id: 'ch04',
    title: '每一度电，都有一笔生态账',
    subtitle: 'Chapter 04 — The Carbon Ledger',
    insight: '每节省 1 kWh 电力，即减少 0.6205 kg CO₂ 排放（生态环境部2024），折合 0.330 kg 标准煤（GB/T 2589）。每 21.77 kg CO₂ 减排等效于一棵乔木一年的碳汇量。',
    highlight: '144.0 kg',
    highlightLabel: '累计CO₂减排',
  },
  {
    id: 'ch05',
    title: '当一间教室被优化，整个校园都开始低碳化',
    subtitle: 'Chapter 05 — Campus-Scale Impact',
    insight: '单教室年节省电费约 971 元。若推广至全校 200 间教室，年节电 37.6 万 kWh，减排 233 吨 CO₂，等效植树 10,700 棵。这不仅是节能，是校园碳中和的基础设施。',
    highlight: '¥19.4万',
    highlightLabel: '全校年节省电费',
  },
];

const axisStyle = {
  axisLine: { lineStyle: { color: '#1A2A44' } }, axisTick: { show: false },
  axisLabel: { color: '#4A6080', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
  splitLine: { lineStyle: { color: 'rgba(0,136,255,0.05)' } },
};

export function NarrativeSection({ timeSeries24h, weekly, scenarios, overview }: Props) {
  return (
    <section className="px-6 py-16">
      <div className="max-w-[1200px] mx-auto">
        {chapters.map((ch, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <ChapterBlock key={ch.id} delay={idx}>
            <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center mb-32`}>
              {/* Text side */}
              <div className="flex-1">
                <div className="text-[10px] text-cyan tracking-[0.3em] uppercase mb-3">{ch.subtitle}</div>
                <h3 className="text-3xl font-display font-bold text-text-primary mb-4 tracking-wide">{ch.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">{ch.insight}</p>
                <div className="flex items-baseline gap-2">
                  <span className="kpi-number text-4xl text-cyan text-glow-cyan">{ch.highlight}</span>
                  <span className="text-xs text-text-muted">{ch.highlightLabel}</span>
                </div>
              </div>

              {/* Chart side */}
              <div className="flex-1 glass-card rounded-xl p-4 glow-border w-full">
                {idx === 0 && (
                  <EChartsWrapper className="w-full" style={{ height: 280 }}
                    option={{
                      title: { text: '传统全亮 vs AI控制 · 24h功率对比', left: 'center', textStyle: { color: '#8899BB', fontSize: 12 } },
                      tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor: '#1A2A44', textStyle: { color: '#E8EDF5', fontSize: 11 } },
                      grid: { left: 54, right: 20, top: 44, bottom: 36 },
                      xAxis: { type: 'category', data: timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.time), ...axisStyle },
                      yAxis: { type: 'value', name: 'W', max: 520, ...axisStyle },
                      series: [
                        { name: '传统全亮', type: 'line', data: timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.baselinePower), lineStyle: { color: '#FF3B30', type: 'dashed', width: 2 }, symbol: 'none' },
                        { name: 'AI控制', type: 'line', data: timeSeries24h.filter((_, i) => i % 4 === 0).map(d => d.aiPower), lineStyle: { color: '#00D4FF', width: 2.5, shadowBlur: 8, shadowColor: 'rgba(0,212,255,0.4)' }, symbol: 'none', areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,180,255,0.2)' }, { offset: 1, color: 'rgba(0,136,255,0.02)' }] } } },
                      ],
                    }}
                  />
                )}
                {idx === 2 && (
                  <EChartsWrapper className="w-full" style={{ height: 280 }}
                    option={{
                      title: { text: '控制策略分布 · 七日统计', left: 'center', textStyle: { color: '#8899BB', fontSize: 12 } },
                      tooltip: { trigger: 'item', backgroundColor: 'rgba(9,16,31,0.96)', borderColor: '#1A2A44', textStyle: { color: '#E8EDF5', fontSize: 11 } },
                      series: [{
                        type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
                        itemStyle: { borderRadius: 4, borderColor: '#060B14', borderWidth: 3 },
                        label: { color: '#8899BB', fontSize: 11, formatter: '{b}\n{d}%' },
                        data: [
                          { value: 45, name: 'ALL_OFF', itemStyle: { color: '#3A5070' } },
                          { value: 30, name: 'ZONE_PARTIAL', itemStyle: { color: '#FFD700' } },
                          { value: 20, name: 'ALL_ON', itemStyle: { color: '#00D4FF' } },
                          { value: 5, name: 'HOLD', itemStyle: { color: '#FF9500' } },
                        ],
                      }],
                    }}
                  />
                )}
                {idx === 4 && (
                  <EChartsWrapper className="w-full" style={{ height: 280 }}
                    option={{
                      title: { text: '全校推广年度潜力评估', left: 'center', textStyle: { color: '#8899BB', fontSize: 12 } },
                      tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor: '#1A2A44', textStyle: { color: '#E8EDF5', fontSize: 11 } },
                      grid: { left: 54, right: 20, top: 44, bottom: 36 },
                      xAxis: { type: 'category', data: ['单教室','10间','50间','100间','200间(全校)'], ...axisStyle },
                      yAxis: { type: 'value', name: '万kWh/年', ...axisStyle },
                      series: [
                        { name: '年节电量', type: 'bar', data: [0.19, 1.88, 9.4, 18.8, 37.6], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00D4FF' }, { offset: 1, color: '#0055AA' }] }, borderRadius: [4, 4, 0, 0] }, barWidth: '50%' },
                      ],
                    }}
                  />
                )}
                {/* Placeholder visuals for ch01, ch03 without dedicated charts */}
                {idx === 1 && (
                  <EChartsWrapper className="w-full" style={{ height: 280 }}
                    option={{
                      title: { text: '七日能耗对比 · 每日基线 vs AI', left: 'center', textStyle: { color: '#8899BB', fontSize: 12 } },
                      tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor: '#1A2A44', textStyle: { color: '#E8EDF5', fontSize: 11 } },
                      legend: { bottom: 6, textStyle: { color: '#8899BB', fontSize: 10 } },
                      grid: { left: 54, right: 20, top: 44, bottom: 38 },
                      xAxis: { type: 'category', data: weekly.map(d => d.day), ...axisStyle },
                      yAxis: { type: 'value', name: 'kWh', ...axisStyle },
                      series: [
                        { name: '全亮基线', type: 'bar', data: weekly.map(d => d.baseline), itemStyle: { color: '#FF3B30', borderRadius: [3, 3, 0, 0] }, barWidth: '35%' },
                        { name: 'AI节能', type: 'bar', data: weekly.map(d => d.ai), itemStyle: { color: '#0088FF', borderRadius: [3, 3, 0, 0] }, barWidth: '35%' },
                      ],
                    }}
                  />
                )}
                {idx === 3 && (
                  <EChartsWrapper className="w-full" style={{ height: 280 }}
                    option={{
                      title: { text: '碳减排转化流程 · Sankey等效', left: 'center', textStyle: { color: '#8899BB', fontSize: 12 } },
                      tooltip: { trigger: 'axis', backgroundColor: 'rgba(9,16,31,0.96)', borderColor: '#1A2A44', textStyle: { color: '#E8EDF5', fontSize: 11 } },
                      grid: { left: 54, right: 20, top: 44, bottom: 36 },
                      xAxis: { type: 'category', data: ['节电\nkWh', 'CO₂减排\nkg', '标准煤\nkg', '植树\n等效'], ...axisStyle },
                      yAxis: { type: 'value', name: '', ...axisStyle },
                      series: [{
                        type: 'bar', data: [
                          { value: overview.totalSavedKwh, itemStyle: { color: '#00D4FF' } },
                          { value: overview.co2ReducedKg, itemStyle: { color: '#34C759' } },
                          { value: overview.totalSavedKwh * 0.33, itemStyle: { color: '#FF9500' } },
                          { value: overview.treeEquivalent, itemStyle: { color: '#34C759' } },
                        ],
                        barWidth: '50%', itemStyle: { borderRadius: [4, 4, 0, 0] },
                        label: { show: true, position: 'top', color: '#8899BB', fontSize: 10 },
                      }],
                    }}
                  />
                )}
              </div>
            </div>
            </ChapterBlock>
          );
        })}
      </div>
    </section>
  );
}
