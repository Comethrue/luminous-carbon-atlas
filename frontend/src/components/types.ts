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
  time: string; hour: number; baselinePower: number;
  aiPower: number; occupancy: number; zonesActive: number;
}

export interface DailyTrend {
  day: string; baseline: number; ai: number; saved: number;
}

export interface MonthlyTrend {
  day: number; ai: number; baseline: number; occupancy: number;
}

export interface Scenario {
  name: string; dailyKwh: number; annualKwh: number;
  annualCost: number; color: string;
}

export interface CarbonLedger {
  totalSavedKwh: number; co2ReducedKg: number; coalSavedKg: number;
  treeEquivalent: number; costSavedYuan: number; classroomsPowered: number;
  campusAnnualPotentialKwh: number; campusAnnualPotentialCo2Kg: number;
}
