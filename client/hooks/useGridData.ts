"use client";

import { create } from 'zustand';
import { api, GridMetrics } from '../services/api';

interface GridState {
  metrics: GridMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchMetrics: () => Promise<void>;
  
  alerts: Array<{ id: string; type: "INFO" | "WARNING" | "CRITICAL"; msg: string; time: string }>;
  fetchAlerts: () => void;
}

export const useGridStore = create<GridState>((set) => ({
  metrics: null,
  isLoading: false,
  error: null,
  alerts: [],
  
  fetchMetrics: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getGridMetrics();
      set({ metrics: data, isLoading: false, error: null });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchAlerts: () => {
    // Generate mock alerts 
    set({
      alerts: [
        { id: "1", type: "CRITICAL", msg: "Transformer overload detected in Zone 4.", time: "10:12 AM" },
        { id: "2", type: "WARNING", msg: "Solar output dropping 15% due to incoming cloud cover.", time: "10:05 AM" },
        { id: "3", type: "INFO", msg: "Battery array B2 fully charged.", time: "09:45 AM" },
      ]
    })
  }
}));
