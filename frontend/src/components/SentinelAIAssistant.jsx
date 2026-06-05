import { useEffect, useMemo, useState } from "react";
import { Bot, HelpCircle, Info, PlayCircle, ShieldCheck, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "./SentinelAIAssistant.css";

const pageHelp = {
  "/dashboard": {
    title: "SOC Dashboard",
    about: "This page summarizes telemetry, alerts, endpoint health, threat status, and AI risk scoring across your team.",
    steps: [
      { selector: "h1", title: "SOC Overview", text: "Start here for the command dashboard context and current workspace status." },
      { selector: ".ai-core-panel", title: "AI Core", text: "This panel summarizes protection posture, endpoint activity, and threat response readiness." },
      { selector: ".endpoint-matrix-grid, .soc-topology-map", title: "Endpoints", text: "Endpoint visualizations show which machines are active and how their risk is changing." },
      { selector: "table, .activity-line", title: "Events", text: "Review live detections, telemetry updates, and recent alert activity here." },
    ],
  },
  "/alerts": {
    title: "Alerts Panel",
    about: "This page explains malware alerts, predictions, severity, risk score, and response actions.",
    steps: [
      { selector: "h1", title: "Alert Workspace", text: "Use this page to review endpoint detections and suspicious file activity." },
      { selector: "table", title: "Alert Table", text: "Each row shows the file, endpoint, prediction, risk, action, and timestamp." },
    ],
  },
  "/endpoint-details": {
    title: "Endpoint Details",
    about: "This page explains endpoint registration, agent status, health, telemetry, and admin-only control actions.",
  },
  "/endpoints": {
    title: "Endpoint Details",
    about: "This page explains endpoint registration, agent status, health, telemetry, and admin-only control actions.",
    steps: [
      { selector: "form", title: "Register Endpoint", text: "Register a machine here before downloading and installing its agent package." },
      { selector: ".grid.gap-4", title: "Endpoint Cards", text: "Endpoint cards show agent mode, telemetry, alerts, and admin controls." },
    ],
  },
  "/quarantine": {
    title: "Quarantine",
    about: "This page explains quarantined files, restore/delete actions, and safe containment status.",
    steps: [
      { selector: "h1", title: "Quarantine View", text: "Use this page to verify isolated files and safe containment actions." },
      { selector: "table, .glass", title: "Quarantine Items", text: "Each item represents a suspicious or malicious file held away from the endpoint." },
    ],
  },
  "/settings": {
    title: "Settings",
    about: "This page explains admin settings, refresh behavior, presentation mode, and other dashboard preferences.",
  },
  "/endpoint-portal": {
    title: "Endpoint Portal",
    about: "This page shows My Endpoint, My Alerts, My Quarantine, and telemetry summary for the linked endpoint only.",
    steps: [
      { selector: "h1", title: "My Endpoint", text: "This endpoint portal is scoped to your own assigned machine." },
      { selector: ".grid.gap-4", title: "Endpoint Summary", text: "These cards summarize your endpoint status, alerts, quarantine state, and telemetry." },
      { selector: "#alerts", title: "My Alerts", text: "Only alerts from your linked endpoint appear in this section." },
      { selector: "#quarantine", title: "My Quarantine", text: "This section shows quarantine status for your endpoint." },
    ],
  },
  "/about": {
    title: "About Us",
    about: "This page explains Sentinel SOC, project links, owner contact, safety notes, and core features.",
    steps: [
      { selector: "h1", title: "About Sentinel SOC", text: "This page introduces the project, usage flow, and safety guidance." },
      { selector: "select", title: "Language", text: "Use this control to switch the About page language." },
      { selector: "section:nth-of-type(1)", title: "Project Summary", text: "This section explains what Sentinel SOC does and why it exists." },
      { selector: "section:last-of-type", title: "Project Links", text: "Find owner contact, GitHub, frontend, and backend links here." },
    ],
  },
};

const fallbackHelp = {
  title: "This Page",
  about: "I can explain the visible sections, controls, and Sentinel SOC workflow on this page.",
  steps: [
    { selector: "h1", title: "Page Header", text: "Start from the page heading to understand the current workflow." },
    { selector: ".glass", title: "Main Panel", text: "Panels contain the most important controls and status information." },
  ],
};

function pageKey(pathname) {
  if (pathname.startsWith("/alerts/")) return "/alerts";
  return pageHelp[pathname] ? pathname : pathname === "/endpoint-details" ? "/endpoints" : pathname;
}

function getStepPosition(element) {
  const rect = element.getBoundingClientRect();
  const top = Math.min(window.innerHeight - 180, Math.max(80, rect.top + rect.height / 2 - 70));
  const left = rect.left + rect.width / 2 > window.innerWidth / 2 ? 24 : window.innerWidth - 344;
  return { top, left };
}

export default function SentinelAIAssistant() {
  const location = useLocation();
  const config = useMemo(() => pageHelp[pageKey(location.pathname)] || fallbackHelp, [location.pathname]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [tutorial, setTutorial] = useState({ running: false, index: 0, step: null, target: null, position: null });

  function clearHighlight() {
    document.querySelectorAll(".sentinel-ai-highlight").forEach((element) => {
      element.classList.remove("sentinel-ai-highlight");
    });
  }

  function endTutorial(text = "Tutorial ended. You can restart it anytime from Start Tutorial.") {
    clearHighlight();
    setTutorial({ running: false, index: 0, step: null, target: null, position: null });
    setMessage(text);
  }

  function showStep(index) {
    clearHighlight();
    const steps = config.steps || fallbackHelp.steps;
    const step = steps[index];
    if (!step) {
      endTutorial("Tutorial complete. You can restart it anytime from Start Tutorial.");
      return;
    }

    const target = document.querySelector(step.selector) || document.querySelector("main");
    if (!target) {
      endTutorial("I could not find a visible tutorial target on this page.");
      return;
    }

    target.classList.add("sentinel-ai-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      setTutorial({
        running: true,
        index,
        step,
        target,
        position: getStepPosition(target),
      });
    }, 240);
  }

  function startTutorial() {
    setOpen(false);
    setMessage("");
    showStep(0);
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && tutorial.running) {
        endTutorial();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tutorial.running]);

  useEffect(() => {
    endTutorial("");
  }, [location.pathname]);

  useEffect(() => clearHighlight, []);

  return (
    <>
      {tutorial.running && tutorial.step && (
        <div
          className="sentinel-ai-tutorial"
          style={{ top: tutorial.position?.top || 120, left: tutorial.position?.left || 24 }}
        >
          <div className="sentinel-ai-tutorial-title">{tutorial.step.title}</div>
          <p>{tutorial.step.text}</p>
          <div className="sentinel-ai-tutorial-actions">
            <button type="button" onClick={() => showStep(tutorial.index + 1)}>Next</button>
            <button type="button" onClick={() => endTutorial()}>Skip</button>
          </div>
        </div>
      )}

      <div className="sentinel-ai-assistant">
        {open && (
          <section className="sentinel-ai-panel" aria-label="Sentinel AI Assistant">
            <div className="sentinel-ai-panel-header">
              <div>
                <span>Sentinel AI</span>
                <strong>{config.title}</strong>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Sentinel AI Assistant">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="sentinel-ai-welcome">
              Hi, I am Sentinel AI Assistant.
              <br />
              I can help you understand this page.
              <br />
              You can ask doubts or start a tutorial.
              <br />
              <br />
              Tip: Press ESC anytime to end the tutorial.
            </p>
            {message && <div className="sentinel-ai-message">{message}</div>}
            <div className="sentinel-ai-options">
              <button type="button" onClick={() => setMessage("Ask me about any visible metric, alert, endpoint, or control on this page.")}>
                <HelpCircle className="h-4 w-4" />
                Ask Doubt
              </button>
              <button type="button" onClick={startTutorial}>
                <PlayCircle className="h-4 w-4" />
                Start Tutorial
              </button>
              <button type="button" onClick={() => setMessage(config.about)}>
                <Info className="h-4 w-4" />
                About This Page
              </button>
              <button type="button" onClick={() => setMessage("The endpoint agent runs silently, sends heartbeat and telemetry, scans Downloads for suspicious files, and follows dashboard pause/resume/stop/remove commands.")}>
                How Agent Works
              </button>
              <button type="button" onClick={() => setMessage("Quarantine moves malicious or high-risk files into a safe holding folder and records metadata for review or restore by admins.")}>
                How Quarantine Works
              </button>
              <button type="button" onClick={() => setMessage("Endpoint monitoring combines heartbeat, telemetry, AI file detection, alerts, and endpoint health status for each linked machine.")}>
                How Endpoint Monitoring Works
              </button>
            </div>
          </section>
        )}

        <button
          type="button"
          className="sentinel-ai-orb"
          aria-label="Open Sentinel AI Assistant"
          onClick={() => setOpen((current) => !current)}
        >
          <Bot className="h-7 w-7" />
          <ShieldCheck className="sentinel-ai-mini-shield h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
