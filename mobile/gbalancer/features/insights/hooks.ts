import { useCallback, useEffect, useState } from 'react';

import {
  fetchAlerts,
  fetchCarbon,
  fetchFestivals,
  fetchInsightsSummary,
} from '@/features/insights/api';
import type {
  AlertsResponse,
  CarbonResponse,
  FestivalsResponse,
  InsightsSummary,
} from '@/features/insights/types';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type PollingOptions = {
  enabled?: boolean;
  pollIntervalMs?: number;
};

function usePollingData<T>(
  loader: () => Promise<T>,
  options?: PollingOptions,
) {
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      });
      return null;
    }
  }, [loader]);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    void refresh();

    if (!pollIntervalMs) {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs, refresh]);

  return {
    ...state,
    refresh,
  };
}

export function useAlertsData(city: string) {
  const loader = useCallback(() => fetchAlerts(city), [city]);
  return usePollingData<AlertsResponse>(loader, { pollIntervalMs: 60_000 });
}

export function useCarbonData(city: string, options?: PollingOptions) {
  const loader = useCallback(() => fetchCarbon(city), [city]);
  return usePollingData<CarbonResponse>(loader, {
    enabled: options?.enabled,
    pollIntervalMs: options?.pollIntervalMs ?? 120_000,
  });
}

export function useFestivalsData(city: string, daysAhead?: number, options?: PollingOptions) {
  const loader = useCallback(() => fetchFestivals(city, daysAhead), [city, daysAhead]);
  return usePollingData<FestivalsResponse>(loader, {
    enabled: options?.enabled,
  });
}

export function useInsightsSummary(city: string, options?: PollingOptions) {
  const loader = useCallback(() => fetchInsightsSummary(city), [city]);
  return usePollingData<InsightsSummary>(loader, {
    enabled: options?.enabled,
    pollIntervalMs: options?.pollIntervalMs ?? 60_000,
  });
}
