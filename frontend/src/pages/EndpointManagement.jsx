import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, Pause, Play, Power, Trash2 } from "lucide-react";
import { createApiClient, getApiErrorMessage, getBlobApiErrorMessage } from "../api/client";
import Button from "../components/Button";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatBytes, formatDate } from "../utils/format";

function controlBadgeClass(tone) {
  const tones = {
    green: "border-cyber-green/40 bg-cyber-green/10 text-cyber-green",
    amber: "border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber",
    red: "border-cyber-red/40 bg-cyber-red/10 text-cyber-red",
    slate: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  };
  return tones[tone] || tones.slate;
}

function endpointBadges(endpoint) {
  const online = endpoint.status === "Online";
  const agentMode = String(endpoint.agent_mode || "running").toLowerCase();
  const detectionEnabled = endpoint.detection_enabled !== false;
  const removed = agentMode === "removed";
  const stopped = agentMode === "stopped";

  return [
    {
      label: removed ? "Removed" : online ? "Online" : "Offline",
      tone: removed ? "red" : online ? "green" : "slate",
    },
    {
      label: detectionEnabled && agentMode === "running" ? "Detection Active" : "Detection Stopped",
      tone: detectionEnabled && agentMode === "running" ? "green" : stopped || removed ? "red" : "amber",
    },
    {
      label: removed ? "Agent Removed" : stopped ? "Agent Stopped" : agentMode === "paused" ? "Agent Paused" : "Agent Running",
      tone: stopped || removed ? "red" : agentMode === "paused" ? "amber" : "green",
    },
  ];
}

