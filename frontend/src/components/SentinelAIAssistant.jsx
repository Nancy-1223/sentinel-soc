import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Info,
  Minus,
  PlayCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
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

const welcomeMessage = `Hi, I am Sentinel AI Assistant.
I can help you understand Sentinel SOC, explain dashboard metrics, answer questions, and guide you through tutorials.

Tip: Press ESC anytime to end the tutorial.`;

function buildResponse(question, config, pathname) {
  const query = question.toLowerCase();
  const key = pageKey(pathname);

  if (query.includes("telemetry")) {
    return "Telemetry is the live health data sent by endpoint agents: heartbeat, CPU, memory, disk, network activity, and monitoring state. Sentinel SOC uses it to confirm that endpoints are visible and protected.";
  }

  if (query.includes("ai score") || query.includes("risk score") || query.includes("threat level")) {
    return "AI score and threat level summarize detection confidence and operational risk. Higher values usually mean suspicious file behavior, repeated alerts, unhealthy endpoint state, or a response action that needs review.";
  }

  if (query.includes("severity") || query.includes("prediction")) {
    return "Alert severity tells you how urgent the event is. Prediction results show how the detection model classified the file or behavior, while risk helps prioritize the next action.";
  }

  if (query.includes("restore") || query.includes("delete")) {
    return "Restore returns a quarantined file only when you trust it. Delete removes the contained item when it is confirmed malicious or no longer needed.";
  }

  if (query.includes("install") || query.includes("agent")) {
    return "To install an agent, register the endpoint, download its agent package, extract it on the target machine, and run the installer. The agent runs silently, sends heartbeat, reports telemetry, and follows dashboard controls.";
  }

  if (query.includes("endpoint") || query.includes("status") || query.includes("offline") || query.includes("paused")) {
    return "Endpoint status reflects agent reachability and mode. Running endpoints send heartbeat and telemetry, paused endpoints send heartbeat only, stopped endpoints go offline, and removed endpoints are no longer active monitoring targets.";
  }

  if (query.includes("quarantine")) {
    return "Quarantine isolates risky files from normal execution and keeps a record for review. Admins can decide whether to restore or delete after validating the file.";
  }

  if (query.includes("alert") || query.includes("prediction") || query.includes("risk")) {
    return "Alerts are created when Sentinel SOC detects suspicious or malicious behavior. Each alert includes prediction, severity, risk, endpoint, file details, and action context for investigation.";
  }

  if (key === "/alerts") {
    if (query.includes("no alert") || query.includes("not found") || query.includes("empty")) {
      return "No alerts found usually means the linked agents have not reported suspicious files recently, detection is paused, or the endpoint is offline. Check endpoint status, agent mode, and recent telemetry before assuming the machine is clean.";
    }
    return "The Alerts page shows malware predictions, severity, risk score, endpoint name, file path, action taken, and time. Use it to decide whether to quarantine, investigate, or clear an event.";
  }

  if (key === "/quarantine") {
    return "Quarantine keeps suspicious files isolated so they cannot execute normally. Restore only when you trust the file, and delete when the item is confirmed malicious or no longer needed.";
  }

  if (key === "/endpoint-details" || key === "/endpoints") {
    return "Endpoint status combines heartbeat and agent mode. Online means heartbeat is active, Offline means heartbeat stopped or became stale, Paused means heartbeat continues but telemetry, detection, and quarantine are stopped.";
  }

  if (key === "/dashboard") {
    return "The dashboard is the SOC overview: telemetry health, endpoint status, alerts, AI score, threat level, and recent activity. Start here to understand whether your team is protected and which endpoints need attention.";
  }

  if (key === "/endpoint-portal") {
    return "The Endpoint Portal is scoped to your own machine. It shows your endpoint status, telemetry summary, alerts, and quarantine state without exposing admin-only data.";
  }

  return `${config.about} Try asking about telemetry, alerts, quarantine, endpoint status, or agent installation.`;
}

