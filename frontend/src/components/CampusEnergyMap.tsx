import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Props {
  overview: { savingRate: number; totalSavedKwh: number; co2ReducedKg: number; activeZones: number };
  live: { zoneStates: Record<string,boolean>; zonePowers: Record<string,number>; persons: number };
}

// ── Campus topology: AI hub → 3 classroom buildings ──
const NODES = [
  // Central AI hub
  { id:'hub', x:350, y:180, label:'AI控制中枢\nRadxa Q6A', icon:'⚙', color:'#00D4FF', size:28, category:'hub' },
  // Classroom buildings
  { id:'bldg_a', x:120, y:90,  label:'教学楼A\n左区教室', icon:'🏫', color:'#34C759', size:22, category:'classroom' },
  { id:'bldg_b', x:140, y:220, label:'教学楼B\n中区教室', icon:'🏫', color:'#00D4FF', size:22, category:'classroom' },
  { id:'bldg_c', x:100, y:340, label:'教学楼C\n右区教室', icon:'🏫', color:'#FFD700', size:22, category:'classroom' },
  // Carbon sink / eco node
  { id:'carbon_sink', x:550, y:180, label:'碳减排汇\nCO₂ -144kg', icon:'🌳', color:'#34C759', size:24, category:'eco' },
];

const EDGES = [
  { from:'hub', to:'bldg_a', label:'节能 72%' },
  { from:'hub', to:'bldg_b', label:'节能 68%' },
  { from:'hub', to:'bldg_c', label:'节能 65%' },
  { from:'bldg_a', to:'carbon_sink', label:'CO₂↓' },
  { from:'bldg_b', to:'carbon_sink', label:'CO₂↓' },
  { from:'bldg_c', to:'carbon_sink', label:'CO₂↓' },
];

