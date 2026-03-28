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

import { EventCard } from "@/components/insights/EventCard";
import { ThemedText } from "@/components/themed-text";
import { useAdminSettings } from "@/features/admin/settings-context";
import { useFestivalsData } from "@/features/insights/hooks";

const DAYS_AHEAD = 45;

const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  green: "#00FF41",
  cyan: "#00F0FF",
  red: "#FF4444",
  yellow: "#FFD700",
};

export default function FestivalsScreen() {
  const { settings } = useAdminSettings();
  const festivals = useFestivalsData(settings.city, DAYS_AHEAD, {
    enabled: settings.insightsPolling,
  });

  const isLoading = festivals.loading && !festivals.data;
  const events = festivals.data?.upcoming_events ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={festivals.loading}
          onRefresh={() => void festivals.refresh()}
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
          <ThemedText style={styles.title}>Festival Outlook</ThemedText>
          <ThemedText style={styles.subtitle}>
            Demand spikes over next {DAYS_AHEAD} days
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="calendar-star"
          size={30}
          color={COLORS.cyan}
        />
      </LinearGradient>

      {festivals.data?.next_high_impact_event ? (
        <LinearGradient
          colors={[`${COLORS.red}28`, `${COLORS.red}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.highlightCard}
        >
          <ThemedText style={styles.highlightTitle}>
            Next High Impact Event
          </ThemedText>
          <ThemedText style={styles.highlightName}>
            {festivals.data.next_high_impact_event.event_name}
          </ThemedText>
          <ThemedText style={styles.highlightMeta}>
            in {festivals.data.next_high_impact_event.days_until} days ·{" "}
            {festivals.data.next_high_impact_event.demand_multiplier.toFixed(2)}
            x demand
          </ThemedText>
        </LinearGradient>
      ) : null}

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <ThemedText style={styles.stateText}>Loading events...</ThemedText>
        </View>
      ) : null}

      {!isLoading && festivals.error ? (
        <LinearGradient
          colors={[`${COLORS.red}22`, `${COLORS.red}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.errorCard, { borderColor: COLORS.red }]}
        >
          <ThemedText style={[styles.errorTitle, { color: COLORS.red }]}>
            Couldn&apos;t fetch festivals
          </ThemedText>
          <ThemedText style={styles.errorMessage}>{festivals.error}</ThemedText>
        </LinearGradient>
      ) : null}

      {!isLoading && !festivals.error ? (
        <>
          {events.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={28}
                color={COLORS.green}
              />
              <ThemedText style={styles.emptyTitle}>No major events</ThemedText>
              <ThemedText style={styles.emptyMessage}>
                No demand multiplier events in this window.
              </ThemedText>
            </View>
          ) : (
            events.map((event) => (
              <EventCard
                key={`${event.event_name}-${event.date}`}
                event={event}
              />
            ))
          )}

          {festivals.data?.note ? (
            <View style={styles.noteWrap}>
              <ThemedText style={styles.noteText}>
                {festivals.data.note}
              </ThemedText>
            </View>
          ) : null}
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
    marginBottom: 14,
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
    marginTop: 4,
    fontSize: 13,
  },
  highlightCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${COLORS.red}88`,
    padding: 14,
    marginBottom: 14,
  },
  highlightTitle: {
    color: "#FFC0C0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  highlightName: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  highlightMeta: {
    marginTop: 4,
    color: "#E8D0D0",
    fontSize: 13,
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
  emptyWrap: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyMessage: {
    color: "#AAAAAA",
    fontSize: 13,
  },
  noteWrap: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLORS.yellow}60`,
    backgroundColor: `${COLORS.yellow}10`,
    padding: 10,
  },
  noteText: {
    color: "#FFEBAA",
    fontSize: 12,
    lineHeight: 16,
  },
});
