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

  // Extract renewable generation (solar + wind)
  const solar = asNumber(row.predicted_solar_mw ?? row.predicted_solar);
  const wind = asNumber(row.predicted_wind_mw ?? row.predicted_wind);
  const supply = solar + wind;
  
  const demand = asNumber(row.predicted_demand_mw ?? row.demand ?? row.predicted_demand);

  return {
    timestamp: asString(row.timestamp ?? row.time, new Date().toISOString()),
    supply,
    demand,
  };
}

function normalizeForecastResponse(payload: unknown): ForecastResponse {
  console.log('   📊 Normalizing forecast response...');
  const raw = (payload ?? {}) as JsonRecord;
  
  // New format: { hourly: [...], summary: {...}, city: "...", generated_at: "..." }
  const hourlyData = Array.isArray(raw.hourly) ? raw.hourly : [];
  const pointsRaw = Array.isArray(raw.points) ? raw.points : hourlyData;
  
  console.log(`      Raw points: ${pointsRaw.length}`);
  console.log(`      City: ${raw.city ?? 'Unknown'}`);
  
  // Extract and preserve summary data
  const rawSummary = (raw.summary ?? {}) as JsonRecord;
  const summary = {
    peak_demand_mw: asNumber(rawSummary.peak_demand_mw),
    min_demand_mw: asNumber(rawSummary.min_demand_mw),
    avg_demand_mw: asNumber(rawSummary.avg_demand_mw),
    hours_with_surplus: asNumber(rawSummary.hours_with_surplus),
    hours_with_deficit: asNumber(rawSummary.hours_with_deficit),
    critical_hours: asNumber(rawSummary.critical_hours),
  };
  
  if (rawSummary) {
    console.log(`      Peak demand: ${summary.peak_demand_mw} MW`);
    console.log(`      Avg demand: ${summary.avg_demand_mw} MW`);
    console.log(`      Deficit hours: ${summary.hours_with_deficit}`);
  }

  if (pointsRaw.length) {
    const points = pointsRaw.map(normalizeForecastPoint);
    const result = {
      horizonHours: asNumber(raw.horizonHours ?? raw.horizon_hours ?? pointsRaw.length, 24),
      points,
      summary: Object.values(summary).some(v => v !== 0) ? summary : undefined,
      city: asString(raw.city, 'Grid'),
      generatedAt: asString(raw.generated_at ?? raw.generatedAt, new Date().toISOString()),
    };
    console.log(`      ✅ Parsed ${result.points.length} forecast points`);
    console.log(`      ✅ Summary: peak=${summary.peak_demand_mw}, avg=${summary.avg_demand_mw}`);
    
    // Log net balance for first few points
    points.slice(0, 3).forEach((p, i) => {
      const balance = p.supply - p.demand;
      console.log(`      Point ${i}: Supply=${p.supply.toFixed(2)}, Demand=${p.demand.toFixed(2)}, Net=${balance.toFixed(2)}`);
    });
    
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
    city: asString(raw.city, 'Grid'),
    generatedAt: asString(raw.generated_at ?? raw.generatedAt, new Date().toISOString()),
  };
  console.log(`      ✅ Converted to ${result.points.length} forecast points`);
  return result;
}

