import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search, ShieldCheck, Siren } from "lucide-react";
import Button from "../components/Button";
import { PredictionBadge, RiskBadge } from "../components/StatusBadge";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatBytes, formatDate } from "../utils/format";
import { downloadIncidentReport, getAiRecommendation } from "../utils/incidentReport";

function isIncident(alert) {
  const prediction = String(alert.prediction || "").toLowerCase();
  return prediction !== "safe" || Number(alert.risk_score || 0) >= 45;
}

function stageFor(alert, override) {
  if (override) return override;
  if (String(alert.action_taken || "").toLowerCase().includes("quarantine")) return "Contained";
  if (Number(alert.risk_score || 0) >= 70) return "Triage";
  return "Review";
}

function stageClass(stage) {
  const tones = {
    Review: "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan",
    Triage: "border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber",
    Contained: "border-cyber-green/30 bg-cyber-green/10 text-cyber-green",
    Resolved: "border-cyber-green/30 bg-cyber-green/10 text-cyber-green",
  };
  return tones[stage] || tones.Review;
}

export default function IncidentInvestigation() {
  const { alerts } = useAlerts();
  const { latestTelemetry } = useTelemetry();
  const [query, setQuery] = useState("");
  const [stageOverrides, setStageOverrides] = useState({});

  const incidents = useMemo(() => {
    return alerts
      .filter(isIncident)
      .filter((alert) =>
        [alert.filename, alert.pc_name, alert.prediction, alert.action_taken]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
  }, [alerts, query]);

  function telemetryFor(alert) {
    return latestTelemetry.find((row) => String(row.endpoint_id) === String(alert.endpoint_id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Incident Investigation</h1>
          <p className="mt-1 text-sm text-slate-400">Prioritize, review, and document active endpoint security incidents.</p>
        </div>
        <label className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 md:w-80">
          <Search className="h-4 w-4 shrink-0 text-cyber-cyan" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Search incidents"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {incidents.map((alert) => {
          const stage = stageFor(alert, stageOverrides[alert.id]);
          const telemetry = telemetryFor(alert);

          return (
            <div key={alert.id} className="glass cyber-border hover-glow-card rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">{alert.filename}</div>
                  <div className="mt-1 text-sm text-slate-400">{alert.pc_name} - {formatDate(alert.created_at)}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${stageClass(stage)}`}>
                  {stage}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PredictionBadge value={alert.prediction} />
                <RiskBadge score={alert.risk_score} />
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Action</div>
                  <div className="mt-2 flex items-center gap-2 text-slate-100">
                    {String(alert.action_taken || "").toLowerCase().includes("quarantine") ? (
                      <ShieldCheck className="h-4 w-4 text-cyber-green" />
                    ) : (
                      <Siren className="h-4 w-4 text-cyber-cyan" />
                    )}
                    {alert.action_taken || "Monitoring"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">File Size</div>
                  <div className="mt-2 text-slate-100">{formatBytes(alert.file_size)}</div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/10 p-3 text-sm font-semibold text-cyber-cyan">
                {getAiRecommendation(alert.risk_score)}
              </div>

              <div className="mt-4 text-xs text-slate-400">
                {telemetry
                  ? `Latest telemetry: CPU ${Math.round(telemetry.cpu)}%, RAM ${Math.round(telemetry.ram)}%, Disk ${Math.round(telemetry.disk)}%`
                  : "No telemetry snapshot attached to this incident."}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  tone="amber"
                  size="xs"
                  onClick={() => setStageOverrides((current) => ({ ...current, [alert.id]: "Triage" }))}
                >
                  Mark Triage
                </Button>
                <Button
                  tone="green"
                  size="xs"
                  onClick={() => setStageOverrides((current) => ({ ...current, [alert.id]: "Resolved" }))}
                >
                  Mark Resolved
                </Button>
                <Button tone="cyan" size="xs" onClick={() => downloadIncidentReport(alert, telemetry)}>
                  <Download className="h-4 w-4" />
                  Report
                </Button>
                <Link
                  to={`/alerts/${alert.id}`}
                  className="hover-glow-button inline-flex items-center rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"
                >
                  Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {incidents.length === 0 && (
        <div className="glass cyber-border hover-glow-card rounded-lg p-8 text-center text-sm text-slate-400">
          No active incidents match the current search.
        </div>
      )}
    </div>
  );
}