export default function SentinelAIAssistant() {
  const location = useLocation();
  const config = useMemo(() => pageHelp[pageKey(location.pathname)] || fallbackHelp, [location.pathname]);
  const [open, setOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([{ role: "bot", text: welcomeMessage }]);
  const [tutorial, setTutorial] = useState({ running: false, index: 0, step: null, target: null, position: null });
  const chatEndRef = useRef(null);

  function addBotMessage(text) {
    if (!text) return;
    setMessages((current) => [...current, { role: "bot", text }]);
  }

  function clearHighlight() {
    document.querySelectorAll(".sentinel-ai-highlight").forEach((element) => {
      element.classList.remove("sentinel-ai-highlight");
    });
  }

  function endTutorial(text = "Tutorial ended. You can restart it anytime from Start Tutorial.") {
    clearHighlight();
    setTutorial({ running: false, index: 0, step: null, target: null, position: null });
    addBotMessage(text);
    if (text) setOpen(true);
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
    setQuickActionsOpen(false);
    setOpen(false);
    showStep(0);
  }

  function sendChat(event) {
    event?.preventDefault();
    const question = chatInput.trim();
    if (!question) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "bot", text: buildResponse(question, config, location.pathname) },
    ]);
    setChatInput("");
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

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open]);

  useEffect(() => clearHighlight, []);

  return (
    <>
      {tutorial.running && tutorial.step && (
        <div
          className="sentinel-ai-tutorial"
          style={{ top: tutorial.position?.top || 120, left: tutorial.position?.left || 24 }}
        >
          <div className="sentinel-ai-tutorial-kicker">Tutorial Started</div>
          <div className="sentinel-ai-tutorial-progress">
            Step {tutorial.index + 1} of {(config.steps || fallbackHelp.steps).length}
          </div>
          <div className="sentinel-ai-tutorial-title">{tutorial.step.title}</div>
          <p>{tutorial.step.text}</p>
          <small>Press ESC anytime to end the tutorial.</small>
          <div className="sentinel-ai-tutorial-actions">
            <button type="button" disabled={tutorial.index === 0} onClick={() => showStep(tutorial.index - 1)}>Previous</button>
            <button type="button" onClick={() => showStep(tutorial.index + 1)}>Next</button>
            <button type="button" onClick={() => endTutorial()}>End Tutorial</button>
          </div>
        </div>
      )}

      <div className="sentinel-ai-assistant">
        {open && (
          <section className="sentinel-ai-panel" aria-label="Sentinel AI Assistant">
            <div className="sentinel-ai-panel-header">
              <div className="sentinel-ai-identity">
                <div className="sentinel-ai-avatar" aria-hidden="true">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <span>🤖 Sentinel AI</span>
                  <strong>Security Operations Assistant</strong>
                  <small><i /> Online</small>
                </div>
              </div>
              <div className="sentinel-ai-window-actions">
                <button type="button" onClick={() => setOpen(false)} aria-label="Minimize Sentinel AI Assistant">
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close Sentinel AI Assistant">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="sentinel-ai-context">{config.title}</div>
            <div className="sentinel-ai-chat" aria-live="polite">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`sentinel-ai-bubble sentinel-ai-bubble-${item.role}`}
                >
                  {item.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className={`sentinel-ai-quick ${quickActionsOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="sentinel-ai-quick-toggle"
                onClick={() => setQuickActionsOpen((current) => !current)}
                aria-expanded={quickActionsOpen}
              >
                <span>Quick Actions</span>
                {quickActionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {quickActionsOpen && (
                <div className="sentinel-ai-options">
                  <button type="button" onClick={startTutorial}>
                    <PlayCircle className="h-4 w-4" />
                    Start Tutorial
                  </button>
                  <button type="button" onClick={() => addBotMessage(config.about)}>
                    <Info className="h-4 w-4" />
                    About This Page
                  </button>
                  <button type="button" onClick={() => addBotMessage("The endpoint agent runs silently, sends heartbeat and telemetry, scans Downloads for suspicious files, and follows dashboard pause/resume/stop/remove commands.")}>
                    How Agent Works
                  </button>
                  <button type="button" onClick={() => addBotMessage("Quarantine moves malicious or high-risk files into a safe holding folder and records metadata for review or restore by admins.")}>
                    How Quarantine Works
                  </button>
                  <button type="button" onClick={() => addBotMessage("Endpoint monitoring combines heartbeat, telemetry, AI file detection, alerts, and endpoint health status for each linked machine.")}>
                    How Endpoint Monitoring Works
                  </button>
                </div>
              )}
            </div>
            <form className="sentinel-ai-chat-form" onSubmit={sendChat}>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask Sentinel AI..."
                aria-label="Ask Sentinel AI"
              />
              <button type="submit" aria-label="Send message">
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </form>
          </section>
        )}

        <button
          type="button"
          className="sentinel-ai-orb"
          aria-label="Open Sentinel AI Assistant"
          data-tooltip="Need help?"
          onClick={() => setOpen((current) => !current)}
        >
          <Bot className="h-7 w-7" />
          <ShieldCheck className="sentinel-ai-mini-shield h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
