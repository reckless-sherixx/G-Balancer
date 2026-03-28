import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";

const COLORS = {
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  white: "#FFFFFF",
};

interface MetricCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

export function MetricCard({
  title,
  value,
  hint,
  icon,
  color,
}: MetricCardProps) {
  return (
    <LinearGradient
      colors={[COLORS.darkGrey, COLORS.grey]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>

      <ThemedText style={[styles.value, { color }]}>{value}</ThemedText>

      {hint ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: "#CFCFCF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  value: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
    lineHeight: 28,
  },
  hint: {
    color: "#9D9D9D",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
