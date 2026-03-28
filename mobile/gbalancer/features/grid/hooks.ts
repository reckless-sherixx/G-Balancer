import { useCallback, useEffect, useState } from 'react';

import { getForecast, getGridStatus, getPrediction } from '@/features/grid/api';
import { type ForecastResponse, type GridStatusResponse, type PredictRequest, type PredictResponse } from '@/features/grid/types';

type ForecastOptions = {
  city?: string;
  hours?: number;
};

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useAsyncData<T>(loader: () => Promise<T>, immediate = true) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

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
    if (immediate) {
      void refresh();
    }
  }, [immediate, refresh]);

  return {
    ...state,
    refresh,
  };
}

export function useForecastData(options?: ForecastOptions) {
  const loader = useCallback(
    () => getForecast({ city: options?.city, hours: options?.hours }),
    [options?.city, options?.hours],
  );
  return useAsyncData<ForecastResponse>(loader);
}

export function useGridStatusData() {
  return useAsyncData<GridStatusResponse>(getGridStatus);
}

export function usePredictionData(initialPayload: PredictRequest) {
  const [payload, setPayload] = useState<PredictRequest>(initialPayload);
  const [state, setState] = useState<AsyncState<PredictResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const predict = useCallback(
    async (nextPayload?: PredictRequest) => {
      const finalPayload = nextPayload ?? payload;
      setPayload(finalPayload);
      setState({ data: null, loading: true, error: null });

      try {
        const result = await getPrediction(finalPayload);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unexpected error',
        });
        return null;
      }
    },
    [payload],
  );

  return {
    ...state,
    payload,
    setPayload,
    predict,
  };
}
