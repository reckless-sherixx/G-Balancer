import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import type { FestivalEvent } from "@/features/insights/types";

const COLORS = {
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  green: "#00FF41",
  cyan: "#00F0FF",
  yellow: "#FFD700",
  red: "#FF4444",
};

interface EventCardProps {
  event: FestivalEvent;
}

export function EventCard({ event }: EventCardProps) {
  const impactColor = event.is_high_impact ? COLORS.red : COLORS.yellow;

  return (
    <LinearGradient
      colors={[COLORS.darkGrey, COLORS.grey]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <ThemedText style={styles.eventName}>{event.event_name}</ThemedText>
          <ThemedText style={styles.dateText}>
            {new Date(event.date).toDateString()}
          </ThemedText>
        </View>

        <View
          style={[
            styles.impactBadge,
            { borderColor: impactColor, backgroundColor: `${impactColor}22` },
          ]}
        >
          <ThemedText style={[styles.impactText, { color: impactColor }]}>
            {event.is_high_impact ? "HIGH IMPACT" : "MODERATE"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={16}
            color={COLORS.cyan}
          />
          <ThemedText style={styles.metaText}>
            {event.days_until} days
          </ThemedText>
        </View>

        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={16}
            color={COLORS.green}
          />
          <ThemedText style={styles.metaText}>
            {event.demand_multiplier.toFixed(2)}x demand
          </ThemedText>
        </View>
      </View>

      <View style={styles.demandRow}>
        <ThemedText style={styles.demandText}>
          Base: {event.base_demand_mw.toFixed(1)} MW
        </ThemedText>
        <ThemedText style={styles.demandText}>
          Expected: {event.expected_demand_mw.toFixed(1)} MW
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleWrap: {
    flex: 1,
  },
  eventName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  dateText: {
    color: "#B0B0B0",
    marginTop: 4,
    fontSize: 12,
  },
  impactBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  impactText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#D8D8D8",
    fontSize: 13,
  },
  demandRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#3A3A3A",
    paddingTop: 10,
    gap: 4,
  },
  demandText: {
    color: "#CFCFCF",
    fontSize: 12,
    lineHeight: 16,
  },
});
