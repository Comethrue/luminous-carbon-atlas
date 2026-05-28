import { useState, useEffect } from 'react';
import { Layers, Gauge, Megaphone } from 'lucide-react';

interface Source { id: string; label: string; value: string; source: string; }
interface Announcement { type: string; icon: string; text: string; time: string; }
interface Props { systemDays: number; timestamp: string; sources: Source[]; lowCarbonScore: number; }

export function StatusBar({ systemDays, timestamp, sources, lowCarbonScore }: Props) {
  const time = new Date(timestamp);
  const timeStr = isNaN(time.getTime())
    ? new Date().toLocaleString('zh-CN', { hour12: false })
    : time.toLocaleString('zh-CN', { hour12: false });

  // ── Broadcast ticker ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    const fetchBroadcast = async () => {
      try {
        const r = await fetch('/api/broadcast');
        if (r.ok) {
          const data = await r.json();
          if (data.announcements?.length) setAnnouncements(data.announcements);
        }
      } catch { /* fallback */ }
    };
    fetchBroadcast();
    const interval = setInterval(fetchBroadcast, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through announcements
  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setTickerIdx(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Main bar */}
      <div className="flex items-center justify-between px-5 py-2 text-xs font-mono"
        style={{
          background: 'linear-gradient(90deg, #09101F 0%, #0D1628 50%, #09101F 100%)',
          borderBottom: '1px solid rgba(0,136,255,0.1)',
        }}>
        <div className="flex items-center gap-4 text-text-secondary">
          <span className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-text-primary font-semibold">LIVE</span>
          </span>
          <span className="text-text-muted">|</span>
          <span>运行 <span className="text-cyan">{systemDays}</span> 天</span>
          <span className="text-text-muted">|</span>
          <span>刷新 {timeStr}</span>
        </div>

        <div className="flex items-center gap-3 text-text-muted">
          <span className="flex items-center gap-1.5">
            <Gauge size={10} className="text-green" />
            <span>低碳评分</span>
            <span className="text-green font-bold text-sm">{lowCarbonScore}</span>
          </span>
          <span className="text-text-muted">|</span>
          <span className="flex items-center gap-1.5">
            <Layers size={10} className="text-cyan" />
            {sources.slice(0, 3).map(s => (
              <span key={s.id} className="px-1.5 py-0.5 rounded text-[10px] border border-cyan-dim">{s.label}</span>
            ))}
          </span>
        </div>
      </div>

      {/* Broadcast ticker */}
      {announcements.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-1.5 text-[10px] font-mono"
          style={{
            background: 'rgba(0,136,255,0.04)',
            borderBottom: '1px solid rgba(0,136,255,0.06)',
          }}>
          <Megaphone size={10} className="text-gold flex-shrink-0" />
          <span className="text-gold text-[9px] tracking-wider flex-shrink-0">播报</span>
          <span className="text-text-secondary truncate animate-pulse" key={tickerIdx}>
            {announcements[tickerIdx]?.icon} {announcements[tickerIdx]?.text}
          </span>
          <span className="text-text-muted flex-shrink-0 ml-auto">
            {announcements[tickerIdx]?.time}
          </span>
        </div>
      )}
    </div>
  );
}
