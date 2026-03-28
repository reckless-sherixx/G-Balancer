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
  statusLabel: "HEALTHY" | "WARNING" | "CRITICAL";
  statusMessage: string;
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

export interface CarbonMetrics {
  savedToday: number;
  treesEquivalent: number;
  creditsEarned: number;
}

export interface SimulationResult {
  status: string;
  before: { demand: number; battery: number };
  after: { demand: number; battery: number };
  recommendation: string;
}

function normalizeGridMetrics(payload: unknown): GridMetrics {
  const raw = (payload ?? {}) as JsonRecord;
  const batteryStatus = asString(raw.battery_status, "idle").toLowerCase();
  const gridStatus = asString(raw.grid_status, "normal").toLowerCase();
  const batteryPct = asNumber(raw.battery_percentage);
  const supplyMw = asNumber(raw.total_supply_mw);
  const demandMw = asNumber(raw.current_demand_mw);
  const netBalanceMw = asNumber(raw.net_balance_mw, supplyMw - demandMw);

  const statusLabel: GridMetrics["statusLabel"] =
    gridStatus === "critical" ? "CRITICAL" : gridStatus === "warning" ? "WARNING" : "HEALTHY";

  let statusMessage = asString(raw.action_description, "");
  if (!statusMessage) {
    if (statusLabel === "CRITICAL") {
      statusMessage = `Battery critically low at ${batteryPct.toFixed(1)}%`;
    } else if (statusLabel === "WARNING") {
      statusMessage = `Grid warning: Supply ${supplyMw.toFixed(1)}MW vs Demand ${demandMw.toFixed(1)}MW`;
    } else {
      statusMessage =
        netBalanceMw > 0
          ? `Grid surplus: ${netBalanceMw.toFixed(1)}MW`
          : `Grid deficit: ${Math.abs(netBalanceMw).toFixed(1)}MW`;
    }
  }

  return {
    city: asString(raw.city, "Mumbai"),
    timestamp: asString(raw.timestamp, new Date().toISOString()),
    statusLabel,
    statusMessage,
    currentDemand: demandMw,
    solarSupply: asNumber(raw.solar_generation_mw),
    windSupply: asNumber(raw.wind_generation_mw),
    conventionalSupply: asNumber(raw.conventional_generation_mw),
    totalSupply: supplyMw,
    batteryPercentage: batteryPct,
    batteryStatus:
      batteryStatus === "charging" || batteryStatus === "discharging" ? batteryStatus : "idle",
    netBalance: netBalanceMw,
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

function normalizeForecastResponse(payload: unknown): ForecastData {
  const raw = (payload ?? {}) as JsonRecord;
  const hourly = Array.isArray(raw.hourly)
    ? raw.hourly
    : Array.isArray(raw.points)
      ? raw.points
      : [];
  const summary = (raw.summary ?? {}) as JsonRecord;

  const points = hourly.map((entry) => {
    const row = entry as JsonRecord;
    const solar = asNumber(row.predicted_solar_mw ?? row.solar);
    const wind = asNumber(row.predicted_wind_mw ?? row.wind);
    return {
      timestamp: asString(row.timestamp ?? row.time, new Date().toISOString()),
      demand: asNumber(row.predicted_demand_mw ?? row.demand),
      solar,
      wind,
      supply: asNumber(row.supply, solar + wind),
      netBalance: asNumber(row.net_balance_mw, solar + wind - asNumber(row.predicted_demand_mw ?? row.demand)),
      recommendedAction: asString(row.recommended_action, "no_action"),
      confidence: asNumber(row.confidence),
    };
  });

  return {
    city: asString(raw.city, "Mumbai"),
    generatedAt: asString(raw.generated_at, new Date().toISOString()),
    points,
    summary: {
      peakDemandMw: asNumber(summary.peak_demand_mw),
      minDemandMw: asNumber(summary.min_demand_mw),
      avgDemandMw: asNumber(summary.avg_demand_mw),
      hoursWithSurplus: asNumber(summary.hours_with_surplus),
      hoursWithDeficit: asNumber(summary.hours_with_deficit),
      criticalHours: asNumber(summary.critical_hours),
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
    const payload = await request<unknown>(`/forecast?${params.toString()}`);
    return normalizeForecastResponse(payload);
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

  async getCarbonMetrics(city = "Mumbai"): Promise<CarbonMetrics> {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const payload = await request<unknown>(`/insights/carbon${query}`);
    const raw = (payload ?? {}) as JsonRecord;
    const carbon = (raw.carbon ?? {}) as JsonRecord;

    return {
      savedToday: asNumber(carbon.co2_saved_tonnes),
      treesEquivalent: asNumber(carbon.equivalent_trees_planted),
      creditsEarned: asNumber(carbon.credit_value_inr),
    };
  },

  async runSimulation(scenario: string, severity: number, city = "Mumbai"): Promise<SimulationResult> {
    const metrics = await api.getGridMetrics(city);
    const severityFactor = Math.max(0, Math.min(100, severity)) / 100;

    let afterDemand = metrics.currentDemand;
    let afterBattery = metrics.batteryPercentage;

    if (scenario === "demand_spike") {
      afterDemand = metrics.currentDemand * (1 + severityFactor);
      afterBattery = Math.max(0, metrics.batteryPercentage - severityFactor * 35);
    } else if (scenario === "solar_drop") {
      afterDemand = metrics.currentDemand;
      afterBattery = Math.max(0, metrics.batteryPercentage - severityFactor * 20);
    } else if (scenario === "heatwave") {
      afterDemand = metrics.currentDemand * (1 + severityFactor * 0.4);
      afterBattery = Math.max(0, metrics.batteryPercentage - severityFactor * 25);
    } else if (scenario === "battery_fail") {
      afterDemand = metrics.currentDemand;
      afterBattery = Math.max(0, metrics.batteryPercentage * (1 - severityFactor));
    }

    return {
      status: "simulated",
      before: { demand: metrics.currentDemand, battery: metrics.batteryPercentage },
      after: { demand: afterDemand, battery: afterBattery },
      recommendation: metrics.actionDescription,
    };
  },
};

export { API_BASE_URL };
