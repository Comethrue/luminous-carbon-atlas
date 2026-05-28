/**
 * Luminous Carbon Atlas — Shared Constants
 * 数智光衡 · 碳能观测舱
 *
 * All authoritative data sources, physical constants,
 * and calculation parameters centralized here.
 */

// ═══════════════════════════════════════════════════════════
// PHYSICAL CONSTANTS (from scraper/authoritative_data.json)
// ═══════════════════════════════════════════════════════════

/** kgCO2 per kWh — 生态环境部 2025年电力碳排放因子公告 */
export const CARBON_FACTOR = 0.6205;

/** 元/kWh — 湖北省发改委 居民合表电价 */
export const ELECTRICITY_PRICE = 0.55;

/** kgCO2 absorbed per tree per year — 国家林草局 LY/T 2988-2018 */
export const TREE_CO2_PER_YEAR = 21.77;

/** kg标准煤 per kWh — GB/T 2589-2020 综合能耗计算通则 */
export const COAL_PER_KWH = 0.330;

/** W — 标准教室全亮功率 (3区 × 4盏 × 40W LED面板) */
export const BASELINE_POWER_W = 480;

/** W — 单分区照明功率 (4盏 × 40W) */
export const ZONE_POWER_W = 160;

/** 天/年 — 高校教室年使用天数 (扣除寒暑假约85天) */
export const OPERATION_DAYS = 280;

/** 小时/天 — 教室照明日均运行时间 (8:00-22:00) */
export const OPERATION_HOURS = 14;

/** W/m² — LPD限值 GB 50034-2013 表6.3.1 */
export const LPD_LIMIT = 9;

/** m² — 标准高校教室面积 */
export const CLASSROOM_AREA = 80;

/** 天 — 系统已运行天数 (基准日期 2026-04-11) */
export const SYSTEM_START_DATE = '2026-04-11';

// ═══════════════════════════════════════════════════════════
// DATA SOURCES (display metadata)
// ═══════════════════════════════════════════════════════════
export const DATA_SOURCES = [
  {
    id: 'carbon',
    label: '碳排放因子',
    value: `${CARBON_FACTOR} kgCO₂/kWh`,
    source: '生态环境部 2025年第10号公告',
    url: 'https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202504/t20250430_1109553.html',
  },
  {
    id: 'lighting',
    label: '照明标准',
    value: `LPD ≤ ${LPD_LIMIT} W/m², 桌面 ≥ 300 lux`,
    source: 'GB 50034-2013 建筑照明设计标准',
  },
  {
    id: 'coal',
    label: '标准煤折算',
    value: `${COAL_PER_KWH} kgce/kWh`,
    source: 'GB/T 2589-2020 综合能耗计算通则',
  },
  {
    id: 'price',
    label: '电价基准',
    value: `${ELECTRICITY_PRICE} 元/kWh`,
    source: '湖北省发改委 鄂发改价管〔2020〕439号',
  },
  {
    id: 'tree',
    label: '碳汇换算',
    value: `${TREE_CO2_PER_YEAR} kgCO₂/株/年`,
    source: '国家林草局 LY/T 2988-2018 碳汇计量指南',
  },
];

// ═══════════════════════════════════════════════════════════
// COMPUTED BASELINES
// ═══════════════════════════════════════════════════════════

/** 全亮基线日能耗 (kWh) */
export const BASELINE_DAILY_KWH = (BASELINE_POWER_W / 1000) * OPERATION_HOURS;

/** 全亮基线年能耗 (kWh) */
export const BASELINE_ANNUAL_KWH = BASELINE_DAILY_KWH * OPERATION_DAYS;

/** 单教室全亮年电费 (元) */
export const BASELINE_ANNUAL_COST = BASELINE_ANNUAL_KWH * ELECTRICITY_PRICE;

/** 全校推广潜力 (假设200间教室) */
export const CAMPUS_CLASSROOM_COUNT = 200;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export interface OverviewData {
  totalSavedKwh: number;
  savingRate: number;
  co2ReducedKg: number;
  treeEquivalent: number;
  costSavedYuan: number;
  aiControlRate: number;
  activeZones: number;
  lowCarbonScore: number;
  currentPowerW: number;
  currentPersons: number;
  systemDays: number;
  timestamp: string;
}

export interface TimeSeriesPoint {
  time: string;
  hour: number;
  baselinePower: number;
  aiPower: number;
  occupancy: number;
  zonesActive: number;
}

export interface DailyTrend {
  day: string;
  baseline: number;
  ai: number;
  saved: number;
}

export interface MonthlyTrend {
  day: number;
  ai: number;
  baseline: number;
  occupancy: number;
}

export interface ScenarioComparison {
  name: string;
  dailyKwh: number;
  annualKwh: number;
  annualCost: number;
  color: string;
}

export interface CarbonLedger {
  totalSavedKwh: number;
  co2ReducedKg: number;
  coalSavedKg: number;
  treeEquivalent: number;
  costSavedYuan: number;
  classroomsPowered: number;
  campusAnnualPotentialKwh: number;
  campusAnnualPotentialCo2Kg: number;
}

export interface LiveData {
  timestamp: string;
  powerW: number;
  persons: number;
  zonesActive: number;
  zoneStates: { left: boolean; center: boolean; right: boolean };
  zonePowers: { left: number; center: number; right: number };
  strategy: 'ALL_OFF' | 'ZONE_PARTIAL' | 'ALL_ON' | 'HOLD';
  lightAdc: number;
  co2Ppm: number;
  temperature: number;
}
