import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";

function CheckItem({ label, ok, detail }) {
  return (
    <div className="glass cyber-border hover-glow-card flex items-center justify-between gap-4 rounded-lg p-4">
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{detail}</div>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ok ? "border-cyber-green/30 bg-cyber-green/10 text-cyber-green" : "border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber"}`}>
        {ok ? "Ready" : "Check"}
      </span>
    </div>
  );
}

export default function DemoChecklist() {
  const { alerts, offline: alertsOffline } = useAlerts();
  const { endpointStatus, latestTelemetry, offline: telemetryOffline } = useTelemetry();
  const onlineAgents = endpointStatus.filter((endpoint) => endpoint.status === "Online").length;
  const quarantined = alerts.filter((alert) => String(alert.action_taken).toLowerCase() === "quarantined").length;

  const items = [
    ["Backend running", !alertsOffline || !telemetryOffline, "FastAPI responds to alert or telemetry polling."],
    ["Frontend running", true, "This checklist page is loaded in the Vite app."],
    ["Agent running", onlineAgents > 0, `${onlineAgents} endpoint agent(s) currently online.`],
    ["Telemetry active", latestTelemetry.length > 0, `${latestTelemetry.length} telemetry stream(s) visible.`],
    ["Alerts working", alerts.length > 0, `${alerts.length} alert record(s) available.`],
    ["Quarantine working", quarantined > 0, `${quarantined} quarantined alert action(s) recorded.`],
    ["Map working", endpointStatus.length > 0, `${endpointStatus.length} endpoint(s) available for map markers.`],
    ["Reports working", alerts.length > 0, "Open any alert and use Generate Report."],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Demo Checklist</h1>
        <p className="mt-1 text-sm text-slate-400">Final readiness checks for the AI SOC demonstration flow.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([label, ok, detail]) => (
          <CheckItem key={label} label={label} ok={ok} detail={detail} />
        ))}
      </div>
    </div>
  );
}
