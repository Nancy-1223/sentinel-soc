import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAlerts } from "../context/AlertsContext";

export default function UserBehavior() {
  const { alerts } = useAlerts();
  const data = alerts.slice(0, 12).reverse().map((alert, index) => ({
    name: `E${index + 1}`,
    downloads: Math.max(1, alert.keyword_count + 1),
    risk: alert.risk_score,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">User Behavior Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">Behavioral signals derived from endpoint download and keyword activity.</p>
      </div>
      <div className="glass cyber-border hover-glow-card static-visual-surface rounded-lg p-5">
        <div className="static-visual-surface h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: "linear-gradient(145deg, rgba(16,40,71,.96), rgba(11,29,53,.94))", border: "1px solid rgba(34,211,238,.28)", borderRadius: "14px", color: "#d8e7f2" }} />
              <Line type="monotone" dataKey="risk" stroke="#22d3ee" strokeWidth={2} />
              <Line type="monotone" dataKey="downloads" stroke="#39ff88" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass cyber-border hover-glow-card rounded-lg p-4"><div className="text-sm text-slate-400">Anomaly score</div><div className="mt-2 text-2xl text-cyber-amber">42</div></div>
        <div className="glass cyber-border hover-glow-card rounded-lg p-4"><div className="text-sm text-slate-400">Risky downloads</div><div className="mt-2 text-2xl text-cyber-red">{alerts.filter((a) => a.risk_score >= 75).length}</div></div>
        <div className="glass cyber-border hover-glow-card rounded-lg p-4"><div className="text-sm text-slate-400">Normal baseline</div><div className="mt-2 text-2xl text-cyber-green">Stable</div></div>
      </div>
    </div>
  );
}
