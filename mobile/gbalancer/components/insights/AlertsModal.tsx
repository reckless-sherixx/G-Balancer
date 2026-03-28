import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AlertCard } from "@/components/insights/AlertCard";
import { ThemedText } from "@/components/themed-text";
import type { AlertsResponse } from "@/features/insights/types";

const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  green: "#00FF41",
  cyan: "#00F0FF",
  red: "#FF4444",
};

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  alertsData: AlertsResponse | null;
  onRetry: () => Promise<unknown>;
}

export function AlertsModal({
  visible,
  onClose,
  loading,
  error,
  alertsData,
  onRetry,
}: AlertsModalProps) {
  const alerts = alertsData?.alerts ?? [];

  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[COLORS.darkGrey, COLORS.black]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalCard}
        >
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Grid Alerts</ThemedText>
              <ThemedText style={styles.subtitle}>
                {alertsData?.city ?? "City"} · {alertsData?.alert_count ?? 0}{" "}
                active
              </ThemedText>
            </View>

            <Pressable onPress={onClose} style={styles.iconButton}>
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <ThemedText style={styles.stateText}>
                Loading alerts...
              </ThemedText>
            </View>
          ) : null}

          {!loading && error ? (
            <View style={styles.stateWrap}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={26}
                color={COLORS.red}
              />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable
                onPress={() => void onRetry()}
                style={styles.retryButton}
              >
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error ? (
            <ScrollView contentContainerStyle={styles.listWrap}>
              {alerts.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={30}
                    color={COLORS.green}
                  />
                  <ThemedText style={styles.emptyTitle}>All clear</ThemedText>
                  <ThemedText style={styles.emptyMessage}>
                    No active alerts right now.
                  </ThemedText>
                </View>
              ) : (
                alerts.map((alert) => (
                  <AlertCard
                    key={`${alert.title}-${alert.timestamp}-${alert.severity}`}
                    alert={alert}
                  />
                ))
              )}
            </ScrollView>
          ) : null}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "88%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#B8B8B8",
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.grey,
    borderWidth: 1,
    borderColor: "#4A4A4A",
  },
  listWrap: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  stateWrap: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  stateText: {
    color: "#D2D2D2",
    fontSize: 14,
  },
  errorText: {
    color: "#FFC0C0",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },
  retryButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}70`,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: `${COLORS.cyan}20`,
  },
  retryText: {
    color: COLORS.cyan,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyWrap: {
    marginTop: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyMessage: {
    color: "#AEAEAE",
    fontSize: 13,
  },
});
