import { useMemo, useState } from "react";
import { Globe, HeartHandshake, LinkIcon, Mail, ShieldCheck } from "lucide-react";
import Button from "../components/Button";

const contactLinks = {
  owner: "Nancy",
  email: "nancy@example.com",
  github: "https://github.com/Nancy-1223/sentinel-soc",
  frontend: "https://sentinel-soc-nine.vercel.app",
  backend: "https://sentinel-soc-backend-fxb8.onrender.com",
};

const aboutTranslations = {
  en: {
    languageLabel: "Language",
    title: "About Us",
    subtitle: "Learn how Sentinel SOC protects endpoint PCs and how to use the dashboard safely.",
    aboutTitle: "About Sentinel SOC",
    aboutBody:
      "Sentinel SOC is an AI-Based Multi-PC Threat Detection Platform. It monitors endpoint PCs, detects malicious files, sends telemetry to the dashboard, quarantines suspicious files, and helps users view endpoint health and alerts from one SOC dashboard.",
    howTitle: "How To Use",
    howSteps: [
      "Login to dashboard.",
      "Register an endpoint.",
      "Download the agent package.",
      "Extract the agent package on the endpoint PC.",
      "Run install_agent.bat once.",
      "Agent starts silently in background.",
      "Endpoint appears online in dashboard.",
      "Alerts and telemetry appear automatically.",
      "Use Pause Detection / Pause Agent controls when needed.",
      "Check quarantine and incident investigation pages.",
    ],
    featuresTitle: "Key Features",
    features: [
      "Multi-PC Monitoring",
      "AI Malware Detection",
      "Silent Endpoint Agent",
      "Real-Time Telemetry",
      "Quarantine Vault",
      "Endpoint Health",
      "Risk Scoring",
      "Incident Investigation",
    ],
    safetyTitle: "Safety Notes",
    safetyNotes: [
      "Use EICAR test file only for safe malware testing.",
      "Do not test with real malware.",
      "Only install the agent on devices you own or have permission to monitor.",
      "Pause Detection can be used during safe testing.",
      "Full Stop Agent stops monitoring completely.",
    ],
    contactTitle: "Contact",
    owner: "Project Owner",
    email: "Email",
    github: "GitHub",
    frontend: "Frontend",
    backend: "Backend",
    formTitle: "Send a Message",
    name: "Name",
    message: "Message",
    submit: "Submit",
    submitting: "Saving...",
    saved: "Message saved locally for the Sentinel SOC team.",
  },
  ta: {
    languageLabel: "மொழி",
    title: "எங்களை பற்றி",
    subtitle: "Sentinel SOC endpoint PCs-ஐ எப்படி பாதுகாக்கிறது மற்றும் dashboard-ஐ பாதுகாப்பாக எப்படி பயன்படுத்துவது என்பதை அறிக.",
    aboutTitle: "Sentinel SOC பற்றி",
    aboutBody:
      "Sentinel SOC என்பது AI அடிப்படையிலான Multi-PC Threat Detection Platform. இது endpoint PCs-ஐ கண்காணிக்கிறது, தீங்கு விளைவிக்கும் files-ஐ கண்டறிகிறது, telemetry-ஐ dashboard-க்கு அனுப்புகிறது, சந்தேகமான files-ஐ quarantine செய்கிறது, மேலும் endpoint health மற்றும் alerts-ஐ ஒரே SOC dashboard-ல் பார்க்க உதவுகிறது.",
    howTitle: "எப்படி பயன்படுத்துவது",
    howSteps: [
      "Dashboard-ல் login செய்யவும்.",
      "ஒரு endpoint-ஐ register செய்யவும்.",
      "Agent package-ஐ download செய்யவும்.",
      "Endpoint PC-ல் agent package-ஐ extract செய்யவும்.",
      "install_agent.bat-ஐ ஒருமுறை run செய்யவும்.",
      "Agent background-ல் அமைதியாக start ஆகும்.",
      "Endpoint dashboard-ல் online ஆக தெரியும்.",
      "Alerts மற்றும் telemetry தானாக தோன்றும்.",
      "தேவைப்படும் போது Pause Detection / Pause Agent controls-ஐ பயன்படுத்தவும்.",
      "Quarantine மற்றும் Incident Investigation pages-ஐ பார்க்கவும்.",
    ],
    featuresTitle: "முக்கிய அம்சங்கள்",
    features: [
      "Multi-PC Monitoring",
      "AI Malware Detection",
      "Silent Endpoint Agent",
      "Real-Time Telemetry",
      "Quarantine Vault",
      "Endpoint Health",
      "Risk Scoring",
      "Incident Investigation",
    ],
    safetyTitle: "பாதுகாப்பு குறிப்புகள்",
    safetyNotes: [
      "Safe malware testing-க்கு EICAR test file மட்டும் பயன்படுத்தவும்.",
      "உண்மையான malware உடன் test செய்ய வேண்டாம்.",
      "நீங்கள் own செய்த அல்லது monitor செய்ய permission உள்ள devices-ல் மட்டும் agent-ஐ install செய்யவும்.",
      "Safe testing நேரத்தில் Pause Detection பயன்படுத்தலாம்.",
      "Full Stop Agent monitoring-ஐ முழுமையாக நிறுத்தும்.",
    ],
    contactTitle: "தொடர்பு",
    owner: "Project Owner",
    email: "Email",
    github: "GitHub",
    frontend: "Frontend",
    backend: "Backend",
    formTitle: "செய்தி அனுப்பவும்",
    name: "பெயர்",
    message: "செய்தி",
    submit: "Submit",
    submitting: "Saving...",
    saved: "உங்கள் செய்தி Sentinel SOC team-க்காக local storage-ல் save செய்யப்பட்டது.",
  },
  hi: {
    languageLabel: "भाषा",
    title: "हमारे बारे में",
    subtitle: "जानें कि Sentinel SOC endpoint PCs की सुरक्षा कैसे करता है और dashboard को सुरक्षित तरीके से कैसे उपयोग करें.",
    aboutTitle: "Sentinel SOC के बारे में",
    aboutBody:
      "Sentinel SOC एक AI-Based Multi-PC Threat Detection Platform है. यह endpoint PCs को monitor करता है, malicious files detect करता है, telemetry dashboard पर भेजता है, suspicious files को quarantine करता है, और users को एक SOC dashboard से endpoint health और alerts देखने में मदद करता है.",
    howTitle: "कैसे उपयोग करें",
    howSteps: [
      "Dashboard में login करें.",
      "एक endpoint register करें.",
      "Agent package download करें.",
      "Endpoint PC पर agent package extract करें.",
      "install_agent.bat को एक बार run करें.",
      "Agent background में silently start हो जाता है.",
      "Endpoint dashboard में online दिखाई देता है.",
      "Alerts और telemetry automatically दिखाई देते हैं.",
      "जरूरत होने पर Pause Detection / Pause Agent controls का उपयोग करें.",
      "Quarantine और Incident Investigation pages देखें.",
    ],
    featuresTitle: "मुख्य विशेषताएं",
    features: [
      "Multi-PC Monitoring",
      "AI Malware Detection",
      "Silent Endpoint Agent",
      "Real-Time Telemetry",
      "Quarantine Vault",
      "Endpoint Health",
      "Risk Scoring",
      "Incident Investigation",
    ],
    safetyTitle: "सुरक्षा नोट्स",
    safetyNotes: [
      "Safe malware testing के लिए केवल EICAR test file का उपयोग करें.",
      "Real malware से test न करें.",
      "Agent केवल उन devices पर install करें जिन्हें आप own करते हैं या monitor करने की permission रखते हैं.",
      "Safe testing के दौरान Pause Detection का उपयोग किया जा सकता है.",
      "Full Stop Agent monitoring को पूरी तरह रोक देता है.",
    ],
    contactTitle: "संपर्क",
    owner: "Project Owner",
    email: "Email",
    github: "GitHub",
    frontend: "Frontend",
    backend: "Backend",
    formTitle: "संदेश भेजें",
    name: "नाम",
    message: "संदेश",
    submit: "Submit",
    submitting: "Saving...",
    saved: "Message Sentinel SOC team के लिए local storage में save किया गया.",
  },
};

