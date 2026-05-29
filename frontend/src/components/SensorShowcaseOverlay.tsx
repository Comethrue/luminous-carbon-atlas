import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
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
  overview: {
    title: 'AI 全链路总览',
    stats: [
      { label: '推理延迟', value: '47', unit: 'ms/帧' },
      { label: 'NPU 算力', value: '12', unit: 'TOPS' },
      { label: '模型精度', value: '89', unit: '% mAP' },
    ],
    desc: 'QCS6490 Hexagon NPU · 3路MIPI CSI · 边缘推理零云端依赖',
  },
  compression: {
    title: '模型压缩管线',
    stats: [
      { label: '原始体积', value: '240', unit: 'MB' },
      { label: '压缩后', value: '1.2', unit: 'MB' },
      { label: '压缩比', value: '200', unit: '×' },
    ],
    desc: '结构化剪枝 30% 通道 · INT8 per-tensor 量化 · 知识蒸馏 T=4',
  },
  fusion: {
    title: 'D-S 证据理论融合',
    stats: [
      { label: '雷达 m1', value: '0.8', unit: '' },
      { label: '视觉 m2', value: 'c×w', unit: 'env' },
      { label: '冲突因子', value: '0.15', unit: 'K' },
    ],
    desc: 'Dempster 组合规则 · 环境权重自适应 · K>0.5 降级策略',
  },
  dqn: {
    title: 'DQN 强化学习决策',
    stats: [
      { label: '状态空间', value: '288', unit: '维' },
      { label: '动作空间', value: '9', unit: '种' },
      { label: '训练量', value: '5000', unit: 'ep' },
    ],
    desc: 'Q表 1152B 烧录 ESP8266 · 查表 <1μs · R=0.4节+0.4舒−0.2切',
  },
  classroom: {
    title: '教室分区智能控灯',
    stats: [
      { label: '分区数', value: '3', unit: '区' },
      { label: '单区功率', value: '160', unit: 'W' },
      { label: '节能率', value: '57', unit: '%' },
    ],
    desc: 'AI视觉定位 → 按需分区亮灯 · 自然光协同 → 自动调暗省电',
  },
  ablation: {
    title: '消融实验 · 模块贡献',
    stats: [
      { label: '基线准确率', value: '65', unit: '%' },
      { label: '最终准确率', value: '98.7', unit: '%' },
      { label: '节能率提升', value: '18→42.3', unit: '%' },
    ],
    desc: '每个AI模块解决一个特定问题 · 叠加效果是乘法而非加法',
  },
};

export function SensorShowcaseOverlay({ mode, moduleId, autoTime, modules, onModuleClick, onModeToggle, onReset, autoPlaying }: Props) {
  const panel = MODULE_PANELS[moduleId];
  const progress = (autoTime / 60) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* ── Top: Title ── */}
      <div className="pt-8 flex justify-center">
        <motion.div
          key={moduleId}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-auto"
        >
          <h2 className="text-3xl font-display tracking-[0.2em] text-[#F5F0E8] text-center">
            数智光衡
          </h2>
          <p className="text-[11px] text-[#8A8578] tracking-[0.3em] uppercase text-center mt-1">
            {panel.title}
          </p>
        </motion.div>
      </div>

      {/* ── Center: Data panel ── */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={moduleId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-auto"
            style={{
              background: 'rgba(20, 20, 24, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(200, 169, 110, 0.12)',
              borderRadius: 16,
              padding: '28px 36px',
              minWidth: 360,
            }}
          >
            <div className="flex gap-10 mb-4">
              {panel.stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[10px] text-[#8A8578] tracking-wider mb-1 uppercase">{s.label}</div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-mono font-bold text-[#F5F0E8] tabular-nums">{s.value}</span>
                    {s.unit && <span className="text-xs text-[#8A8578]">{s.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[#8A8578] text-center font-mono leading-relaxed max-w-md">
              {panel.desc}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom: Controls ── */}
      <div className="pb-8 space-y-4">
        {/* Progress bar (auto mode only) */}
        {mode === 'auto' && (
          <div className="flex justify-center">
            <div className="pointer-events-auto w-[320px] h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#C8A96E', width: `${progress}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'linear' }}
              />
            </div>
          </div>
        )}

        {/* Module navigation */}
        <div className="flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 px-4 py-2 rounded-full"
            style={{ background: 'rgba(20, 20, 24, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(200, 169, 110, 0.1)' }}>
            {modules.map(m => (
              <button
                key={m.id}
                onClick={() => onModuleClick(m.id)}
                className="relative px-3 py-2 rounded-full text-[11px] font-medium transition-all duration-300 whitespace-nowrap"
                style={{
                  color: moduleId === m.id ? '#0A0A0C' : '#8A8578',
                  background: moduleId === m.id ? '#C8A96E' : 'transparent',
                }}
              >
                {m.label}
                {moduleId === m.id && (
                  <span className="block text-[9px] opacity-70 font-normal">{m.sub}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full"
            style={{ background: 'rgba(20, 20, 24, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(200, 169, 110, 0.1)' }}>
            <button
              onClick={onModeToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors"
              title={mode === 'auto' ? '切换到自由探索' : '切换到自动演示'}
            >
              {mode === 'auto' ? <Pause size={13} /> : <Play size={13} />}
              {mode === 'auto' ? '自由探索' : '自动演示'}
            </button>
            <span className="text-[#3A3832]">|</span>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors"
              title="重新播放"
            >
              <RotateCcw size={13} />
              重播
            </button>
            <button
              onClick={() => {
                const idx = modules.findIndex(m => m.id === moduleId);
                const prev = modules[(idx - 1 + modules.length) % modules.length];
                onModuleClick(prev.id);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => {
                const idx = modules.findIndex(m => m.id === moduleId);
                const next = modules[(idx + 1) % modules.length];
                onModuleClick(next.id);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] text-[#8A8578] hover:text-[#F5F0E8] transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="flex justify-center">
          <div className="text-[10px] text-[#4A4538] font-mono tracking-wider">
            ← → 切换模块 · Space 暂停 · Esc 总览 · 1-6 跳转 · 拖拽旋转
          </div>
        </div>
      </div>
    </div>
  );
}
