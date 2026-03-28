export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface GridAlert {
  severity: AlertSeverity;
  title: string;
  message: string;
  recommended_action: string;
  timestamp: string;
}

export interface AlertsResponse {
  city: string;
  alert_count: number;
  alerts: GridAlert[];
}

export interface CarbonData {
  renewable_kwh: number;
  co2_saved_kg: number;
  co2_saved_tonnes: number;
  carbon_credits_earned: number;
  credit_value_inr: number;
  equivalent_trees_planted: number;
  equivalent_cars_off_road: number;
}

export interface CarbonResponse {
  city: string;
  solar_mw: number;
  wind_mw: number;
  renewable_percentage: number;
  carbon: CarbonData;
  generated_at: string;
}

export interface FestivalEvent {
  date: string;
  event_name: string;
  demand_multiplier: number;
  base_demand_mw: number;
  expected_demand_mw: number;
  days_until: number;
  is_high_impact: boolean;
}

export interface FestivalsResponse {
  city: string;
  days_ahead: number;
  upcoming_events: FestivalEvent[];
  next_high_impact_event: FestivalEvent | null;
  note?: string;
}

export interface InsightsSummary {
  city: string;
  alert_count: number;
  highest_severity: AlertSeverity | 'NONE';
  carbon_saved_today_kg: number;
  renewable_percentage: number;
  next_event: {
    date: string;
    event_name: string;
    days_until: number;
    demand_multiplier: number;
  } | null;
  generated_at: string;
}
