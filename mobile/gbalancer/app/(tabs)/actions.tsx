import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { usePredictionData } from "@/features/grid/hooks";

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

const ACTION_COLORS: Record<
  string,
  { bgStart: string; bgEnd: string; text: string; icon: string }
> = {
  STORE: {
    bgStart: COLORS.cyan + "30",
    bgEnd: COLORS.cyan + "14",
    text: COLORS.cyan,
    icon: "battery-plus",
  },
  RELEASE: {
    bgStart: COLORS.red + "30",
    bgEnd: COLORS.red + "14",
    text: COLORS.red,
    icon: "flash",
  },
  REDISTRIBUTE: {
    bgStart: COLORS.yellow + "30",
    bgEnd: COLORS.yellow + "14",
    text: COLORS.yellow,
    icon: "shuffle",
  },
  STABLE: {
    bgStart: COLORS.green + "30",
    bgEnd: COLORS.green + "14",
    text: COLORS.green,
    icon: "check-circle",
  },
};

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: string;
  unit: string;
  error?: string | null;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  unit,
  error,
}) => {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.grey, COLORS.green],
  });

  return (
    <View style={styles.inputField}>
      <View style={styles.inputHeader}>
        <View style={styles.inputLabel}>
          <MaterialCommunityIcons
            name={icon as any}
            size={16}
            color={COLORS.cyan}
          />
          <ThemedText style={styles.inputLabelText}>{label}</ThemedText>
        </View>
        <ThemedText style={styles.inputUnit}>{unit}</ThemedText>
      </View>

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? COLORS.red : (borderColor as any),
          },
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={COLORS.lightGrey}
        />
      </Animated.View>

      {!!error && (
        <ThemedText style={styles.inputErrorText}>{error}</ThemedText>
      )}
    </View>
  );
};

