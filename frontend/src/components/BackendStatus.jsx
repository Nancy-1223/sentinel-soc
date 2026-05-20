import { API_BASE_URL } from "../config/api";
import { useBackendStatus } from "../hooks/useBackendStatus";

export default function BackendStatus({ compact = false }) {
  const { online, offline, checking } = useBackendStatus();
  const tone = online
    ? "border-cyber-green/30 bg-cyber-green/10 text-cyber-green"
    : "border-cyber-red/30 bg-cyber-red/10 text-cyber-red";
  const label = online ? "Backend Online" : checking ? "Checking Backend" : "Backend Offline";

  return (
    <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${tone}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-cyber-green" : "bg-cyber-red"} ${checking ? "animate-pulse" : ""}`} />
        <span>{label}</span>
      </div>
      {!compact && offline && <div className="mt-1 font-normal text-slate-300">Cannot connect to SOC backend server.</div>}
      {!compact && online && <div className="mt-1 font-normal text-slate-300">{API_BASE_URL}</div>}
    </div>
  );
}
