import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ForecastBars } from "@/components/grid/forecast-bars";
import { ThemedText } from "@/components/themed-text";
import { useAdminSettings } from "@/features/admin/settings-context";
import { useForecastData } from "@/features/grid/hooks";

const { width } = Dimensions.get("window");

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

interface ForecastCardProps {
  title: string;
  value: string;
  unit: string;
  icon: string;
  hint: string;
  color: string;
  delay: number;
}

const ForecastCard: React.FC<ForecastCardProps> = ({
  title,
  value,
  unit,
  icon,
  hint,
  color,
  delay,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(delay, [
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.forecastCard,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[COLORS.darkGrey, COLORS.grey]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.forecastCardInner}
      >
        <View style={styles.forecastCardHeader}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          <ThemedText style={styles.forecastCardTitle}>{title}</ThemedText>
        </View>

        <View style={styles.forecastCardContent}>
          <ThemedText style={[styles.forecastCardValue, { color }]}>
            {value}
          </ThemedText>
          <ThemedText style={styles.forecastCardUnit}>{unit}</ThemedText>
        </View>

        <ThemedText style={styles.forecastCardHint}>{hint}</ThemedText>
      </LinearGradient>
    </Animated.View>
  );
};

export default function ForecastScreen() {
  const { settings } = useAdminSettings();
  const forecast = useForecastData({
    city: settings.city,
    hours: settings.forecastHours,
  });
  const scrollAnim = useRef(new Animated.Value(0)).current;

  // Safe point access with fallback
  const nextPoint = forecast.data?.points[0];
  const sixthPoint = forecast.data?.points[5];

  // Calculate day-level balance as aggregate of all 24 hours (or available hours)
  // This prevents deflection caused by using single unstable points
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

  // Extract summary data with proper typing
  const peakDemand = forecast.data?.summary?.peak_demand_mw ?? 0;
  const minDemand = forecast.data?.summary?.min_demand_mw ?? 0;
  const avgDemand = forecast.data?.summary?.avg_demand_mw ?? 0;
  const city = forecast.data?.city ?? "Grid";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollAnim } } }],
        {
          useNativeDriver: false,
        },
      )}
      refreshControl={
        <RefreshControl
          refreshing={forecast.loading}
          onRefresh={() => forecast.refresh()}
          tintColor={COLORS.green}
          colors={[COLORS.green]}
          progressBackgroundColor={COLORS.darkGrey}
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
            <ThemedText style={styles.headerTitle}>Energy Forecast</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              24-hour prediction
            </ThemedText>
            {city !== "Grid" && (
              <ThemedText style={styles.headerCity}>{city}</ThemedText>
            )}
          </View>
          <MaterialCommunityIcons
            name="chart-line"
            size={32}
            color={COLORS.cyan}
          />
        </View>
      </LinearGradient>

      {forecast.loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <ThemedText style={styles.loaderText}>
            Computing forecast...
          </ThemedText>
        </View>
      )}

      {!!forecast.error && (
        <LinearGradient
          colors={[COLORS.red + "20", COLORS.red + "10"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.errorCard, { borderColor: COLORS.red }]}
        >
          <View style={styles.errorHeader}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={20}
              color={COLORS.red}
            />
            <ThemedText style={[styles.errorTitle, { color: COLORS.red }]}>
              Forecast Error
            </ThemedText>
          </View>
          <ThemedText style={styles.errorMessage}>{forecast.error}</ThemedText>
        </LinearGradient>
      )}

      {!forecast.loading && !forecast.error && (
        <>
          {/* Quick Metrics */}
          <View style={styles.metricsSection}>
            <ForecastCard
              title="Next Hour"
              value={nextDelta}
              unit="MW"
              icon={isNextSurplus ? "flash" : "alert"}
              hint={isNextSurplus ? "Surplus expected" : "Deficit expected"}
              color={isNextSurplus ? COLORS.green : COLORS.yellow}
              delay={0}
            />
            <ForecastCard
              title="6 Hours"
              value={sixthDelta}
              unit="MW"
              icon={
                isSixthSurplus ? "lightning-bolt" : "lightning-bolt-outline"
              }
              hint={isSixthSurplus ? "Strong surplus" : "Potential deficit"}
              color={isSixthSurplus ? COLORS.green : COLORS.yellow}
              delay={100}
            />
            <ForecastCard
              title="24 Hours"
              value={dayDelta}
              unit="MW"
              icon={isDaySurplus ? "check-circle" : "close-circle"}
              hint={isDaySurplus ? "Day-level surplus" : "Day-level deficit"}
              color={isDaySurplus ? COLORS.green : COLORS.red}
              delay={200}
            />
          </View>

          {/* Demand Summary */}
          <View style={styles.summarySection}>
            <LinearGradient
              colors={[COLORS.darkGrey, COLORS.grey]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryHeader}>
                <ThemedText style={styles.summaryTitle}>
                  Demand Summary
                </ThemedText>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={20}
                  color={COLORS.cyan}
                />
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>
                    Peak Demand
                  </ThemedText>
                  <ThemedText
                    style={[styles.summaryValue, { color: COLORS.red }]}
                  >
                    {peakDemand.toFixed(0)}
                  </ThemedText>
                  <ThemedText style={styles.summaryUnit}>MW</ThemedText>
                </View>

                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>
                    Min Demand
                  </ThemedText>
                  <ThemedText
                    style={[styles.summaryValue, { color: COLORS.green }]}
                  >
                    {minDemand.toFixed(0)}
                  </ThemedText>
                  <ThemedText style={styles.summaryUnit}>MW</ThemedText>
                </View>

                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryLabel}>
                    Avg Demand
                  </ThemedText>
                  <ThemedText
                    style={[styles.summaryValue, { color: COLORS.yellow }]}
                  >
                    {avgDemand.toFixed(0)}
                  </ThemedText>
                  <ThemedText style={styles.summaryUnit}>MW</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
          <View style={styles.chartSection}>
            <LinearGradient
              colors={[COLORS.darkGrey, COLORS.grey]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chartCard}
            >
              <View style={styles.chartHeader}>
                <ThemedText style={styles.chartTitle}>
                  Supply vs Demand
                </ThemedText>
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={20}
                  color={COLORS.cyan}
                />
              </View>
              <ForecastBars points={forecast.data?.points ?? []} />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: COLORS.green },
                    ]}
                  />
                  <ThemedText style={styles.legendLabel}>Supply</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: COLORS.red }]}
                  />
                  <ThemedText style={styles.legendLabel}>Demand</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Detailed Points */}
          <View style={styles.detailsSection}>
            <LinearGradient
              colors={[COLORS.darkGrey, COLORS.grey]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailsCard}
            >
              <View style={styles.detailsHeader}>
                <ThemedText style={styles.detailsTitle}>
                  Upcoming Points
                </ThemedText>
                <MaterialCommunityIcons
                  name="list-box-outline"
                  size={20}
                  color={COLORS.cyan}
                />
              </View>

              {(forecast.data?.points ?? [])
                .slice(0, 12)
                .map((point, index) => {
                  const time = new Date(point.timestamp).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );
                  const delta = (point.supply - point.demand).toFixed(1);
                  const isSurplus = parseFloat(delta) > 0;

                  return (
                    <View key={point.timestamp} style={styles.pointRow}>
                      <View style={styles.pointTime}>
                        <ThemedText style={styles.pointTimeText}>
                          {time}
                        </ThemedText>
                      </View>

                      <View style={styles.pointBars}>
                        <View style={styles.pointBar}>
                          <View
                            style={[
                              styles.pointBarFill,
                              {
                                width: `${Math.min(
                                  (point.supply / 500) * 100,
                                  100,
                                )}%`,
                                backgroundColor: COLORS.green,
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.pointValue}>
                          {point.supply.toFixed(0)} MW
                        </ThemedText>
                      </View>

                      <View style={styles.pointBars}>
                        <View style={styles.pointBar}>
                          <View
                            style={[
                              styles.pointBarFill,
                              {
                                width: `${Math.min(
                                  (point.demand / 500) * 100,
                                  100,
                                )}%`,
                                backgroundColor: COLORS.red,
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.pointValue}>
                          {point.demand.toFixed(0)} MW
                        </ThemedText>
                      </View>

                      <View
                      // style={[
                      //   styles.deltaBox,
                      //   {
                      //     backgroundColor: isSurplus
                      //       ? COLORS.green + "20"
                      //       : COLORS.red + "20",
                      //     borderColor: isSurplus ? COLORS.green : COLORS.red,
                      //   },
                      // ]}
                      >
                        <ThemedText
                          style={[
                            styles.deltaValue,
                            {
                              color: isSurplus ? COLORS.green : COLORS.red,
                            },
                          ]}
                        >
                          {isSurplus ? "+" : ""}
                          {delta}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
            </LinearGradient>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 28,
    backgroundColor: COLORS.black,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 28,
    gap: 8,
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
  headerCity: {
    color: COLORS.cyan,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loaderText: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  errorMessage: {
    color: COLORS.lightGrey,
    fontSize: 12,
  },
  metricsSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  forecastCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  forecastCardInner: {
    borderWidth: 1,
    borderColor: COLORS.grey,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  forecastCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  forecastCardTitle: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  forecastCardContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  forecastCardValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  forecastCardUnit: {
    color: COLORS.lightGrey,
    fontSize: 12,
    fontWeight: "600",
  },
  forecastCardHint: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  chartSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
    padding: 14,
    gap: 12,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
  },
  detailsSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
    padding: 14,
    gap: 10,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailsTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.grey,
    gap: 10,
  },
  pointTime: {
    width: 50,
  },
  pointTimeText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pointBars: {
    flex: 1,
    gap: 4,
  },
  pointBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.darkGrey,
    overflow: "hidden",
  },
  pointBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  pointValue: {
    color: COLORS.lightGrey,
    fontSize: 9,
    fontWeight: "600",
  },
  deltaBox: {
    width: 60,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  deltaValue: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summarySection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
    padding: 14,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grey,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  summaryUnit: {
    color: COLORS.lightGrey,
    fontSize: 9,
    fontWeight: "600",
  },
});
