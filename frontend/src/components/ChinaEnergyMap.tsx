import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { MapParticleOverlay } from './MapParticleOverlay';

// ── Province energy savings potential (万kWh/year) ──
const PROVINCE_DATA: Record<string, number> = {
  '北京市':173,'天津市':105,'河北省':233,'山西省':156,'内蒙古自治区':102,
  '辽宁省':216,'吉林省':152,'黑龙江省':167,'上海市':120,'江苏省':316,
  '浙江省':205,'安徽省':228,'福建省':165,'江西省':197,'山东省':286,
  '河南省':293,'湖北省':244,'湖南省':241,'广东省':301,'广西壮族自治区':160,
  '海南省':39,'重庆市':133,'四川省':252,'贵州省':145,'云南省':154,
  '西藏自治区':13,'陕西省':203,'甘肃省':92,'青海省':23,'宁夏回族自治区':36,
  '新疆维吾尔自治区':105,
};

// ── GDP TOP 10 cities — premium markers ──
const TOP10 = [
  { name:'上海',   lon:121.47,lat:31.23,rank:1,  province:'上海市' },
  { name:'北京',   lon:116.41,lat:39.90,rank:2,  province:'北京市' },
  { name:'深圳',   lon:114.06,lat:22.54,rank:3,  province:'广东省' },
  { name:'广州',   lon:113.26,lat:23.13,rank:4,  province:'广东省' },
  { name:'重庆',   lon:106.55,lat:29.57,rank:5,  province:'重庆市' },
  { name:'苏州',   lon:120.59,lat:31.30,rank:6,  province:'江苏省' },
  { name:'成都',   lon:104.07,lat:30.57,rank:7,  province:'四川省' },
  { name:'杭州',   lon:120.15,lat:30.28,rank:8,  province:'浙江省' },
  { name:'武汉',   lon:114.30,lat:30.60,rank:9,  province:'湖北省' },
  { name:'南京',   lon:118.79,lat:32.06,rank:10, province:'江苏省' },
];

// Guangdong province cities for sub-markers
const GUANGDONG_CITIES = [
  { name:'广州', lon:113.26,lat:23.13, type:'hub' },
  { name:'深圳', lon:114.06,lat:22.54, type:'tech' },
  { name:'东莞', lon:113.75,lat:23.05, type:'mfg' },
  { name:'佛山', lon:113.12,lat:23.03, type:'mfg' },
  { name:'珠海', lon:113.58,lat:22.27, type:'eco' },
];

interface Props {
  liveData: { pilotCities?: any[]; carbonPrice?: { price:number; trend:string }; gridLoad?: { loadRate:number; status:string } } | null;
}

const MAP_KEY = '__china_map_ok__';

