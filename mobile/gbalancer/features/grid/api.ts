import { Platform } from 'react-native';

import {
  type ForecastPoint,
  type ForecastResponse,
  type GridStatusResponse,
  type PredictRequest,
  type PredictResponse,
} from '@/features/grid/types';

const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const API_BASE_URL = process.env.EXPO_PUBLIC_ML_API_URL ?? DEFAULT_BASE_URL;

type JsonRecord = Record<string, unknown>;

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeForecastPoint(input: unknown): ForecastPoint {
  const row = (input ?? {}) as JsonRecord;

  return {
    timestamp: asString(row.timestamp ?? row.time, new Date().toISOString()),
    supply: asNumber(row.supply ?? row.predicted_supply),
    demand: asNumber(row.demand ?? row.predicted_demand),
  };
}

function normalizeForecastResponse(payload: unknown): ForecastResponse {
  const raw = (payload ?? {}) as JsonRecord;
  const pointsRaw = Array.isArray(raw.points) ? raw.points : [];

  if (pointsRaw.length) {
    return {
      horizonHours: asNumber(raw.horizonHours ?? raw.horizon_hours ?? pointsRaw.length, 24),
      points: pointsRaw.map(normalizeForecastPoint),
    };
  }

  const hours = Array.isArray(raw.hours) ? raw.hours.map((item) => String(item)) : [];
  const supply = Array.isArray(raw.predicted_supply) ? raw.predicted_supply.map((item) => asNumber(item)) : [];
  const demand = Array.isArray(raw.predicted_demand) ? raw.predicted_demand.map((item) => asNumber(item)) : [];
  const maxLength = Math.max(hours.length, supply.length, demand.length);

  const convertedPoints: ForecastPoint[] = Array.from({ length: maxLength }).map((_, index) => {
    const hourLabel = hours[index] ?? `${index}:00`;

    return {
      timestamp: `${new Date().toISOString().slice(0, 10)}T${hourLabel.padStart(2, '0')}:00.000Z`,
      supply: supply[index] ?? 0,
      demand: demand[index] ?? 0,
    };
  });

  return {
    horizonHours: asNumber(raw.horizonHours ?? raw.horizon_hours ?? convertedPoints.length, 24),
    points: convertedPoints,
  };
}

function normalizeGridStatus(payload: unknown): GridStatusResponse {
  const raw = (payload ?? {}) as JsonRecord;

  return {
    status: asString(raw.status, 'HEALTHY') as GridStatusResponse['status'],
    message: asString(raw.message, ''),
    batteryLevelPct: asNumber(raw.battery_level_pct ?? raw.batteryLevelPct),
    surplusKwh: asNumber(raw.surplus_kwh ?? raw.surplusKwh),
    currentSupply: asNumber(raw.currentSupply ?? raw.current_supply),
    currentDemand: asNumber(raw.currentDemand ?? raw.current_demand),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
}

function normalizePredictResponse(payload: unknown): PredictResponse {
  const raw = (payload ?? {}) as JsonRecord;

  return {
    action: asString(raw.recommended_action ?? raw.action, 'STABLE') as PredictResponse['action'],
    confidence: asNumber(raw.confidence),
    urgencyScore: asNumber(raw.urgencyScore ?? raw.urgency_score),
    surplusKwh: asNumber(raw.surplus_kwh ?? raw.surplusKwh),
    reason: asString(raw.message ?? raw.reason, ''),
  };
}

type SimulateResponse = {
  total_supply_kwh: number[];
  demand_kwh: number[];
  battery_pct: number[];
};

function buildPredictBody(input: PredictRequest) {
  const baseDemand = 22;
  const solar = Array.from({ length: 24 }, (_, hour) => Math.max(0, 8 * Math.sin(((hour - 6) / 12) * Math.PI)));
  const wind = Array.from({ length: 24 }, (_, hour) => 4 + 2 * Math.cos((hour / 24) * 2 * Math.PI));

  const demand = Array.from({ length: 24 }, (_, hour) => {
    const stressEffect = input.gridStress * (hour >= 17 && hour <= 22 ? 7 : 3);
    const dailyEffect = hour >= 17 && hour <= 22 ? 8 : 0;
    return baseDemand + dailyEffect + stressEffect - input.forecastedSurplus * 0.05;
  });

  return {
    solar_output_kwh: solar,
    wind_output_kwh: wind,
    demand_kwh: demand,
    battery_level_pct: input.batteryLevelPct,
    forecast_horizon_hours: 6,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getForecast(): Promise<ForecastResponse> {
  const payload = await request<unknown>('/forecast');
  return normalizeForecastResponse(payload);
}

export async function getGridStatus(): Promise<GridStatusResponse> {
  const simulation = await request<SimulateResponse>('/simulate');
  const currentSupply = simulation.total_supply_kwh.at(-1) ?? 0;
  const currentDemand = simulation.demand_kwh.at(-1) ?? 0;
  const batteryLevelPct = simulation.battery_pct.at(-1) ?? 0;

  const payload = await request<unknown>('/grid-status', {
    method: 'POST',
    body: JSON.stringify({
      battery_level_pct: batteryLevelPct,
      current_supply_kwh: currentSupply,
      current_demand_kwh: currentDemand,
    }),
  });

  return normalizeGridStatus({
    ...(payload as JsonRecord),
    currentSupply,
    currentDemand,
    battery_level_pct: batteryLevelPct,
    updated_at: new Date().toISOString(),
  });
}

export async function getPrediction(input: PredictRequest): Promise<PredictResponse> {
  const body = buildPredictBody(input);
  const payload = await request<unknown>('/predict', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return normalizePredictResponse(payload);
}

export { API_BASE_URL };
