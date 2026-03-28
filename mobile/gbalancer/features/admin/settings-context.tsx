import React, { createContext, useContext, useMemo, useState } from "react";

export type AdminSettings = {
  city: string;
  forecastHours: number;
  insightsPolling: boolean;
  alertsEnabled: boolean;
  festivalsEnabled: boolean;
  co2Enabled: boolean;
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  city: process.env.EXPO_PUBLIC_INSIGHTS_CITY ?? "Mumbai",
  forecastHours: 24,
  insightsPolling: true,
  alertsEnabled: true,
  festivalsEnabled: true,
  co2Enabled: true,
};

type AdminSettingsContextValue = {
  settings: AdminSettings;
  updateSettings: (patch: Partial<AdminSettings>) => void;
  resetSettings: () => void;
};

const AdminSettingsContext = createContext<AdminSettingsContextValue | null>(
  null,
);

export function AdminSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AdminSettings>(
    DEFAULT_ADMIN_SETTINGS,
  );

  const value = useMemo<AdminSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (patch) => {
        setSettings((previous) => ({
          ...previous,
          ...patch,
        }));
      },
      resetSettings: () => {
        setSettings(DEFAULT_ADMIN_SETTINGS);
      },
    }),
    [settings],
  );

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error(
      "useAdminSettings must be used within AdminSettingsProvider",
    );
  }
  return context;
}

export const ADMIN_FORECAST_HOURS_OPTIONS = [6, 12, 24] as const;
