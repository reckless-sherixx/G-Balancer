import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import {
  ADMIN_FORECAST_HOURS_OPTIONS,
  type AdminSettings,
  useAdminSettings,
} from "@/features/admin/settings-context";

const COLORS = {
  black: "#0B0B0B",
  darkGrey: "#1A1A1A",
  grey: "#2A2A2A",
  lightGrey: "#3A3A3A",
  green: "#00FF41",
  cyan: "#00F0FF",
  white: "#FFFFFF",
  yellow: "#FFD700",
};

interface AdminPanelModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ visible, onClose }: AdminPanelModalProps) {
  const { settings, updateSettings, resetSettings } = useAdminSettings();
  const [draft, setDraft] = useState<AdminSettings>(settings);

  useEffect(() => {
    if (visible) {
      setDraft(settings);
    }
  }, [settings, visible]);

  const applyChanges = () => {
    updateSettings({
      ...draft,
      city: draft.city.trim() || "Mumbai",
    });
    onClose();
  };

  const resetAndClose = () => {
    resetSettings();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[COLORS.darkGrey, COLORS.black]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Admin Panel</ThemedText>
              <ThemedText style={styles.subtitle}>
                Runtime controls for app behavior
              </ThemedText>
            </View>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={COLORS.white}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>City</ThemedText>
              <TextInput
                value={draft.city}
                onChangeText={(text) =>
                  setDraft((prev) => ({ ...prev, city: text }))
                }
                placeholder="Mumbai"
                placeholderTextColor="#808080"
                style={styles.input}
                autoCapitalize="words"
              />
              <ThemedText style={styles.helperText}>
                Used by forecast and insights endpoints.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Forecast Horizon
              </ThemedText>
              <View style={styles.chipRow}>
                {ADMIN_FORECAST_HOURS_OPTIONS.map((hours) => {
                  const selected = draft.forecastHours === hours;
                  return (
                    <Pressable
                      key={hours}
                      onPress={() =>
                        setDraft((prev) => ({ ...prev, forecastHours: hours }))
                      }
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {hours}h
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Feature Toggles
              </ThemedText>

              <SettingToggleRow
                label="Alerts"
                value={draft.alertsEnabled}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, alertsEnabled: value }))
                }
              />
              <SettingToggleRow
                label="Insights polling"
                value={draft.insightsPolling}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, insightsPolling: value }))
                }
              />
              <SettingToggleRow
                label="Festivals tab"
                value={draft.festivalsEnabled}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, festivalsEnabled: value }))
                }
              />
              <SettingToggleRow
                label="CO2 tab"
                value={draft.co2Enabled}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, co2Enabled: value }))
                }
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryBtn} onPress={resetAndClose}>
              <ThemedText style={styles.secondaryBtnText}>Reset</ThemedText>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={applyChanges}>
              <ThemedText style={styles.primaryBtnText}>Apply</ThemedText>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function SettingToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? COLORS.green : "#9B9B9B"}
        trackColor={{ false: "#4A4A4A", true: `${COLORS.green}88` }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#B8B8B8",
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.grey,
    borderWidth: 1,
    borderColor: "#4A4A4A",
  },
  body: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 16,
  },
  section: {
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#121212",
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    backgroundColor: "#0F0F0F",
  },
  helperText: {
    color: "#9A9A9A",
    fontSize: 11,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#4A4A4A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#191919",
  },
  chipSelected: {
    borderColor: COLORS.green,
    backgroundColor: `${COLORS.green}22`,
  },
  chipText: {
    color: "#D0D0D0",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: COLORS.green,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3A3A3A",
    paddingVertical: 6,
  },
  toggleLabel: {
    color: "#EAEAEA",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.yellow,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: `${COLORS.yellow}22`,
  },
  secondaryBtnText: {
    color: COLORS.yellow,
    fontWeight: "700",
    fontSize: 13,
  },
  primaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: `${COLORS.green}26`,
  },
  primaryBtnText: {
    color: COLORS.green,
    fontWeight: "700",
    fontSize: 13,
  },
});
