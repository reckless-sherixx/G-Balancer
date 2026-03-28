type JsonRecord = Record<string, unknown>;

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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

export interface GridMetrics {
  city: string;
  timestamp: string;
  currentDemand: number;
  solarSupply: number;
  windSupply: number;
  conventionalSupply: number;
  totalSupply: number;
  batteryPercentage: number;
  batteryStatus: "charging" | "discharging" | "idle";
  netBalance: number;
  gridStatus: "normal" | "warning" | "critical" | "surplus";
  recommendedAction: string;
  actionDescription: string;
}

export interface DashboardStats {
  last24hAvgDemandMw: number;
  last24hPeakDemandMw: number;
  renewablePercentage: number;
}

export interface WeatherSnapshot {
  temperatureC: number;
  cloudCoverPercent: number;
  windSpeedKmh: number;
  solarIrradiance: number;
}

export interface ForecastPoint {
  timestamp: string;
  demand: number;
  solar: number;
  wind: number;
  supply: number;
  netBalance: number;
  recommendedAction: string;
  confidence: number;
}

export interface ForecastData {
  city: string;
  generatedAt: string;
  points: ForecastPoint[];
  summary: {
    peakDemandMw: number;
    minDemandMw: number;
    avgDemandMw: number;
    hoursWithSurplus: number;
    hoursWithDeficit: number;
    criticalHours: number;
  };
}

export interface GridAlert {
  id: string;
  type: "INFO" | "WARNING" | "CRITICAL";
  msg: string;
  time: string;
  rawTimestamp: string;
}

export interface DashboardBundle {
  metrics: GridMetrics;
  weather: WeatherSnapshot;
  stats: DashboardStats;
  alerts: GridAlert[];
}

export interface SimulationOutput {
  status: "simulated";
  before: { demand: number; battery: number };
  after: { demand: number; battery: number };
  recommendation: string;
}

export interface CarbonMetrics {
  savedToday: number;
  treesEquivalent: number;
  creditsEarned: number;
}

function normalizeGridMetrics(payload: unknown): GridMetrics {
  const raw = (payload ?? {}) as JsonRecord;
  const batteryStatus = asString(raw.battery_status, "idle").toLowerCase();
  const gridStatus = asString(raw.grid_status, "normal").toLowerCase();

  return {
    city: asString(raw.city, "Mumbai"),
    timestamp: asString(raw.timestamp, new Date().toISOString()),
    currentDemand: asNumber(raw.current_demand_mw),
    solarSupply: asNumber(raw.solar_generation_mw),
    windSupply: asNumber(raw.wind_generation_mw),
    conventionalSupply: asNumber(raw.conventional_generation_mw),
    totalSupply: asNumber(raw.total_supply_mw),
    batteryPercentage: asNumber(raw.battery_percentage),
    batteryStatus:
      batteryStatus === "charging" || batteryStatus === "discharging" ? batteryStatus : "idle",
    netBalance: asNumber(raw.net_balance_mw),
    gridStatus:
      gridStatus === "warning" || gridStatus === "critical" || gridStatus === "surplus"
        ? gridStatus
        : "normal",
    recommendedAction: asString(raw.recommended_action, "no_action"),
    actionDescription: asString(raw.action_description, "No action required."),
  };
}

function normalizeAlertType(value: unknown): "INFO" | "WARNING" | "CRITICAL" {
  const severity = asString(value, "low").toLowerCase();
  if (severity === "critical" || severity === "high") return "CRITICAL";
  if (severity === "warning" || severity === "medium") return "WARNING";
  return "INFO";
}

function normalizeAlert(payload: unknown, index: number): GridAlert {
  const raw = (payload ?? {}) as JsonRecord;
  const timestamp = asString(raw.timestamp, new Date().toISOString());
  const title = asString(raw.title);
  const message = asString(raw.message, "No message provided.");

  return {
    id: String(raw.id ?? `${timestamp}-${index}`),
    type: normalizeAlertType(raw.severity),
    msg: title ? `${title}: ${message}` : message,
    time: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    rawTimestamp: timestamp,
  };
}

