import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AdminPanelModal } from "@/components/admin/AdminPanelModal";
import { AlertsModal } from "@/components/insights/AlertsModal";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAdminSettings } from "@/features/admin/settings-context";
import { useAlertsData, useInsightsSummary } from "@/features/insights/hooks";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SEVERITY_COLOR: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE", string> = {
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

  const totalAlerts = alerts.data?.alert_count ?? summary.data?.alert_count ?? 0;
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
      <View style={styles.missionBar}>
        <MaterialCommunityIcons name="monitor" size={18} color="#00FF87" />
        <View style={styles.missionTextGroup}>
          <View style={styles.missionPill} />
          <View style={styles.missionTitleWrap}>
            <Text style={styles.missionTitle}>Mission: Grid Control</Text>
            <Text style={[styles.missionLabel, { color: badgeColor }]}>Severity: {highestSeverity}</Text>
          </View>
          <Text style={styles.missionSubtitle}>Live data stream from network</Text>
        </View>
      </View>

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          tabBarInactiveTintColor: "#878D95",
          tabBarStyle: {
            backgroundColor: "#070707",
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: "#000",
            shadowOpacity: 0.7,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -3 },
            height: 70,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.45,
            marginBottom: 4,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: "#080808",
            borderBottomWidth: 0,
            height: 74,
          },
          headerTintColor: "#00FF87",
          headerTitleStyle: {
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: "800",
            letterSpacing: 0.7,
          },
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
                <Pressable style={styles.headerAlertButton} onPress={openAlerts}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={22} color="#00FF87" />
                  {totalAlerts > 0 ? (
                    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                      <MaterialCommunityIcons name="alert" size={10} color="#0B0B0B" />
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
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Forecast",
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="actions"
          options={{
            title: "Actions",
            tabBarIcon: ({ color }) => <IconSymbol name="chevron.left.forwardslash.chevron.right" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="festivals"
          options={{
            title: "Festivals",
            href: settings.festivalsEnabled ? undefined : null,
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-star" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="co2"
          options={{
            title: "CO2",
            href: settings.co2Enabled ? undefined : null,
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="leaf" size={24} color={color} />,
          }}
        />
      </Tabs>

      <AdminPanelModal visible={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

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
  missionBar: {
    backgroundColor: "#070707",
    borderBottomWidth: 1,
    borderBottomColor: "#182127",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  missionTextGroup: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  missionPill: {
    width: 6,
    height: 22,
    backgroundColor: "#00FF87",
    borderRadius: 3,
  },
  missionTitle: {
    color: "#00FF87",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  missionSubtitle: {
    color: "#A8B0B8",
    fontSize: 11,
  },
  missionLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  missionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
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
    width: 42,
    height: 42,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#225F75",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111B21",
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
