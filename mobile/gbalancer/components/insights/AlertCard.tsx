import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { SeverityBadge } from "@/components/insights/SeverityBadge";
import type { GridAlert } from "@/features/insights/types";

const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  green: "#00FF41",
  cyan: "#00F0FF",
};

interface AlertCardProps {
  alert: GridAlert;
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) {
    return timestamp;
  }
  return parsed.toLocaleString();
}

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <LinearGradient
      colors={[COLORS.darkGrey, COLORS.grey]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <ThemedText style={styles.title}>{alert.title}</ThemedText>
          <ThemedText style={styles.timestamp}>
            {formatTimestamp(alert.timestamp)}
          </ThemedText>
        </View>
        <SeverityBadge severity={alert.severity} />
      </View>

      <ThemedText style={styles.message}>{alert.message}</ThemedText>

      <View style={styles.actionRow}>
        <MaterialCommunityIcons
          name="lightbulb-on-outline"
          size={16}
          color={COLORS.cyan}
        />
        <ThemedText style={styles.actionText}>
          Recommended: {alert.recommended_action}
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  timestamp: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  message: {
    color: "#EAEAEA",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  actionRow: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLORS.green}30`,
    backgroundColor: `${COLORS.green}12`,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  actionText: {
    color: "#D7FFD5",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
