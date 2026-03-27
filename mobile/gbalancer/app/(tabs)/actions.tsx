import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ActionBadge } from '@/components/grid/action-badge';
import { MetricCard } from '@/components/grid/metric-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePredictionData } from '@/features/grid/hooks';

export default function ActionsScreen() {
  const [surplusInput, setSurplusInput] = useState('12.0');
  const [batteryInput, setBatteryInput] = useState('62');
  const [stressInput, setStressInput] = useState('0.36');

  const prediction = usePredictionData({
    forecastedSurplus: 12,
    batteryLevelPct: 62,
    gridStress: 0.36,
  });

  const parsedPayload = useMemo(
    () => ({
      forecastedSurplus: Number.parseFloat(surplusInput) || 0,
      batteryLevelPct: Number.parseFloat(batteryInput) || 0,
      gridStress: Number.parseFloat(stressInput) || 0,
    }),
    [batteryInput, stressInput, surplusInput],
  );

  const runPrediction = async () => {
    await prediction.predict(parsedPayload);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.topCard}>
        <ThemedText type="title">Action Recommender</ThemedText>
        <ThemedText>
          Run the recommender to choose STORE, RELEASE, REDISTRIBUTE, or STABLE for the current grid state.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.formCard}>
        <ThemedText type="subtitle">Input Signals</ThemedText>

        <View style={styles.fieldWrap}>
          <ThemedText>Forecasted Surplus (MW)</ThemedText>
          <TextInput
            style={styles.input}
            value={surplusInput}
            onChangeText={setSurplusInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 10.5"
          />
        </View>

        <View style={styles.fieldWrap}>
          <ThemedText>Battery Level (0 to 100)</ThemedText>
          <TextInput
            style={styles.input}
            value={batteryInput}
            onChangeText={setBatteryInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.65"
          />
        </View>

        <View style={styles.fieldWrap}>
          <ThemedText>Grid Stress (0 to 1)</ThemedText>
          <TextInput
            style={styles.input}
            value={stressInput}
            onChangeText={setStressInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.4"
          />
        </View>

        <Pressable onPress={runPrediction} style={styles.runButton}>
          <ThemedText type="defaultSemiBold">Run Recommendation</ThemedText>
        </Pressable>
      </ThemedView>

      {prediction.loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" />
          <ThemedText>Computing action recommendation...</ThemedText>
        </View>
      )}

      {!!prediction.error && (
        <ThemedView style={styles.errorCard}>
          <ThemedText type="defaultSemiBold">Predict endpoint error</ThemedText>
          <ThemedText>{prediction.error}</ThemedText>
        </ThemedView>
      )}

      {!!prediction.data && (
        <ThemedView style={styles.outputCard}>
          <ThemedText type="subtitle">Recommended Action</ThemedText>
          <ActionBadge action={prediction.data.action} />

          <View style={styles.metricsRow}>
            <MetricCard
              title="Confidence"
              value={`${Math.round(prediction.data.confidence * 100)}%`}
            />
            <MetricCard
              title="Urgency"
              value={`${Math.round(prediction.data.urgencyScore * 100)}%`}
            />
            <MetricCard
              title="Predicted Surplus"
              value={`${prediction.data.surplusKwh.toFixed(1)} kWh`}
            />
          </View>

          {!!prediction.data.reason && (
            <ThemedView style={styles.reasonCard}>
              <ThemedText type="defaultSemiBold">Rationale</ThemedText>
              <ThemedText>{prediction.data.reason}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}
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
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    padding: 14,
    gap: 8,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 14,
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  runButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  outputCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 14,
    gap: 10,
  },
  metricsRow: {
    gap: 10,
  },
  reasonCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 10,
    gap: 4,
  },
});