export function CampusEnergyMap({ overview, live }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts|null>(null);

  useEffect(() => {
    const el=ref.current;if(!el)return;
    let disposed=false;
    const rect=el.getBoundingClientRect();
    const doInit=()=>{if(disposed)return;if(chartRef.current){try{chartRef.current.dispose();}catch{}}chartRef.current=null;init();};
    if(rect.width>0&&rect.height>0){doInit();}
    else{let lw=0,lh=0;const obs=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(Math.abs(w-lw)>20||Math.abs(h-lh)>20){lw=w;lh=h;doInit();}else if(chartRef.current){try{chartRef.current.resize();}catch{}}});obs.observe(el);return()=>{obs.disconnect();disposed=true;if(chartRef.current){try{chartRef.current.dispose();}catch{}chartRef.current=null;}};}
    return()=>{disposed=true;if(chartRef.current){try{chartRef.current.dispose();}catch{}chartRef.current=null;}};

    function init(){
      if(chartRef.current)chartRef.current.dispose();
      chartRef.current=echarts.init(ref.current!,undefined,{renderer:'canvas'});

      // Node scatter data: [x, y, value, id]
      const nodeData=NODES.map(n=>{
        const val=n.id==='hub'?overview.savingRate:
                 n.id==='carbon_sink'?overview.co2ReducedKg/10:
                 n.id==='bldg_a'?70+Math.random()*10:
                 n.id==='bldg_b'?65+Math.random()*10:
                 60+Math.random()*10;
        return{value:[n.x,n.y,val],id:n.id,category:n.category,label:n.label,icon:n.icon,color:n.color,size:n.size};
      });

      const edgeData=EDGES.map(e=>{
        const from=NODES.find(n=>n.id===e.from)!;
        const to=NODES.find(n=>n.id===e.to)!;
        return{coords:[[from.x,from.y],[to.x,to.y]],label:e.label};
      });

      chartRef.current!.setOption({
        backgroundColor:'transparent',
        grid:{left:0,right:0,top:0,bottom:0},
        xAxis:{type:'value',min:0,max:680,show:false},
        yAxis:{type:'value',min:0,max:430,show:false},

        series:[
          // ── Layer 1: Grid BG (tech mesh) ──
          {
            type:'scatter',data:[],
            markArea:{
              silent:true,
              data:[[
                {xAxis:0,yAxis:0,itemStyle:{color:'rgba(0,136,255,0.015)'}},
                {xAxis:680,yAxis:430}
              ]],
            },
            z:0,
          },

          // ── Layer 2: Energy flow lines with animated particles ──
          {
            type:'lines',coordinateSystem:'cartesian2d',polyline:false,
            data:edgeData,
            lineStyle:{color:'rgba(0,180,255,0.25)',width:1.5,curveness:0.2},
            effect:{
              show:true,period:5,trailLength:0.25,
              symbol:'circle',symbolSize:4,
              color:'rgba(0,212,255,0.7)',
            },
            label:{
              show:true,formatter:'{b}',position:'middle',
              color:'#4A6080',fontSize:9,distance:8,
              backgroundColor:'rgba(6,11,20,0.8)',padding:[2,6],borderRadius:3,
            },
            z:1,
          },

          // ── Layer 3: Building nodes (pulse scatter) ──
          {
            type:'effectScatter',coordinateSystem:'cartesian2d',
            data:nodeData.filter(d=>d.category==='classroom'),
            symbolSize:(v:number[])=>v[2]/5+10,
            rippleEffect:{brushType:'stroke',scale:3,period:4,color:'rgba(0,180,255,0.3)'},
            itemStyle:{color:(p:any)=>p.data?.color||'#00D4FF',shadowBlur:15,shadowColor:'rgba(0,180,255,0.4)'},
            label:{show:true,formatter:(p:any)=>p.data?.label||'',position:'bottom',color:'#8899BB',fontSize:9,distance:8,lineHeight:16},
            z:2,
          },

          // ── Layer 4: AI Hub (large pulsing core) ──
          {
            type:'effectScatter',coordinateSystem:'cartesian2d',
            data:nodeData.filter(d=>d.category==='hub'),
            symbolSize:32,
            rippleEffect:{brushType:'fill',scale:6,period:2.5,color:'rgba(0,212,255,0.25)'},
            itemStyle:{color:'#00D4FF',shadowBlur:30,shadowColor:'rgba(0,212,255,0.7)'},
            label:{show:true,formatter:'AI控制中枢\nRadxa Q6A',position:'bottom',color:'#00D4FF',fontSize:10,fontWeight:'bold',distance:10,lineHeight:16},
            z:3,
          },

          // ── Layer 5: Carbon sink (green pulse) ──
          {
            type:'effectScatter',coordinateSystem:'cartesian2d',
            data:nodeData.filter(d=>d.category==='eco'),
            symbolSize:28,
            rippleEffect:{brushType:'stroke',scale:5,period:3,color:'rgba(52,199,89,0.3)'},
            itemStyle:{color:'#34C759',shadowBlur:20,shadowColor:'rgba(52,199,89,0.5)'},
            label:{show:true,formatter:`碳减排汇\nCO₂ ↓${overview.co2ReducedKg.toFixed(0)}kg`,position:'right',color:'#34C759',fontSize:10,fontWeight:'bold',distance:10,lineHeight:16},
            z:3,
          },

          // ── Layer 6: Tech grid scan lines ──
          {
            type:'scatter',data:[],z:0,
            markLine:{
              silent:true,symbol:'none',
              animation:true,animationDuration:4000,animationEasing:'linear',
              lineStyle:{color:'rgba(0,180,255,0.06)',width:1,type:'dashed'},
              data:[
                {yAxis:90,label:{show:false}},
                {yAxis:180,label:{show:false}},
                {yAxis:270,label:{show:false}},
                {yAxis:360,label:{show:false}},
              ],
            },
          },
        ],
      },true);
    }
  },[overview.savingRate,overview.co2ReducedKg]);

  useEffect(()=>{
    const r=()=>chartRef.current?.resize();
    window.addEventListener('resize',r);
    return()=>window.removeEventListener('resize',r);
  },[]);

  return (
    <div
      className="glass-card rounded-xl p-4 glow-border relative overflow-hidden"
    >
      {/* Scan line overlay on card */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:'linear-gradient(180deg,transparent 0%,rgba(0,180,255,0.02) 50%,transparent 100%)',
          backgroundSize:'100% 80px',
          animation:'chartScan 6s linear infinite',
        }}
      />
      <div className="text-[10px] text-text-muted tracking-[0.15em] uppercase mb-2 relative z-20">
        校园能碳拓扑 · AI灯控网络
      </div>
      <div ref={ref} className="w-full relative z-20" style={{height:320}} />
      {/* Stats bar */}
      <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-text-muted relative z-20">
        <span>● AI节点: 1 · 教室: 3栋 · 碳汇: 1</span>
        <span className="text-cyan">节能率 {overview.savingRate}% · 累计 {overview.totalSavedKwh}kWh</span>
      </div>
    </div>
  );
}
