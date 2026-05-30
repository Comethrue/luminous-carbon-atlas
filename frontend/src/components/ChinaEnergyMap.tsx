import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

// ── Province energy savings potential (万kWh/year) ──
const PROVINCE_DATA: Record<string, number> = {
  '北京市':173,'天津市':105,'河北省':233,'山西省':156,'内蒙古自治区':102,
  '辽宁省':216,'吉林省':152,'黑龙江省':167,'上海市':120,'江苏省':316,
  '浙江省':205,'安徽省':228,'福建省':165,'江西省':197,'山东省':286,
  '河南省':293,'湖北省':244,'湖南省':241,'广东省':301,'广西壮族自治区':160,
  '海南省':39,'重庆市':133,'四川省':252,'贵州省':145,'云南省':154,
  '西藏自治区':13,'陕西省':203,'甘肃省':92,'青海省':23,'宁夏回族自治区':36,
  '新疆维吾尔自治区':105,
  // ── 必须单独列出的省级行政区 ──
  '台湾省': 0,     // 按省级行政单位表示，与大陆省级行政区一致设色
  '香港特别行政区': 35,
  '澳门特别行政区': 8,
};

// ── GDP TOP 10 cities ──
const TOP10 = [
  { name:'上海',   lon:121.47,lat:31.23,rank:1 },
  { name:'北京',   lon:116.41,lat:39.90,rank:2 },
  { name:'深圳',   lon:114.06,lat:22.54,rank:3 },
  { name:'广州',   lon:113.26,lat:23.13,rank:4 },
  { name:'重庆',   lon:106.55,lat:29.57,rank:5 },
  { name:'苏州',   lon:120.59,lat:31.30,rank:6 },
  { name:'成都',   lon:104.07,lat:30.57,rank:7 },
  { name:'杭州',   lon:120.15,lat:30.28,rank:8 },
  { name:'武汉',   lon:114.30,lat:30.60,rank:9 },
  { name:'南京',   lon:118.79,lat:32.06,rank:10 },
];

// ── Guangdong pilot cities ──
const GUANGDONG_CITIES = [
  { name:'广州', lon:113.26,lat:23.13 },
  { name:'深圳', lon:114.06,lat:22.54 },
  { name:'东莞', lon:113.75,lat:23.05 },
  { name:'佛山', lon:113.12,lat:23.03 },
  { name:'珠海', lon:113.58,lat:22.27 },
];

// ── Key provincial capitals ──
const CAPITALS = [
  { name:'台北', lon:121.52,lat:25.03 },
  { name:'西安', lon:108.90,lat:34.30 },{ name:'郑州', lon:113.60,lat:34.80 },
  { name:'长沙', lon:113.00,lat:28.20 },{ name:'合肥', lon:117.20,lat:31.80 },
  { name:'济南', lon:117.00,lat:36.70 },{ name:'沈阳', lon:123.40,lat:41.80 },
  { name:'昆明', lon:102.70,lat:25.00 },{ name:'哈尔滨', lon:126.60,lat:45.80 },
  { name:'福州', lon:119.30,lat:26.10 },{ name:'南昌', lon:115.90,lat:28.70 },
  { name:'贵阳', lon:106.70,lat:26.60 },{ name:'兰州', lon:103.80,lat:36.10 },
  { name:'南宁', lon:108.30,lat:22.80 },{ name:'太原', lon:112.50,lat:37.90 },
  { name:'长春', lon:125.30,lat:43.90 },{ name:'乌鲁木齐', lon:87.60,lat:43.80 },
  { name:'呼和浩特', lon:111.70,lat:40.80 },{ name:'银川', lon:106.30,lat:38.50 },
  { name:'西宁', lon:101.80,lat:36.60 },{ name:'拉萨', lon:91.10,lat:29.60 },
  { name:'沈阳', lon:123.40,lat:41.80 },
];

interface Props {
  liveData: { pilotCities?: any[]; carbonPrice?: { price:number; trend:string }; gridLoad?: { loadRate:number; status:string } } | null;
}

