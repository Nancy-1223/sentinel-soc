import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useAlerts } from "../context/AlertsContext";
import { useSettings } from "../context/SettingsContext";
import { useTelemetry } from "../context/TelemetryContext";
import { formatDate } from "../utils/format";

const GLOBAL_LOCATIONS = [
  { key: "india", pcName: "SOC-INDIA-CORE", label: "India", location: "India", x: 716, y: 189, prediction: "Endpoint telemetry", riskScore: 38 },
  { key: "singapore", pcName: "SOC-SINGAPORE-EDGE", label: "Singapore", location: "Singapore", x: 788, y: 246, prediction: "Credential probe", riskScore: 56 },
  { key: "tokyo", pcName: "SOC-TOKYO-EDGE", label: "Tokyo", location: "Tokyo, Japan", x: 888, y: 151, prediction: "Malware beacon", riskScore: 72 },
  { key: "london", pcName: "SOC-LONDON-GW", label: "London", location: "London, United Kingdom", x: 500, y: 107, prediction: "Recon activity", riskScore: 34 },
  { key: "new-york", pcName: "SOC-NEWYORK-GW", label: "New York", location: "New York, United States", x: 294, y: 137, prediction: "Brute force", riskScore: 67 },
];

const LABEL_OFFSETS = {
  India: { x: -20, y: -22, anchor: "end" },
  Singapore: { x: 20, y: 28, anchor: "start" },
  Tokyo: { x: 20, y: -18, anchor: "start" },
  London: { x: 18, y: -18, anchor: "start" },
  "New York": { x: 18, y: -18, anchor: "start" },
};

const ROUTES = [
  ["New York", "London"],
  ["London", "India"],
  ["Tokyo", "Singapore"],
  ["Singapore", "India"],
  ["New York", "Tokyo"],
];

function severityFromRisk(riskScore) {
  if (riskScore >= 65) return "high";
  if (riskScore >= 40) return "medium";
  return "low";
}

function buildGlobalMarkers(alerts, endpointStatus) {
  const totalThreats = alerts.filter((alert) => String(alert.prediction).toLowerCase() !== "safe").length;
  const highestRisk = alerts.length ? Math.max(...alerts.map((alert) => Number(alert.risk_score || 0))) : 0;
  const online = endpointStatus.filter((endpoint) => endpoint.status === "Online").length;
  const lastAlert = alerts[0];

  return GLOBAL_LOCATIONS.map((location) => {
    const isIndia = location.label === "India";
    const riskScore = isIndia && highestRisk ? highestRisk : location.riskScore;
    const prediction = isIndia && lastAlert ? lastAlert.prediction : location.prediction;

    return {
      ...location,
      pcName: isIndia && lastAlert?.pc_name ? lastAlert.pc_name : location.pcName,
      prediction,
      riskScore,
      status: isIndia ? `${online} endpoints online` : "Global watch node",
      lastSeen: lastAlert?.created_at || new Date().toISOString(),
      totalThreats,
      severity: severityFromRisk(riskScore),
    };
  });
}

function routePath(source, target) {
  const midX = (source.x + target.x) / 2;
  const distance = Math.abs(source.x - target.x);
  const midY = Math.min(source.y, target.y) - Math.max(55, distance * 0.18);
  return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
}