function normalizeForecastPoint(input: unknown): ForecastPoint {
  const row = (input ?? {}) as JsonRecord;
  const solar = asNumber(row.predicted_solar_mw ?? row.predicted_solar ?? row.solar);
  const wind = asNumber(row.predicted_wind_mw ?? row.predicted_wind ?? row.wind);
  const demand = asNumber(row.predicted_demand_mw ?? row.predicted_demand ?? row.demand);
  const supply = asNumber(row.supply, solar + wind);
  const netBalance = asNumber(row.net_balance_mw, supply - demand);

  return {
    timestamp: asString(row.timestamp ?? row.time, new Date().toISOString()),
    demand,
    solar,
    wind,
    supply,
    netBalance,
    recommendedAction: asString(row.recommended_action, "no_action"),
    confidence: asNumber(row.confidence, 0.85),
  };
}

function normalizeForecastResponse(payload: unknown): ForecastData {
  const raw = (payload ?? {}) as JsonRecord;
  const pointsRaw = Array.isArray(raw.hourly) ? raw.hourly : Array.isArray(raw.points) ? raw.points : [];
  const summaryRaw = (raw.summary ?? {}) as JsonRecord;

  let points = pointsRaw.map(normalizeForecastPoint);

  if (!points.length) {
    const supply = Array.isArray(raw.predicted_supply) ? raw.predicted_supply : [];
    const demand = Array.isArray(raw.predicted_demand) ? raw.predicted_demand : [];
    const maxLength = Math.max(supply.length, demand.length);
    points = Array.from({ length: maxLength }).map((_, index) => {
      const pointSupply = asNumber(supply[index]);
      const pointDemand = asNumber(demand[index]);
      return {
        timestamp: new Date(Date.now() + index * 3600 * 1000).toISOString(),
        demand: pointDemand,
        solar: 0,
        wind: pointSupply,
        supply: pointSupply,
        netBalance: pointSupply - pointDemand,
        recommendedAction: "no_action",
        confidence: 0.7,
      };
    });
  }

  return {
    city: asString(raw.city, "Mumbai"),
    generatedAt: asString(raw.generated_at ?? raw.generatedAt, new Date().toISOString()),
    points,
    summary: {
      peakDemandMw: asNumber(summaryRaw.peak_demand_mw),
      minDemandMw: asNumber(summaryRaw.min_demand_mw),
      avgDemandMw: asNumber(summaryRaw.avg_demand_mw),
      hoursWithSurplus: asNumber(summaryRaw.hours_with_surplus),
      hoursWithDeficit: asNumber(summaryRaw.hours_with_deficit),
      criticalHours: asNumber(summaryRaw.critical_hours),
    },
  };
}

