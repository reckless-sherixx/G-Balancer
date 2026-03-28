import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AdminPanelModal } from "@/components/admin/AdminPanelModal";
import { AlertsModal } from "@/components/insights/AlertsModal";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAdminSettings } from "@/features/admin/settings-context";
import { useAlertsData, useInsightsSummary } from "@/features/insights/hooks";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SEVERITY_COLOR: Record<
  "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE",
  string
> = {
  CRITICAL: "#FF4444",
  HIGH: "#FF7A45",
  MEDIUM: "#FFD700",
  LOW: "#00F0FF",
  NONE: "#00FF41",
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isAlertsOpen, setIsAlertsOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const { settings } = useAdminSettings();

  const alerts = useAlertsData(settings.city);
  const summary = useInsightsSummary(settings.city, {
    enabled: settings.insightsPolling,
    pollIntervalMs: settings.insightsPolling ? 60_000 : undefined,
  });

  const totalAlerts =
    alerts.data?.alert_count ?? summary.data?.alert_count ?? 0;
  const highestSeverity = summary.data?.highest_severity ?? "NONE";
  const badgeColor = SEVERITY_COLOR[highestSeverity];

  const refreshAlerts = async () => {
    await Promise.all([alerts.refresh(), summary.refresh()]);
  };

  const openAlerts = () => {
    setIsAlertsOpen(true);
  };

  const openAdminPanel = () => {
    setIsAdminOpen(true);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: true,
          headerStyle: {
            backgroundColor: "#0B0B0B",
          },
          headerTitleStyle: {
            color: "#FFFFFF",
            fontSize: 17,
            fontWeight: "700",
          },
          headerTintColor: "#00F0FF",
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActionsWrap}>
              <Pressable
                onLongPress={openAdminPanel}
                delayLongPress={700}
                style={styles.hiddenAdminTrigger}
                hitSlop={8}
              >
                <View style={styles.hiddenTriggerDot} />
              </Pressable>

              {settings.alertsEnabled ? (
                <Pressable
                  style={styles.headerAlertButton}
                  onPress={openAlerts}
                >
                  <MaterialCommunityIcons
                    name="bell-ring-outline"
                    size={22}
                    color="#00F0FF"
                  />
                  {totalAlerts > 0 ? (
                    <View
                      style={[styles.badge, { backgroundColor: badgeColor }]}
                    >
                      <MaterialCommunityIcons
                        name="alert"
                        size={10}
                        color="#0B0B0B"
                      />
                    </View>
                  ) : null}
                </Pressable>
              ) : null}
            </View>
          ),
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Overview",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Forecast",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="paperplane.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="actions"
          options={{
            title: "Actions",
            tabBarIcon: ({ color }) => (
              <IconSymbol
                size={28}
                name="chevron.left.forwardslash.chevron.right"
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="festivals"
          options={{
            title: "Festivals",
            href: settings.festivalsEnabled ? undefined : null,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="calendar-star"
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="co2"
          options={{
            title: "CO2",
            href: settings.co2Enabled ? undefined : null,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="leaf" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      <AdminPanelModal
        visible={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <AlertsModal
        visible={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        loading={alerts.loading}
        error={alerts.error}
        alertsData={alerts.data}
        onRetry={refreshAlerts}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    gap: 6,
  },
  hiddenAdminTrigger: {
    width: 30,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenTriggerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#174B50",
    opacity: 0.22,
  },
  headerAlertButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2E6A72",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0B0B0B",
  },
});
