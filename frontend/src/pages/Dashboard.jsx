import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  DatabaseZap,
  Fingerprint,
  Gauge,
  HardDrive,
  Hexagon,
  LockKeyhole,
  Network,
  RadioTower,
  ScanLine,
  ShieldCheck,
  Siren,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AlertTable from "../components/AlertTable";
import StatCard from "../components/StatCard";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatDate } from "../utils/format";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function isThreat(alert) {
  return String(alert.prediction).toLowerCase() !== "safe";
}

function aiConfidence(alert) {
  if (!alert) return 0;
  return clamp(Math.round(Number(alert.risk_score || 0) + Number(alert.keyword_count || 0) * 2), 45, 99);
}

function threatTone(score) {
  if (score >= 70) return "red";
  if (score >= 45) return "amber";
  return "green";
}

function toneClasses(tone) {
  const tones = {
    cyan: "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan",
    green: "border-cyber-green/30 bg-cyber-green/10 text-cyber-green",
    amber: "border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber",
    red: "border-cyber-red/30 bg-cyber-red/10 text-cyber-red",
  };
  return tones[tone] || tones.cyan;
}

function toneText(tone) {
  const tones = {
    cyan: "text-cyber-cyan",
    green: "text-cyber-green",
    amber: "text-cyber-amber",
    red: "text-cyber-red",
  };
  return tones[tone] || tones.cyan;
}

function trendData(alerts) {
  const buckets = alerts.slice(0, 14).reverse().map((alert, index) => ({
    name: `T-${14 - index}`,
    risk: clamp(alert.risk_score),
    confidence: aiConfidence(alert),
  }));
  return buckets.length ? buckets : [{ name: "Now", risk: 0, confidence: 0 }];
}

function getEndpointTone(endpoint) {
  const protection = String(endpoint.protection_status || endpoint.protectionStatus || "").toLowerCase();
  const status = String(endpoint.status || "").toLowerCase();
  const risk = Number(endpoint.max_risk_score || endpoint.maxRisk || 0);
  if (protection.includes("attack") || risk >= 70) return "red";
  if (protection.includes("failure") || risk >= 45) return "amber";
  if (status !== "online") return "cyan";
  return "green";
}

function buildEndpointRows(endpointStatus, latestTelemetry, alerts) {
  const rows = new Map();

  alerts.forEach((alert) => {
    rows.set(alert.endpoint_id, {
      endpoint_id: alert.endpoint_id,
      pc_name: alert.pc_name,
      status: "Observed",
      protection_status: Number(alert.risk_score || 0) >= 70 ? "Under Attack" : "Protected",
      max_risk_score: Number(alert.risk_score || 0),
      total_alerts: 1,
    });
  });

  latestTelemetry.forEach((row) => {
    const current = rows.get(row.endpoint_id) || {};
    rows.set(row.endpoint_id, {
      ...current,
      endpoint_id: row.endpoint_id,
      pc_name: row.pc_name || current.pc_name,
      telemetry: row,
      status: current.status || "Online",
    });
  });

  endpointStatus.forEach((endpoint) => {
    rows.set(endpoint.endpoint_id, {
      ...rows.get(endpoint.endpoint_id),
      ...endpoint,
    });
  });

  return Array.from(rows.values()).sort((a, b) => Number(a.endpoint_id || 0) - Number(b.endpoint_id || 0));
}

