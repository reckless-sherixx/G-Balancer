import { Platform } from 'react-native';

import {
  type ForecastPoint,
  type ForecastResponse,
  type GridStatusResponse,
  type PredictRequest,
  type PredictResponse,
} from '@/features/grid/types';

// For Android emulator: 10.0.2.2 maps to host machine's localhost
// For iOS simulator: localhost:8000 works directly
// For physical device: use your machine's IP address (e.g., 192.168.x.x)
// YOUR MACHINE IP: 10.21.39.161
// 
// ⚠️ CRITICAL: Android Emulator cannot reach 10.21.39.161 directly!
// Android Emulator uses special IP 10.0.2.2 to reach host machine
// 
// iOS Simulator can reach 10.21.39.161 or localhost
// Physical device (if on same WiFi) can reach 10.21.39.161
const DEFAULT_BASE_URL =
  Platform.OS === 'android' 
    ? 'http://10.21.39.161:8000'           // ✅ Android Emulator special IP
    : 'http://10.21.39.161:8000';      // iOS or physical device

console.log(`📱 Platform: ${Platform.OS}`);
console.log(`🌐 API Base URL: ${DEFAULT_BASE_URL}`);

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
  console.log('   📊 Normalizing forecast response...');
  const raw = (payload ?? {}) as JsonRecord;
  const pointsRaw = Array.isArray(raw.points) ? raw.points : [];
  console.log(`      Raw points: ${pointsRaw.length}`);

  if (pointsRaw.length) {
    const result = {
      horizonHours: asNumber(raw.horizonHours ?? raw.horizon_hours ?? pointsRaw.length, 24),
      points: pointsRaw.map(normalizeForecastPoint),
    };
    console.log(`      ✅ Parsed ${result.points.length} forecast points`);
    return result;
  }

  console.log('   Converting arrays to forecast points...');
  const hours = Array.isArray(raw.hours) ? raw.hours.map((item) => String(item)) : [];
  const supply = Array.isArray(raw.predicted_supply) ? raw.predicted_supply.map((item) => asNumber(item)) : [];
  const demand = Array.isArray(raw.predicted_demand) ? raw.predicted_demand.map((item) => asNumber(item)) : [];
  const maxLength = Math.max(hours.length, supply.length, demand.length);
  console.log(`      Arrays: hours=${hours.length}, supply=${supply.length}, demand=${demand.length}`);

  const convertedPoints: ForecastPoint[] = Array.from({ length: maxLength }).map((_, index) => {
    const hourLabel = hours[index] ?? `${index}:00`;

    return {
      timestamp: `${new Date().toISOString().slice(0, 10)}T${hourLabel.padStart(2, '0')}:00.000Z`,
      supply: supply[index] ?? 0,
      demand: demand[index] ?? 0,
    };
  });

  const result = {
    horizonHours: asNumber(raw.horizonHours ?? raw.horizon_hours ?? convertedPoints.length, 24),
    points: convertedPoints,
  };
  console.log(`      ✅ Converted to ${result.points.length} forecast points`);
  return result;
}

