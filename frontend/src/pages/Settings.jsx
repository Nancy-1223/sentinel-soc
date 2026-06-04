import { useSettings } from "../context/SettingsContext";
import { createApiClient, getApiErrorMessage } from "../api/client";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { API_BASE_URL } from "../config/api";
import Button from "../components/Button";
import ToggleSwitch from "../components/ToggleSwitch";
import { useState } from "react";

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { refreshAlerts } = useAlerts();
  const { refreshTelemetry } = useTelemetry();
  const [resettingDemo, setResettingDemo] = useState(false);

  async function resetDemoData() {
    const confirmed = window.confirm("Clear demo alerts, telemetry, endpoints, and quarantine files? This cannot be undone.");
    if (!confirmed) return;

    try {
      setResettingDemo(true);
      const api = createApiClient();
      await api.delete("/demo/reset");
      await Promise.all([refreshAlerts(), refreshTelemetry()]);
      window.alert("Demo data reset successfully.");
    } catch (exc) {
      window.alert(getApiErrorMessage(exc, "Could not reset demo data."));
    } finally {
      setResettingDemo(false);
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
                <span className="text-sm font-semibold text-white">Backend URL</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                  value={API_BASE_URL}
                  readOnly
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-white">Refresh Interval</span>
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
            <span className="text-sm font-semibold text-white">Theme</span>
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
              <ToggleSwitch label="Toast notifications" checked={settings.notifications} onChange={(value) => updateSettings({ notifications: value })} />
              <ToggleSwitch label="Auto quarantine" checked={settings.autoQuarantine} onChange={(value) => updateSettings({ autoQuarantine: value })} />
              <ToggleSwitch label="Demo mode" checked={settings.demoMode} onChange={(value) => updateSettings({ demoMode: value })} />
            </>
          )}
          <ToggleSwitch
            label="Presentation mode"
            checked={settings.presentationMode}
            onChange={(value) => updateSettings({ presentationMode: value })}
            description="Presentation Mode simplifies the SOC dashboard for live demo by hiding admin controls and showing only key security visuals."
          />
        </div>
        {!settings.presentationMode && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={resetSettings} tone="slate">
              Reset Settings
            </Button>
            <Button onClick={resetDemoData} tone="red" loading={resettingDemo} loadingText="Resetting...">
              Reset Demo Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