function AtlasWorldMap() {
  return (
    <g>
      <g className="atlas-land" fill="rgba(15, 118, 110, 0.34)" stroke="rgba(125, 211, 252, 0.34)" strokeWidth="1.2">
        <path d="M121 103 L160 76 L221 63 L286 78 L333 107 L348 153 L330 196 L293 224 L246 220 L218 252 L164 239 L137 202 L98 187 L79 146 Z" />
        <path d="M202 222 L242 235 L263 278 L251 333 L224 395 L193 452 L169 418 L165 358 L147 308 L165 263 Z" />
        <path d="M431 88 L480 65 L544 70 L599 97 L625 139 L602 177 L541 178 L507 155 L455 164 L414 132 Z" />
        <path d="M518 178 L568 182 L613 208 L633 262 L616 325 L573 349 L533 318 L501 255 Z" />
        <path d="M603 101 L681 72 L768 76 L861 105 L936 153 L918 211 L837 225 L785 204 L720 218 L674 184 L606 166 Z" />
        <path d="M675 214 L733 224 L785 254 L828 301 L814 350 L754 344 L711 303 L661 282 Z" />
        <path d="M822 352 L884 369 L921 421 L894 456 L830 438 L802 392 Z" />
        <path d="M116 392 L185 380 L252 398 L292 430 L251 461 L158 462 L93 435 Z" opacity="0.72" />
        <path d="M447 63 L479 48 L505 58 L494 82 L458 85 Z" opacity="0.82" />
        <path d="M865 137 L907 126 L943 140 L934 163 L886 164 Z" opacity="0.86" />
        <path d="M736 259 L767 266 L779 291 L756 306 L731 290 Z" opacity="0.84" />
      </g>

      <g className="atlas-borders" fill="none" stroke="rgba(186, 230, 253, 0.22)" strokeLinecap="round" strokeWidth="0.75">
        <path d="M152 80 L172 129 L160 183 L194 225" />
        <path d="M210 67 L225 121 L214 176 L245 220" />
        <path d="M278 81 L286 134 L322 159 L296 213" />
        <path d="M171 264 L214 292 L233 339 L209 397" />
        <path d="M432 114 L482 120 L516 91 L552 140 L602 144" />
        <path d="M455 162 L503 154 L542 178" />
        <path d="M541 186 L558 237 L540 292 L570 342" />
        <path d="M604 112 L674 130 L723 105 L780 131 L844 126 L915 160" />
        <path d="M653 166 L707 181 L754 168 L816 204" />
        <path d="M686 222 L729 238 L773 231 L812 298" />
        <path d="M706 303 L752 286 L813 330" />
        <path d="M829 375 L875 395 L896 434" />
      </g>

      <g className="atlas-region-label">
        <text x="202" y="151">NORTH AMERICA</text>
        <text x="210" y="350">SOUTH AMERICA</text>
        <text x="505" y="125">EUROPE</text>
        <text x="559" y="269">AFRICA</text>
        <text x="737" y="153">ASIA</text>
        <text x="853" y="416">AUSTRALIA</text>
      </g>
    </g>
  );
}

function TooltipCard({ marker }) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-50 w-72 rounded-lg border border-cyber-cyan/30 bg-[#07111f] p-4 text-sm shadow-[0_16px_42px_rgba(0,0,0,.45)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-white">{marker.pcName}</div>
        <div className={`rounded-full px-2 py-0.5 text-[11px] ${marker.severity === "high" ? "bg-cyber-red/15 text-cyber-red" : marker.severity === "medium" ? "bg-cyber-amber/15 text-cyber-amber" : "bg-cyber-green/15 text-cyber-green"}`}>
          {marker.severity.toUpperCase()}
        </div>
      </div>
      <div className="mt-3 space-y-2 text-slate-300">
        <div>Location <span className="float-right text-slate-100">{marker.location}</span></div>
        <div>Prediction <span className="float-right text-slate-100">{marker.prediction}</span></div>
        <div>Risk score <span className="float-right text-cyber-amber">{marker.riskScore}</span></div>
        <div>Last seen <span className="float-right text-slate-100">{formatDate(marker.lastSeen)}</span></div>
      </div>
    </div>
  );
}

