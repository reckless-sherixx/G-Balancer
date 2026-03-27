export type GridAction = 'STORE' | 'RELEASE' | 'REDISTRIBUTE' | 'STABLE';

export type ForecastPoint = {
  timestamp: string;
  supply: number;
  demand: number;
};

export type ForecastResponse = {
  horizonHours: number;
  points: ForecastPoint[];
};

export type GridStatusResponse = {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  message: string;
  batteryLevelPct: number;
  surplusKwh: number;
  currentSupply: number;
  currentDemand: number;
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
