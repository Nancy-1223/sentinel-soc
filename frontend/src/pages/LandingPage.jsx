import { Link } from "react-router-dom";
import { Activity, ArrowRight, BrainCircuit, LockKeyhole, MonitorUp, ShieldCheck } from "lucide-react";
import CyberBackground from "../components/CyberBackground";

export default function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem("soc_token"));
  const ctaTarget = isLoggedIn ? "/dashboard" : "/login";
  const ctaLabel = isLoggedIn ? "Go to Dashboard" : "Login to Dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-slate-100">
      <CyberBackground />
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Sentinel SOC</div>
            <div className="text-xs uppercase tracking-[0.18em] text-cyber-cyan">AI Threat Defense</div>
          </div>
        </div>
        <Link
          to={ctaTarget}
          className="hover-glow-button inline-flex items-center gap-2 rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/10 px-4 py-2 text-sm font-semibold text-white hover:bg-cyber-cyan/15"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="inline-flex rounded-full border border-cyber-cyan/25 bg-cyber-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyber-cyan">
            Multi-PC endpoint protection
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            AI-Based SOC Dashboard for Real-Time Threat Detection
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Sentinel SOC monitors endpoint PCs, detects suspicious files, streams telemetry, supports quarantine workflows, and keeps investigations organized from one professional dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={ctaTarget}
              className="hover-glow-button inline-flex items-center gap-2 rounded-lg bg-cyber-cyan px-5 py-3 text-sm font-bold text-white hover:bg-cyan-300"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/about"
              className="hover-glow-button inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/[0.04]"
            >
              Learn More
            </Link>
          </div>
        </section>

        <section className="landing-orbit glass cyber-border rounded-2xl p-5">
          <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-cyber-cyan/20 bg-white/[0.03] p-5">
            <div className="soc-scan-sweep" />
            <div className="grid gap-4">
              {[
                { icon: MonitorUp, label: "Endpoints", value: "Multi-PC Monitoring", tone: "text-cyber-cyan" },
                { icon: BrainCircuit, label: "AI Engine", value: "Malware Risk Scoring", tone: "text-cyber-green" },
                { icon: Activity, label: "Telemetry", value: "Live Health Signals", tone: "text-cyber-amber" },
                { icon: LockKeyhole, label: "Response", value: "Quarantine Vault", tone: "text-cyber-red" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="hover-glow-card rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${item.tone}`} />
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                        <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl border border-cyber-cyan/20 bg-cyber-cyan/10 p-4 text-sm text-slate-200">
              Built for clean project demos, endpoint visibility, and fast investigation workflows.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
