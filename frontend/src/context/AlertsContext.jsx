import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createApiClient } from "../api/client";
import { getStoredUser, getUserRole } from "../utils/auth";
import { useSettings } from "./SettingsContext";

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const { settings } = useSettings();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [latestThreat, setLatestThreat] = useState(null);
  const knownIds = useRef(new Set());
  const initialized = useRef(false);

  const fetchAlerts = useCallback(async () => {
    const api = createApiClient();
    const user = getStoredUser();
    const alertsPath = getUserRole(user) === "endpoint" ? "/my/alerts" : "/get-alerts";

    try {
      const response = await api.get(alertsPath);
      const nextAlerts = Array.isArray(response.data) ? response.data : [];

      if (initialized.current && settings.notifications) {
        const newAlerts = nextAlerts.filter((alert) => !knownIds.current.has(alert.id));
        const newThreat = newAlerts.find((alert) => String(alert.prediction).toLowerCase() !== "safe");
        if (newThreat) {
          setLatestThreat(newThreat);
        }
      }

      knownIds.current = new Set(nextAlerts.map((alert) => alert.id));
      initialized.current = true;
      setAlerts(nextAlerts);
      setOffline(false);
      return true;
    } catch {
      setOffline(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [settings.notifications]);

  useEffect(() => {
    fetchAlerts();
    const timer = window.setInterval(fetchAlerts, Number(settings.refreshInterval) || 5000);
    return () => window.clearInterval(timer);
  }, [fetchAlerts, settings.refreshInterval]);

  const value = useMemo(
    () => ({
      alerts,
      loading,
      offline,
      latestThreat,
      clearLatestThreat: () => setLatestThreat(null),
      removeAlert: (alertId) => {
        setAlerts((current) => current.filter((alert) => alert.id !== alertId));
        knownIds.current.delete(alertId);
      },
      refreshAlerts: fetchAlerts,
    }),
    [alerts, loading, offline, latestThreat, fetchAlerts]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts must be used inside AlertsProvider");
  }
  return context;
}
