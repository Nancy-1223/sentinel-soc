import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  LockKeyhole,
  MonitorUp,
  Radar,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";

const particles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 100}%`,
  delay: `${(index % 8) * 0.45}s`,
  size: `${4 + (index % 4) * 2}px`,
  burst: index % 5 === 0,
}));

const features = [
  { icon: MonitorUp, title: "Multi-PC Monitoring", text: "Track endpoint PCs from one command dashboard." },
  { icon: BrainCircuit, title: "AI Malware Detection", text: "Score suspicious files and prioritize risky activity." },
  { icon: Activity, title: "Real-Time Telemetry", text: "Watch CPU, RAM, disk, and endpoint health signals." },
  { icon: LockKeyhole, title: "Quarantine Vault", text: "Contain suspicious files and review response status." },
  { icon: Radar, title: "Risk Scoring", text: "Turn alerts into clear severity and triage signals." },
  { icon: Siren, title: "Incident Investigation", text: "Move from alert review to investigation workflow fast." },
];

const steps = [
  "Login to Sentinel SOC",
  "Register endpoint PCs",
  "Install the silent agent",
  "Monitor telemetry and alerts",
  "Investigate and quarantine threats",
];

export default function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem("soc_token"));
  const ctaTarget = isLoggedIn ? "/dashboard" : "/login";
  const ctaLabel = isLoggedIn ? "Go to Dashboard" : "Login to Dashboard";

  return (
    <div className="landing-page">
      <div className="landing-particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className={particle.burst ? "landing-particle landing-particle-burst" : "landing-particle"}
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>
      <div className="landing-glow landing-glow-one" aria-hidden="true" />
      <div className="landing-glow landing-glow-two" aria-hidden="true" />
      <div className="landing-glow landing-glow-three" aria-hidden="true" />

      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="Sentinel SOC home">
          <span className="landing-brand-mark">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <span>
            <span className="landing-brand-title">Sentinel SOC</span>
            <span className="landing-brand-subtitle">AI Threat Defense</span>
          </span>
        </Link>
        <nav className="landing-nav-links" aria-label="Landing page navigation">
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#contact">Contact</a>
        </nav>
        <Link to={ctaTarget} className="landing-nav-cta">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker reveal-up">
              <Sparkles className="h-4 w-4" />
              Multi-PC endpoint protection
            </div>
            <h1 className="landing-title reveal-up reveal-delay-1">
              AI-Based SOC Dashboard for Real-Time Threat Detection
            </h1>
            <p className="landing-subtitle reveal-up reveal-delay-2">
              Sentinel SOC monitors endpoint PCs, detects suspicious files, streams telemetry, supports quarantine workflows, and keeps investigations organized from one professional dashboard.
            </p>
            <div className="landing-actions reveal-up reveal-delay-3">
              <Link to={ctaTarget} className="landing-primary-button">
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="landing-secondary-button">
                Explore Features
              </a>
            </div>
          </div>

          <div className="landing-visual reveal-up reveal-delay-2">
            <div className="landing-orbit-ring" />
            <div className="landing-dashboard-card">
              <div className="landing-dashboard-header">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-scan-card">
                <BrainCircuit className="h-8 w-8 text-cyan-500" />
                <div>
                  <div className="landing-mini-label">AI Threat Engine</div>
                  <div className="landing-mini-value">Risk analysis active</div>
                </div>
              </div>
              <div className="landing-meter">
                <div />
              </div>
              <div className="landing-mini-grid">
                <span>Endpoints 12</span>
                <span>Alerts 08</span>
                <span>Telemetry Live</span>
                <span>Vault Ready</span>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="landing-section landing-reveal">
          <div className="landing-section-heading">
            <span>About Sentinel SOC</span>
            <h2>Built for clean endpoint visibility.</h2>
          </div>
          <p className="landing-section-copy">
            Sentinel SOC is an AI-Based Multi-PC Threat Detection Platform for monitoring endpoint PCs, detecting malicious files, sending telemetry to the dashboard, quarantining suspicious files, and helping analysts view endpoint health and alerts from one SOC workspace.
          </p>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-heading landing-reveal">
            <span>Key Features</span>
            <h2>Everything needed for a polished SOC demo.</h2>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="landing-feature-card landing-reveal" style={{ animationDelay: `${index * 90}ms` }}>
                  <Icon className="h-6 w-6" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="landing-section-heading landing-reveal">
            <span>How It Works</span>
            <h2>From endpoint install to investigation.</h2>
          </div>
          <div className="landing-timeline">
            {steps.map((step, index) => (
              <div key={step} className="landing-timeline-step landing-reveal" style={{ animationDelay: `${index * 120}ms` }}>
                <div className="landing-step-index">{index + 1}</div>
                <div>
                  <h3>{step}</h3>
                  <p>{index === 0 ? "Start from the secure analyst workflow." : "The dashboard updates smoothly as the SOC flow progresses."}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-safety landing-reveal">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <span>Safety Notes</span>
            <h2>Test responsibly and stay demo ready.</h2>
            <p>
              Use the EICAR test file for safe malware testing, avoid real malware, and install the endpoint agent only on devices you own or have permission to monitor.
            </p>
          </div>
        </section>

        <section id="contact" className="landing-section landing-contact landing-reveal">
          <div>
            <span>Contact</span>
            <h2>Sentinel SOC project links</h2>
          </div>
          <div className="landing-contact-links">
            <a href="https://github.com/Nancy-1223/sentinel-soc" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://sentinel-soc-nine.vercel.app" target="_blank" rel="noreferrer">Frontend</a>
            <a href="https://sentinel-soc-backend-fxb8.onrender.com" target="_blank" rel="noreferrer">Backend</a>
          </div>
        </section>
      </main>
    </div>
  );
}
