import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Cpu,
  Crosshair,
  DatabaseZap,
  Network,
  Radar,
  Server,
  ShieldCheck,
  Siren,
  Terminal,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AlertTable from "../components/AlertTable";
import AttackMap from "../components/AttackMap";
import StatCard from "../components/StatCard";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { useTelemetry } from "../context/TelemetryContext";

function trendData(alerts) {
  const buckets = alerts.slice(0, 12).reverse().map((alert, index) => ({
    name: `A${index + 1}`,
    risk: Number(alert.risk_score || 0),
    confidence: Math.min(99, Math.max(45, Number(alert.risk_score || 0) + Number(alert.keyword_count || 0) * 2)),
  }));
  return buckets.length ? buckets : [{ name: "Now", risk: 0, confidence: 0 }];
}

function StatusChip({ icon: Icon, label, value, tone = "cyan", live = false }) {
  const tones = {
    cyan: "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan",
    green: "border-cyber-green/30 bg-cyber-green/10 text-cyber-green",
    amber: "border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber",
    red: "border-cyber-red/30 bg-cyber-red/10 text-cyber-red",
  };

  return (
    <motion.div
      className={`hover-glow-card rounded-lg border p-4 ${tones[tone]}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5" />
        {live && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current shadow-[0_0_18px_currentColor]" />}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </motion.div>
  );
}

function HeroStatusSection({ summary, activeAlerts, quarantined, totalThreats, offline, presentationMode }) {
  return (
      <div className="glass cyber-border hover-glow-card static-visual-surface overflow-hidden rounded-lg p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/70 to-transparent" />
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyber-green/30 bg-cyber-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-green">
              AI Detection Engine Active
            </span>
            <span className="rounded-full border border-cyber-cyan/30 bg-cyber-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-cyan">
              Threat Monitoring Live
            </span>
            {presentationMode && (
              <span className="rounded-full border border-cyber-amber/30 bg-cyber-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-amber">
                Presentation Mode Active
              </span>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Sentinel SOC Command Center</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Enterprise-style monitoring surface for AI detections, endpoint telemetry, quarantine status, and global threat movement.
          </p>
        </div>
        <div className="grid min-w-[min(100%,560px)] grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusChip icon={Server} label="Endpoints" value={summary.online} tone="green" live />
          <StatusChip icon={Siren} label="Threats" value={activeAlerts} tone={activeAlerts ? "red" : "cyan"} live={activeAlerts > 0} />
          <StatusChip icon={ShieldCheck} label="Quarantine" value={quarantined} tone="amber" />
          <StatusChip icon={DatabaseZap} label="Events" value={totalThreats} tone={offline ? "red" : "cyan"} live={!offline} />
        </div>
      </div>
    </div>
  );
}

function CircularRiskMeter({ score }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const tone = score >= 70 ? "text-cyber-red" : score >= 45 ? "text-cyber-amber" : "text-cyber-green";

  return (
    <div className="glass cyber-border hover-glow-card static-visual-surface rounded-lg p-5">
      <div className="mb-3 text-sm font-medium text-slate-200">Circular Risk Meter</div>
      <div className="grid place-items-center py-2">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={score >= 70 ? "#fb7185" : score >= 45 ? "#facc15" : "#39ff88"}
              strokeLinecap="round"
              strokeWidth="10"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className={`text-4xl font-semibold ${tone}`}>{score}</div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">risk</div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-sm text-slate-400">Highest current alert risk score</div>
    </div>
  );
}

function MiniPanel({ label, value, detail, tone = "cyan" }) {
  const tones = {
    cyan: "text-cyber-cyan",
    green: "text-cyber-green",
    amber: "text-cyber-amber",
    red: "text-cyber-red",
  };

  return (
    <div className="hover-glow-card rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function TerminalActivity({ alerts, summary, quarantined }) {
  const latest = alerts[0];
  const lines = [
    `[INFO] Monitoring endpoint ${latest?.pc_name || "PC_2"}`,
    `[AI] ${latest?.prediction || "Threat signature"} analysis active`,
    quarantined ? `[ACTION] ${quarantined} file(s) quarantined` : "[ACTION] Quarantine engine standing by",
    `[STATUS] ${summary.online} endpoint(s) online`,
    "[STATUS] AI engine active",
  ];

  return (
    <div className="glass cyber-border hover-glow-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Terminal className="h-4 w-4 text-cyber-green" />
        Live Terminal Activity
      </div>
      <div className="space-y-2 font-mono text-xs sm:text-sm">
        {lines.map((line, index) => (
          <motion.div
            key={line}
            className="terminal-line text-slate-300"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.18, duration: 0.32 }}
          >
            <span className={line.startsWith("[AI]") ? "text-cyber-cyan" : line.startsWith("[ACTION]") ? "text-cyber-amber" : "text-cyber-green"}>
              {line.split("]")[0]}]
            </span>
            {line.slice(line.indexOf("]") + 1)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EndpointHealth({ summary }) {
  return (
    <div className="glass cyber-border hover-glow-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200"><Network className="h-4 w-4 text-cyber-cyan" />Endpoint Health</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniPanel label="Online" value={summary.online} detail="Active agents" tone="green" />
        <MiniPanel label="Offline" value={summary.offline} detail="Needs attention" tone={summary.offline ? "red" : "cyan"} />
        <MiniPanel label="CPU" value={`${summary.cpu}%`} detail="Average load" tone="cyan" />
        <MiniPanel label="RAM" value={`${summary.ram}%`} detail="Memory pressure" tone="green" />
      </div>
    </div>
  );
}

function AiConfidencePanel({ alerts }) {
  const latest = alerts[0];
  const confidence = latest
    ? Math.min(99, Math.max(50, Math.round(Number(latest.risk_score || 0) + Number(latest.keyword_count || 0) * 2)))
    : 0;

  return (
    <div className="glass cyber-border hover-glow-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200"><Bot className="h-4 w-4 text-cyber-cyan" />AI Confidence Panel</div>
      <div className="text-3xl font-semibold text-cyber-cyan">{confidence}%</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-green"
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <div className="mt-3 text-sm text-slate-400">
        {latest ? `${latest.prediction || "Unknown"} prediction on ${latest.pc_name}` : "Awaiting AI prediction data"}
      </div>
    </div>
  );
}

function QuarantineSummary({ count, activeAlerts }) {
  return (
    <div className="glass cyber-border hover-glow-card rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200"><ShieldCheck className="h-4 w-4 text-cyber-green" />Quarantine Summary</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniPanel label="Contained" value={count} detail="Files isolated" tone="green" />
        <MiniPanel label="Watchlist" value={activeAlerts} detail="High-risk alerts" tone="amber" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { alerts, loading, offline } = useAlerts();
  const { settings } = useSettings();
  const { summary, offline: telemetryOffline } = useTelemetry();
  const totalThreats = alerts.filter((alert) => String(alert.prediction).toLowerCase() !== "safe").length;
  const activeAlerts = alerts.filter((alert) => Number(alert.risk_score) >= 45).length;
  const quarantined = alerts.filter((alert) => String(alert.action_taken).toLowerCase() === "quarantined").length;
  const avgRisk = alerts.length ? Math.round(alerts.reduce((sum, alert) => sum + Number(alert.risk_score || 0), 0) / alerts.length) : 0;
  const maxRisk = alerts.length ? Math.max(...alerts.map((alert) => Number(alert.risk_score || 0))) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-white">SOC Command Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Live security posture, endpoint health, and AI threat confidence.</p>
        </div>
        {settings.presentationMode && (
          <div className="rounded-lg border border-cyber-green/25 bg-cyber-green/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyber-green">
            Presentation Mode Active
          </div>
        )}
      </div>

      <HeroStatusSection
        summary={summary}
        activeAlerts={activeAlerts}
        quarantined={quarantined}
        totalThreats={totalThreats}
        offline={offline}
        presentationMode={settings.presentationMode}
      />

      {telemetryOffline && (
        <div className="glass cyber-border rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
          Cannot connect to SOC backend server.
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass cyber-border h-28 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${settings.presentationMode ? "xl:grid-cols-4 presentation-cards" : "xl:grid-cols-4"}`}>
        <StatCard label="Total Threats" value={totalThreats} detail="Non-safe AI predictions" tone="red" icon={Crosshair} />
        <StatCard label="Active Alerts" value={activeAlerts} detail="Risk score above watch threshold" tone="amber" icon={Siren} />
        <StatCard label="Quarantined" value={quarantined} detail="Endpoint containment actions" tone="green" icon={ShieldCheck} />
        <StatCard label="SOC Status" value={offline ? "Offline" : "Online"} detail={`Average risk ${avgRisk}`} tone={offline ? "red" : "cyan"} icon={Activity} />
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <CircularRiskMeter score={maxRisk} />
        <div className="glass cyber-border hover-glow-card static-visual-surface rounded-lg p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200"><Radar className="h-4 w-4 text-cyber-cyan" />Attack Trend Graph</div>
            <div className="text-xs text-slate-500">Latest 12 alerts</div>
          </div>
          <div className="static-visual-surface h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData(alerts)} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <defs>
                  <linearGradient id="riskGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="confidenceGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#39ff88" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#39ff88" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "rgba(2,8,23,.92)", border: "1px solid rgba(34,211,238,.3)", borderRadius: "8px", boxShadow: "0 18px 48px rgba(0,0,0,.45)" }} />
                <Area type="monotone" dataKey="risk" stroke="#22d3ee" strokeWidth={2.8} fill="url(#riskGradient)" dot={false} animationDuration={900} />
                <Area type="monotone" dataKey="confidence" stroke="#39ff88" strokeWidth={2.2} fill="url(#confidenceGradient)" dot={false} animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <AiConfidencePanel alerts={alerts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <EndpointHealth summary={summary} />
        <QuarantineSummary count={quarantined} activeAlerts={activeAlerts} />
        <div className="glass cyber-border hover-glow-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200"><Cpu className="h-4 w-4 text-cyber-amber" />Live Telemetry Summary</div>
          <div className="space-y-3">
            <MiniPanel label="Highest Risk" value={maxRisk} detail="Peak alert score" tone={maxRisk >= 70 ? "red" : "amber"} />
            <MiniPanel label="Pipeline" value={offline ? "Offline" : "Online"} detail="Backend alert service" tone={offline ? "red" : "cyan"} />
          </div>
        </div>
      </div>

      <TerminalActivity alerts={alerts} summary={summary} quarantined={quarantined} />

      <AttackMap />

      <div className="glass cyber-border hover-glow-card rounded-lg p-4">
        <div className="mb-4 text-sm font-medium text-slate-200">Recent Alerts</div>
        {alerts.length ? (
          <AlertTable alerts={alerts.slice(0, settings.presentationMode ? 4 : 6)} compact={settings.presentationMode} />
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
            No alerts yet. Start an endpoint agent or drop a test file into Downloads.
          </div>
        )}
      </div>
    </div>
  );
}