interface ActionCardProps {
  action: string;
  confidence: number;
  urgency: number;
  surplus: number;
  reason: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  confidence,
  urgency,
  surplus,
  reason,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
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
  }, [action, opacityAnim, scaleAnim]);

  const colors = ACTION_COLORS[action] || ACTION_COLORS.STABLE;

  return (
    <Animated.View
      style={[
        styles.actionCardWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.bgStart, colors.bgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.actionCard, { borderColor: colors.text }]}
      >
        <View style={styles.actionBadge}>
          <MaterialCommunityIcons
            name={colors.icon as any}
            size={28}
            color={colors.text}
          />
          <ThemedText style={[styles.actionText, { color: colors.text }]}>
            {action}
          </ThemedText>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Confidence</ThemedText>
            <View style={styles.metricBarBg}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${confidence * 100}%`,
                    backgroundColor: COLORS.green,
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.metricValue}>
              {Math.round(confidence * 100)}%
            </ThemedText>
          </View>

          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Urgency</ThemedText>
            <View style={styles.metricBarBg}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${urgency * 100}%`,
                    backgroundColor:
                      urgency > 0.7
                        ? COLORS.red
                        : urgency > 0.4
                          ? COLORS.yellow
                          : COLORS.green,
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.metricValue}>
              {Math.round(urgency * 100)}%
            </ThemedText>
          </View>

          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Surplus (kWh)</ThemedText>
            <View
              style={[
                styles.surplusBox,
                {
                  backgroundColor:
                    surplus > 0 ? COLORS.green + "20" : COLORS.red + "20",
                  borderColor: surplus > 0 ? COLORS.green : COLORS.red,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.surplusValue,
                  {
                    color: surplus > 0 ? COLORS.green : COLORS.red,
                  },
                ]}
              >
                {surplus > 0 ? "+" : ""}
                {surplus.toFixed(1)}
              </ThemedText>
            </View>
          </View>
        </View>

        {reason && (
          <LinearGradient
            colors={[COLORS.black + "40", COLORS.black + "20"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reasonCard}
          >
            <View style={styles.reasonHeader}>
              <MaterialCommunityIcons
                name="lightbulb"
                size={16}
                color={COLORS.cyan}
              />
              <ThemedText style={styles.reasonTitle}>Rationale</ThemedText>
            </View>
            <ThemedText style={styles.reasonText}>{reason}</ThemedText>
          </LinearGradient>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

export default function ActionsScreen() {
  const [surplusInput, setSurplusInput] = useState("12.0");
  const [batteryInput, setBatteryInput] = useState("62");
  const [stressInput, setStressInput] = useState("0.36");
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

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

  const fieldErrors = useMemo(() => {
    const parse = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number.parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const surplus = parse(surplusInput);
    const battery = parse(batteryInput);
    const stress = parse(stressInput);

    return {
      surplus:
        surplusInput.trim().length === 0
          ? "Required"
          : surplus === null
            ? "Enter a valid number"
            : surplus < -100 || surplus > 100
              ? "Use range -100 to 100"
              : null,
      battery:
        batteryInput.trim().length === 0
          ? "Required"
          : battery === null
            ? "Enter a valid number"
            : battery < 0 || battery > 100
              ? "Use range 0 to 100"
              : null,
      stress:
        stressInput.trim().length === 0
          ? "Required"
          : stress === null
            ? "Enter a valid number"
            : stress < 0 || stress > 1
              ? "Use range 0 to 1"
              : null,
    };
  }, [batteryInput, stressInput, surplusInput]);

  const hasValidationErrors =
    !!fieldErrors.surplus || !!fieldErrors.battery || !!fieldErrors.stress;

  const runPrediction = async () => {
    if (hasValidationErrors) {
      return;
    }

    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    await prediction.predict(parsedPayload);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
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
            <ThemedText style={styles.headerTitle}>
              Action Recommender
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Grid optimization
            </ThemedText>
          </View>
          <MaterialCommunityIcons
            name="lightbulb-on"
            size={32}
            color={COLORS.cyan}
          />
        </View>
      </LinearGradient>

      {/* Input Section */}
      <LinearGradient
        colors={[COLORS.darkGrey, COLORS.grey]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.formCard}
      >
        <View style={styles.formHeader}>
          <MaterialCommunityIcons name="tune" size={20} color={COLORS.cyan} />
          <ThemedText style={styles.formTitle}>Input Parameters</ThemedText>
        </View>

        <View style={styles.inputsContainer}>
          <InputField
            label="Forecasted Surplus"
            value={surplusInput}
            onChangeText={setSurplusInput}
            placeholder="e.g. 10.5"
            icon="flash"
            unit="MW"
            error={fieldErrors.surplus}
          />

          <InputField
            label="Battery Level"
            value={batteryInput}
            onChangeText={setBatteryInput}
            placeholder="e.g. 65"
            icon="battery"
            unit="%"
            error={fieldErrors.battery}
          />

          <InputField
            label="Grid Stress"
            value={stressInput}
            onChangeText={setStressInput}
            placeholder="e.g. 0.4"
            icon="gauge"
            unit="0-1"
            error={fieldErrors.stress}
          />
        </View>

        <Animated.View
          style={[
            styles.runButtonContainer,
            { transform: [{ scale: buttonScaleAnim }] },
          ]}
        >
          <Pressable
            onPress={runPrediction}
            disabled={prediction.loading || hasValidationErrors}
            style={styles.runButton}
          >
            <LinearGradient
              colors={
                hasValidationErrors
                  ? [COLORS.grey, COLORS.lightGrey]
                  : [COLORS.green, COLORS.green + "CC"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.runButtonGradient}
            >
              <MaterialCommunityIcons
                name={prediction.loading ? "loading" : "play"}
                size={20}
                color={COLORS.black}
              />
              <ThemedText style={styles.runButtonText}>
                {prediction.loading
                  ? "Computing..."
                  : hasValidationErrors
                    ? "Fix input ranges"
                    : "Run Recommendation"}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </LinearGradient>

      {/* Loading State */}
      {prediction.loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <ThemedText style={styles.loaderText}>
            Analyzing grid state...
          </ThemedText>
        </View>
      )}

      {/* Result State */}
      {!!prediction.data && (
        <ActionCard
          action={prediction.data.action}
          confidence={prediction.data.confidence}
          urgency={prediction.data.urgencyScore}
          surplus={prediction.data.surplusKwh}
          reason={
            prediction.data.reason || "Recommendation based on grid analysis"
          }
        />
      )}

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <LinearGradient
          colors={[COLORS.darkGrey, COLORS.grey]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.infoCard}
        >
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={COLORS.cyan}
            />
            <ThemedText style={styles.infoTitle}>Actions Explained</ThemedText>
          </View>

          <View style={styles.actionExplanation}>
            <View style={styles.explanationItem}>
              <View
                style={[
                  styles.actionIndicator,
                  { backgroundColor: ACTION_COLORS.STORE.text },
                ]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.explanationLabel}>STORE</ThemedText>
                <ThemedText style={styles.explanationText}>
                  Charge battery from excess supply
                </ThemedText>
              </View>
            </View>

            <View style={styles.explanationItem}>
              <View
                style={[
                  styles.actionIndicator,
                  { backgroundColor: ACTION_COLORS.RELEASE.text },
                ]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.explanationLabel}>RELEASE</ThemedText>
                <ThemedText style={styles.explanationText}>
                  Discharge battery to meet demand
                </ThemedText>
              </View>
            </View>

            <View style={styles.explanationItem}>
              <View
                style={[
                  styles.actionIndicator,
                  { backgroundColor: ACTION_COLORS.REDISTRIBUTE.text },
                ]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.explanationLabel}>
                  REDISTRIBUTE
                </ThemedText>
                <ThemedText style={styles.explanationText}>
                  Shift load between regions
                </ThemedText>
              </View>
            </View>

            <View style={styles.explanationItem}>
              <View
                style={[
                  styles.actionIndicator,
                  { backgroundColor: ACTION_COLORS.STABLE.text },
                ]}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.explanationLabel}>STABLE</ThemedText>
                <ThemedText style={styles.explanationText}>
                  Grid is balanced, no action needed
                </ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
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
  formCard: {
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
    padding: 14,
    gap: 14,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  inputsContainer: {
    gap: 12,
  },
  inputField: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputLabelText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputUnit: {
    color: COLORS.lightGrey,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.grey,
    overflow: "hidden",
  },
  input: {
    backgroundColor: COLORS.darkGrey,
    color: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  inputErrorText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  runButtonContainer: {
    marginTop: 4,
  },
  runButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  runButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  runButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loaderContainer: {
    marginHorizontal: 14,
    marginVertical: 12,
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorCard: {
    marginHorizontal: 14,
    marginVertical: 12,
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
  actionCardWrapper: {
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  actionBadge: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricsGrid: {
    gap: 10,
  },
  metricItem: {
    gap: 6,
  },
  metricLabel: {
    color: COLORS.lightGrey,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  metricBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.black + "40",
    overflow: "hidden",
  },
  metricBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  surplusBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  surplusValue: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  reasonCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.grey,
    gap: 6,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasonTitle: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  reasonText: {
    color: COLORS.lightGrey,
    fontSize: 11,
    lineHeight: 16,
  },
  infoSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grey,
    padding: 14,
    gap: 12,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionExplanation: {
    gap: 10,
  },
  explanationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  actionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  explanationLabel: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  explanationText: {
    color: COLORS.lightGrey,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
});
