import type {
  AlertsResponse,
  CarbonResponse,
  FestivalsResponse,
  InsightsSummary,
} from '@/features/insights/types';

const API_BASE_URL = "https://g-balancer.onrender.com";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(path: string, method: HttpMethod = 'GET'): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_BACKEND_URI is undefined. Set it in mobile/gbalancer/.env and restart Expo.',
    );
  }

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchAlerts(city: string): Promise<AlertsResponse> {
  const q = encodeURIComponent(city);
  return request<AlertsResponse>(`/insights/alerts?city=${q}`);
}

export async function fetchCarbon(city: string): Promise<CarbonResponse> {
  const q = encodeURIComponent(city);
  return request<CarbonResponse>(`/insights/carbon?city=${q}`);
}

export async function fetchFestivals(
  city: string,
  daysAhead?: number,
): Promise<FestivalsResponse> {
  const qCity = encodeURIComponent(city);
  const qDays = encodeURIComponent(String(daysAhead ?? 30));
  return request<FestivalsResponse>(`/insights/festivals?city=${qCity}&days_ahead=${qDays}`);
}

export async function fetchInsightsSummary(city: string): Promise<InsightsSummary> {
  const q = encodeURIComponent(city);
  return request<InsightsSummary>(`/insights/summary?city=${q}`);
}
