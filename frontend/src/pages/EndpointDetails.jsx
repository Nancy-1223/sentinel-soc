import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download } from "lucide-react";
import { createApiClient, getApiErrorMessage } from "../api/client";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatBytes, formatDate } from "../utils/format";

export default function EndpointDetails() {
  const { alerts, refreshAlerts } = useAlerts();
  const { endpointStatus, offline: telemetryOffline, refreshTelemetry } = useTelemetry();
  const user = JSON.parse(localStorage.getItem("soc_user") || "null");
  const [pcName, setPcName] = useState("");
  const [registeredEndpoint, setRegisteredEndpoint] = useState(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const alertEndpoints = alerts.reduce((acc, alert) => {
    acc[alert.endpoint_id] = acc[alert.endpoint_id] || {
      endpoint_id: alert.endpoint_id,
      pc_name: alert.pc_name,
      alerts: 0,
      maxRisk: 0,
      lastSeen: alert.created_at,
    };
    acc[alert.endpoint_id].alerts += 1;
    acc[alert.endpoint_id].maxRisk = Math.max(acc[alert.endpoint_id].maxRisk, Number(alert.risk_score || 0));
    return acc;
  }, {});
  const telemetryEndpoints = endpointStatus.reduce((acc, endpoint) => {
    const existing = acc[endpoint.endpoint_id] || {};
    acc[endpoint.endpoint_id] = {
      ...existing,
      endpoint_id: endpoint.endpoint_id,
      pc_name: endpoint.pc_name || existing.pc_name,
      alerts: endpoint.total_alerts ?? existing.alerts ?? 0,
      maxRisk: endpoint.max_risk_score ?? existing.maxRisk ?? 0,
      status: endpoint.status,
      protectionStatus: endpoint.protection_status || existing.protectionStatus || "Protected",
      lastSeen: endpoint.last_seen || existing.lastSeen,
      telemetry: endpoint.telemetry,
    };
    return acc;
  }, alertEndpoints);
  const endpoints = Object.values(telemetryEndpoints);

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function refreshAll() {
    await Promise.all([refreshAlerts(), refreshTelemetry()]);
  }

  async function registerEndpoint(event) {
    event.preventDefault();
    setMessage("");
    setRegisteredEndpoint(null);
    const userId = user?.user_id || user?.id;
    if (!userId) {
      const text = "Login again before registering an endpoint.";
      setMessage(text);
      showToast("error", text);
      return;
    }

    setBusyAction("register");
    try {
      const api = createApiClient();
      const response = await api.post("/register-endpoint", {
        user_id: userId,
        pc_name: pcName.trim() || "LAB-PC-01",
      });
      const nextEndpoint = {
        endpoint_id: response.data.endpoint_id,
        pc_name: response.data.pc_name || pcName.trim() || "LAB-PC-01",
        status: response.data.status || "Registered",
      };
      setRegisteredEndpoint(nextEndpoint);
      setMessage("Endpoint registered successfully. Download and run the Sentinel Agent once to start protection.");
      setPcName("");
      showToast("success", "Endpoint registered successfully. Download and run the Sentinel Agent once to start protection.");
      await refreshAll();
    } catch (exc) {
      setMessage(getApiErrorMessage(exc, "Endpoint registration failed."));
      showToast("error", getApiErrorMessage(exc, "Endpoint registration failed."));
    } finally {
      setBusyAction("");
    }
  }

  function getDownloadFilename(response, endpoint) {
    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    if (match?.[1]) {
      return match[1];
    }
    return `sentinel-agent-endpoint-${endpoint.endpoint_id}.zip`;
  }

  async function downloadAgent(endpoint) {
    setBusyAction(`download-${endpoint.endpoint_id}`);
    try {
      const api = createApiClient();
      const response = await api.get(`/download-agent/${endpoint.endpoint_id}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getDownloadFilename(response, endpoint);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast("success", "Configured agent package downloaded.");
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not download agent package."));
    } finally {
      setBusyAction("");
    }
  }

  async function deleteEndpoint(endpoint) {
    const confirmed = window.confirm(`Delete ${endpoint.pc_name || "this endpoint"} and its telemetry/alerts?`);
    if (!confirmed) return;

    setBusyAction(`delete-${endpoint.endpoint_id}`);
    try {
      const api = createApiClient();
      await api.delete(`/endpoints/${endpoint.endpoint_id}`);
      showToast("success", `${endpoint.pc_name || "Endpoint"} deleted.`);
      await refreshAll();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not delete endpoint."));
    } finally {
      setBusyAction("");
    }
  }

  async function clearOfflineEndpoints() {
    const offlineEndpoints = endpoints.filter((endpoint) => endpoint.status !== "Online");
    if (!offlineEndpoints.length) {
      showToast("success", "No offline endpoints to clear.");
      return;
    }
    const confirmed = window.confirm(`Delete ${offlineEndpoints.length} offline endpoint(s) and their telemetry/alerts?`);
    if (!confirmed) return;

    setBusyAction("clear-offline");
    try {
      const api = createApiClient();
      await Promise.all(offlineEndpoints.map((endpoint) => api.delete(`/endpoints/${endpoint.endpoint_id}`)));
      showToast("success", "Offline endpoints cleared.");
      await refreshAll();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not clear offline endpoints."));
    } finally {
      setBusyAction("");
    }
  }

  async function clearAllTestData() {
    const confirmed = window.confirm("Clear all demo endpoints, telemetry, alerts, and quarantine files?");
    if (!confirmed) return;

    setBusyAction("demo-reset");
    try {
      const api = createApiClient();
      await api.delete("/demo/reset");
      showToast("success", "All test data cleared.");
      await refreshAll();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not reset demo data."));
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Endpoint Details</h1>
        <p className="mt-1 text-sm text-slate-400">Registered endpoint workflow and observed alert activity.</p>
      </div>
      {telemetryOffline && (
        <div className="glass cyber-border hover-glow-card rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
          Cannot connect to SOC backend server.
        </div>
      )}
      <form onSubmit={registerEndpoint} className="glass cyber-border hover-glow-card grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_auto]">
        <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyber-cyan/60" placeholder="PC name" value={pcName} onChange={(e) => setPcName(e.target.value)} />
        <button disabled={busyAction === "register"} className="hover-glow-button rounded-md bg-cyber-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
          {busyAction === "register" ? "Registering..." : "Register Endpoint"}
        </button>
        {message && <div className="text-sm text-cyber-cyan md:col-span-2">{message}</div>}
      </form>
      {registeredEndpoint && (
        <div className="glass cyber-border hover-glow-card rounded-lg p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Ready for Agent Install</div>
              <div className="mt-2 text-lg font-semibold text-white">{registeredEndpoint.pc_name}</div>
              <div className="mt-1 text-sm text-slate-400">
                Endpoint #{registeredEndpoint.endpoint_id} - {registeredEndpoint.status}
              </div>
              <div className="mt-3 text-sm text-cyber-cyan">
                Download and run Sentinel Agent once. After that, monitoring starts automatically.
              </div>
            </div>
            <button
              onClick={() => downloadAgent(registeredEndpoint)}
              disabled={busyAction === `download-${registeredEndpoint.endpoint_id}`}
              className="hover-glow-button inline-flex items-center justify-center gap-2 rounded-md bg-cyber-green px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busyAction === `download-${registeredEndpoint.endpoint_id}` ? "Preparing..." : "Download Agent"}
            </button>
          </div>
        </div>
      )}
      <div className="glass cyber-border hover-glow-card rounded-lg p-4 text-sm text-slate-300">
        Download and run Sentinel Agent once. After that, monitoring starts automatically. No Swagger or terminal commands are needed for normal endpoint onboarding.
      </div>
      <div className="glass cyber-border hover-glow-card flex flex-wrap gap-3 rounded-lg p-4">
        <button
          onClick={clearOfflineEndpoints}
          disabled={busyAction === "clear-offline"}
          className="hover-glow-button rounded-md border border-cyber-amber/30 px-4 py-2 text-sm font-semibold text-cyber-amber transition hover:bg-cyber-amber/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "clear-offline" ? "Clearing..." : "Clear Offline Endpoints"}
        </button>
        <button
          onClick={clearAllTestData}
          disabled={busyAction === "demo-reset"}
          className="hover-glow-button rounded-md border border-cyber-red/30 px-4 py-2 text-sm font-semibold text-cyber-red transition hover:bg-cyber-red/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "demo-reset" ? "Resetting..." : "Clear All Test Data"}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {endpoints.map((endpoint) => (
          <div key={endpoint.endpoint_id} className="glass cyber-border hover-glow-card rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Endpoint #{endpoint.endpoint_id}</div>
                <div className="mt-2 text-lg font-semibold text-white">{endpoint.pc_name}</div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${endpoint.status === "Online" ? "border-cyber-green/40 bg-cyber-green/10 text-cyber-green" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}>
                {endpoint.status || "Offline"}
              </span>
            </div>
            <div
              className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                endpoint.protectionStatus === "Under Attack"
                  ? "border-cyber-red/40 bg-cyber-red/10 text-cyber-red"
                  : endpoint.protectionStatus === "Quarantine Failure"
                    ? "border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber"
                    : "border-cyber-green/40 bg-cyber-green/10 text-cyber-green"
              }`}
            >
              {endpoint.protectionStatus}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><div className="text-slate-500">Alerts</div><div className="text-cyber-cyan">{endpoint.alerts}</div></div>
              <div><div className="text-slate-500">Max risk</div><div className="text-cyber-amber">{endpoint.maxRisk}</div></div>
              <div><div className="text-slate-500">CPU</div><div className="text-cyber-green">{Math.round(endpoint.telemetry?.cpu || 0)}%</div></div>
              <div><div className="text-slate-500">RAM</div><div className="text-cyber-green">{Math.round(endpoint.telemetry?.ram || 0)}%</div></div>
              <div><div className="text-slate-500">Disk</div><div className="text-cyber-green">{Math.round(endpoint.telemetry?.disk || 0)}%</div></div>
              <div><div className="text-slate-500">Network</div><div className="text-cyber-cyan">{formatBytes(endpoint.telemetry?.network_sent || 0)} / {formatBytes(endpoint.telemetry?.network_received || 0)}</div></div>
            </div>
            <div className="mt-4 text-xs text-slate-500">Last seen {formatDate(endpoint.lastSeen)}</div>
            <button
              onClick={() => downloadAgent(endpoint)}
              disabled={busyAction === `download-${endpoint.endpoint_id}`}
              className="hover-glow-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyber-green/30 px-3 py-2 text-sm font-semibold text-cyber-green transition hover:bg-cyber-green/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busyAction === `download-${endpoint.endpoint_id}` ? "Preparing..." : "Download Agent"}
            </button>
            <button
              onClick={() => deleteEndpoint(endpoint)}
              disabled={busyAction === `delete-${endpoint.endpoint_id}`}
              className="hover-glow-button mt-4 w-full rounded-md border border-cyber-red/30 px-3 py-2 text-sm font-semibold text-cyber-red transition hover:bg-cyber-red/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === `delete-${endpoint.endpoint_id}` ? "Deleting..." : "Delete Endpoint"}
            </button>
          </div>
        ))}
        {endpoints.length === 0 && <div className="glass cyber-border hover-glow-card rounded-lg p-5 text-sm text-slate-400">No endpoint alerts have been reported yet.</div>}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className={`fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border p-4 shadow-2xl ${
              toast.type === "success"
                ? "border-cyber-green/30 bg-[#07130d]/95 text-cyber-green"
                : "border-cyber-red/30 bg-[#13070d]/95 text-cyber-red"
            }`}
          >
            <div className="text-sm font-semibold">{toast.type === "success" ? "Action complete" : "Action failed"}</div>
            <div className="mt-1 text-sm text-slate-300">{toast.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
