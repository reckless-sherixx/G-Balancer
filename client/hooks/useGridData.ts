"use client";

import { create } from 'zustand';
import {
  api,
  DashboardStats,
  ForecastData,
  GridAlert,
  GridMetrics,
  WeatherSnapshot,
} from '../services/api';

interface GridState {
  metrics: GridMetrics | null;
  weather: WeatherSnapshot | null;
  stats: DashboardStats | null;
  forecast: ForecastData | null;
  isLoading: boolean;
  error: string | null;
  alerts: GridAlert[];
  fetchDashboard: (city?: string) => Promise<void>;
  fetchMetrics: (city?: string) => Promise<void>;
  fetchAlerts: (city?: string, limit?: number) => Promise<void>;
  fetchForecast: (city?: string, hours?: number) => Promise<void>;
}

export const useGridStore = create<GridState>((set) => ({
  metrics: null,
  weather: null,
  stats: null,
  forecast: null,
  isLoading: false,
  error: null,
  alerts: [],

  fetchDashboard: async (city = 'Mumbai') => {
    set({ isLoading: true });
    try {
      const bundle = await api.getDashboard(city);
      set({
        metrics: bundle.metrics,
        weather: bundle.weather,
        stats: bundle.stats,
        alerts: bundle.alerts,
        isLoading: false,
        error: null,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch dashboard data';
      set({ error: message, isLoading: false });
    }
  },
  
  fetchMetrics: async (city = 'Mumbai') => {
    set({ isLoading: true });
    try {
      const data = await api.getGridMetrics(city);
      set({ metrics: data, isLoading: false, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch metrics';
      set({ error: message, isLoading: false });
    }
  },

  fetchAlerts: async (city = 'Mumbai', limit = 20) => {
    try {
      const data = await api.getAlerts(city, limit);
      set({ alerts: data, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch alerts';
      set({ error: message });
    }
  },

  fetchForecast: async (city = 'Mumbai', hours = 24) => {
    try {
      const data = await api.getForecast(city, hours);
      set({ forecast: data, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch forecast';
      set({ error: message });
    }
  },
}));