function AiCorePanel({ summary, activeAlerts, quarantined, totalThreats, securityScore, presentationMode }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (securityScore / 100) * circumference;

  return (
    <section className="ai-core-panel cyber-border overflow-hidden rounded-2xl p-5 lg:p-6">
      <div className="soc-scan-sweep" />
      <div className="relative flex min-h-full flex-col items-center justify-between gap-5">
        <div className="max-w-xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyber-cyan">Sentinel AI Core</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100 sm:text-3xl">Autonomous Defense Core</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            AI-powered endpoint protection, telemetry scoring, and threat response.
          </p>
        </div>

        <div className="ai-core-orbit ai-core-orbit-hero mx-auto">
          <svg viewBox="0 0 140 140" className="ai-core-ring">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(148,163,184,.14)" strokeWidth="8" />
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={securityScore >= 80 ? "#39ff88" : securityScore >= 55 ? "#22d3ee" : "#facc15"}
              strokeLinecap="round"
              strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="ai-core-inner">
            <BrainCircuit className="h-10 w-10 text-cyber-cyan" />
            <div className="mt-2 text-4xl font-semibold text-white">{securityScore}</div>
            <div className="text-xs uppercase tracking-[0.16em] text-cyber-cyan">AI score</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-cyber-green/35 bg-cyber-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-green">
            Endpoint Mesh Active
          </span>
          <span className="rounded-full border border-cyber-cyan/35 bg-cyber-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-cyan">
            Threat Scanner Live
          </span>
          <span className="rounded-full border border-cyber-green/35 bg-cyber-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-green">
            Quarantine Ready
          </span>
          {presentationMode && (
            <span className="rounded-full border border-cyber-amber/35 bg-cyber-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-amber">
              Presentation Mode
            </span>
          )}
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPill icon={ShieldCheck} label="Endpoints Live" value={summary.online} tone="green" live />
          <MetricPill icon={Siren} label="Active Threats" value={activeAlerts} tone={activeAlerts ? "red" : "cyan"} live={activeAlerts > 0} />
          <MetricPill icon={LockKeyhole} label="Quarantine" value={quarantined} tone="green" />
          <MetricPill icon={DatabaseZap} label="Events" value={totalThreats + summary.online + summary.offline} tone="cyan" live />
        </div>
      </div>
    </section>
  );
}

function MetricPill({ icon: Icon, label, value, tone = "cyan", live = false }) {
  return (
    <motion.div
      className={`hover-glow-card rounded-lg border p-4 ${toneClasses(tone)}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        {live && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current shadow-[0_0_18px_currentColor]" />}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </motion.div>
  );
}

function AiThreatIntelligence({ alerts, summary, endpoints }) {
  const latestThreats = alerts.filter(isThreat).slice(0, 3);
  const latest = latestThreats[0] || alerts[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <BrainCircuit className="h-4 w-4 text-cyber-cyan" />
            AI Threat Intelligence Center
          </div>
          <span className="rounded-full border border-cyber-cyan/25 bg-cyber-cyan/10 px-2.5 py-1 text-xs text-cyber-cyan">
            Live inference
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
          <AttackConfidenceMeter alert={latest} />
          <div className="space-y-3">
            {(latestThreats.length ? latestThreats : alerts.slice(0, 3)).map((alert) => (
              <ThreatCard key={alert.id} alert={alert} />
            ))}
            {!alerts.length && (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">
                AI threat cards are standing by for endpoint detections.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <AnomalyFeed alerts={alerts} summary={summary} />
        <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
            <ScanLine className="h-4 w-4 text-cyber-amber" />
            Detection Candidates
          </div>
          {alerts.length ? (
            <div className="space-y-3">
              {alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm text-slate-200">{alert.filename}</div>
                    <div className="mt-1 text-xs text-slate-500">{alert.pc_name} - {alert.prediction}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses(threatTone(alert.risk_score))}`}>
                    {alert.risk_score}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No scanned files reported by endpoint agents yet." />
          )}
        </div>
      </div>

      <EndpointHealthCards endpoints={endpoints} />
    </div>
  );
}

