import { AlertTriangle, Download, HardDrive, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createApiClient, getApiErrorMessage, getBlobApiErrorMessage } from "../api/client";
import AlertTable from "../components/AlertTable";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { getStoredUser } from "../utils/auth";
import { formatDate } from "../utils/format";

export default function EndpointPortal() {
  const user = getStoredUser();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { endpointStatus, latestTelemetry, loading: telemetryLoading } = useTelemetry();
  const [downloadState, setDownloadState] = useState({ loading: false, error: "" });
  const [toast, setToast] = useState(null);
  const endpoint = endpointStatus[0] || null;
  const telemetry = endpoint?.telemetry || latestTelemetry[0] || null;
  const quarantined = alerts.filter((alert) => String(alert.action_taken || "").toLowerCase().includes("quarantine"));
  const threats = alerts.filter((alert) => String(alert.prediction || "").toLowerCase() !== "safe");

  async function downloadMyAgent() {
    setDownloadState({ loading: true, error: "" });
    setToast(null);
    try {
      const api = createApiClient();
      const response = await api.get("/my/download-agent", { responseType: "blob", timeout: 60000 });
      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `sentinel-agent-endpoint-${user?.endpoint_id || "mine"}.zip`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadState({ loading: false, error: "" });
    } catch (exc) {
      const message = await getBlobApiErrorMessage(exc, "Could not download endpoint agent.");
      setDownloadState({ loading: false, error: message });
      setToast({ type: "error", text: message });
      window.setTimeout(() => setToast(null), 3500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">My Endpoint</h1>
          <p className="mt-1 text-sm text-slate-400">
            Endpoint portal for {user?.name || "endpoint user"}. Only your assigned endpoint data is shown.
          </p>
        </div>
        <Button onClick={downloadMyAgent} loading={downloadState.loading} loadingText="Preparing..." tone="solidCyan" size="sm">
          <span className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download My Agent
          </span>
        </Button>
      </div>
      {downloadState.error && <div className="glass cyber-border rounded-lg border-cyber-red/30 p-3 text-sm text-cyber-red">{downloadState.error}</div>}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-cyber-red/30 bg-white/90 p-4 text-cyber-red shadow-2xl">
          <div className="text-sm font-semibold">Download failed</div>
          <div className="mt-1 text-sm text-slate-300">{toast.text}</div>
        </div>
      )}

      {!user?.endpoint_id && (
        <div className="glass cyber-border rounded-lg border-cyber-amber/30 p-4 text-sm text-cyber-amber">
          No endpoint is linked to this account yet. Register or link an endpoint to begin monitoring.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Endpoint" value={endpoint?.pc_name || "Unlinked"} detail={endpoint ? `Last seen ${formatDate(endpoint.last_seen)}` : "No endpoint assigned"} tone="cyan" icon={HardDrive} />
        <StatCard label="Status" value={endpoint?.status || "Unknown"} detail={endpoint?.agent_mode ? `Agent ${endpoint.agent_mode}` : "Awaiting heartbeat"} tone={endpoint?.status === "Online" ? "green" : "amber"} icon={ShieldCheck} />
        <StatCard label="My Alerts" value={alerts.length} detail={`${threats.length} threat event(s)`} tone={threats.length ? "red" : "green"} icon={AlertTriangle} />
        <StatCard label="Quarantine" value={quarantined.length} detail="Endpoint containment status" tone={quarantined.length ? "amber" : "green"} icon={LockKeyhole} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="glass cyber-border hover-glow-card rounded-2xl p-5">
          <div className="mb-4 text-sm font-medium text-slate-200">Telemetry Summary</div>
          {telemetry ? (
            <div className="grid gap-3 text-sm">
              <Metric label="CPU" value={`${Math.round(telemetry.cpu || 0)}%`} />
              <Metric label="RAM" value={`${Math.round(telemetry.ram || 0)}%`} />
              <Metric label="Disk" value={`${Math.round(telemetry.disk || 0)}%`} />
              <Metric label="Agent Version" value={telemetry.agent_version || "unknown"} />
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              {telemetryLoading ? "Loading telemetry..." : "No telemetry has been received for this endpoint yet."}
            </div>
          )}
        </section>

        <section id="alerts" className="glass cyber-border hover-glow-card rounded-2xl p-5">
          <div className="mb-4 text-sm font-medium text-slate-200">My Alerts</div>
          {alerts.length ? (
            <AlertTable alerts={alerts.slice(0, 8)} compact showDetails={false} />
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              {alertsLoading ? "Loading alerts..." : "No alerts reported for your endpoint."}
            </div>
          )}
        </section>
      </div>

      <section id="quarantine" className="glass cyber-border hover-glow-card rounded-2xl p-5">
        <div className="mb-4 text-sm font-medium text-slate-200">My Quarantine Status</div>
        {quarantined.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quarantined.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-cyber-amber/20 bg-cyber-amber/10 p-4">
                <div className="truncate font-medium text-white">{alert.filename}</div>
                <div className="mt-1 text-xs text-slate-400">{alert.action_taken} - {formatDate(alert.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            No quarantined files for your endpoint.
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-cyber-cyan">{value}</span>
    </div>
  );
}
