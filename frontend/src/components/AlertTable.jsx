import { Link } from "react-router-dom";
import { FileWarning, ShieldCheck, Siren } from "lucide-react";
import { formatBytes, formatDate } from "../utils/format";
import Button from "./Button";
import { PredictionBadge, RiskBadge } from "./StatusBadge";

function alertRowTone(alert) {
  const prediction = String(alert.prediction || "").toLowerCase();
  const risk = Number(alert.risk_score || 0);
  if (prediction.includes("malicious") || risk >= 70) return "alert-row-malicious";
  if (prediction.includes("suspicious") || risk >= 45) return "alert-row-suspicious";
  return "";
}

export default function AlertTable({ alerts, onDeleteAlert, deletingAlertId, onGenerateReport, compact = false, showDetails = true }) {
  return (
    <div className="thin-scrollbar overflow-x-auto">
      <table className="w-full min-w-[840px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Threat</th>
            <th className="px-4 py-3">Endpoint</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Prediction</th>
            <th className="px-4 py-3">Risk</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {alerts.map((alert) => (
            <tr key={alert.id} className={`hover-glow-row hover:bg-white/[0.03] ${alertRowTone(alert)}`}>
              <td className="px-4 py-3">
                <div className="flex max-w-64 items-start gap-2 break-words font-medium text-slate-100">
                  <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-cyber-amber" />
                  <span>{alert.filename}</span>
                </div>
                {!compact && <div className="text-xs text-slate-500">{formatBytes(alert.file_size)}</div>}
              </td>
              <td className="px-4 py-3 text-slate-300">{alert.pc_name}</td>
              <td className="px-4 py-3 font-mono text-cyber-cyan">{alert.file_extension || "n/a"}</td>
              <td className="px-4 py-3">
                <PredictionBadge value={alert.prediction} />
              </td>
              <td className="px-4 py-3">
                <RiskBadge score={alert.risk_score} />
              </td>
              <td className="px-4 py-3 text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  {String(alert.action_taken).toLowerCase() === "quarantined" ? <ShieldCheck className="h-4 w-4 text-cyber-green" /> : <Siren className="h-4 w-4 text-cyber-cyan" />}
                  {alert.action_taken}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400">{formatDate(alert.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {showDetails && (
                    <Link
                      to={`/alerts/${alert.id}`}
                      className="hover-glow-button rounded-md border border-cyber-cyan/30 px-3 py-1.5 text-xs font-medium text-cyber-cyan hover:bg-cyber-cyan/10"
                    >
                      Details
                    </Link>
                  )}
                  {onDeleteAlert && (
                    <Button
                      onClick={() => onDeleteAlert(alert)}
                      loading={deletingAlertId === alert.id}
                      loadingText="Deleting..."
                      tone="red"
                      size="xs"
                    >
                      Delete
                    </Button>
                  )}
                  {onGenerateReport && (
                    <Button
                      onClick={() => onGenerateReport(alert)}
                      tone="green"
                      size="xs"
                    >
                      Report
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alerts.length === 0 && <div className="p-8 text-center text-slate-500">No alerts found.</div>}
    </div>
  );
}
