import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useAlerts } from "../context/AlertsContext";
import { useTelemetry } from "../context/TelemetryContext";

function averageHistory(history) {
  const buckets = history.reduce((acc, row) => {
    acc[row.label] = acc[row.label] || { label: row.label, count: 0, cpu: 0, ram: 0 };
    acc[row.label].count += 1;
    acc[row.label].cpu += Number(row.cpu || 0);
    acc[row.label].ram += Number(row.ram || 0);
    return acc;
  }, {});

  return Object.values(buckets).slice(-18).map((row) => ({
    label: row.label,
    cpu: Math.round(row.cpu / row.count),
    ram: Math.round(row.ram / row.count),
  }));
}

function timeStamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "sync pending";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function SummaryCard({ label, value, detail, tone = "cyan" }) {
  const tones = {
    cyan: "text-cyber-cyan shadow-cyber-cyan/20",
    green: "text-cyber-green shadow-cyber-green/20",
    red: "text-cyber-red shadow-cyber-red/20",
  };

  return (
    <motion.div
      className="glass cyber-border hover-glow-card static-visual-surface rounded-lg p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </motion.div>
  );
}

function MetricChart({ title, dataKey, color, data, updatedAt }) {
  return (
    <motion.div
      className="glass cyber-border hover-glow-card static-visual-surface rounded-lg p-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">{title}</div>
          <div className="mt-1 text-xs text-slate-500">Percent utilization over recent telemetry samples</div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400">
          Updated {updatedAt}
        </div>
      </div>
      <div className="static-visual-surface h-56 sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -18, right: 10, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`${dataKey}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.34} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{
                background: "rgba(2,8,23,.92)",
                border: "1px solid rgba(34,211,238,.28)",
                borderRadius: "8px",
                boxShadow: "0 18px 50px rgba(0,0,0,.45)",
              }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(value) => [`${value}%`, title.replace(" Usage", "")]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.4}
              fill={`url(#${dataKey}-fill)`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default function SystemHealth() {
  const { alerts } = useAlerts();
  const { endpointStatus, history, summary, offline: telemetryOffline } = useTelemetry();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const chartData = useMemo(() => averageHistory(history), [history]);
  const online = endpointStatus.filter((endpoint) => endpoint.status === "Online").length;
  const offline = endpointStatus.length - online;
  const totalThreats = alerts.filter((alert) => String(alert.prediction).toLowerCase() !== "safe").length;
  const lastTelemetry = history.at(-1)?.timestamp;
  const updatedAt = lastTelemetry ? timeStamp(lastTelemetry) : timeStamp(clock);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-white">System Health</h1>
          <p className="mt-1 text-sm text-slate-400">Live endpoint telemetry with the duplicate panels stripped away.</p>
        </div>
        <div className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/10 px-3 py-2 text-xs text-slate-300">
          Console time <span className="ml-1 font-medium text-cyber-cyan">{timeStamp(clock)}</span>
        </div>
      </div>

      {telemetryOffline && (
        <div className="glass cyber-border rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
          Cannot connect to SOC backend server.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Online vs Offline Endpoints"
          value={`${online} / ${offline}`}
          detail={`Current fleet status from ${endpointStatus.length || 0} registered endpoints`}
          tone={offline ? "red" : "green"}
        />
        <SummaryCard
          label="Total Threat Count"
          value={totalThreats}
          detail={`AI pipeline tracking ${alerts.length} total alert records`}
          tone={totalThreats ? "red" : "cyan"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MetricChart title="CPU Usage" dataKey="cpu" color="#22d3ee" data={chartData} updatedAt={updatedAt} />
        <MetricChart title="RAM Usage" dataKey="ram" color="#39ff88" data={chartData} updatedAt={updatedAt} />
      </div>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400 sm:grid-cols-3">
        <div>Average CPU <span className="text-slate-100">{summary.cpu}%</span></div>
        <div>Average RAM <span className="text-slate-100">{summary.ram}%</span></div>
        <div>Last sample <span className="text-slate-100">{updatedAt}</span></div>
      </div>
    </div>
  );
}