export function ChinaEnergyMap({ liveData }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const disposedRef = useRef(false);
  const [geoReady, setGeoReady] = useState(!!(window as any)[MAP_KEY]);

  // ── Load local GeoJSON ──
  useEffect(() => {
    if (geoReady) return;
    let ok = false;
    fetch(import.meta.env.BASE_URL + 'china.json')
      .then(r => { if(!r.ok)throw Error(`HTTP ${r.status}`); return r.json(); })
      .then(geo => {
        if (ok) return;
        echarts.registerMap('china', geo);
        (window as any)[MAP_KEY] = true;
        setGeoReady(true);
      })
      .catch(() => setGeoReady(true)); // fallback
    return () => { ok = true; };
  }, []);

  // ── Init chart ──
  useEffect(() => {
    if (!ref.current || !geoReady) return;
    disposedRef.current = false;
    const el = ref.current;

    const doInit = () => {
      if (disposedRef.current) return;
      try { chartRef.current?.dispose(); } catch {}
      chartRef.current = null;
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      chartRef.current = echarts.init(el, undefined, { width:w, height:h, renderer:'canvas' });

      const hasMap = (window as any)[MAP_KEY];
      const pilots = liveData?.pilotCities || [];
      const maxVal = Math.max(...Object.values(PROVINCE_DATA), 1);

      // Guangdong cities scatter data
      const gdScatter = GUANGDONG_CITIES.map(c => ({
        name: c.name, value: [c.lon, c.lat, c.type === 'hub' ? 400 : (c.type === 'tech' ? 350 : 150)],
        type: c.type,
      }));

      // Flow lines: Guangdong hub → all GDP top 10
      const gz = GUANGDONG_CITIES.find(c => c.name === '广州')!;
      const flowLines = TOP10.filter(c => c.name !== '广州').map(c => ({
        coords: [[gz.lon, gz.lat], [c.lon, c.lat]],
      }));

      // ── Build series ──
      const series: any[] = [];

      if (hasMap) {
        // Map base
        series.push({
          type:'map', map:'china', roam:true, scaleLimit:{min:0.8,max:5}, zoom:1.12, center:[108,36], aspectScale:0.85,
          itemStyle:{
            areaColor: new echarts.graphic.LinearGradient(0,0,0,1,[
              {offset:0,color:'#0F1D30'},{offset:0.5,color:'#0A1628'},{offset:1,color:'#050C18'}
            ]),
            borderColor:'rgba(0,180,255,0.25)', borderWidth:1,
            shadowBlur:20, shadowOffsetY:6, shadowColor:'rgba(0,0,0,0.5)',
          },
          emphasis:{ label:{show:true,color:'#fff',fontSize:11}, itemStyle:{ areaColor:'#1A3050', borderColor:'#00D4FF', borderWidth:2, shadowBlur:28, shadowOffsetY:8, shadowColor:'rgba(0,180,255,0.35)' } },
          data: Object.entries(PROVINCE_DATA).map(([name,value])=>({name,value})),
          z:1,
        });
        // Highlight Guangdong province border
        series.push({
          type:'map', map:'china', roam:false, zoom:1.12, center:[108,36], aspectScale:0.85,
          itemStyle:{ areaColor:'rgba(52,199,89,0.06)', borderColor:'rgba(52,199,89,0.7)', borderWidth:2.5, shadowBlur:25, shadowOffsetY:4, shadowColor:'rgba(52,199,89,0.4)' },
          data: [{ name:'广东省', value:301, itemStyle:{ areaColor:'rgba(52,199,89,0.08)' } }],
          silent:true, z:2,
        });
        // Flow lines on geo
        series.push({
          type:'lines', coordinateSystem:'geo', polyline:false, data:flowLines,
          lineStyle:{ color:'rgba(0,212,255,0.18)', width:1, curveness:0.2 },
          effect:{ show:true, period:5, trailLength:0.2, symbol:'circle', symbolSize:4, color:'rgba(0,212,255,0.6)' },
          z:3,
        });
        // ── GDP Top 10: diamond-shaped markers with multi-ring ripples ──
        series.push({
          type:'effectScatter', coordinateSystem:'geo',
          data: TOP10.filter(c => c.province !== '广东省').map(c => ({
            name: c.name, value: [c.lon, c.lat, 11 - c.rank],
            rank: c.rank,
          })),
          symbol: (v:number[]) => v[2] >= 8 ? 'diamond' : 'pin',
          symbolSize: (v:number[]) => 28 + v[2] * 2.5,
          symbolRotate: 45,
          rippleEffect: { brushType:'stroke', scale:5, period:3.5, color:'rgba(0,200,255,0.3)' },
          itemStyle: {
            color: (p:any) => {
              const r = p.data?.rank || 10;
              if (r <= 2) return '#FFD700';
              if (r <= 4) return '#FFB800';
              if (r <= 6) return '#00D4FF';
              return '#7B9FFF';
            },
            shadowBlur: 22, shadowColor: 'rgba(0,200,255,0.5)',
            borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderType: 'solid',
          },
          label: {
            show:true,
            formatter:(p:any)=>`#{p.data?.rank} ${p.name}`,
            position:'right', color:'#FFFFFF', fontSize:10, fontWeight:'bold', distance:12,
            backgroundColor:'rgba(9,16,31,0.85)', borderColor:'rgba(0,180,255,0.3)', borderWidth:1,
            padding:[3,8,3,8], borderRadius:4,
          },
          z:4,
        });
        // ── Guangdong core: Guangzhou — massive multi-ring pulse ──
        series.push({
          type:'effectScatter', coordinateSystem:'geo',
          data: [{ name:'广州', value:[113.26,23.13,10], rank:4 }],
          symbol: 'pin',
          symbolSize: 38,
          rippleEffect: { brushType:'fill', scale:14, period:2, color:'rgba(52,199,89,0.35)' },
          itemStyle: { color:'#34C759', shadowBlur:50, shadowColor:'rgba(52,199,89,0.8)', borderColor:'rgba(255,255,255,0.6)', borderWidth:3 },
          label: {
            show:true, formatter:'广州 · 数智光衡\nAI照明试点基地',
            position:'bottom', color:'#34C759', fontSize:13, fontWeight:'bold', distance:20, lineHeight:18,
            backgroundColor:'rgba(6,11,20,0.9)', borderColor:'rgba(52,199,89,0.4)', borderWidth:1.5,
            padding:[5,10,5,10], borderRadius:6,
          },
          z:6,
        });
        // ── Shenzhen — tech hub pulse ──
        series.push({
          type:'effectScatter', coordinateSystem:'geo',
          data: [{ name:'深圳', value:[114.06,22.54,8], rank:3 }],
          symbol: 'diamond',
          symbolSize: 26,
          symbolRotate: 45,
          rippleEffect: { brushType:'stroke', scale:8, period:2.8, color:'rgba(0,212,255,0.35)' },
          itemStyle: { color:'#00D4FF', shadowBlur:30, shadowColor:'rgba(0,212,255,0.6)', borderColor:'rgba(255,255,255,0.4)', borderWidth:2.5 },
          label: {
            show:true, formatter:'深圳 · 科技枢纽',
            position:'right', color:'#00D4FF', fontSize:11, fontWeight:'bold', distance:10,
            backgroundColor:'rgba(9,16,31,0.85)', borderColor:'rgba(0,180,255,0.3)', borderWidth:1,
            padding:[3,8,3,8], borderRadius:4,
          },
          z:5,
        });
        // ── Dongguan + Foshan + Zhuhai — GD sub-markers ──
        series.push({
          type:'effectScatter', coordinateSystem:'geo',
          data: [
            { name:'东莞', value:[113.75,23.05,3] },
            { name:'佛山', value:[113.12,23.03,3] },
            { name:'珠海', value:[113.58,22.27,3] },
          ],
          symbol: 'roundRect',
          symbolSize: 12,
          rippleEffect: { brushType:'stroke', scale:3, period:4, color:'rgba(52,199,89,0.2)' },
          itemStyle: { color:'rgba(52,199,89,0.7)', shadowBlur:8, shadowColor:'rgba(52,199,89,0.4)', borderColor:'rgba(255,255,255,0.25)', borderWidth:1 },
          label: { show:true, position:'right', color:'rgba(52,199,89,0.7)', fontSize:8, distance:6 },
          z:4,
        });
        // ── Provincial capitals (dim reference markers) ──
        series.push({
          type:'scatter', coordinateSystem:'geo',
          data: [
            { name:'西安', value:[108.90,34.30] },{ name:'郑州', value:[113.60,34.80] },
            { name:'长沙', value:[113.00,28.20] },{ name:'合肥', value:[117.20,31.80] },
            { name:'济南', value:[117.00,36.70] },{ name:'沈阳', value:[123.40,41.80] },
            { name:'昆明', value:[102.70,25.00] },{ name:'哈尔滨', value:[126.60,45.80] },
            { name:'福州', value:[119.30,26.10] },{ name:'南昌', value:[115.90,28.70] },
            { name:'贵阳', value:[106.70,26.60] },{ name:'兰州', value:[103.80,36.10] },
            { name:'南宁', value:[108.30,22.80] },{ name:'太原', value:[112.50,37.90] },
            { name:'长春', value:[125.30,43.90] },{ name:'乌鲁木齐', value:[87.60,43.80] },
            { name:'呼和浩特', value:[111.70,40.80] },{ name:'银川', value:[106.30,38.50] },
            { name:'西宁', value:[101.80,36.60] },{ name:'拉萨', value:[91.10,29.60] },
          ],
          symbolSize: 5,
          itemStyle: { color:'rgba(255,255,255,0.18)', borderColor:'rgba(255,255,255,0.08)', borderWidth:0.5 },
          label: { show:true, position:'right', color:'rgba(255,255,255,0.25)', fontSize:7, distance:4 },
          emphasis: { scale:2, itemStyle:{color:'rgba(0,200,255,0.6)'}, label:{color:'rgba(0,200,255,0.7)'} },
          z:1,
        });
      } else {
        // Fallback cartesian mode
        series.push({
          type:'effectScatter', coordinateSystem:'cartesian2d',
          data: TOP10.map(c => ({
            name:c.name, value:[c.lon,c.lat,c.rank],
            color: c.province==='广东省'?'#34C759':(c.rank<=3?'#FFD700':(c.rank<=6?'#00D4FF':'#8899FF')),
            size: c.province==='广东省'?22:(18-c.rank*0.8),
          })),
          symbolSize: (v:number[])=>v[2]<=3?18:(14-v[2]*0.5),
          rippleEffect:{ brushType:'stroke',scale:3,period:5,color:'rgba(0,200,255,0.2)' },
          itemStyle:{ color:(p:any)=>p.data?.color||'#00D4FF', shadowBlur:12, shadowColor:'rgba(0,180,255,0.3)' },
          label:{ show:true,formatter:'{b}',position:'right',color:'#8899BB',fontSize:9,distance:6 },
          z:3,
        });
      }

      try {
        chartRef.current!.setOption({
          backgroundColor:'transparent',
          ...(hasMap ? {} : { grid:{left:0,right:0,top:0,bottom:0}, xAxis:{type:'value',min:100,max:128,show:false}, yAxis:{type:'value',min:20,max:47,show:false} }),
          ...(hasMap ? { visualMap:{ min:0,max:maxVal,left:'left',bottom:24,text:['高','低'],textStyle:{color:'#8899BB',fontSize:10}, inRange:{color:['#0A1628','#0F2840','#154A50','#1A7040','#34C759']}, calculable:true,itemWidth:12,itemHeight:100 } } : {}),
          tooltip:{
            trigger:'item', backgroundColor:'rgba(9,16,31,0.96)', borderColor:'rgba(0,200,255,0.3)',
            textStyle:{color:'#E8EDF5',fontSize:11},
            extraCssText:'animation:tooltipIn 0.35s cubic-bezier(0.16,1,0.3,1);box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px rgba(0,180,255,0.15);backdrop-filter:blur(12px);border-radius:10px;',
            formatter:(p:any)=>{
              if(p.seriesType==='map') return `<b>${p.name}</b><br/>年节能潜力: <b style="color:#00D4FF">${p.value||0} 万kWh</b><br/>减排: <b style="color:#34C759">${((p.value||0)*6.205).toFixed(0)} 吨CO₂</b>`;
              const city=TOP10.find(c=>c.name===p.name)||GUANGDONG_CITIES.find(c=>c.name===p.name);
              if(city){
                const live=pilots.find(x=>x.name===p.name);
                return `<b>${p.name}${city.rank?` · GDP第${city.rank}位`:''}</b>${p.name==='广州'?'<br/><span style="color:#34C759">● 数智光衡 AI试点基地</span>':''}<br/>${live?`温度:<b>${live.temp}°C</b> · 云量<b>${live.cloud}%</b><br/>太阳辐射:<b style="color:#FFD700">${live.solarRadiation}W/m²</b><br/>节能潜力:<b style="color:#00D4FF">${live.savingsPotential}万kWh</b>`:''}`;
              }
              return p.name;
            },
          },
          series,
        }, true);
      } catch {}
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
    return ()=>{ disposedRef.current=true; obs.disconnect(); try{chartRef.current?.dispose();}catch{} chartRef.current=null; };
  }, [geoReady, liveData]);

  useEffect(()=>{ const r=()=>{try{chartRef.current?.resize();}catch{}}; window.addEventListener('resize',r); return()=>window.removeEventListener('resize',r); },[]);

  const pilots = liveData?.pilotCities || [];
  const carbonP = liveData?.carbonPrice;
  const grid = liveData?.gridLoad;

  return (
    <div className="glass-card rounded-xl p-4 glow-border chart-glow relative overflow-hidden">
      {/* ── Particle orbit system ── */}
      <MapParticleOverlay />

      {/* ── Scan line ── */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background:'linear-gradient(180deg,transparent 0%,rgba(0,200,255,0.015) 50%,transparent 100%)', backgroundSize:'100% 80px', animation:'chartScan 7s linear infinite' }}
      />

      <div className="relative z-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase">
            中国碳减排潜力地图 · 广东 AI 照明试点基地
          </div>
          <div className="flex gap-4 text-[9px] font-mono">
            {carbonP && <span>碳交易 <span className="text-gold font-bold">¥{carbonP.price}</span><span className={carbonP.trend==='↑'?'text-red':'text-green'}> {carbonP.trend}</span></span>}
            {grid && <span>电网 <span className="text-cyan font-bold">{grid.loadRate}%</span> · {grid.status}</span>}
          </div>
        </div>

        {/* ── 地图审图号 + 数据来源 + 合规声明 ── */}
        <div className="flex items-center justify-between mb-1 text-[8px] text-text-muted font-mono">
          <span>审图号：GS(2021)6375号 · 自然资源部监制 · 本图为数据可视化示意图</span>
          <span>底图：阿里云 DataV ｜ 含台湾省·香港·澳门·南海诸岛</span>
        </div>

        {/* Map */}
        <div ref={ref} className="w-full relative z-10" style={{ height: 420 }} />

        {/* Legend + Stats + 南海诸岛 */}
        <div className="flex items-center justify-between mt-2 text-[9px] font-mono">
          <div className="flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1"><span className="text-xs" style={{color:'#34C759'}}>◆</span> 广东AI试点</span>
            <span className="flex items-center gap-1"><span className="text-xs" style={{color:'#FFD700'}}>◆</span> GDP前3</span>
            <span className="flex items-center gap-1"><span className="text-xs" style={{color:'#00D4FF'}}>◆</span> GDP前10</span>
            <span className="flex items-center gap-1"><span className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>●</span> 省会</span>
            <span className="text-text-muted">| 滚轮缩放</span>
          </div>
          <div className="flex items-center gap-3">
            {/* ── 南海诸岛标识 ── */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ border:'1px solid rgba(0,180,255,0.25)', background:'rgba(6,14,26,0.8)' }}>
              <div style={{ width:16, height:18, position:'relative', flexShrink:0 }}>
                {[[4,4],[10,3],[7,8],[3,10],[11,11],[6,14]].map(([x,y],i)=>(
                  <div key={i} style={{position:'absolute',left:x,top:y,width:1.5,height:1.5,borderRadius:'50%',background:'rgba(0,200,255,0.5)'}}/>
                ))}
              </div>
              <span style={{ color:'rgba(0,200,255,0.6)', fontSize:7, fontWeight:600, letterSpacing:'0.1em' }}>南海诸岛</span>
            </div>
            <span className="text-text-muted">
              全国潜力 {Object.values(PROVINCE_DATA).reduce((a,b)=>a+b,0).toFixed(0)}万kWh/年
            </span>
          </div>
        </div>

        {/* City strip */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-text-muted mr-1">监测:</span>
          {TOP10.map(c => {
            const live = pilots.find(p => p.name === c.name);
            const isGD = c.province === '广东省';
            return (
              <span key={c.name}
                className="px-1.5 py-0.5 rounded border text-[8px]"
                style={{
                  borderColor: isGD ? 'rgba(52,199,89,0.5)' : 'rgba(0,180,255,0.2)',
                  color: isGD ? '#34C759' : '#8899BB',
                  background: isGD ? 'rgba(52,199,89,0.1)' : 'transparent',
                  fontWeight: isGD ? 'bold' : 'normal',
                }}>
                #{c.rank} {c.name}{live?` ${live.temp}°`:'—'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
