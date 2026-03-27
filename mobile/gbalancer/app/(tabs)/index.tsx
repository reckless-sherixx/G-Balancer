import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ForecastBars } from '@/components/grid/forecast-bars';
import { MetricCard } from '@/components/grid/metric-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/features/grid/api';
import { useForecastData, useGridStatusData } from '@/features/grid/hooks';

export default function HomeScreen() {
  const status = useGridStatusData();
  const forecast = useForecastData();

  const forecastSummary = useMemo(() => {
    if (!forecast.data?.points.length) {
      return { avgSupply: 0, avgDemand: 0, avgDelta: 0 };
    }

    const totals = forecast.data.points.reduce(
      (acc, point) => {
        acc.supply += point.supply;
        acc.demand += point.demand;
        return acc;
      },
      { supply: 0, demand: 0 },
    );

    const count = forecast.data.points.length;
    const avgSupply = totals.supply / count;
    const avgDemand = totals.demand / count;

    return {
      avgSupply,
      avgDemand,
      avgDelta: avgSupply - avgDemand,
    };
  }, [forecast.data?.points]);

  const hasError = status.error || forecast.error;

  const refreshAll = async () => {
    await Promise.all([status.refresh(), forecast.refresh()]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.headerCard}>
        <ThemedText type="title">Grid Operations Center</ThemedText>
        <ThemedText style={styles.headerText}>
          Live ML insight for supply-demand balance, battery health, and dispatch readiness.
        </ThemedText>
        <ThemedText style={styles.apiText}>{`API: ${API_BASE_URL}`}</ThemedText>
        <Pressable onPress={refreshAll} style={styles.refreshButton}>
          <ThemedText type="defaultSemiBold">Refresh Data</ThemedText>
        </Pressable>
      </ThemedView>

      {(status.loading || forecast.loading) && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" />
          <ThemedText>Loading latest grid telemetry...</ThemedText>
        </View>
      )}

      {!!hasError && (
        <ThemedView style={styles.errorCard}>
          <ThemedText type="defaultSemiBold">Could not fetch one or more endpoints</ThemedText>
          <ThemedText>{hasError}</ThemedText>
        </ThemedView>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Battery Level"
          value={`${Math.round(status.data?.batteryLevelPct ?? 0)}%`}
          hint="Storage state of charge"
        />
        <MetricCard
          title="Grid State"
          value={`${status.data?.status ?? 'UNKNOWN'}`}
          hint={status.data?.message ?? 'Status from rule-based grid health model'}
        />
        <MetricCard
          title="Current Supply"
          value={`${(status.data?.currentSupply ?? 0).toFixed(1)} MW`}
          hint="Measured now"
        />
        <MetricCard
          title="Current Demand"
          value={`${(status.data?.currentDemand ?? 0).toFixed(1)} MW`}
          hint="Measured now"
        />
        <MetricCard
          title="Current Surplus"
          value={`${(status.data?.surplusKwh ?? 0).toFixed(1)} kWh`}
          hint="Supply minus demand"
        />
      </View>

      <ThemedView style={styles.sectionCard}>
        <ThemedText type="subtitle">Forecast Snapshot (Next 12 points)</ThemedText>
        <ForecastBars points={forecast.data?.points ?? []} />
        <ThemedText>
          Avg Supply: {forecastSummary.avgSupply.toFixed(1)} MW | Avg Demand:{' '}
          {forecastSummary.avgDemand.toFixed(1)} MW
        </ThemedText>
        <ThemedText type="defaultSemiBold">
          {`Average Delta: ${forecastSummary.avgDelta >= 0 ? '+' : ''}${forecastSummary.avgDelta.toFixed(1)} MW`}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.sectionCard}>
        <ThemedText type="subtitle">Data Flow</ThemedText>
        <ThemedText>
          Weather + sensor + historical data -> preprocessing -> LSTM forecast -> surplus/deficit
          calculation -> recommender action -> frontend monitoring.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.25)',
    gap: 8,
    backgroundColor: 'rgba(32, 126, 164, 0.08)',
  },
  headerText: {
    opacity: 0.9,
  },
  apiText: {
    fontSize: 12,
    opacity: 0.6,
  },
  refreshButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.35)',
  },
  loaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 60, 60, 0.4)',
    padding: 12,
    gap: 6,
  },
  metricsGrid: {
    gap: 10,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 14,
    gap: 10,
  },
});