export default function EndpointManagement() {
  const { alerts, refreshAlerts } = useAlerts();
  const { settings } = useSettings();
  const { endpointStatus, offline: telemetryOffline, refreshTelemetry } = useTelemetry();
  const [pcName, setPcName] = useState("");
  const [registeredEndpoint, setRegisteredEndpoint] = useState(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

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
      detection_enabled: endpoint.detection_enabled,
      agent_mode: endpoint.agent_mode || existing.agent_mode || "running",
      heartbeat_enabled: endpoint.heartbeat_enabled,
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

    setBusyAction("register");
    try {
      const api = createApiClient();
      const response = await api.post("/register-endpoint", {
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
        timeout: 60000,
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
      showToast("error", await getBlobApiErrorMessage(exc, "Agent download failed. Please try again or check backend logs."));
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

  async function runEndpointControl(endpoint, path, successText, confirmText = "") {
    if (confirmText && !window.confirm(confirmText)) return;

    setBusyAction(`${path}-${endpoint.endpoint_id}`);
    try {
      const api = createApiClient();
      await api.post(`/endpoints/${endpoint.endpoint_id}${path}`);
      showToast("success", successText);
      await refreshAll();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not update endpoint control."));
    } finally {
      setBusyAction("");
    }
  }

  function toggleAgentPause(endpoint) {
    const agentMode = String(endpoint.agent_mode || "running").toLowerCase();
    runEndpointControl(
      endpoint,
      agentMode === "paused" ? "/agent/resume" : "/agent/pause",
      agentMode === "paused" ? "Agent resumed." : "Agent paused."
    );
  }

  function stopAgent(endpoint) {
    runEndpointControl(
      endpoint,
      "/agent/stop",
      "Stop Agent command sent.",
      `Stop Sentinel SOC agent on ${endpoint.pc_name || "this endpoint"}? The agent process will exit completely and the endpoint will go offline.`
    );
  }

  async function confirmRemoveAgent() {
    if (!removeTarget) return;

    const endpoint = removeTarget;
    setBusyAction(`/agent/remove-${endpoint.endpoint_id}`);
    try {
      const api = createApiClient();
      await api.post(`/endpoints/${endpoint.endpoint_id}/agent/remove`);
      showToast("success", "Remove Agent command sent.");
      setRemoveTarget(null);
      await refreshAll();
    } catch (exc) {
      showToast("error", getApiErrorMessage(exc, "Could not remove agent."));
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
        <h1 className="text-xl font-semibold text-white">Endpoint Management</h1>
        <p className="mt-1 text-sm text-slate-400">Register endpoints, review health, manage agents, and inspect observed alert activity.</p>
      </div>
      {telemetryOffline && (
        <div className="glass cyber-border hover-glow-card rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
          Cannot connect to SOC backend server.
        </div>
      )}
      <form onSubmit={registerEndpoint} className="glass cyber-border hover-glow-card grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_auto]">
        <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyber-cyan/60" placeholder="PC name" value={pcName} onChange={(e) => setPcName(e.target.value)} />
        <Button type="submit" loading={busyAction === "register"} loadingText="Registering..." tone="solidCyan">
          Register Endpoint
        </Button>
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
            <Button
              onClick={() => downloadAgent(registeredEndpoint)}
              loading={busyAction === `download-${registeredEndpoint.endpoint_id}`}
              loadingText="Preparing..."
              tone="solidGreen"
            >
              <Download className="h-4 w-4" />
              Download Agent
            </Button>
          </div>
        </div>
      )}
      <div className="glass cyber-border hover-glow-card rounded-lg p-4 text-sm text-slate-300">
        Download and run Sentinel Agent once. After that, monitoring starts automatically. No Swagger or terminal commands are needed for normal endpoint onboarding.
      </div>
      {!settings.presentationMode && <div className="glass cyber-border hover-glow-card flex flex-wrap gap-3 rounded-lg p-4">
        <Button
          onClick={clearOfflineEndpoints}
          loading={busyAction === "clear-offline"}
          loadingText="Clearing..."
          tone="amber"
        >
          Clear Offline Endpoints
        </Button>
        <Button
          onClick={clearAllTestData}
          loading={busyAction === "demo-reset"}
          loadingText="Resetting..."
          tone="red"
        >
          Clear All Test Data
        </Button>
      </div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {endpoints.map((endpoint) => {
          const agentMode = String(endpoint.agent_mode || "running").toLowerCase();
          const agentStopped = agentMode === "stopped";
          const agentRemoved = agentMode === "removed";
          const agentPath = agentMode === "paused" ? "/agent/resume" : "/agent/pause";
          const controlsDisabled = agentStopped || agentRemoved;

          return (
          <div key={endpoint.endpoint_id} className="glass cyber-border hover-glow-card rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Endpoint #{endpoint.endpoint_id}</div>
                <div className="mt-2 text-lg font-semibold text-white">{endpoint.pc_name}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {endpointBadges(endpoint).map((badge) => (
                <span key={badge.label} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${controlBadgeClass(badge.tone)}`}>
                  {badge.label}
                </span>
              ))}
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
            <div className="mt-4 grid gap-2">
              <Button
                onClick={() => toggleAgentPause(endpoint)}
                disabled={controlsDisabled || busyAction === `${agentPath}-${endpoint.endpoint_id}`}
                loading={busyAction === `${agentPath}-${endpoint.endpoint_id}`}
                loadingText="Updating..."
                tone="amber"
                className="w-full"
              >
                {agentMode === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {agentRemoved ? "Agent Removed" : agentStopped ? "Agent Stopped" : agentMode === "paused" ? "Resume Agent" : "Pause Agent"}
              </Button>
              <Button
                onClick={() => stopAgent(endpoint)}
                disabled={controlsDisabled || busyAction === `/agent/stop-${endpoint.endpoint_id}`}
                loading={busyAction === `/agent/stop-${endpoint.endpoint_id}`}
                loadingText="Stopping..."
                tone="red"
                className="w-full"
              >
                <Power className="h-4 w-4" />
                Stop Agent
              </Button>
              <Button
                onClick={() => setRemoveTarget(endpoint)}
                disabled={agentRemoved || busyAction === `/agent/remove-${endpoint.endpoint_id}`}
                loading={busyAction === `/agent/remove-${endpoint.endpoint_id}`}
                loadingText="Removing..."
                tone="red"
                className="w-full"
              >
                <Trash2 className="h-4 w-4" />
                Remove Agent Completely
              </Button>
            </div>
            <Button
              onClick={() => downloadAgent(endpoint)}
              loading={busyAction === `download-${endpoint.endpoint_id}`}
              loadingText="Preparing..."
              tone="green"
              className="mt-4 w-full"
            >
              <Download className="h-4 w-4" />
              Download Agent
            </Button>
            {!settings.presentationMode && <Button
              onClick={() => deleteEndpoint(endpoint)}
              loading={busyAction === `delete-${endpoint.endpoint_id}`}
              loadingText="Deleting..."
              tone="red"
              className="mt-4 w-full"
            >
              Delete Endpoint
            </Button>}
          </div>
          );
        })}
        {endpoints.length === 0 && <div className="glass cyber-border hover-glow-card rounded-lg p-5 text-sm text-slate-400">No endpoint alerts have been reported yet.</div>}
      </div>
      <AnimatePresence>
        {removeTarget && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-agent-title"
              className="glass cyber-border w-[min(460px,100%)] rounded-2xl p-5 shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyber-red/35 bg-cyber-red/10 text-cyber-red">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="remove-agent-title" className="text-base font-semibold text-white">Remove Sentinel SOC agent?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Are you sure you want to remove Sentinel SOC agent from this endpoint? This will stop monitoring and remove local agent files.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Endpoint: {removeTarget.pc_name || `#${removeTarget.endpoint_id}`}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button tone="slate" onClick={() => setRemoveTarget(null)}>
                  Cancel
                </Button>
                <Button
                  tone="red"
                  loading={busyAction === `/agent/remove-${removeTarget.endpoint_id}`}
                  loadingText="Removing..."
                  onClick={confirmRemoveAgent}
                >
                  Confirm Remove
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
            <div className="text-sm font-semibold">{toast.type === "success" ? "Action complete" : "Action failed"}</div>
            <div className="mt-1 text-sm text-slate-300">{toast.text}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