function ThreatCard({ alert }) {
  const tone = threatTone(Number(alert.risk_score || 0));
  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyber-cyan/30"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-white">{alert.filename}</div>
          <div className="mt-1 text-xs text-slate-500">{alert.pc_name} - {formatDate(alert.created_at)}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses(tone)}`}>
          {alert.prediction}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <MiniMetric label="Risk" value={alert.risk_score} tone={tone} />
        <MiniMetric label="AI Conf." value={`${aiConfidence(alert)}%`} tone="cyan" />
        <MiniMetric label="Action" value={alert.action_taken || "Observe"} tone={String(alert.action_taken).toLowerCase() === "quarantined" ? "green" : "amber"} />
      </div>
    </motion.div>
  );
}

function MiniMetric({ label, value, tone = "cyan" }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-2">
      <div className="truncate uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={`mt-1 truncate font-semibold ${toneText(tone)}`}>{value}</div>
    </div>
  );
}

function AttackConfidenceMeter({ alert }) {
  const confidence = aiConfidence(alert);
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className="ai-meter rounded-2xl border border-cyber-cyan/18 p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Attack Confidence Meter</div>
      <div className="mt-5 grid place-items-center">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(148,163,184,.13)" strokeWidth="9" />
            <motion.circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke={confidence >= 70 ? "#fb7185" : confidence >= 45 ? "#facc15" : "#39ff88"}
              strokeLinecap="round"
              strokeWidth="9"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.9 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className={`text-4xl font-semibold ${toneText(threatTone(confidence))}`}>{confidence}%</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">confidence</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-400">
        {alert ? `${alert.prediction} behavior on ${alert.pc_name}` : "Awaiting AI prediction stream"}
      </div>
    </div>
  );
}

function AnomalyFeed({ alerts, summary }) {
  const latest = alerts[0];
  const anomalies = [
    { label: "CPU deviation", value: `${summary.cpu}%`, tone: summary.cpu > 75 ? "amber" : "cyan" },
    { label: "Memory pressure", value: `${summary.ram}%`, tone: summary.ram > 80 ? "amber" : "green" },
    { label: "Disk telemetry", value: `${summary.disk}%`, tone: "cyan" },
    { label: "Latest risk delta", value: latest ? `+${latest.risk_score}` : "0", tone: latest && latest.risk_score >= 45 ? "red" : "green" },
  ];

  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <ScanLine className="h-4 w-4 text-cyber-green" />
        Anomaly Detection Feed
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {anomalies.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
            <div className={`mt-2 text-xl font-semibold ${toneText(item.tone)}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndpointHealthCards({ endpoints }) {
  const top = endpoints.slice(0, 4);
  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5 xl:col-span-2">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <HardDrive className="h-4 w-4 text-cyber-cyan" />
        Endpoint Health Cards
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {top.map((endpoint) => {
          const telemetry = endpoint.telemetry || {};
          const tone = getEndpointTone(endpoint);
          return (
            <div key={endpoint.endpoint_id} className={`rounded-xl border p-3 ${toneClasses(tone)}`}>
              <div className="truncate text-sm font-semibold text-slate-100">{endpoint.pc_name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.14em] opacity-80">{endpoint.status || "Observed"}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>CPU <span className="text-slate-100">{Math.round(telemetry.cpu || 0)}%</span></div>
                <div>RAM <span className="text-slate-100">{Math.round(telemetry.ram || 0)}%</span></div>
                <div>Risk <span className="text-slate-100">{endpoint.max_risk_score || 0}</span></div>
              </div>
            </div>
          );
        })}
        {!top.length && <EmptyState text="No registered endpoints yet." />}
      </div>
    </div>
  );
}

