import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createApiClient, getApiErrorMessage } from "../api/client";
import Button from "../components/Button";
import { RiskBadge } from "../components/StatusBadge";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { formatDate } from "../utils/format";

export default function Quarantine() {
  const { refreshAlerts } = useAlerts();
  const { settings } = useSettings();
  const [quarantineAlerts, setQuarantineAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenAlertIds, setHiddenAlertIds] = useState(new Set());
  const [busyAlertIds, setBusyAlertIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const fetchQuarantine = useCallback(async () => {
    try {
      const api = createApiClient();
      console.info("[quarantine] Fetching quarantine records", { url: "/quarantine" });
      const response = await api.get("/quarantine");
      const rows = Array.isArray(response.data) ? response.data : [];
      console.info("[quarantine] Records received", { count: rows.length });
      setQuarantineAlerts(rows);
      return true;
    } catch (exc) {
      console.error("[quarantine] Could not fetch quarantine records", exc);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuarantine();
    const timer = window.setInterval(fetchQuarantine, Number(settings.refreshInterval) || 5000);
    return () => window.clearInterval(timer);
  }, [fetchQuarantine, settings.refreshInterval]);

  const quarantined = quarantineAlerts.filter((alert) => !hiddenAlertIds.has(alert.id));

  function markBusy(alertId, isBusy) {
    setBusyAlertIds((current) => {
      const next = new Set(current);
      if (isBusy) {
        next.add(alertId);
      } else {
        next.delete(alertId);
      }
      return next;
    });
  }

  function hideAlert(alertId) {
    setHiddenAlertIds((current) => new Set(current).add(alertId));
  }

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function deleteFile(alert) {
    setToast(null);
    markBusy(alert.id, true);

    try {
      const api = createApiClient();
      await api.delete(`/quarantine/${encodeURIComponent(alert.filename)}`);
      hideAlert(alert.id);
      showToast("success", `${alert.filename} deleted from quarantine.`);
      await fetchQuarantine();
      await refreshAlerts();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not delete quarantined file."));
    } finally {
      markBusy(alert.id, false);
    }
  }

  async function restoreFile(alert) {
    setToast(null);
    markBusy(alert.id, true);

    try {
      const api = createApiClient();
      await api.post(`/restore/${encodeURIComponent(alert.filename)}`);
      hideAlert(alert.id);
      showToast("success", `${alert.filename} restored to its original location.`);
      await fetchQuarantine();
      await refreshAlerts();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not restore quarantined file."));
    } finally {
      markBusy(alert.id, false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Quarantine</h1>
        <p className="mt-1 text-sm text-slate-400">Contained files reported by the endpoint agent.</p>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-lg border p-3 text-sm ${
              toast.type === "success"
                ? "border-cyber-green/30 bg-cyber-green/10 text-cyber-green"
                : "border-cyber-red/30 bg-cyber-red/10 text-cyber-red"
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {quarantined.map((alert) => {
          const isBusy = busyAlertIds.has(alert.id);

          return (
            <div
              key={alert.id}
              className="glass cyber-border hover-glow-card grid gap-4 rounded-lg p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <div className="font-medium text-white">{alert.filename}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {alert.pc_name} - {formatDate(alert.created_at)}
                </div>
                <div className="mt-3">
                  <RiskBadge score={alert.risk_score} />
                </div>
              </div>
              {!settings.presentationMode && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => restoreFile(alert)}
                    loading={isBusy}
                    loadingText="Working..."
                    tone="green"
                    size="sm"
                  >
                    Restore
                  </Button>
                  <Button
                    onClick={() => deleteFile(alert)}
                    loading={isBusy}
                    loadingText="Working..."
                    tone="red"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {quarantined.length === 0 && (
          <div className="glass cyber-border hover-glow-card rounded-lg p-8 text-center text-slate-500">
            {loading ? "Loading quarantined files..." : "No quarantined files reported."}
          </div>
        )}
      </div>
    </div>
  );
}
