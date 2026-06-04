import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import BackendStatus from "../BackendStatus";
import Button from "../Button";
import { useAlerts } from "../../context/AlertsContext";
import { useSettings } from "../../context/SettingsContext";
import { useTelemetry } from "../../context/TelemetryContext";

export default function Topbar() {
  const { alerts, refreshAlerts } = useAlerts();
  const { refreshTelemetry } = useTelemetry();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("soc_user") || "null");
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3200);
  }

  function logout() {
    localStorage.removeItem("soc_user");
    localStorage.removeItem("soc_token");
    navigate("/login");
  }

  async function refreshAll() {
    setRefreshing(true);
    setToast(null);
    try {
      const [alertsOk, telemetryOk] = await Promise.all([refreshAlerts(), refreshTelemetry()]);
      if (alertsOk === false || telemetryOk === false) {
        showToast("error", "Could not refresh all dashboard data.");
      } else {
        showToast("success", "Dashboard data refreshed.");
      }
    } catch {
      showToast("error", "Could not refresh dashboard data.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="premium-topbar sticky top-0 z-30 border-b border-cyber-cyan/10 px-4 py-3 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Security operations center</div>
          <div className="mt-1 text-sm text-slate-300">
            <span className="text-cyber-green">{alerts.length} events indexed</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings.presentationMode && (
            <div className="rounded-md border border-cyber-green/30 bg-cyber-green/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-green">
              Presentation Mode Active
            </div>
          )}
          <BackendStatus compact />
          {!settings.presentationMode && (
            <Button onClick={refreshAll} tone="cyan" size="xs" loading={refreshing} loadingText="Refreshing...">
              Refresh
            </Button>
          )}
          <Link
            to="/incidents"
            className="hover-glow-button rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
          >
            Investigate
          </Link>
          <div className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
            {user?.name || "SOC Analyst"}
          </div>
          <Button onClick={logout} tone="slate" size="xs" aria-label="Log out and return to login">
            Logout
          </Button>
        </div>
      </div>
      {toast && (
        <div
          className={`fixed right-5 top-20 z-50 rounded-lg border px-4 py-3 text-sm shadow-2xl ${
            toast.type === "success"
              ? "border-cyber-green/30 bg-cyber-green/10 text-cyber-green"
              : "border-cyber-red/30 bg-cyber-red/10 text-cyber-red"
          }`}
        >
          {toast.text}
        </div>
      )}
    </header>
  );
}
