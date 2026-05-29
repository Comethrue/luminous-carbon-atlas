import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModuleId } from './SensorShowcase';

interface ModuleInfo { id: ModuleId; label: string; sub: string; }

interface Props {
  mode: 'auto' | 'free';
  moduleId: ModuleId;
  autoTime: number;
  modules: ModuleInfo[];
  onModuleClick: (id: ModuleId) => void;
  onModeToggle: () => void;
  onReset: () => void;
  autoPlaying: boolean;
}

const MODULE_PANELS: Record<ModuleId, { title: string; stats: { label: string; value: string; unit: string }[]; desc: string }> = {
  overview:    { title: 'AI 全链路总览',    stats: [{ label: '推理延迟', value: '47', unit: 'ms/帧' }, { label: 'NPU 算力', value: '12', unit: 'TOPS' }, { label: '模型精度', value: '89', unit: '% mAP' }], desc: 'QCS6490 Hexagon NPU · 3路MIPI CSI · 边缘推理零云端依赖' },
  compression: { title: '模型压缩管线',    stats: [{ label: '原始体积', value: '240', unit: 'MB' }, { label: '压缩后', value: '1.2', unit: 'MB' }, { label: '压缩比', value: '200', unit: '×' }], desc: '结构化剪枝 30% 通道 · INT8 per-tensor 量化 · 知识蒸馏 T=4' },
  fusion:      { title: 'D-S 证据理论融合', stats: [{ label: '雷达 m1', value: '0.8', unit: '' }, { label: '视觉 m2', value: 'c×w', unit: 'env' }, { label: '冲突因子', value: '0.15', unit: 'K' }], desc: 'Dempster 组合规则 · 环境权重自适应 · K>0.5 降级策略' },
  dqn:         { title: 'DQN 强化学习决策', stats: [{ label: '状态空间', value: '288', unit: '维' }, { label: '动作空间', value: '9', unit: '种' }, { label: '训练量', value: '5000', unit: 'ep' }], desc: 'Q表 1152B 烧录 ESP8266 · 查表 <1μs · R=0.4节+0.4舒−0.2切' },
  classroom:   { title: '教室分区智能控灯', stats: [{ label: '分区数', value: '3', unit: '区' }, { label: '单区功率', value: '160', unit: 'W' }, { label: '节能率', value: '57', unit: '%' }], desc: 'AI视觉定位 → 按需分区亮灯 · 自然光协同 → 自动调暗省电' },
  ablation:    { title: '消融实验 · 模块贡献', stats: [{ label: '基线准确率', value: '65', unit: '%' }, { label: '最终准确率', value: '98.7', unit: '%' }, { label: '节能率提升', value: '18→42.3', unit: '%' }], desc: '每个AI模块解决一个特定问题 · 叠加效果是乘法而非加法' },
};

export function SensorShowcaseOverlay({ mode, moduleId, autoTime, modules, onModuleClick, onModeToggle, onReset, autoPlaying }: Props) {
  const panel = MODULE_PANELS[moduleId];
  const progress = (autoTime / 60) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* ── Top-left: compact title ── */}
      <div className="absolute top-6 left-8">
        <motion.div
          key={moduleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-display tracking-[0.15em] text-[#F5F0E8]/80">
            数智光衡
          </h2>
          <p className="text-[10px] text-[#8A8578] tracking-[0.2em] uppercase mt-0.5">
            {panel.title}
          </p>
        </motion.div>
      </div>

      {/* ── Bottom-right: compact data panel (free mode only, or auto mode mini) ── */}
      <div className="absolute bottom-32 right-8 max-w-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={moduleId + mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              background: 'rgba(12, 12, 16, 0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(200, 169, 110, 0.1)',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <div className="flex gap-5 mb-2">
              {panel.stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[9px] text-[#6A6558] tracking-wider uppercase mb-0.5">{s.label}</div>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-mono font-bold text-[#E8E0D0] tabular-nums">{s.value}</span>
                    {s.unit && <span className="text-[10px] text-[#6A6558]">{s.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#6A6558] font-mono leading-relaxed">
              {panel.desc}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom center: progress (auto mode) ── */}
      {mode === 'auto' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div className="w-[400px] h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <motion.div className="h-full rounded-full" style={{ background: '#C8A96E', width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {/* ── Bottom center: module navigation ── */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 px-3 py-2 rounded-full"
          style={{ background: 'rgba(16, 16, 20, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(200, 169, 110, 0.1)', pointerEvents: 'auto' }}>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={(e) => { e.stopPropagation(); onModuleClick(m.id); }}
              className="relative px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 whitespace-nowrap cursor-pointer"
              style={{
                color: moduleId === m.id ? '#0A0A0C' : '#8A8578',
                background: moduleId === m.id ? '#C8A96E' : 'transparent',
                pointerEvents: 'auto',
              }}
            >
              {m.label}
              {moduleId === m.id && <span className="block text-[9px] opacity-70 font-normal">{m.sub}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom center: control buttons ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(16, 16, 20, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(200, 169, 110, 0.1)', pointerEvents: 'auto' }}>
          <button onClick={(e) => { e.stopPropagation(); onModeToggle(); }} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors cursor-pointer" style={{ pointerEvents: 'auto' }}>
            <Play size={12} className={mode === 'auto' ? 'opacity-50' : ''} />
            {mode === 'auto' ? '自由探索' : '自动演示'}
          </button>
          <span className="text-[#3A3832] text-[10px]">|</span>
          <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors cursor-pointer" style={{ pointerEvents: 'auto' }}>
            <RotateCcw size={12} /> 重播
          </button>
          <span className="text-[#3A3832] text-[10px]">|</span>
          <button onClick={(e) => {
            e.stopPropagation();
            const idx = modules.findIndex(m => m.id === moduleId);
            onModuleClick(modules[(idx - 1 + modules.length) % modules.length].id);
          }} className="flex items-center px-1.5 py-1 rounded-full text-[10px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors cursor-pointer" style={{ pointerEvents: 'auto' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={(e) => {
            e.stopPropagation();
            const idx = modules.findIndex(m => m.id === moduleId);
            onModuleClick(modules[(idx + 1) % modules.length].id);
          }} className="flex items-center px-1.5 py-1 rounded-full text-[10px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors cursor-pointer" style={{ pointerEvents: 'auto' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