const languageOptions = [
  { key: "en", label: "English" },
  { key: "ta", label: "Tamil" },
  { key: "hi", label: "Hindi" },
];

function savedLanguage() {
  const language = localStorage.getItem("sentinel_about_language");
  return aboutTranslations[language] ? language : "en";
}

function savedMessages() {
  try {
    const messages = JSON.parse(localStorage.getItem("sentinel_contact_messages") || "[]");
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

export default function AboutUs() {
  const [language, setLanguage] = useState(savedLanguage);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const t = aboutTranslations[language];

  const contactCards = useMemo(
    () => [
      { label: t.owner, value: contactLinks.owner, icon: HeartHandshake },
      { label: t.email, value: contactLinks.email, icon: Mail },
      { label: t.github, value: contactLinks.github, icon: LinkIcon, href: contactLinks.github },
      { label: t.frontend, value: contactLinks.frontend, icon: Globe, href: contactLinks.frontend },
      { label: t.backend, value: contactLinks.backend, icon: ShieldCheck, href: contactLinks.backend },
    ],
    [t]
  );

  function changeLanguage(event) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    localStorage.setItem("sentinel_about_language", nextLanguage);
  }

  function submitContact(event) {
    event.preventDefault();
    setSaving(true);
    const nextMessage = {
      ...form,
      language,
      createdAt: new Date().toISOString(),
    };
    const messages = savedMessages();
    localStorage.setItem("sentinel_contact_messages", JSON.stringify([nextMessage, ...messages].slice(0, 25)));
    window.setTimeout(() => {
      setSaving(false);
      setNotice(t.saved);
      setForm({ name: "", email: "", message: "" });
    }, 250);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{t.title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{t.subtitle}</p>
        </div>
        <label className="min-w-56 space-y-2">
          <span className="text-sm font-semibold text-white">{t.languageLabel}</span>
          <select
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
            value={language}
            onChange={changeLanguage}
          >
            {languageOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="glass cyber-border hover-glow-card rounded-lg p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.aboutTitle}</div>
        <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">{t.aboutBody}</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <div className="glass cyber-border hover-glow-card rounded-lg p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.howTitle}</div>
          <ol className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            {t.howSteps.map((step, index) => (
              <li key={step} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <span className="mr-2 font-semibold text-cyber-cyan">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="glass cyber-border hover-glow-card rounded-lg p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.safetyTitle}</div>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {t.safetyNotes.map((note) => (
              <li key={note} className="rounded-lg border border-cyber-amber/20 bg-cyber-amber/10 p-3">
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="glass cyber-border hover-glow-card rounded-lg p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.featuresTitle}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.map((feature) => (
            <div key={feature} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold text-white">{feature}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <div className="glass cyber-border hover-glow-card rounded-lg p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.contactTitle}</div>
          <div className="mt-4 space-y-3">
            {contactCards.map((card) => {
              const Icon = card.icon;
              const content = (
                <>
                  <Icon className="h-4 w-4 shrink-0 text-cyber-cyan" />
                  <span className="min-w-28 text-slate-400">{card.label}</span>
                  <span className="break-all font-semibold text-slate-100">{card.value}</span>
                </>
              );
              return card.href ? (
                <a
                  key={card.label}
                  href={card.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover-glow-button flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm"
                >
                  {content}
                </a>
              ) : (
                <div key={card.label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={submitContact} className="glass cyber-border hover-glow-card rounded-lg p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyber-cyan">{t.formTitle}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white">{t.name}</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                value={form.name}
                required
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white">{t.email}</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                type="email"
                value={form.email}
                required
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-white">{t.message}</span>
              <textarea
                className="min-h-32 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
                value={form.message}
                required
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" tone="solidCyan" loading={saving} loadingText={t.submitting}>
              {t.submit}
            </Button>
            {notice && <div className="text-sm text-cyber-green">{notice}</div>}
          </div>
        </form>
      </section>
    </div>
  );
}
