import { useEffect, useState } from 'react';
import { useFetch, useLiveFeed, API_BASE } from './lib/api';
import { StatusBar } from './components/StatusBar';
import { HeroSection } from './components/HeroSection';
import { ObservatorySection } from './components/ObservatorySection';
import { NarrativeSection } from './components/NarrativeSection';
import { CarbonLedgerSection } from './components/CarbonLedgerSection';
import { ParticleBackground } from './components/ParticleBackground';
import { ScanlineOverlay } from './components/ScanlineOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

// Environment data (refreshed every 30s — drives real-time chart changes)
function useEnv() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/environment`);
        if (r.ok) setData(await r.json());
      } catch { /* fallback */ }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return data;
}

export default function App() {
  const overview = useFetch('/overview', {
    totalSavedKwh: 0, savingRate: 0, co2ReducedKg: 0, treeEquivalent: 0,
    costSavedYuan: 0, aiControlRate: 0, activeZones: 0, lowCarbonScore: 0,
    currentPowerW: 0, currentPersons: 0, systemDays: 0, timestamp: '',
  });
  const timeSeries24h = useFetch('/timeseries/24h', [] as any[]);
  const weekly = useFetch('/trends/weekly', [] as any[]);
  const monthly = useFetch('/trends/monthly', [] as any[]);
  const scenarios = useFetch('/scenarios', [] as any[]);
  const ledger = useFetch('/carbon-ledger', {
    totalSavedKwh: 0, co2ReducedKg: 0, coalSavedKg: 0, treeEquivalent: 0,
    costSavedYuan: 0, classroomsPowered: 0,
    campusAnnualPotentialKwh: 0, campusAnnualPotentialCo2Kg: 0,
  });
  const sources = useFetch('/sources', [] as any[]);
  const live = useLiveFeed();
  const env = useEnv();

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const st = window.scrollY;
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(dh > 0 ? st / dh : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative">
      <ParticleBackground />
      <ScanlineOverlay />

      <StatusBar
        systemDays={overview.data.systemDays}
        timestamp={live.timestamp}
        sources={sources.data}
        lowCarbonScore={overview.data.lowCarbonScore}
      />

      <ErrorBoundary><HeroSection overview={overview.data} live={live} /></ErrorBoundary>

      <ErrorBoundary>
        <ObservatorySection
          overview={overview.data} live={live}
          timeSeries24h={timeSeries24h.data} weekly={weekly.data}
          monthly={monthly.data} scenarios={scenarios.data} env={env}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <NarrativeSection
          timeSeries24h={timeSeries24h.data} weekly={weekly.data}
          scenarios={scenarios.data} overview={overview.data}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <CarbonLedgerSection ledger={ledger.data} overview={overview.data} />
      </ErrorBoundary>
    </div>
  );
}