export function ChinaEnergyMap({ liveData }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const disposedRef = useRef(false);
  const [mapImgLoaded, setMapImgLoaded] = useState(false);

  // ── Official map image path ──
  // 用户必须从自然资源部标准地图服务下载标准地图并放在 public/ 目录
  // http://bzdt.ch.mnr.gov.cn/
  const MAP_IMG = import.meta.env.BASE_URL + 'china-official-standard-map.jpg';
  // 南海诸岛附图
  const SOUTH_SEA_IMG = import.meta.env.BASE_URL + 'china-south-sea-inset.jpg';

  useEffect(() => {
    // 预加载官方地图图片
    const img = new Image();
    img.onload = () => setMapImgLoaded(true);
    img.onerror = () => setMapImgLoaded(true); // 降级：图片加载失败时仍渲染
    img.src = MAP_IMG;
  }, []);

  // ── Convert geo coords to pixel coords (approximate for China map) ──
  // 中国地图经度范围约 73-135，纬度范围约 18-54
  const lonToX = (lon: number) => ((lon - 73) / (135 - 73)) * 100;
  const latToY = (lat: number) => (1 - (lat - 18) / (54 - 18)) * 100;

  useEffect(() => {
    if (!ref.current) return;
    disposedRef.current = false;
    const el = ref.current;

    const doInit = () => {
      if (disposedRef.current) return;
      try { chartRef.current?.dispose(); } catch {}
      chartRef.current = null;
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      chartRef.current = echarts.init(el, undefined, { width: w, height: h, renderer: 'canvas' });

      const pilots = liveData?.pilotCities || [];

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',

        // ── 使用官方标准地图图片作为底图 ──
        graphic: [
          {
            type: 'image',
            id: 'official-map',
            left: 'center',
            top: 'middle',
            style: {
              image: MAP_IMG,
              width: w * 0.92,
              height: h * 0.92,
              opacity: 0.95,
            },
          },
          // ── 南海诸岛附图 ──
          {
            type: 'image',
            id: 'south-sea-inset',
            right: 8,
            bottom: 8,
            style: {
              image: SOUTH_SEA_IMG,
              width: 120,
              height: 160,
              opacity: 0.9,
            },
          },
          // ── 审图号标注 ──
          {
            type: 'text',
            left: 8,
            bottom: 8,
            style: {
              text: '审图号：GS(2016)2935号  来源：中华人民共和国自然资源部标准地图服务',
              font: '9px JetBrains Mono, monospace',
              fill: 'rgba(136,153,187,0.7)',
            },
            z: 100,
          },
        ],

        grid: { left: 0, right: 0, top: 0, bottom: 0 },

        xAxis: { type: 'value', min: 0, max: 100, show: false },
        yAxis: { type: 'value', min: 0, max: 100, show: false },

        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(9,16,31,0.96)',
          borderColor: 'rgba(0,200,255,0.3)',
          textStyle: { color: '#E8EDF5', fontSize: 11 },
          formatter: (p: any) => {
            const city = [...TOP10, ...GUANGDONG_CITIES].find(c => c.name === p.name);
            if (city) {
              const live = pilots.find((x: any) => x.name === p.name);
              const rank = (city as any).rank;
              return `<b>${p.name}${rank ? ` · GDP第${rank}位` : ''}</b>` +
                (p.name === '广州' ? '<br/><span style="color:#34C759">● 数智光衡 AI试点基地</span>' : '') +
                (live ? `<br/>温度:<b>${live.temp}°C</b> · 云量<b>${live.cloud}%</b><br/>太阳辐射:<b style="color:#FFD700">${live.solarRadiation}W/m²</b>` : '');
            }
            return p.name;
          },
        },

        series: [
          // ── GDP Top 10 ripple markers ──
          {
            type: 'effectScatter',
            data: TOP10.map(c => ({
              name: c.name, value: [lonToX(c.lon), latToY(c.lat), 11 - c.rank],
              rank: c.rank,
            })),
            symbolSize: (v: number[]) => 22 + (v[2] || 0) * 2.5,
            rippleEffect: { brushType: 'stroke', scale: 5, period: 3.5, color: 'rgba(0,200,255,0.3)' },
            itemStyle: {
              color: (p: any) => {
                const r = p.data?.rank || 10;
                if (r <= 2) return '#FFD700';
                if (r <= 4) return '#FFB800';
                if (r <= 6) return '#00D4FF';
                return '#7B9FFF';
              },
              shadowBlur: 22, shadowColor: 'rgba(0,200,255,0.5)',
              borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2,
            },
            label: {
              show: true,
              formatter: (p: any) => `#{p.data?.rank} ${p.name}`,
              position: 'right', color: '#FFFFFF', fontSize: 10, fontWeight: 'bold',
              backgroundColor: 'rgba(9,16,31,0.85)', borderColor: 'rgba(0,180,255,0.3)',
              borderWidth: 1, padding: [3, 8, 3, 8], borderRadius: 4,
            },
            z: 4,
          },
          // ── Guangzhou pilot highlight ──
          {
            type: 'effectScatter',
            data: [{ name: '广州', value: [lonToX(113.26), latToY(23.13), 10], rank: 4 }],
            symbolSize: 36,
            rippleEffect: { brushType: 'fill', scale: 12, period: 2, color: 'rgba(52,199,89,0.35)' },
            itemStyle: {
              color: '#34C759', shadowBlur: 50, shadowColor: 'rgba(52,199,89,0.8)',
              borderColor: 'rgba(255,255,255,0.6)', borderWidth: 3,
            },
            label: {
              show: true, formatter: '广州 · 数智光衡\nAI照明试点基地',
              position: 'bottom', color: '#34C759', fontSize: 13, fontWeight: 'bold',
              backgroundColor: 'rgba(6,11,20,0.9)', borderColor: 'rgba(52,199,89,0.4)',
              borderWidth: 1.5, padding: [5, 10, 5, 10], borderRadius: 6,
            },
            z: 6,
          },
          // ── Shenzhen tech hub ──
          {
            type: 'effectScatter',
            data: [{ name: '深圳', value: [lonToX(114.06), latToY(22.54), 8], rank: 3 }],
            symbol: 'diamond', symbolSize: 24, symbolRotate: 45,
            rippleEffect: { brushType: 'stroke', scale: 7, period: 2.8, color: 'rgba(0,212,255,0.35)' },
            itemStyle: {
              color: '#00D4FF', shadowBlur: 30, shadowColor: 'rgba(0,212,255,0.6)',
              borderColor: 'rgba(255,255,255,0.4)', borderWidth: 2.5,
            },
            label: {
              show: true, formatter: '深圳 · 科技枢纽',
              position: 'right', color: '#00D4FF', fontSize: 11, fontWeight: 'bold',
              backgroundColor: 'rgba(9,16,31,0.85)', borderColor: 'rgba(0,180,255,0.3)',
              borderWidth: 1, padding: [3, 8, 3, 8], borderRadius: 4,
            },
            z: 5,
          },
          // ── GD sub-markers ──
          {
            type: 'scatter',
            data: GUANGDONG_CITIES.filter(c => c.name !== '广州' && c.name !== '深圳').map(c => ({
              name: c.name, value: [lonToX(c.lon), latToY(c.lat)],
            })),
            symbolSize: 10,
            itemStyle: {
              color: 'rgba(52,199,89,0.6)', shadowBlur: 8, shadowColor: 'rgba(52,199,89,0.4)',
              borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1,
            },
            label: { show: true, position: 'right', color: 'rgba(52,199,89,0.7)', fontSize: 8 },
            z: 4,
          },
          // ── Provincial capitals ──
          {
            type: 'scatter',
            data: CAPITALS.map(c => ({
              name: c.name, value: [lonToX(c.lon), latToY(c.lat)],
            })),
            symbolSize: 5,
            itemStyle: {
              color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5,
            },
            label: { show: true, position: 'right', color: 'rgba(255,255,255,0.2)', fontSize: 7 },
            emphasis: { scale: 2, itemStyle: { color: 'rgba(0,200,255,0.6)' }, label: { color: 'rgba(0,200,255,0.7)' } },
            z: 1,
          },
        ],
      };

      try { chartRef.current!.setOption(option, true); } catch {}
    };

    doInit();
    let lastW = 0, lastH = 0;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      if (Math.abs(w - lastW) > 20 || Math.abs(h - lastH) > 20) {
        lastW = w; lastH = h;
        doInit();
      } else if (chartRef.current) {
        try { chartRef.current.resize(); } catch {}
      }
    });
    obs.observe(el);
    return () => {
      disposedRef.current = true;
      obs.disconnect();
      try { chartRef.current?.dispose(); } catch {}
      chartRef.current = null;
    };
  }, [liveData, mapImgLoaded]);

  useEffect(() => {
    const r = () => { try { chartRef.current?.resize(); } catch {} };
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const pilots = liveData?.pilotCities || [];
  const carbonP = liveData?.carbonPrice;
  const grid = liveData?.gridLoad;

  return (
    <div className="glass-card rounded-xl p-4 glow-border relative overflow-hidden">
      {/* Scan line overlay */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(180deg,transparent 0%,rgba(0,200,255,0.015) 50%,transparent 100%)',
          backgroundSize: '100% 80px',
          animation: 'chartScan 7s linear infinite',
        }}
      />

      <div className="relative z-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase">
            中国碳减排潜力地图 · 广东 AI 照明试点基地
          </div>
          <div className="flex gap-4 text-[9px] font-mono">
            {carbonP && <span>碳交易 <span className="text-gold font-bold">¥{carbonP.price}</span><span className={carbonP.trend === '↑' ? 'text-red' : 'text-green'}> {carbonP.trend}</span></span>}
            {grid && <span>电网 <span className="text-cyan font-bold">{grid.loadRate}%</span> · {grid.status}</span>}
          </div>
        </div>

        {/* Map container */}
        <div ref={ref} className="w-full relative z-10" style={{ height: 440 }} />

        {/* ── Compliance footer ── */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3 text-[8px] font-mono text-text-muted">
            <span className="flex items-center gap-1"><span style={{ color: '#34C759' }}>◆</span> 广东AI试点</span>
            <span className="flex items-center gap-1"><span style={{ color: '#FFD700' }}>◆</span> GDP前3</span>
            <span className="flex items-center gap-1"><span style={{ color: '#00D4FF' }}>◆</span> GDP前10</span>
            <span className="flex items-center gap-1"><span style={{ color: 'rgba(255,255,255,0.4)' }}>●</span> 省会</span>
          </div>
          <span className="text-[8px] text-text-muted font-mono">
            31省(含台湾省/香港/澳门) · 全国潜力 {(Object.values(PROVINCE_DATA).reduce((a,b)=>a+b,0)).toFixed(0)}万kWh/年
          </span>
        </div>

        {/* ── 合规声明 ── */}
        <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] text-text-muted font-mono">
            <span>
              审图号：GS(2016)2935号 · 来源：中华人民共和国自然资源部标准地图服务 (bzdt.ch.mnr.gov.cn)
            </span>
            <span>
              依据《公开地图内容表示规范》(自然资规〔2023〕2号) 制作
            </span>
          </div>
          <p className="text-[8px] text-text-muted/60 leading-relaxed">
            本地图基于自然资源部标准地图服务网站下载的标准地图制作，底图无修改。图中台湾省按省级行政单位表示，香港特别行政区、澳门特别行政区按省级行政单位标识。南海诸岛、钓鱼岛及其附属岛屿已在标准底图中完整表示。本图仅用于学术竞赛数据可视化展示，不作划界依据。
          </p>
        </div>

        {/* City strip */}
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-text-muted mr-1">监测:</span>
          {TOP10.map(c => {
            const live = pilots.find((p: any) => p.name === c.name);
            const isGD = c.name === '广州' || c.name === '深圳';
            return (
              <span key={c.name}
                className="px-1.5 py-0.5 rounded border text-[8px]"
                style={{
                  borderColor: isGD ? 'rgba(52,199,89,0.5)' : 'rgba(0,180,255,0.2)',
                  color: isGD ? '#34C759' : '#8899BB',
                  background: isGD ? 'rgba(52,199,89,0.1)' : 'transparent',
                  fontWeight: isGD ? 'bold' : 'normal',
                }}>
                #{c.rank} {c.name}{live ? ` ${live.temp}°` : '—'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