export default function AttackMap({ large = false }) {
  const { alerts } = useAlerts();
  const { endpointStatus } = useTelemetry();
  const { settings } = useSettings();
  const [activeLabel, setActiveLabel] = useState(null);
  const markers = useMemo(() => buildGlobalMarkers(alerts, endpointStatus), [alerts, endpointStatus]);
  const activeMarker = markers.find((marker) => marker.label === activeLabel);
  const routes = ROUTES.map(([from, to]) => {
    const source = markers.find((marker) => marker.label === from);
    const target = markers.find((marker) => marker.label === to);
    return source && target ? { source, target, path: routePath(source, target) } : null;
  }).filter(Boolean);

  return (
    <div
      className={`glass cyber-border hover-glow-card static-visual-surface relative overflow-hidden rounded-lg ${large ? "h-[560px]" : "h-80"}`}
      onDragStart={(event) => event.preventDefault()}
      onWheel={(event) => event.preventDefault()}
    >
      <div className="map-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_48%,rgba(34,211,238,.06),transparent_38%),linear-gradient(180deg,rgba(2,6,23,.2),rgba(2,6,23,.92))]" />
      <svg className="absolute inset-0 h-full w-full px-3 py-8" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dark global world map with animated SOC threat routes" draggable="false">
        <defs>
          <filter id="atlasGlow">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="atlasRoute" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="48%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.28" />
          </linearGradient>
          <radialGradient id="oceanGlow" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#0e7490" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="500" rx="18" fill="url(#oceanGlow)" />
        <g opacity="0.42" stroke="rgba(125,211,252,.18)" strokeWidth="0.8">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => <path key={`lon-${x}`} d={`M ${x} 42 V 466`} />)}
          {[90, 160, 230, 300, 370, 440].map((y) => <path key={`lat-${y}`} d={`M 42 ${y} H 958`} />)}
        </g>

        <AtlasWorldMap />

        {routes.map((route, index) => (
          <g key={`${route.source.label}-${route.target.label}`} filter="url(#atlasGlow)">
            <motion.path
              d={route.path}
              fill="none"
              stroke="url(#atlasRoute)"
              strokeLinecap="round"
              strokeWidth="3.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 0.95, 0.22] }}
              transition={{ duration: settings.presentationMode ? 4 : 2.9, repeat: Infinity, delay: index * 0.48, ease: "easeInOut" }}
            />
          </g>
        ))}

        {markers.map((marker, index) => {
          const label = LABEL_OFFSETS[marker.label];
          const color = marker.severity === "high" ? "#fb7185" : marker.severity === "medium" ? "#facc15" : "#39ff88";
          return (
            <g
              key={marker.key}
              className="map-marker cursor-pointer"
              filter="url(#atlasGlow)"
              onMouseEnter={() => setActiveLabel(marker.label)}
              onMouseLeave={() => setActiveLabel(null)}
              onFocus={() => setActiveLabel(marker.label)}
              tabIndex="0"
            >
              <motion.circle
                cx={marker.x}
                cy={marker.y}
                r="15"
                fill="none"
                stroke={color}
                strokeWidth="2"
                animate={{ r: [12, 26, 12], opacity: [0.75, 0.08, 0.75] }}
                transition={{ duration: settings.presentationMode ? 2.8 : 2.1, repeat: Infinity, delay: index * 0.18 }}
              />
              <circle className="map-marker-core" cx={marker.x} cy={marker.y} r="6" fill={color} />
              <circle cx={marker.x} cy={marker.y} r="2" fill="#ffffff" opacity="0.92" />
              <text x={marker.x + label.x} y={marker.y + label.y} textAnchor={label.anchor} className="atlas-marker-label">
                {marker.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-4 top-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Global SOC threat map</div>
        <div className="mt-1 text-sm text-cyber-cyan">India - Singapore - Tokyo - London - New York</div>
      </div>
      <div className="absolute bottom-4 left-4 rounded-md border border-cyber-cyan/15 bg-[#07111f] px-3 py-2 text-xs text-slate-400">
        {markers.length} global markers - {routes.length} animated attack paths
      </div>
      {activeMarker && <TooltipCard marker={activeMarker} />}
      <div className="scanline absolute bottom-0 left-0 h-px w-full" />
    </div>
  );
}
