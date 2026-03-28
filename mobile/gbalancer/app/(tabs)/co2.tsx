import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAdminSettings } from "@/features/admin/settings-context";
import { useCarbonData, useInsightsSummary } from "@/features/insights/hooks";

const COLORS = {
  background: "#080808",
  panel: "#0f0f0f",
  panelBorder: "#1f1f1f",
  text: "#e2e2e2",
  neon: "#00ff87",
  cyan: "#00f0ff",
  amber: "#ffd700",
  red: "#ff4444",
  grey: "#8d8d8d",
};

export default function CarbonScreen() {
  const { settings } = useAdminSettings();
  const carbon = useCarbonData(settings.city, {
    enabled: settings.insightsPolling,
    pollIntervalMs: settings.insightsPolling ? 120_000 : undefined,
  });
  const summary = useInsightsSummary(settings.city, {
    enabled: settings.insightsPolling,
    pollIntervalMs: settings.insightsPolling ? 60_000 : undefined,
  });

  const onRefresh = async () => {
    await Promise.all([carbon.refresh(), summary.refresh()]);
  };

  const isLoading = carbon.loading && !carbon.data;
  const error = carbon.error || summary.error;

  const health = summary.data?.highest_severity ?? "NONE";
  const healthColor =
    health === "CRITICAL"
      ? COLORS.red
      : health === "HIGH"
        ? COLORS.amber
        : COLORS.neon;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={carbon.loading || summary.loading}
            onRefresh={() => void onRefresh()}
            tintColor={COLORS.neon}
            colors={[COLORS.neon]}
            progressBackgroundColor={COLORS.panel}
          />
        }
      >
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.title}>CO2 Command Console</Text>
            <Text style={styles.subtitle}>
              Emission monitoring in real-time
            </Text>
          </View>
          <MaterialCommunityIcons name="leaf" size={30} color={COLORS.neon} />
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.neon} />
            <Text style={styles.emptyText}>
              Gathering environmental signal…
            </Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={[styles.statusBar, { borderColor: COLORS.red }]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={18}
              color={COLORS.red}
            />
            <Text style={[styles.statusText, { color: COLORS.red }]}>
              Insights unavailable
            </Text>
            <Text style={styles.message}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && carbon.data ? (
          <>
            <View
              style={[
                styles.statusBar,
                {
                  borderColor: healthColor,
                  backgroundColor: `${healthColor}20`,
                },
              ]}
            >
              <Text
                style={[styles.healthTag, { color: healthColor }]}
              >{`Grid Health: ${health}`}</Text>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderColor: COLORS.neon }]}>
                <Text style={styles.metricTitle}>CO2 Saved</Text>
                <Text style={[styles.metricValue, { color: COLORS.neon }]}>
                  {carbon.data.carbon.co2_saved_kg.toFixed(1)} kg
                </Text>
                <Text style={styles.metricHint}>Impact this hour</Text>
              </View>
              <View style={[styles.metricCard, { borderColor: COLORS.cyan }]}>
                <Text style={styles.metricTitle}>Carbon Credits</Text>
                <Text style={[styles.metricValue, { color: COLORS.cyan }]}>
                  {carbon.data.carbon.carbon_credits_earned.toFixed(2)}
                </Text>
                <Text style={styles.metricHint}>
                  ~₹{carbon.data.carbon.credit_value_inr.toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderColor: COLORS.amber }]}>
                <Text style={styles.metricTitle}>Renewable Share</Text>
                <Text style={[styles.metricValue, { color: COLORS.amber }]}>
                  {carbon.data.renewable_percentage.toFixed(1)}%
                </Text>
                <Text style={styles.metricHint}>Solar + Wind contribution</Text>
              </View>
              <View style={[styles.metricCard, { borderColor: COLORS.neon }]}>
                <Text style={styles.metricTitle}>Equivalent Trees</Text>
                <Text style={[styles.metricValue, { color: COLORS.neon }]}>
                  {carbon.data.carbon.equivalent_trees_planted.toFixed(1)}
                </Text>
                <Text style={styles.metricHint}>Ecosystem impact</Text>
              </View>
            </View>

            <View style={styles.detailPanel}>
              <Text style={styles.sectionTitle}>Renewable Distribution</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Solar</Text>
                <Text style={[styles.detailValue, { color: COLORS.amber }]}>
                  {carbon.data.solar_mw.toFixed(2)} MW
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Wind</Text>
                <Text style={[styles.detailValue, { color: COLORS.cyan }]}>
                  {carbon.data.wind_mw.toFixed(2)} MW
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  wrap: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    paddingBottom: 26,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: COLORS.neon,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.grey,
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    gap: 10,
  },
  emptyText: {
    color: COLORS.grey,
    fontSize: 13,
  },
  statusBar: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#101010",
  },
  statusText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  message: {
    color: COLORS.grey,
    fontSize: 11,
    marginTop: 4,
  },
  healthTag: {
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.panel,
  },
  metricTitle: {
    color: COLORS.grey,
    fontSize: 10,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  metricHint: {
    color: COLORS.grey,
    fontSize: 11,
    marginTop: 4,
  },
  detailPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    backgroundColor: COLORS.panel,
    padding: 12,
    marginTop: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    color: COLORS.grey,
    fontSize: 11,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "800",
  },
});
