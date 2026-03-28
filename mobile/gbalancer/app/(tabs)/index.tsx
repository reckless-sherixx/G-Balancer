import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// ===== COLOR THEME =====
const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  lightGrey: "#3A3A3A",
  green: "#00FF41",
  cyan: "#00F0FF",
  white: "#FFFFFF",
  red: "#FF4444",
  yellow: "#FFD700",
};

// ===== DATA TYPES =====
interface GridStatus {
  battery_level_pct: number;
  status: string;
  supply_mw: number;
  demand_mw: number;
  solar_mw: number;
  wind_mw: number;
  renewable_percentage: number;
}

// ===== COMPONENTS =====

interface StatBoxProps {
  icon: string;
  label: string;
  value: string | number;
  unit: string;
  color?: string;
}

const StatBox: React.FC<StatBoxProps> = ({
  icon,
  label,
  value,
  unit,
  color = COLORS.white,
}) => (
  <LinearGradient
    colors={[COLORS.darkGrey, COLORS.grey]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.statBox}
  >
    <View style={styles.statHeader}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  </LinearGradient>
);

interface EnergyBarProps {
  label: string;
  percentage: number;
  color: string;
}

const EnergyBar: React.FC<EnergyBarProps> = ({ label, percentage, color }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percentage,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const width = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.energyBarContainer}>
      <View style={styles.energyBarHeader}>
        <Text style={styles.energyBarLabel}>{label}</Text>
        <Text style={[styles.energyBarValue, { color }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
      <LinearGradient
        colors={[COLORS.darkGrey, COLORS.grey]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.energyBarBg}
      >
        <Animated.View
          style={[styles.energyBarFill, { width, backgroundColor: color }]}
        >
          <LinearGradient
            colors={[color, color + "BB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: "100%", height: "100%" }}
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

// ===== MAIN COMPONENT =====

export default function HomeScreen() {
  const [gridData, setGridData] = useState<GridStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--");
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for status indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const fetchGridStatus = async () => {
    try {
      console.log("📡 Fetching grid status...");
      const response = await fetch("http://10.21.39.161:8000/simulate");
      const data = await response.json();

      const transformedData: GridStatus = {
        battery_level_pct: data.battery_percentage || 50,
        status: "HEALTHY",
        supply_mw: data.total_supply || 0,
        demand_mw: data.demand || 0,
        solar_mw: data.solar || 0,
        wind_mw: data.wind || 0,
        renewable_percentage: Math.round(
          (((data.solar || 0) + (data.wind || 0)) / (data.total_supply || 1)) *
            100,
        ),
      };

      setGridData(transformedData);
      setLastUpdate(new Date().toLocaleTimeString());
      console.log("✅ Grid data updated");
    } catch (error) {
      console.error("❌ Error fetching grid:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGridStatus();
    const interval = setInterval(fetchGridStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGridStatus();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loaderText}>Initializing...</Text>
        </View>
      </View>
    );
  }

  if (!gridData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color={COLORS.red}
          />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>Unable to fetch grid data</Text>
        </View>
      </View>
    );
  }

  const balanceStatus = gridData.supply_mw >= gridData.demand_mw;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.green}
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.darkGrey, COLORS.black]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>G-Balancer</Text>
            <Text style={styles.headerSubtitle}>Energy Grid Control</Text>
          </View>
          <Animated.View
            style={[
              styles.statusBadge,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: COLORS.green }]}
            />
            <Text style={[styles.statusText, { color: COLORS.green }]}>
              ONLINE
            </Text>
          </Animated.View>
        </View>
        <Text style={styles.updateText}>Updated: {lastUpdate}</Text>
      </LinearGradient>

      {/* Battery Status Card */}
      <View style={styles.section}>
        <LinearGradient
          colors={[COLORS.darkGrey, COLORS.grey]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.batteryCard}
        >
          <View style={styles.batteryHeader}>
            <View>
              <Text style={styles.batteryTitle}>Battery Storage</Text>
              <Text style={styles.batterySubtitle}>Current capacity level</Text>
            </View>
            <MaterialCommunityIcons
              name="battery-charging"
              size={32}
              color={COLORS.cyan}
            />
          </View>

          <View style={styles.batteryGaugeWrapper}>
            <View style={styles.batteryGauge}>
              <Text style={[styles.batteryPercent, { color: COLORS.green }]}>
                {gridData.battery_level_pct.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.batteryInfoCol}>
              <View style={styles.batteryInfoBox}>
                <Text style={styles.batteryInfoLabel}>Capacity</Text>
                <Text style={styles.batteryInfoVal}>100 MWh</Text>
              </View>
              <View style={styles.batteryInfoBox}>
                <Text style={styles.batteryInfoLabel}>Status</Text>
                <Text style={[styles.batteryInfoVal, { color: COLORS.green }]}>
                  Active
                </Text>
              </View>
            </View>
          </View>

          <EnergyBar
            label="Storage Level"
            percentage={gridData.battery_level_pct}
            color={COLORS.green}
          />
        </LinearGradient>
      </View>

      {/* Supply & Demand Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Energy Balance</Text>
        <View style={styles.gridRow}>
          <StatBox
            icon="power-socket"
            label="Supply"
            value={gridData.supply_mw.toFixed(1)}
            unit="MW"
            color={COLORS.cyan}
          />
          <StatBox
            icon="lightning-bolt-outline"
            label="Demand"
            value={gridData.demand_mw.toFixed(1)}
            unit="MW"
            color={COLORS.yellow}
          />
        </View>

        {/* Balance Status */}
        <LinearGradient
          colors={
            balanceStatus
              ? [COLORS.green + "20", COLORS.green + "10"]
              : [COLORS.red + "20", COLORS.red + "10"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.balanceCard,
            { borderColor: balanceStatus ? COLORS.green : COLORS.red },
          ]}
        >
          <View style={styles.balanceContent}>
            <MaterialCommunityIcons
              name={balanceStatus ? "check-circle" : "alert-circle"}
              size={24}
              color={balanceStatus ? COLORS.green : COLORS.red}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  styles.balanceTitle,
                  { color: balanceStatus ? COLORS.green : COLORS.red },
                ]}
              >
                {balanceStatus ? "Grid Surplus" : "Grid Deficit"}
              </Text>
              <Text style={styles.balanceValue}>
                {Math.abs(gridData.supply_mw - gridData.demand_mw).toFixed(1)}{" "}
                MW
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Renewable Energy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Renewable Generation</Text>
        <View style={styles.renewableRow}>
          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.renewableBox}
          >
            <MaterialCommunityIcons
              name="white-balance-sunny"
              size={28}
              color={COLORS.yellow}
            />
            <Text style={styles.renewableValue}>
              {gridData.solar_mw.toFixed(1)}
            </Text>
            <Text style={styles.renewableLabel}>Solar MW</Text>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.renewableBox}
          >
            <MaterialCommunityIcons
              name="weather-windy"
              size={28}
              color={COLORS.cyan}
            />
            <Text style={styles.renewableValue}>
              {gridData.wind_mw.toFixed(1)}
            </Text>
            <Text style={styles.renewableLabel}>Wind MW</Text>
          </LinearGradient>
        </View>

        {/* Green Energy Percentage */}
        <LinearGradient
          colors={[COLORS.darkGrey, COLORS.grey]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.greenEnergyCard}
        >
          <View style={styles.greenEnergyHeader}>
            <View>
              <Text style={styles.greenEnergyLabel}>Clean Energy Ratio</Text>
              <Text style={[styles.greenEnergyValue, { color: COLORS.green }]}>
                {gridData.renewable_percentage}%
              </Text>
            </View>
            <Text style={styles.greenEnergyEmoji}>🌱</Text>
          </View>
          <EnergyBar
            label="Renewable Mix"
            percentage={gridData.renewable_percentage}
            color={COLORS.green}
          />
        </LinearGradient>
      </View>

      {/* System Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Metrics</Text>
        <View style={styles.metricsGrid}>
          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Grid Frequency</Text>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>
              50.0 Hz
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Voltage</Text>
            <Text style={[styles.metricValue, { color: COLORS.cyan }]}>
              230V
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Efficiency</Text>
            <Text style={[styles.metricValue, { color: COLORS.yellow }]}>
              94.5%
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.grey]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Active Nodes</Text>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>
              1,248
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>G-Balancer Energy Management</Text>
        <Text style={styles.footerVersion}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
  },
  loaderText: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  errorMessage: {
    color: COLORS.lightGrey,
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 28,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: COLORS.lightGrey,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.green + "15",
    borderWidth: 1,
    borderColor: COLORS.green + "40",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  updateText: {
    color: COLORS.lightGrey,
    fontSize: 11,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  section: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statUnit: {
    color: COLORS.lightGrey,
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "600",
  },
  batteryCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  batteryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  batteryTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  batterySubtitle: {
    color: COLORS.lightGrey,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  batteryGaugeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  batteryGauge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.black + "40",
    borderWidth: 2,
    borderColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
  },
  batteryPercent: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  batteryInfoCol: {
    flex: 1,
    gap: 10,
  },
  batteryInfoBox: {
    backgroundColor: COLORS.black + "30",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  batteryInfoLabel: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  batteryInfoVal: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  energyBarContainer: {
    marginTop: 6,
    gap: 6,
  },
  energyBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  energyBarLabel: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  energyBarValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  energyBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  energyBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  balanceValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  renewableRow: {
    flexDirection: "row",
    gap: 10,
  },
  renewableBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.grey,
    alignItems: "center",
    gap: 8,
  },
  renewableValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  renewableLabel: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  greenEnergyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.grey,
    marginTop: 8,
  },
  greenEnergyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  greenEnergyLabel: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  greenEnergyValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  greenEnergyEmoji: {
    fontSize: 28,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
  },
  metricLabel: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGrey,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: COLORS.lightGrey,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footerVersion: {
    color: COLORS.grey,
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
