import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { MetricCard } from "@/components/insights/MetricCard";
import { SeverityBadge } from "@/components/insights/SeverityBadge";
import { ThemedText } from "@/components/themed-text";
import { useAdminSettings } from "@/features/admin/settings-context";
import { useCarbonData, useInsightsSummary } from "@/features/insights/hooks";

const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  green: "#00FF41",
  cyan: "#00F0FF",
  red: "#FF4444",
  yellow: "#FFD700",
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={carbon.loading || summary.loading}
          onRefresh={() => void onRefresh()}
          tintColor={COLORS.green}
          colors={[COLORS.green]}
          progressBackgroundColor={COLORS.darkGrey}
        />
      }
    >
      <LinearGradient
        colors={[COLORS.darkGrey, COLORS.black]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <ThemedText style={styles.title}>CO2 Insights</ThemedText>
          <ThemedText style={styles.subtitle}>
            Live carbon and renewable metrics
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="leaf" size={32} color={COLORS.green} />
      </LinearGradient>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <ThemedText style={styles.stateText}>
            Loading carbon insights...
          </ThemedText>
        </View>
      ) : null}

      {!isLoading && error ? (
        <LinearGradient
          colors={[`${COLORS.red}22`, `${COLORS.red}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.errorCard, { borderColor: COLORS.red }]}
        >
          <ThemedText style={[styles.errorTitle, { color: COLORS.red }]}>
            Failed to load insights
          </ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
        </LinearGradient>
      ) : null}

      {!isLoading && !error && carbon.data ? (
        <>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.sectionTitle}>Grid Health</ThemedText>
            <SeverityBadge
              severity={summary.data?.highest_severity ?? "NONE"}
            />
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard
              title="CO2 Saved"
              value={`${carbon.data.carbon.co2_saved_kg.toFixed(1)} kg`}
              icon="molecule-co2"
              color={COLORS.green}
              hint="Estimated savings this hour"
            />
            <MetricCard
              title="Carbon Credits"
              value={`${carbon.data.carbon.carbon_credits_earned.toFixed(2)}`}
              icon="star-circle"
              color={COLORS.cyan}
              hint={`~₹${carbon.data.carbon.credit_value_inr.toFixed(0)} value`}
            />
            <MetricCard
              title="Renewable Share"
              value={`${carbon.data.renewable_percentage.toFixed(1)}%`}
              icon="flash"
              color={COLORS.yellow}
              hint="Solar + wind in current supply"
            />
            <MetricCard
              title="Equivalent Trees"
              value={`${carbon.data.carbon.equivalent_trees_planted.toFixed(1)}`}
              icon="tree"
              color={COLORS.green}
              hint="Impact equivalent"
            />
          </View>

          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.breakdownCard}
          >
            <ThemedText style={styles.breakdownTitle}>
              Renewable Breakdown
            </ThemedText>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Solar</ThemedText>
              <ThemedText
                style={[styles.breakdownValue, { color: COLORS.yellow }]}
              >
                {carbon.data.solar_mw.toFixed(2)} MW
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Wind</ThemedText>
              <ThemedText
                style={[styles.breakdownValue, { color: COLORS.cyan }]}
              >
                {carbon.data.wind_mw.toFixed(2)} MW
              </ThemedText>
            </View>
          </LinearGradient>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 26,
  },
  header: {
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: "#B6B6B6",
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  summaryRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  breakdownCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    padding: 14,
  },
  breakdownTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#4A4A4A",
    paddingVertical: 10,
  },
  breakdownLabel: {
    color: "#C8C8C8",
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  stateWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: "#D5D5D5",
    fontSize: 14,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  errorMessage: {
    marginTop: 6,
    color: "#F2D7D7",
    fontSize: 13,
    lineHeight: 18,
  },
});
