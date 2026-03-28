import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useGridStatusData, useForecastData } from "@/features/grid/hooks";

const INPUT_COLORS = {
  background: "#080808",
  panel: "#0e0e0e",
  panelBorder: "#232323",
  text: "#FFFFFF",
  grey: "#7a7a7a",
  neon: "#00ff87",
  cyan: "#00f0ff",
  amber: "#ffd700",
  critical: "#ff4444",
};

const MetricLabel = ({ label, value, unit, icon, color }: { label: string; value: string | number; unit?: string; icon: string; color: string }) => (
  <View style={[styles.metricItem, { borderColor: color }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}25` }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
    </View>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export default function HomeScreen() {
  const gridStatus = useGridStatusData();
  const forecast = useForecastData();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  if (gridStatus.loading && !gridStatus.data) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator size="large" color={INPUT_COLORS.neon} />
        <Text style={styles.helperText}>Initializing grid comms...</Text>
      </View>
    );
  }

  if (gridStatus.error && !gridStatus.data) {
    return (
      <View style={styles.fullScreenCenter}>
        <MaterialCommunityIcons name="alert-circle" size={56} color={INPUT_COLORS.critical} />
        <Text style={styles.errorTitle}>Data link failure</Text>
        <Text style={styles.errorText}>{gridStatus.error}</Text>
      </View>
    );
  }

  const gridData = gridStatus.data;
  if (!gridData) {
    return (
      <View style={styles.fullScreenCenter}>
        <MaterialCommunityIcons name="database-off" size={52} color={INPUT_COLORS.amber} />
        <Text style={styles.errorTitle}>No grid feed</Text>
        <Text style={styles.errorText}>Live telemetry unavailable</Text>
      </View>
    );
  }

  const isHealthy = gridData.currentSupply >= gridData.currentDemand;
  const balanceDelta = Math.abs(gridData.currentSupply - gridData.currentDemand).toFixed(1);
  const renewablePercent = gridData.currentSupply > 0 ? ((gridData.solarGenerationMw + gridData.windGenerationMw) / gridData.currentSupply) * 100 : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={gridStatus.loading} onRefresh={() => gridStatus.refresh()} tintColor={INPUT_COLORS.neon} />
      }
    >
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>G-Balancer Control Matrix</Text>
        <Text style={styles.heroSubtitle}>Command Center · Live operations</Text>
      </View>

      <View style={styles.alertRow}>
        <Animated.View
          style={[
            styles.pulseDot,
            {
              backgroundColor: isHealthy ? INPUT_COLORS.neon : INPUT_COLORS.critical,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
            },
          ]}
        />
        <View>
          <Text style={[styles.statusTitle, { color: isHealthy ? INPUT_COLORS.neon : INPUT_COLORS.critical }]}>
            {isHealthy ? "GRID SURPLUS" : "GRID DEFICIT"}
          </Text>
          <Text style={styles.statusMessage}>Diff {balanceDelta} MW</Text>
        </View>
      </View>

      <View style={styles.overviewGrid}>
        <MetricLabel icon="power-plug" label="Supply" value={gridData.currentSupply.toFixed(1)} unit="MW" color={INPUT_COLORS.cyan} />
        <MetricLabel icon="flash" label="Demand" value={gridData.currentDemand.toFixed(1)} unit="MW" color={INPUT_COLORS.amber} />
        <MetricLabel icon="battery" label="Battery" value={`${gridData.batteryLevelPct.toFixed(1)}%`} color={INPUT_COLORS.neon} />
        <MetricLabel icon="leaf" label="Renewable" value={`${renewablePercent.toFixed(1)}%`} color={INPUT_COLORS.neon} />
      </View>

      <View style={styles.sectionPanel}>
        <Text style={styles.sectionTitle}>Performance Blueprint</Text>
        <View style={styles.rotateLayout}>
          <View style={styles.smallPanel}>
            <Text style={styles.panelLabel}>Solar Output</Text>
            <Text style={styles.panelValue}>{gridData.solarGenerationMw.toFixed(1)} MW</Text>
          </View>
          <View style={styles.smallPanel}>
            <Text style={styles.panelLabel}>Wind Output</Text>
            <Text style={styles.panelValue}>{gridData.windGenerationMw.toFixed(1)} MW</Text>
          </View>
        </View>
        <View style={styles.impactRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactHint}>Estimated Surplus</Text>
            <Text style={styles.impactValue}>{((gridData.currentSupply - gridData.currentDemand) * 1000).toFixed(0)} kWh</Text>
          </View>
          <View style={[styles.impactStatus, { borderColor: isHealthy ? INPUT_COLORS.neon : INPUT_COLORS.critical }]}> 
            <Text style={[styles.impactCondition, { color: isHealthy ? INPUT_COLORS.neon : INPUT_COLORS.critical }]}>
              {isHealthy ? "STABLE" : "CRITICAL"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.panelLegacy}>
        <Text style={styles.sectionTitle}>Forecast Snapshot</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Peak demand</Text>
          <Text style={styles.previewValue}>{(forecast.data?.summary?.peak_demand_mw ?? 0).toFixed(1)} MW</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Avg demand</Text>
          <Text style={styles.previewValue}>{(forecast.data?.summary?.avg_demand_mw ?? 0).toFixed(1)} MW</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Deficit hours</Text>
          <Text style={styles.previewValue}>{forecast.data?.summary?.hours_with_deficit ?? 0}h</Text>
        </View>
      </View>

      <View style={styles.footer}> 
        <Text style={styles.footerText}>Interface: G-Balancer Mobile Command</Text>
        <Text style={styles.footerHint}>Updated: {new Date(gridData.updatedAt).toLocaleTimeString()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INPUT_COLORS.background,
    paddingTop: 10,
  },
  fullScreenCenter: {
    flex: 1,
    backgroundColor: INPUT_COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  helperText: {
    color: INPUT_COLORS.grey,
    marginTop: 10,
  },
  errorTitle: {
    color: INPUT_COLORS.critical,
    fontWeight: "800",
    fontSize: 22,
    marginTop: 8,
  },
  errorText: {
    color: INPUT_COLORS.grey,
    marginTop: 6,
    textAlign: "center",
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroTitle: {
    color: INPUT_COLORS.neon,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroSubtitle: {
    color: "#8A8A8A",
    fontSize: 13,
    marginTop: 4,
    textTransform: "uppercase",
  },
  alertRow: {
    backgroundColor: "#0f1418",
    borderLeftWidth: 4,
    borderLeftColor: INPUT_COLORS.neon,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTitle: {
    color: INPUT_COLORS.neon,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusMessage: {
    color: INPUT_COLORS.grey,
    fontSize: 11,
    marginTop: 2,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    gap: 10,
  },
  metricItem: {
    width: "47%",
    marginVertical: 6,
    backgroundColor: INPUT_COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: INPUT_COLORS.panelBorder,
    padding: 12,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  metricUnit: {
    color: INPUT_COLORS.grey,
    fontSize: 11,
    marginTop: 2,
  },
  metricLabel: {
    color: INPUT_COLORS.grey,
    fontSize: 11,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionPanel: {
    backgroundColor: INPUT_COLORS.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INPUT_COLORS.panelBorder,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: INPUT_COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rotateLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  smallPanel: {
    flex: 1,
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#272727",
    padding: 10,
  },
  panelLabel: {
    color: INPUT_COLORS.grey,
    fontSize: 10,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  panelValue: {
    color: INPUT_COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  impactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  impactStat: {
    flex: 1,
  },
  impactHint: {
    color: INPUT_COLORS.grey,
    fontSize: 10,
    textTransform: "uppercase",
  },
  impactValue: {
    color: INPUT_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  impactStatus: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  impactCondition: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  panelLegacy: {
    marginHorizontal: 16,
    marginBottom: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INPUT_COLORS.panelBorder,
    padding: 14,
    backgroundColor: INPUT_COLORS.panel,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewLabel: {
    color: INPUT_COLORS.grey,
    fontSize: 12,
  },
  previewValue: {
    color: INPUT_COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    padding: 14,
    alignItems: "center",
    marginBottom: 30,
  },
  footerText: {
    color: INPUT_COLORS.grey,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  footerHint: {
    color: INPUT_COLORS.grey,
    fontSize: 10,
  },
});