function EndpointSecurityMatrix({ endpoints }) {
  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Fingerprint className="h-4 w-4 text-cyber-green" />
          Endpoint Security Matrix
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-cyber-green">Protected</span>
          <span className="text-cyber-amber">Suspicious</span>
          <span className="text-cyber-red">Under attack</span>
        </div>
      </div>
      {endpoints.length ? (
        <div className="endpoint-matrix-grid">
          {endpoints.map((endpoint, index) => {
          const tone = getEndpointTone(endpoint);
          return (
            <motion.div
              key={endpoint.endpoint_id}
              className={`endpoint-cell endpoint-cell-${tone}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.025 }}
            >
              <span>{endpoint.pc_name}</span>
              <small>{endpoint.status || "Observed"}</small>
            </motion.div>
          );
          })}
        </div>
      ) : (
        <EmptyState text="Endpoint matrix will populate after endpoint registration or telemetry." />
      )}
    </div>
  );
}

function SocNeuralVisualization({ endpoints, alerts }) {
  const nodeCount = Math.max(7, Math.min(12, endpoints.length + 5));
  const latestRisk = clamp(alerts[0]?.risk_score);

  return (
    <div className="glass cyber-border hover-glow-card neural-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Sparkles className="h-4 w-4 text-cyber-cyan" />
          SOC Neural Visualization
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${toneClasses(threatTone(latestRisk))}`}>
          Pulse {latestRisk || 12}
        </span>
      </div>
      <div className="neural-canvas">
        {Array.from({ length: nodeCount }).map((_, index) => (
          <span key={index} className={`neural-node neural-node-${index + 1}`} />
        ))}
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className={`neural-stream neural-stream-${index + 1}`} />
        ))}
        <div className="neural-core">
          <BrainCircuit className="h-9 w-9 text-cyber-cyan" />
          <span>AI CORE</span>
        </div>
      </div>
    </div>
  );
}

function EndpointTopology({ endpoints }) {
  const nodes = endpoints.slice(0, 9);
  return (
    <div className="glass cyber-border hover-glow-card topology-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Network className="h-4 w-4 text-cyber-cyan" />
        Interactive Endpoint Topology
      </div>
      <div className="topology-canvas">
        <div className="topology-core">
          <ShieldCheck className="h-8 w-8 text-cyber-green" />
          <span>SOC</span>
        </div>
        {nodes.map((endpoint, index) => {
          const tone = getEndpointTone(endpoint);
          return (
            <div key={endpoint.endpoint_id} className={`topology-node topology-node-${index + 1} topology-${tone}`}>
              <span>{endpoint.pc_name}</span>
            </div>
          );
        })}
        {!nodes.length && <div className="topology-empty">Register an endpoint to light up the mesh</div>}
      </div>
    </div>
  );
}

function ThreatDnaAnalyzer({ alerts, maxRisk }) {
  const latest = alerts[0];
  const confidence = aiConfidence(latest);
  const fileReputation = latest ? clamp(100 - Number(latest.risk_score || 0), 1, 100) : 100;

  return (
    <div className="glass cyber-border hover-glow-card dna-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Hexagon className="h-4 w-4 text-cyber-cyan" />
        Threat DNA Analyzer
      </div>
      <div className="dna-scanner">
        <div className="dna-ring dna-ring-outer" />
        <div className="dna-ring dna-ring-inner" />
        <div className="dna-reticle">
          <div className={`text-3xl font-semibold ${toneText(threatTone(maxRisk))}`}>{maxRisk}</div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">risk score</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniMetric label="Malware confidence" value={`${confidence}%`} tone={threatTone(confidence)} />
        <MiniMetric label="Behavior anomalies" value={latest?.keyword_count || 0} tone="amber" />
        <MiniMetric label="File reputation" value={`${fileReputation}%`} tone={fileReputation > 65 ? "green" : "red"} />
        <MiniMetric label="Containment" value={latest?.action_taken || "Ready"} tone={String(latest?.action_taken).toLowerCase() === "quarantined" ? "green" : "cyan"} />
      </div>
    </div>
  );
}

function ThreatTimeline({ alerts }) {
  const timeline = alerts.slice(0, 6);
  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
      <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-200">
        <RadioTower className="h-4 w-4 text-cyber-green" />
        AI Threat Timeline
      </div>
      <div className="threat-timeline thin-scrollbar">
        {timeline.map((alert) => {
          const tone = threatTone(Number(alert.risk_score || 0));
          return (
            <div key={alert.id} className="timeline-item">
              <span className={`timeline-dot timeline-${tone}`} />
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{formatDate(alert.created_at)}</div>
              <div className="mt-2 font-medium text-white">{alert.prediction}</div>
              <div className="mt-1 text-sm text-slate-400">{alert.action_taken || "Monitoring"} - {alert.pc_name}</div>
              <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses(tone)}`}>
                Level {alert.risk_score || 0}
              </div>
            </div>
          );
        })}
        {!timeline.length && <EmptyState text="No detections have reached the timeline yet." />}
      </div>
    </div>
  );
}

function QuarantineVault({ alerts }) {
  const quarantined = alerts.filter((alert) => String(alert.action_taken).toLowerCase() === "quarantined").slice(0, 4);
  return (
    <div className="glass cyber-border hover-glow-card vault-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <LockKeyhole className="h-4 w-4 text-cyber-green" />
        Quarantine Vault
      </div>
      <div className="vault-door">
        <LockKeyhole className="h-9 w-9 text-cyber-green" />
        <span>{quarantined.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {quarantined.map((alert) => (
          <div key={alert.id} className="vault-container">
            <div className="truncate font-medium text-white">{alert.filename}</div>
            <div className="mt-1 text-xs text-slate-500">{alert.pc_name} - isolated container</div>
          </div>
        ))}
        {!quarantined.length && <div className="vault-container text-sm text-slate-400">No files isolated in the vault.</div>}
      </div>
    </div>
  );
}

function SecurityScorePanel({ securityScore, summary, activeAlerts, avgRisk }) {
  const metrics = [
    { label: "Protected", value: `${securityScore}%`, tone: securityScore >= 80 ? "green" : "amber" },
    { label: "Detection efficiency", value: `${clamp(92 - activeAlerts * 4, 45, 99)}%`, tone: "cyan" },
    { label: "Endpoint trust", value: `${clamp(summary.online * 18 - summary.offline * 12 + 70, 20, 99)}%`, tone: summary.offline ? "amber" : "green" },
    { label: "Response speed", value: avgRisk >= 70 ? "Fast" : "Ready", tone: avgRisk >= 70 ? "green" : "cyan" },
  ];

  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Gauge className="h-4 w-4 text-cyber-cyan" />
        AI Security Score
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${toneText(metric.tone)}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildActivityLines(alerts, latestTelemetry, endpoints, summary, telemetryOffline) {
  const latest = alerts[0];
  const latestEndpoint = endpoints.find((endpoint) => endpoint.status === "Online") || endpoints[0];
  const lines = [];
  if (latestTelemetry[0]) lines.push(`[TELEMETRY] ${latestTelemetry[0].pc_name} reported CPU ${Math.round(latestTelemetry[0].cpu || 0)}% RAM ${Math.round(latestTelemetry[0].ram || 0)}%`);
  if (latestEndpoint) lines.push(`[ENDPOINT] ${latestEndpoint.pc_name} is ${latestEndpoint.status || "observed"}`);
  if (latest) lines.push(`[SCAN] ${latest.filename} scored ${latest.risk_score} on ${latest.pc_name}`);
  if (latest && String(latest.prediction).toLowerCase() !== "safe") lines.push(`[THREAT] ${latest.prediction} detection on ${latest.pc_name}`);
  if (latest && String(latest.action_taken).toLowerCase() === "quarantined") lines.push(`[VAULT] ${latest.filename} isolated successfully`);
  lines.push(telemetryOffline ? "[LINK] Backend telemetry connection degraded" : `[LINK] Mesh synchronized across ${summary.online} online endpoint(s)`);
  return lines;
}

function RealTimeActivityFeed({ alerts, latestTelemetry, endpoints, summary, telemetryOffline }) {
  const lines = buildActivityLines(alerts, latestTelemetry, endpoints, summary, telemetryOffline);

  return (
    <div className="glass cyber-border hover-glow-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
        <Terminal className="h-4 w-4 text-cyber-green" />
        Real-Time AI Activity Feed
      </div>
      {lines.length ? (
        <div className="space-y-2 font-mono text-xs sm:text-sm">
          {lines.map((line, index) => (
          <motion.div
            key={line}
            className="activity-line text-slate-300"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.12 }}
          >
            <span className={line.startsWith("[AI]") ? "text-cyber-cyan" : line.startsWith("[VAULT]") ? "text-cyber-green" : line.startsWith("[LINK]") ? "text-cyber-amber" : "text-slate-400"}>
              {line.split("]")[0]}]
            </span>
            {line.slice(line.indexOf("]") + 1)}
          </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState text="Activity feed will stream once endpoints send telemetry." />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function Dashboard() {
  const { alerts, loading, offline } = useAlerts();
  const { settings } = useSettings();
  const { summary, endpointStatus, latestTelemetry, offline: telemetryOffline } = useTelemetry();
  const endpoints = buildEndpointRows(endpointStatus, latestTelemetry, alerts);
  const totalThreats = alerts.filter(isThreat).length;
  const activeAlerts = alerts.filter((alert) => Number(alert.risk_score) >= 45).length;
  const quarantined = alerts.filter((alert) => String(alert.action_taken).toLowerCase() === "quarantined").length;
  const avgRisk = alerts.length ? Math.round(alerts.reduce((sum, alert) => sum + Number(alert.risk_score || 0), 0) / alerts.length) : 0;
  const maxRisk = alerts.length ? Math.max(...alerts.map((alert) => Number(alert.risk_score || 0))) : 0;
  const protectedEndpoints = endpoints.filter((endpoint) => getEndpointTone(endpoint) === "green").length;
  const securityScore = endpoints.length
    ? clamp(Math.round((protectedEndpoints / endpoints.length) * 100 - activeAlerts * 3 + quarantined * 2), 0, 100)
    : clamp(100 - activeAlerts * 8 - avgRisk / 3, 40, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-white">AI Cyber Command Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">AI-driven endpoint defense, threat intelligence, containment, and posture telemetry.</p>
        </div>
        {settings.presentationMode && (
          <div className="rounded-lg border border-cyber-green/25 bg-cyber-green/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyber-green">
            Presentation Mode Active
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
        <AiCorePanel
        summary={summary}
        activeAlerts={activeAlerts}
        quarantined={quarantined}
        totalThreats={totalThreats}
        securityScore={securityScore}
        presentationMode={settings.presentationMode}
        />
        <div className="grid gap-6">
          <EndpointTopology endpoints={endpoints} />
          <RealTimeActivityFeed alerts={alerts} latestTelemetry={latestTelemetry} endpoints={endpoints} summary={summary} telemetryOffline={telemetryOffline} />
        </div>
      </div>

      {(telemetryOffline || offline) && (
        <div className="glass cyber-border rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
          SOC backend connection is degraded. Cached dashboard state remains visible.
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
        <StatCard label="Total Threats" value={totalThreats} detail="Non-safe AI predictions" tone="red" icon={Zap} />
        <StatCard label="Active Alerts" value={activeAlerts} detail="Risk score above watch threshold" tone="amber" icon={Siren} />
        <StatCard label="Quarantined" value={quarantined} detail="Endpoint containment actions" tone="green" icon={LockKeyhole} />
        <StatCard label="SOC Status" value={offline ? "Offline" : "Online"} detail={`Average risk ${avgRisk}`} tone={offline ? "red" : "cyan"} icon={Activity} />
      </div>

      <AiThreatIntelligence alerts={alerts} summary={summary} endpoints={endpoints} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <EndpointSecurityMatrix endpoints={endpoints} />
        <SocNeuralVisualization endpoints={endpoints} alerts={alerts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ThreatDnaAnalyzer alerts={alerts} maxRisk={maxRisk} />
        <QuarantineVault alerts={alerts} />
        <SecurityScorePanel securityScore={securityScore} summary={summary} activeAlerts={activeAlerts} avgRisk={avgRisk} />
      </div>

      <ThreatTimeline alerts={alerts} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="glass cyber-border hover-glow-card static-visual-surface rounded-2xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Bot className="h-4 w-4 text-cyber-cyan" />
              AI Detection Trend
            </div>
            <div className="text-xs text-slate-500">Latest 14 detections</div>
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
                <Tooltip contentStyle={{ background: "linear-gradient(145deg, rgba(255,255,255,.96), rgba(239,248,255,.94))", border: "1px solid rgba(14,165,233,.26)", borderRadius: "14px", boxShadow: "0 18px 48px rgba(15,23,42,.14)", color: "#0f172a" }} />
                <Area type="monotone" dataKey="risk" stroke="#22d3ee" strokeWidth={2.8} fill="url(#riskGradient)" dot={false} animationDuration={900} />
                <Area type="monotone" dataKey="confidence" stroke="#39ff88" strokeWidth={2.2} fill="url(#confidenceGradient)" dot={false} animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass cyber-border hover-glow-card rounded-2xl p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
          <CheckCircle2 className="h-4 w-4 text-cyber-green" />
          Recent Alerts
        </div>
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
