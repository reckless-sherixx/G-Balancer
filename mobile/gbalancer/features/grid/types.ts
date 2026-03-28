export type GridAction = 'STORE' | 'RELEASE' | 'REDISTRIBUTE' | 'STABLE';

export type ForecastPoint = {
  timestamp: string;
  supply: number;
  demand: number;
};

export type ForecastSummary = {
  peak_demand_mw: number;
  min_demand_mw: number;
  avg_demand_mw: number;
  hours_with_surplus: number;
  hours_with_deficit: number;
  critical_hours: number;
};

export type ForecastResponse = {
  horizonHours: number;
  points: ForecastPoint[];
  summary?: ForecastSummary;
  city?: string;
  generatedAt?: string;
};

export type GridStatusResponse = {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  message: string;
  batteryLevelPct: number;
  surplusKwh: number;
  currentSupply: number;
  currentDemand: number;
  solarGenerationMw: number;
  windGenerationMw: number;
  conventionalGenerationMw: number;
  updatedAt: string;
};

export type PredictRequest = {
  forecastedSurplus: number;
  batteryLevelPct: number;
  gridStress: number;
};

export type PredictResponse = {
  action: GridAction;
  confidence: number;
  urgencyScore: number;
  surplusKwh: number;
  reason?: string;
};
