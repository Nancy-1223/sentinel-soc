import { useSettings } from "../context/SettingsContext";
import { createApiClient, getApiErrorMessage } from "../api/client";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { API_BASE_URL } from "../config/api";

function Toggle({ label, checked, onChange, description }) {
  return (
    <label className="hover-glow-card flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <span>
        <span className="block text-sm text-slate-300">{label}</span>
        {description && <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`hover-glow-button relative h-6 w-11 rounded-full transition ${checked ? "bg-cyber-green" : "bg-slate-700"}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { refreshAlerts } = useAlerts();
  const { refreshTelemetry } = useTelemetry();

  async function resetDemoData() {
    const confirmed = window.confirm("Clear demo alerts, telemetry, endpoints, and quarantine files? This cannot be undone.");
    if (!confirmed) return;

    try {
      const api = createApiClient();
      await api.delete("/demo/reset");
      await Promise.all([refreshAlerts(), refreshTelemetry()]);
      window.alert("Demo data reset successfully.");
    } catch (exc) {
      window.alert(getApiErrorMessage(exc, "Could not reset demo data."));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Local SOC console preferences saved in browser storage.</p>
      </div>
      <div className="glass cyber-border hover-glow-card rounded-lg p-5">
        <div className="grid gap-4 md:grid-cols-2">
          {!settings.presentationMode && (
            <>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Backend URL</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                  value={API_BASE_URL}
                  readOnly
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Refresh Interval</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
                >
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                </select>
              </label>
            </>
          )}
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Theme</span>
            <select
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value })}
            >
              <option value="dark">Dark SOC</option>
              <option value="light">Light SOC</option>
            </select>
          </label>
          {!settings.presentationMode && (
            <>
              <Toggle label="Toast notifications" checked={settings.notifications} onChange={(value) => updateSettings({ notifications: value })} />
              <Toggle label="Auto quarantine" checked={settings.autoQuarantine} onChange={(value) => updateSettings({ autoQuarantine: value })} />
              <Toggle label="Demo mode" checked={settings.demoMode} onChange={(value) => updateSettings({ demoMode: value })} />
            </>
          )}
          <Toggle
            label="Presentation mode"
            checked={settings.presentationMode}
            onChange={(value) => updateSettings({ presentationMode: value })}
            description="Presentation Mode simplifies the SOC dashboard for live demo by hiding admin controls and showing only key security visuals."
          />
        </div>
        {!settings.presentationMode && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={resetSettings} className="hover-glow-button rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]">
              Reset Settings
            </button>
            <button onClick={resetDemoData} className="hover-glow-button rounded-md border border-cyber-red/30 px-4 py-2 text-sm font-semibold text-cyber-red hover:bg-cyber-red/10">
              Reset Demo Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
