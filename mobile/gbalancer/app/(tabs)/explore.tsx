import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAdminSettings } from "@/features/admin/settings-context";
import { useForecastData } from "@/features/grid/hooks";

const COLORS = {
  background: "#080808",
  panel: "#0f0f0f",
  panelBorder: "#202020",
  text: "#E8E8E8",
  neon: "#00ff87",
  cyan: "#00f0ff",
  orange: "#ffd700",
  red: "#ff4444",
  grey: "#9CA3AF",
};

const MonitorCard = ({
  label,
  value,
  change,
  icon,
  accent,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
  accent: string;
}) => (
  <View style={[styles.monitorCard, { borderColor: accent }]}>
    <View style={styles.monitorHeader}>
      <MaterialCommunityIcons name={icon as any} size={18} color={accent} />
      <Text style={styles.monitorLabel}>{label}</Text>
    </View>
    <View style={styles.monitorBody}>
      <Text style={[styles.monitorValue, { color: accent }]}>{value}</Text>
      <Text style={styles.monitorChange}>{change}</Text>
    </View>
  </View>
);

export default function ForecastScreen() {
  const { settings } = useAdminSettings();
  const forecast = useForecastData({
    city: settings.city,
    hours: settings.forecastHours,
  });
  const scrollY = useRef(new Animated.Value(0)).current;

  const nextPoint = forecast.data?.points[0];
  const sixthPoint = forecast.data?.points[5];
  const points = forecast.data?.points ?? [];
  const daySupplyTotal = points.reduce((sum, p) => sum + (p.supply ?? 0), 0);
  const dayDemandTotal = points.reduce((sum, p) => sum + (p.demand ?? 0), 0);
  const dayDelta = (daySupplyTotal - dayDemandTotal).toFixed(1);

  const nextDelta = (
    (nextPoint?.supply ?? 0) - (nextPoint?.demand ?? 0)
  ).toFixed(1);
  const sixthDelta = (
    (sixthPoint?.supply ?? 0) - (sixthPoint?.demand ?? 0)
  ).toFixed(1);

  const isNextSurplus = parseFloat(nextDelta) > 0;
  const isSixthSurplus = parseFloat(sixthDelta) > 0;
  const isDaySurplus = parseFloat(dayDelta) > 0;

  const peakDemand = forecast.data?.summary?.peak_demand_mw ?? 0;
  const avgDemand = forecast.data?.summary?.avg_demand_mw ?? 0;
  const minDemand = forecast.data?.summary?.min_demand_mw ?? 0;
  const city = forecast.data?.city ?? "Grid";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={styles.container}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshControl={
          <RefreshControl
            refreshing={forecast.loading}
            onRefresh={() => forecast.refresh()}
            tintColor={COLORS.neon}
            colors={[COLORS.neon]}
            progressBackgroundColor={COLORS.panel}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTitle}>Forecast Control</Text>
            <Text style={styles.heroSubtitle}>{city} 24h Timeline</Text>
          </View>
          <MaterialCommunityIcons
            name="chart-line"
            size={30}
            color={COLORS.cyan}
          />
        </View>

        {forecast.loading && (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={COLORS.neon} />
            <Text style={styles.loadingText}>Analyzing demand curves...</Text>
          </View>
        )}

        {!!forecast.error && (
          <View style={[styles.statusAlert, { borderColor: COLORS.red }]}>
            <Text style={[styles.alertText, { color: COLORS.red }]}>
              Forecast error
            </Text>
            <Text style={styles.alertDetail}>{forecast.error}</Text>
          </View>
        )}

        {!forecast.loading && !forecast.error && (
          <>
            <View style={styles.longGrid}>
              <MonitorCard
                label="24h Delta"
                value={`${dayDelta} MW`}
                change={isDaySurplus ? "Surplus" : "Deficit"}
                icon="flash"
                accent={isDaySurplus ? COLORS.neon : COLORS.orange}
              />
              <MonitorCard
                label="Peak Demand"
                value={`${peakDemand.toFixed(1)} MW`}
                change="max"
                icon="arrow-up-bold"
                accent={COLORS.red}
              />
            </View>

            <View style={styles.longGrid}>
              <MonitorCard
                label="Avg Demand"
                value={`${avgDemand.toFixed(1)} MW`}
                change="trend"
                icon="chart-areaspline"
                accent={COLORS.cyan}
              />
              <MonitorCard
                label="Min Demand"
                value={`${minDemand.toFixed(1)} MW`}
                change="floor"
                icon="arrow-down-bold"
                accent={COLORS.neon}
              />
            </View>

            <View style={styles.timeSlice}>
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>Next 1h</Text>
                <Text
                  style={[
                    styles.timeDelta,
                    { color: isNextSurplus ? COLORS.neon : COLORS.orange },
                  ]}
                >{`${nextDelta} MW`}</Text>
                <Text style={styles.timeState}>
                  {isNextSurplus ? "Surplus window" : "Deficit window"}
                </Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>+6h</Text>
                <Text
                  style={[
                    styles.timeDelta,
                    { color: isSixthSurplus ? COLORS.neon : COLORS.orange },
                  ]}
                >{`${sixthDelta} MW`}</Text>
                <Text style={styles.timeState}>
                  {isSixthSurplus ? "Surplus" : "Deficit"}
                </Text>
              </View>
            </View>

            <View style={styles.explainPanel}>
              <Text style={styles.sectionTitle}>Action Threshold</Text>
              <Text style={styles.sectionBody}>
                Adjust dispatch when deficit exceeds 10% for 3+ hours; maintain
                reserve targets in peak windows.
              </Text>
            </View>
          </>
        )}
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
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroTextGroup: {
    flex: 1,
  },
  heroTitle: {
    color: COLORS.neon,
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: COLORS.grey,
    marginTop: 2,
    fontSize: 12,
    textTransform: "uppercase",
  },
  loadingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
  },
  loadingText: {
    color: COLORS.grey,
    marginTop: 8,
    fontSize: 12,
  },
  statusAlert: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#2f1a1c",
    padding: 12,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 14,
    fontWeight: "800",
  },
  alertDetail: {
    color: COLORS.grey,
    marginTop: 4,
    fontSize: 12,
  },
  longGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  monitorCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.neon,
    padding: 10,
  },
  monitorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  monitorLabel: {
    color: COLORS.grey,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  monitorBody: {
    alignItems: "flex-start",
  },
  monitorValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  monitorChange: {
    color: COLORS.grey,
    fontSize: 11,
    marginTop: 4,
  },
  timeSlice: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  timeCard: {
    width: "48%",
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    padding: 12,
  },
  timeLabel: {
    color: COLORS.grey,
    fontSize: 11,
    textTransform: "uppercase",
  },
  timeDelta: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  timeState: {
    color: COLORS.grey,
    marginTop: 4,
    fontSize: 10,
  },
  explainPanel: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  sectionTitle: {
    color: COLORS.neon,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionBody: {
    color: COLORS.grey,
    fontSize: 12,
    lineHeight: 16,
  },
});
