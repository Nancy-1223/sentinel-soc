import { Link, useNavigate } from "react-router-dom";
import BackendStatus from "../BackendStatus";
import { useAlerts } from "../../context/AlertsContext";
import { useSettings } from "../../context/SettingsContext";

export default function Topbar() {
  const { alerts, refreshAlerts } = useAlerts();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("soc_user") || "null");

  function logout() {
    localStorage.removeItem("soc_user");
    localStorage.removeItem("soc_token");
    navigate("/login");
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
            <button
              onClick={refreshAlerts}
              className="hover-glow-button rounded-lg border border-cyber-cyan/30 px-3 py-2 text-xs font-medium text-cyber-cyan hover:bg-cyber-cyan/10"
            >
              Refresh
            </button>
          )}
          <Link
            to="/alerts"
            className="hover-glow-button rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
          >
            Investigate
          </Link>
          <div className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
            {user?.name || "SOC Analyst"}
          </div>
          <button onClick={logout} className="hover-glow-button rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