function normalizeGridStatus(payload: unknown): GridStatusResponse {
  console.log('   📡 Normalizing grid status response...');
  const raw = (payload ?? {}) as JsonRecord;

  const result = {
    status: asString(raw.status, 'HEALTHY') as GridStatusResponse['status'],
    message: asString(raw.message, ''),
    batteryLevelPct: asNumber(raw.battery_level_pct ?? raw.batteryLevelPct),
    surplusKwh: asNumber(raw.surplus_kwh ?? raw.surplusKwh),
    currentSupply: asNumber(raw.currentSupply ?? raw.current_supply),
    currentDemand: asNumber(raw.currentDemand ?? raw.current_demand),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
  
  console.log(`      Status: ${result.status}`);
  console.log(`      Battery: ${result.batteryLevelPct.toFixed(1)}%`);
  console.log(`      Supply: ${result.currentSupply.toFixed(2)}, Demand: ${result.currentDemand.toFixed(2)}`);
  
  return result;
}

function normalizePredictResponse(payload: unknown): PredictResponse {
  console.log('   🤖 Normalizing predict response...');
  const raw = (payload ?? {}) as JsonRecord;

  const result = {
    action: asString(raw.recommended_action ?? raw.action, 'STABLE') as PredictResponse['action'],
    confidence: asNumber(raw.confidence),
    urgencyScore: asNumber(raw.urgencyScore ?? raw.urgency_score),
    surplusKwh: asNumber(raw.surplus_kwh ?? raw.surplusKwh),
    reason: asString(raw.message ?? raw.reason, ''),
  };
  
  console.log(`      Action: ${result.action}`);
  console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`      Urgency: ${result.urgencyScore}`);
  
  return result;
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
  try {
    const url = `${API_BASE_URL}${path}`;
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    if (!response.ok) {
      const text = await response.text();
      const errorMsg = text || `Request failed with status ${response.status}`;
      console.error(`❌ Request failed (${response.status}): ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as T;
    console.log(`✅ Response received:`, data);
    return data;
  } catch (error) {
    console.error(`🔴 Network error on ${API_BASE_URL}${path}:`, error);
    throw error;
  }
}

export async function getForecast(): Promise<ForecastResponse> {
  // Call the backend /forecast endpoint (POST or GET depending on backend setup)
  // For now, we'll use the mobile-friendly /forecast GET endpoint if available,
  // otherwise construct a forecast from weather + predictions
  console.log('📊 getForecast() called');
  console.log(`   Endpoint: ${API_BASE_URL}/forecast`);
  
  try {
    console.log('   Attempting to fetch /forecast...');
    const payload = await request<unknown>('/forecast');
    console.log('   ✅ /forecast successful');
    const result = normalizeForecastResponse(payload);
    console.log(`   ✅ Normalized forecast: ${result.points.length} points`);
    return result;
  } catch (error) {
    // Fallback: construct forecast from simulation + predictions
    console.warn('   ⚠️  /forecast failed, trying /simulate fallback:', error);
    try {
      console.log('   Attempting fallback: /simulate...');
      const simulation = await request<SimulateResponse>('/simulate');
      console.log('   ✅ /simulate successful');
      
      // Convert simulation arrays into forecast points
      const points: ForecastPoint[] = (simulation.total_supply_kwh || []).slice(0, 12).map((supply, i) => {
        const point = {
          timestamp: new Date(Date.now() + i * 3600 * 1000).toISOString(),
          supply: supply || 0,
          demand: (simulation.demand_kwh?.[i] || 0),
        };
        if (i === 0) console.log(`   📈 First point: supply=${point.supply}, demand=${point.demand}`);
        return point;
      });

      const result = {
        horizonHours: points.length,
        points,
      };
      console.log(`   ✅ Fallback successful: ${result.points.length} points`);
      return result;
    } catch (fallbackError) {
      console.error('   ❌ Both /forecast and /simulate failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function getGridStatus(): Promise<GridStatusResponse> {
  console.log('🏠 getGridStatus() called');
  console.log(`   Endpoint: ${API_BASE_URL}/simulate + ${API_BASE_URL}/grid-status`);
  
  try {
    console.log('   Step 1: Fetching simulation data...');
    const simulation = await request<SimulateResponse>('/simulate');
    const currentSupply = simulation.total_supply_kwh.at(-1) ?? 0;
    const currentDemand = simulation.demand_kwh.at(-1) ?? 0;
    const batteryLevelPct = simulation.battery_pct.at(-1) ?? 0;
    console.log(`   ✅ Simulation received`);
    console.log(`      Supply: ${currentSupply.toFixed(2)} kWh`);
    console.log(`      Demand: ${currentDemand.toFixed(2)} kWh`);
    console.log(`      Battery: ${batteryLevelPct.toFixed(1)}%`);

    console.log('   Step 2: Posting to /grid-status...');
    const payload = await request<unknown>('/grid-status', {
      method: 'POST',
      body: JSON.stringify({
        battery_level_pct: batteryLevelPct,
        current_supply_kwh: currentSupply,
        current_demand_kwh: currentDemand,
      }),
    });
    console.log('   ✅ /grid-status response received');

    const result = normalizeGridStatus({
      ...(payload as JsonRecord),
      currentSupply,
      currentDemand,
      battery_level_pct: batteryLevelPct,
      updated_at: new Date().toISOString(),
    });
    
    console.log(`   ✅ Normalized grid status: ${result.status}`);
    console.log(`      Message: ${result.message}`);
    return result;
  } catch (error) {
    console.error('   ❌ getGridStatus failed:', error);
    throw error;
  }
}

export async function getPrediction(input: PredictRequest): Promise<PredictResponse> {
  console.log('🤖 getPrediction() called');
  console.log(`   Grid Stress: ${input.gridStress}`);
  console.log(`   Forecasted Surplus: ${input.forecastedSurplus}`);
  console.log(`   Battery Level: ${input.batteryLevelPct}%`);
  
  try {
    console.log('   Step 1: Building predict body...');
    const body = buildPredictBody(input);
    console.log(`   ✅ Built body with ${body.solar_output_kwh.length} hours of data`);
    console.log(`      Solar points: ${body.solar_output_kwh.length}`);
    console.log(`      Wind points: ${body.wind_output_kwh.length}`);
    console.log(`      Demand points: ${body.demand_kwh.length}`);

    console.log('   Step 2: Posting to /predict endpoint...');
    const payload = await request<unknown>('/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log('   ✅ /predict response received');

    const result = normalizePredictResponse(payload);
    console.log(`   ✅ Normalized prediction`);
    console.log(`      Action: ${result.action}`);
    console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`      Urgency: ${result.urgencyScore}`);
    return result;
  } catch (error) {
    console.error('   ❌ getPrediction failed:', error);
    throw error;
  }
}

export { API_BASE_URL };
