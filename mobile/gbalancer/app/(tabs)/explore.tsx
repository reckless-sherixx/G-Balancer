import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ForecastBars } from '@/components/grid/forecast-bars';
import { MetricCard } from '@/components/grid/metric-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useForecastData } from '@/features/grid/hooks';

export default function ForecastScreen() {
  const forecast = useForecastData();

  const nextPoint = forecast.data?.points[0];
  const sixthPoint = forecast.data?.points[5];
  const dayPoint = forecast.data?.points[23];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.topCard}>
        <ThemedText type="title">Energy Forecast</ThemedText>
        <ThemedText>
          LSTM output for supply and demand windows over the selected horizon.
        </ThemedText>
      </ThemedView>

      {forecast.loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" />
          <ThemedText>Fetching forecast horizon...</ThemedText>
        </View>
      )}

      {!!forecast.error && (
        <ThemedView style={styles.errorCard}>
          <ThemedText type="defaultSemiBold">Forecast endpoint error</ThemedText>
          <ThemedText>{forecast.error}</ThemedText>
        </ThemedView>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Next 1h Delta"
          value={`${((nextPoint?.supply ?? 0) - (nextPoint?.demand ?? 0)).toFixed(1)} MW`}
          hint="Immediate surplus (+) or deficit (-)"
        />
        <MetricCard
          title="Next 6h Delta"
          value={`${((sixthPoint?.supply ?? 0) - (sixthPoint?.demand ?? 0)).toFixed(1)} MW`}
          hint="Mid-window balancing signal"
        />
        <MetricCard
          title="Next 24h Delta"
          value={`${((dayPoint?.supply ?? 0) - (dayPoint?.demand ?? 0)).toFixed(1)} MW`}
          hint="Day-level planning estimate"
        />
      </View>

      <ThemedView style={styles.sectionCard}>
        <ThemedText type="subtitle">Supply vs Demand</ThemedText>
        <ForecastBars points={forecast.data?.points ?? []} />
        <ThemedText style={styles.legend}>Green = Supply, Red = Demand</ThemedText>
      </ThemedView>

      <ThemedView style={styles.tableCard}>
        <ThemedText type="subtitle">Upcoming Points</ThemedText>
        {(forecast.data?.points ?? []).slice(0, 6).map((point) => (
          <View key={point.timestamp} style={styles.row}>
            <ThemedText>{new Date(point.timestamp).toLocaleTimeString()}</ThemedText>
            <ThemedText>{`${point.supply.toFixed(1)} / ${point.demand.toFixed(1)} MW`}</ThemedText>
          </View>
        ))}
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
  topCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.25)',
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
    padding: 14,
    gap: 8,
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
  legend: {
    fontSize: 12,
    opacity: 0.75,
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.35)',
  },
});
