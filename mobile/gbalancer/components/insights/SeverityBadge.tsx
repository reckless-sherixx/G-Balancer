import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { AlertSeverity } from "@/features/insights/types";

const COLORS = {
  green: "#00FF41",
  yellow: "#FFD700",
  red: "#FF4444",
  cyan: "#00F0FF",
  darkGrey: "#1A1A1A",
};

type BadgePalette = {
  border: string;
  text: string;
  background: string;
};

const PALETTE_BY_SEVERITY: Record<AlertSeverity | "NONE", BadgePalette> = {
  CRITICAL: {
    border: COLORS.red,
    text: COLORS.red,
    background: `${COLORS.red}22`,
  },
  HIGH: { border: "#FF7A45", text: "#FF7A45", background: "#FF7A4522" },
  MEDIUM: {
    border: COLORS.yellow,
    text: COLORS.yellow,
    background: `${COLORS.yellow}22`,
  },
  LOW: {
    border: COLORS.cyan,
    text: COLORS.cyan,
    background: `${COLORS.cyan}22`,
  },
  NONE: {
    border: COLORS.green,
    text: COLORS.green,
    background: `${COLORS.green}22`,
  },
};

interface SeverityBadgeProps {
  severity: AlertSeverity | "NONE";
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const palette = PALETTE_BY_SEVERITY[severity];

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
      ]}
    >
      <ThemedText style={[styles.text, { color: palette.text }]}>
        {severity}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    backgroundColor: COLORS.darkGrey,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
