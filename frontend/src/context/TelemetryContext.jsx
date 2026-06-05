import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import { getStoredUser, getUserRole } from "../utils/auth";
import { useSettings } from "./SettingsContext";

const TelemetryContext = createContext(null);

function timeLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TelemetryProvider({ children }) {
  const { settings } = useSettings();
  const [latestTelemetry, setLatestTelemetry] = useState([]);
  const [endpointStatus, setEndpointStatus] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    const api = createApiClient();
    const user = getStoredUser();
    const isEndpoint = getUserRole(user) === "endpoint";
    const telemetryPath = isEndpoint ? "/my/telemetry" : "/telemetry";
    const statusPath = isEndpoint ? "/my/endpoint/status" : "/endpoints/status";

    try {
      const [telemetryResponse, statusResponse] = await Promise.all([
        api.get(telemetryPath),
        api.get(statusPath),
      ]);
      const telemetryRows = Array.isArray(telemetryResponse.data) ? telemetryResponse.data : [];
      const statusRows = Array.isArray(statusResponse.data) ? statusResponse.data : [];

      setLatestTelemetry(telemetryRows);
      setEndpointStatus(statusRows);
      setHistory((current) => {
        const nextPoints = telemetryRows.map((row) => ({
          ...row,
          label: timeLabel(row.timestamp),
        }));
        return [...current, ...nextPoints].slice(-160);
      });
      setOffline(false);
      return true;
    } catch {
      setOffline(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const timer = window.setInterval(fetchTelemetry, Number(settings.refreshInterval) || 5000);
    return () => window.clearInterval(timer);
  }, [fetchTelemetry, settings.refreshInterval]);

  const summary = useMemo(() => {
    const online = endpointStatus.filter((endpoint) => endpoint.status === "Online").length;
    const offlineCount = endpointStatus.filter((endpoint) => endpoint.status !== "Online").length;
    const count = latestTelemetry.length || 1;
    const average = (field) => Math.round(latestTelemetry.reduce((sum, row) => sum + Number(row[field] || 0), 0) / count);

    return {
      online,
      offline: offlineCount,
      cpu: average("cpu"),
      ram: average("ram"),
      disk: average("disk"),
      networkSent: latestTelemetry.reduce((sum, row) => sum + Number(row.network_sent || 0), 0),
      networkReceived: latestTelemetry.reduce((sum, row) => sum + Number(row.network_received || 0), 0),
    };
  }, [endpointStatus, latestTelemetry]);

  const value = useMemo(
    () => ({
      latestTelemetry,
      endpointStatus,
      history,
      summary,
      loading,
      offline,
      refreshTelemetry: fetchTelemetry,
    }),
    [latestTelemetry, endpointStatus, history, summary, loading, offline, fetchTelemetry]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used inside TelemetryProvider");
  }
  return context;
}