function normalizeGridStatus(payload: unknown): GridStatusResponse {
  console.log('   📡 Normalizing grid status response...');
  const raw = (payload ?? {}) as JsonRecord;

  // Map GridState schema fields to GridStatusResponse
  // GridState has: grid_status, battery_percentage, total_supply_mw, current_demand_mw, solar_generation_mw, wind_generation_mw
  const batteryPct = asNumber(raw.battery_percentage ?? raw.battery_level_pct ?? raw.batteryLevelPct);
  const supplyMw = asNumber(raw.total_supply_mw ?? raw.currentSupply ?? raw.current_supply);
  const demandMw = asNumber(raw.current_demand_mw ?? raw.currentDemand ?? raw.current_demand);
  const netBalanceMw = asNumber(raw.net_balance_mw ?? (supplyMw - demandMw));
  const solarMw = asNumber(raw.solar_generation_mw ?? raw.solarGenerationMw ?? 0);
  const windMw = asNumber(raw.wind_generation_mw ?? raw.windGenerationMw ?? 0);
  const conventionalMw = asNumber(raw.conventional_generation_mw ?? raw.conventionalGenerationMw ?? 0);
  
  // Map grid_status enum to friendly status
  const gridStatusRaw = asString(raw.grid_status, 'normal').toLowerCase();
  let status: GridStatusResponse['status'] = 'HEALTHY';
  if (gridStatusRaw === 'critical') status = 'CRITICAL';
  else if (gridStatusRaw === 'warning') status = 'WARNING';
  else if (gridStatusRaw === 'surplus') status = 'HEALTHY';
  else status = 'HEALTHY';

  // Generate message based on status and conditions
  let message = asString(raw.action_description, '');
  if (!message) {
    if (status === 'CRITICAL') {
      message = `Battery critically low at ${batteryPct.toFixed(1)}%`;
    } else if (status === 'WARNING') {
      message = `Grid warning: Supply ${supplyMw.toFixed(1)}MW vs Demand ${demandMw.toFixed(1)}MW`;
    } else {
      message = netBalanceMw > 0 ? `Grid surplus: ${netBalanceMw.toFixed(1)}MW` : `Grid deficit: ${Math.abs(netBalanceMw).toFixed(1)}MW`;
    }
  }

  const result = {
    status,
    message,
    batteryLevelPct: batteryPct,
    surplusKwh: netBalanceMw * 1000, // Convert MW to kWh (approximation)
    currentSupply: supplyMw,
    currentDemand: demandMw,
    solarGenerationMw: solarMw,
    windGenerationMw: windMw,
    conventionalGenerationMw: conventionalMw,
    updatedAt: asString(raw.timestamp ?? raw.updatedAt ?? raw.updated_at, new Date().toISOString()),
  };
  
  console.log(`      Status: ${result.status}`);
  console.log(`      Battery: ${result.batteryLevelPct.toFixed(1)}%`);
  console.log(`      Supply: ${result.currentSupply.toFixed(2)}MW, Demand: ${result.currentDemand.toFixed(2)}MW`);
  console.log(`      Solar: ${result.solarGenerationMw.toFixed(2)}MW, Wind: ${result.windGenerationMw.toFixed(2)}MW`);
  console.log(`      Net Balance: ${netBalanceMw.toFixed(2)}MW`);
  
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

type ForecastQueryOptions = {
  city?: string;
  hours?: number;
};

export async function getForecast(options?: ForecastQueryOptions): Promise<ForecastResponse> {
  // Call the backend /forecast endpoint (POST or GET depending on backend setup)
  // For now, we'll use the mobile-friendly /forecast GET endpoint if available,
  // otherwise construct a forecast from weather + predictions
  console.log('📊 getForecast() called');
  const params = new URLSearchParams();
  if (options?.city?.trim()) {
    params.append('city', options.city.trim());
  }
  if (typeof options?.hours === 'number' && Number.isFinite(options.hours)) {
    params.append('hours', String(Math.max(1, Math.min(168, Math.floor(options.hours)))));
  }

  const forecastPath = params.toString() ? `/forecast?${params.toString()}` : '/forecast';

  console.log(`   Endpoint: ${API_BASE_URL}${forecastPath}`);
  
  try {
    console.log('   Attempting to fetch /forecast...');
  const payload = await request<unknown>(forecastPath);
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
  console.log(`   Endpoint: ${API_BASE_URL}/grid/state/latest`);
  
  try {
    console.log('   Step 1: Fetching grid state...');
    const payload = await request<unknown>('/grid/state/latest');
    console.log('   ✅ Grid state received');

    const result = normalizeGridStatus(payload);
    
    console.log(`   ✅ Normalized grid status: ${result.status}`);
    console.log(`      Battery: ${result.batteryLevelPct.toFixed(1)}%`);
    console.log(`      Supply: ${result.currentSupply.toFixed(2)} MW`);
    console.log(`      Demand: ${result.currentDemand.toFixed(2)} MW`);
    console.log(`      Message: ${result.message}`);
    return result;
  } catch (error) {
    console.error('   ❌ getGridStatus failed:', error);
    throw error;
  }
}

export async function getPrediction(input: PredictRequest): Promise<PredictResponse> {
  console.log('🤖 getPrediction() called');
  console.log(`   Input - Grid Stress: ${input.gridStress}, Forecasted Surplus: ${input.forecastedSurplus}, Battery: ${input.batteryLevelPct}%`);
  
  try {
    console.log('   Step 1: Building predict body...');
    const now = new Date();
    const day = now.getDay();
    const body = {
      forecasted_surplus: input.forecastedSurplus,
      battery_level_pct: input.batteryLevelPct,
      grid_stress: input.gridStress,
      hour_of_day: now.getHours(),
      is_weekend: day === 0 || day === 6 ? 1 : 0,
    };
    console.log(`   ✅ Built body successfully`);

    console.log('   Step 2: Serializing body to JSON...');
    const jsonBody = JSON.stringify(body);
    console.log(`   ✅ JSON serialized (${jsonBody.length} bytes)`);

    console.log('   Step 3: Posting to /predict endpoint...');
    const payload = await request<unknown>('/predict', {
      method: 'POST',
      body: jsonBody,
    });
    console.log('   ✅ /predict response received');

    const result = normalizePredictResponse(payload);
    console.log(`   ✅ Prediction complete`);
    console.log(`      Action: ${result.action}`);
    console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`      Urgency: ${result.urgencyScore}`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('   ❌ getPrediction failed:');
    console.error(`      Error: ${errorMsg}`);
    console.error(`      Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
    throw error;
  }
}

export { API_BASE_URL };
