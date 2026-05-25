import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createApiClient, getApiErrorMessage } from "../api/client";
import AlertTable from "../components/AlertTable";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { downloadIncidentReport } from "../utils/incidentReport";

export default function AlertsPanel() {
  const { settings } = useSettings();
  const { alerts, removeAlert, refreshAlerts } = useAlerts();
  const { latestTelemetry } = useTelemetry();
  const [search, setSearch] = useState("");
  const [prediction, setPrediction] = useState("all");
  const [minRisk, setMinRisk] = useState(0);
  const [deletingAlertId, setDeletingAlertId] = useState(null);
  const [toast, setToast] = useState(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch = [alert.filename, alert.pc_name, alert.file_extension, alert.action_taken]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesPrediction = prediction === "all" || String(alert.prediction).toLowerCase() === prediction;
      const matchesRisk = Number(alert.risk_score || 0) >= Number(minRisk);
      return matchesSearch && matchesPrediction && matchesRisk;
    });
  }, [alerts, search, prediction, minRisk]);

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function deleteAlert(alert) {
    const confirmed = window.confirm(`Delete alert history for ${alert.filename}? This will not delete any quarantined file from disk.`);
    if (!confirmed) return;

    setDeletingAlertId(alert.id);
    try {
      const api = createApiClient();
      await api.delete(`/alerts/${alert.id}`);
      removeAlert(alert.id);
      showToast("success", "Alert removed from dashboard history.");
      await refreshAlerts();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not delete alert."));
    } finally {
      setDeletingAlertId(null);
    }
  }

  function generateReport(alert) {
    const telemetry = latestTelemetry.find((row) => String(row.endpoint_id) === String(alert.endpoint_id));
    downloadIncidentReport(alert, telemetry);
    showToast("success", "Incident report generated.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Alerts Panel</h1>
        <p className="mt-1 text-sm text-slate-400">Search and triage endpoint detections from the backend.</p>
      </div>
      {!settings.presentationMode && (
        <div className="glass cyber-border hover-glow-card grid gap-3 rounded-lg p-4 md:grid-cols-3">
          <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Search alerts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyber-cyan/60" value={prediction} onChange={(e) => setPrediction(e.target.value)}>
            <option value="all">All predictions</option>
            <option value="safe">Safe</option>
            <option value="suspicious">Suspicious</option>
            <option value="malicious">Malicious</option>
          </select>
          <label className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
            Min risk
            <input type="range" min="0" max="100" value={minRisk} onChange={(e) => setMinRisk(e.target.value)} className="flex-1" />
            <span className="w-8 text-cyber-cyan">{minRisk}</span>
          </label>
        </div>
      )}
      <div className="glass cyber-border hover-glow-card rounded-lg p-4">
        <AlertTable
          alerts={filteredAlerts}
          onDeleteAlert={settings.presentationMode ? undefined : deleteAlert}
          deletingAlertId={deletingAlertId}
          onGenerateReport={generateReport}
          compact={settings.presentationMode}
        />
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className={`fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border p-4 shadow-2xl ${
              toast.type === "success"
                ? "border-cyber-green/30 bg-white/90 text-cyber-green"
                : "border-cyber-red/30 bg-white/90 text-cyber-red"
            }`}
          >
            <div className="text-sm font-semibold">{toast.type === "success" ? "Alert deleted" : "Delete failed"}</div>
            <div className="mt-1 text-sm text-slate-300">{toast.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
