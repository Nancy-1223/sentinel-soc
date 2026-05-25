import { NavLink } from "react-router-dom";
import {
  Activity,
  Bell,
  CheckSquare,
  Gauge,
  HardDrive,
  LockKeyhole,
  Settings,
  Shield,
  UserRoundCog,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/alerts", label: "Alerts Panel", icon: Bell },
  { to: "/behavior", label: "User Behavior", icon: UserRoundCog },
  { to: "/endpoints", label: "Endpoint Details", icon: HardDrive },
  { to: "/quarantine", label: "Quarantine", icon: LockKeyhole },
  { to: "/health", label: "System Health", icon: Activity },
  { to: "/checklist", label: "Demo Checklist", icon: CheckSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="premium-sidebar fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-cyber-cyan/10 p-5 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan shadow-glow">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-cyber-cyan">Sentinel</div>
          <div className="mt-1 text-lg font-semibold text-white">AI SOC Platform</div>
          <div className="mt-1 text-xs text-slate-500">Endpoint Defense Mesh</div>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                isActive
                  ? "sidebar-link-active border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
          );
        })}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cyber-green/20 bg-cyber-green/5 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Agent Mode</div>
        <div className="mt-2 text-sm text-cyber-green">Endpoint telemetry active</div>
      </div>
    </aside>
  );
}
