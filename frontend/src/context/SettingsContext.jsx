import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_BACKEND_URL } from "../api/client";

const defaultSettings = {
  backendUrl: DEFAULT_BACKEND_URL,
  refreshInterval: 5000,
  theme: "dark",
  notifications: true,
  autoQuarantine: true,
  demoMode: false,
  presentationMode: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("soc_settings");
    if (!saved) return defaultSettings;

    try {
      const parsedSettings = { ...defaultSettings, ...JSON.parse(saved) };
      if (!["dark", "light"].includes(parsedSettings.theme)) {
        parsedSettings.theme = "dark";
      }
      return parsedSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("soc_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === "light" ? "light" : "dark";
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.presentation = settings.presentationMode ? "on" : "off";
  }, [settings.presentationMode]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      resetSettings: () => setSettings(defaultSettings),
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