export const api = {
  async getGridMetrics(city = "Mumbai"): Promise<GridMetrics> {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const payload = await request<unknown>(`/grid/state/latest${query}`);
    return normalizeGridMetrics(payload);
  },

  async getAlerts(city = "Mumbai", limit = 20): Promise<GridAlert[]> {
    const params = new URLSearchParams({ city, limit: String(limit) });
    const payload = await request<unknown>(`/grid/alerts?${params.toString()}`);
    const rows = Array.isArray(payload) ? payload : [];
    return rows.map((entry, index) => normalizeAlert(entry, index));
  },

  async getForecast(city = "Mumbai", hours = 24): Promise<ForecastData> {
    const params = new URLSearchParams({
      city,
      hours: String(Math.max(1, Math.min(72, Math.floor(hours)))),
    });

    try {
      const payload = await request<unknown>(`/forecast?${params.toString()}`);
      return normalizeForecastResponse(payload);
    } catch {
      const fallback = await request<unknown>("/simulate");
      const raw = (fallback ?? {}) as JsonRecord;
      const supply = Array.isArray(raw.total_supply_kwh) ? raw.total_supply_kwh : [];
      const demand = Array.isArray(raw.demand_kwh) ? raw.demand_kwh : [];
      const points = supply.slice(0, hours).map((s, i) => {
        const pointSupply = asNumber(s);
        const pointDemand = asNumber(demand[i]);
        return {
          timestamp: new Date(Date.now() + i * 3600 * 1000).toISOString(),
          demand: pointDemand,
          solar: 0,
          wind: pointSupply,
          supply: pointSupply,
          netBalance: pointSupply - pointDemand,
          recommendedAction: "no_action",
          confidence: 0.65,
        };
      });

      return {
        city,
        generatedAt: new Date().toISOString(),
        points,
        summary: {
          peakDemandMw: points.length ? Math.max(...points.map((p) => p.demand)) : 0,
          minDemandMw: points.length ? Math.min(...points.map((p) => p.demand)) : 0,
          avgDemandMw: points.length ? points.reduce((acc, p) => acc + p.demand, 0) / points.length : 0,
          hoursWithSurplus: points.filter((p) => p.netBalance > 0).length,
          hoursWithDeficit: points.filter((p) => p.netBalance < 0).length,
          criticalHours: 0,
        },
      };
    }
  },

  async getDashboard(city = "Mumbai"): Promise<DashboardBundle> {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const payload = await request<unknown>(`/dashboard/${query}`);
    const raw = (payload ?? {}) as JsonRecord;

    const weatherRaw = (raw.weather ?? {}) as JsonRecord;
    const statsRaw = (raw.stats ?? {}) as JsonRecord;
    const alertsRaw = Array.isArray(raw.recent_alerts) ? raw.recent_alerts : [];

    return {
      metrics: normalizeGridMetrics(raw.current_state),
      weather: {
        temperatureC: asNumber(weatherRaw.temperature_c),
        cloudCoverPercent: asNumber(weatherRaw.cloud_cover_percent),
        windSpeedKmh: asNumber(weatherRaw.wind_speed_kmh),
        solarIrradiance: asNumber(weatherRaw.solar_irradiance),
      },
      stats: {
        last24hAvgDemandMw: asNumber(statsRaw.last_24h_avg_demand_mw),
        last24hPeakDemandMw: asNumber(statsRaw.last_24h_peak_demand_mw),
        renewablePercentage: asNumber(statsRaw.renewable_percentage),
      },
      alerts: alertsRaw.map((entry, index) => normalizeAlert(entry, index)),
    };
  },

  async runSimulation(scenario: string, severity: number): Promise<SimulationOutput> {
    const payload = await request<unknown>("/simulate");
    const raw = (payload ?? {}) as JsonRecord;
    const demandSeries = Array.isArray(raw.demand_kwh) ? raw.demand_kwh.map((v) => asNumber(v)) : [];
    const batterySeries = Array.isArray(raw.battery_pct) ? raw.battery_pct.map((v) => asNumber(v)) : [];

    const baseDemand = demandSeries[0] ?? 0;
    const shockedDemand = scenario === "demand_spike"
      ? baseDemand * (1 + Math.max(0, severity) / 100)
      : baseDemand;

    return {
      status: "simulated",
      before: {
        demand: baseDemand,
        battery: batterySeries[0] ?? 50,
      },
      after: {
        demand: shockedDemand,
        battery: batterySeries[Math.min(batterySeries.length - 1, 5)] ?? 45,
      },
      recommendation: "Backend simulation completed. Apply adaptive battery and load balancing policy.",
    };
  },

  async getCarbonMetrics(): Promise<CarbonMetrics> {
    try {
      const payload = await request<unknown>("/insights/carbon");
      const raw = (payload ?? {}) as JsonRecord;
      const carbon = (raw.carbon ?? {}) as JsonRecord;

      const savedKg = asNumber(carbon.co2_saved_kg ?? carbon.total_co2_saved_kg);
      const trees = asNumber(
        carbon.trees_equivalent ?? carbon.equivalent_trees_planted
      );
      const credits = asNumber(
        carbon.carbon_credits_value_inr ?? carbon.credit_value_inr
      );

      return {
        savedToday: savedKg / 1000,
        treesEquivalent: trees,
        creditsEarned: credits,
      };
    } catch {
      return {
        savedToday: 0,
        treesEquivalent: 0,
        creditsEarned: 0,
      };
    }
  },
};

export { API_BASE_URL };
