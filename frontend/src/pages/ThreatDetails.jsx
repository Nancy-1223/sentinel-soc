import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/Button";
import { PredictionBadge, RiskBadge } from "../components/StatusBadge";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatBytes, formatDate } from "../utils/format";
import { downloadAlertReport, getAiRecommendation } from "../utils/alertReport";

export default function ThreatDetails() {
  const { id } = useParams();
  const { alerts } = useAlerts();
  const { latestTelemetry } = useTelemetry();
  const alert = alerts.find((item) => String(item.id) === String(id));
  const [notes, setNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    setNotes(localStorage.getItem(`soc_alert_notes_${id}`) || "");
    setNoteSaved(false);
  }, [id]);

  if (!alert) {
    return (
      <div className="glass cyber-border hover-glow-card rounded-lg p-6">
        <div className="text-white">Threat not found.</div>
        <Link className="mt-3 inline-block text-sm text-cyber-cyan" to="/alerts">Back to alerts</Link>
      </div>
    );
  }

  const confidence = Math.min(100, Math.max(5, Number(alert.risk_score || 0)));
  const telemetry = latestTelemetry.find((row) => String(row.endpoint_id) === String(alert.endpoint_id));
  const recommendation = getAiRecommendation(alert.risk_score);

  function saveNotes() {
    localStorage.setItem(`soc_alert_notes_${id}`, notes);
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Threat Details</h1>
          <p className="mt-1 text-sm text-slate-400">{alert.filename} on {alert.pc_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => downloadAlertReport(alert, telemetry)}
            tone="green"
            size="xs"
          >
            Generate Report
          </Button>
          <PredictionBadge value={alert.prediction} />
          <RiskBadge score={alert.risk_score} />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="glass cyber-border hover-glow-card rounded-lg p-5 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Filename", alert.filename],
              ["PC Name", alert.pc_name],
              ["Extension", alert.file_extension || "n/a"],
              ["Keyword Count", alert.keyword_count],
              ["File Size", formatBytes(alert.file_size)],
              ["Action Taken", alert.action_taken],
              ["Timestamp", formatDate(alert.created_at)],
              ["Endpoint ID", alert.endpoint_id],
            ].map(([label, value]) => (
              <div key={label} className="hover-glow-card rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
                <div className="mt-2 break-words text-sm text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <div className="hover-glow-card mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Suspicious Content</div>
            <div className="mt-3 break-words font-mono text-sm text-slate-300">{alert.suspicious_content}</div>
          </div>
          <div className="hover-glow-card mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Telemetry Snapshot</div>
            {telemetry ? (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="text-slate-300">CPU <span className="text-cyber-cyan">{Math.round(telemetry.cpu)}%</span></div>
                <div className="text-slate-300">RAM <span className="text-cyber-green">{Math.round(telemetry.ram)}%</span></div>
                <div className="text-slate-300">Disk <span className="text-cyber-amber">{Math.round(telemetry.disk)}%</span></div>
                <div className="text-slate-300">Last seen <span className="text-slate-100">{formatDate(telemetry.timestamp)}</span></div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">No telemetry snapshot available for this endpoint.</div>
            )}
          </div>
          <div className="hover-glow-card mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Analyst Notes</div>
            <textarea
              className="mt-3 min-h-32 w-full rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-100 outline-none focus:border-cyber-cyan/60"
              placeholder="Add triage notes, containment steps, or follow-up actions..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={saveNotes} tone="solidCyan">
                Save Notes
              </Button>
              {noteSaved && <span className="text-sm text-cyber-green">Notes saved locally.</span>}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass cyber-border hover-glow-card rounded-lg p-5">
            <div className="text-sm font-medium text-slate-200">AI Confidence Meter</div>
            <div className="mt-5 h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-gradient-to-r from-cyber-green via-cyber-amber to-cyber-red" style={{ width: `${confidence}%` }} />
            </div>
            <div className="mt-3 text-sm text-slate-400">{confidence}% confidence based on risk indicators.</div>
          </div>
          <div className="glass cyber-border hover-glow-card rounded-lg p-5">
            <div className="text-sm font-medium text-slate-200">Alert Timeline</div>
            <div className="mt-4 space-y-4 border-l border-cyber-cyan/25 pl-4 text-sm">
              <div><span className="text-cyber-cyan">File created</span><div className="text-slate-500">Endpoint agent detected new download.</div></div>
              <div><span className="text-cyber-cyan">AI scan</span><div className="text-slate-500">Features sent to ML prediction API.</div></div>
              <div><span className="text-cyber-cyan">Response action</span><div className="text-slate-500">{alert.action_taken}</div></div>
            </div>
          </div>
          <div className="glass cyber-border hover-glow-card rounded-lg p-5">
            <div className="text-sm font-medium text-slate-200">AI Recommendation</div>
            <div className="mt-3 rounded-md border border-cyber-cyan/20 bg-cyber-cyan/10 p-3 text-sm font-semibold text-cyber-cyan">
              {recommendation}
            </div>
            <p className="mt-3 text-sm text-slate-400">Use the recommendation to prioritize triage while preserving evidence and endpoint context.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
