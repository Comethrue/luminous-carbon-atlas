import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface Props { option: any; className?: string; style?: React.CSSProperties; }

export function EChartsWrapper({ option, className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const aliveRef = useRef(true);
  const readyRef = useRef(false);

  // ── Init chart instance (once, size-aware) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    aliveRef.current = true;

    const el = document.createElement('div');
    el.style.cssText = 'width:100%;height:100%;';
    container.appendChild(el);

    const doInit = () => {
      if (!aliveRef.current || readyRef.current || !el.isConnected) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;

      chartRef.current = echarts.init(el, undefined, { width: w, height: h, renderer: 'canvas' });
      readyRef.current = true;
    };

    doInit();
    const obs = new ResizeObserver(doInit);
    obs.observe(el);

    return () => {
      aliveRef.current = false;
      readyRef.current = false;
      obs.disconnect();
      if (chartRef.current) {
        try { chartRef.current.dispose(); } catch {}
        chartRef.current = null;
      }
      if (el.isConnected) el.parentNode?.removeChild(el);
    };
  }, []);

  // ── Render chart (when option arrives or changes) ──
  useEffect(() => {
    if (!chartRef.current || !readyRef.current) return;
    if (!option || !option.series || option.series.length === 0) return;

    try {
      // Deep-clone to strip class instances (LinearGradient etc)
      // ECharts accepts plain-object equivalents
      const safe = JSON.parse(JSON.stringify(option));
      safe.backgroundColor = 'transparent';
      chartRef.current.setOption(safe, { notMerge: true, lazyUpdate: false });
    } catch {}
  }, [option]);

  // ── Resize ──
  useEffect(() => {
    const r = () => { try { chartRef.current?.resize(); } catch {} };
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  return <div ref={containerRef} className={className} style={style} />;
}
