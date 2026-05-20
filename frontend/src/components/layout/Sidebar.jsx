import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/alerts", label: "Alerts Panel" },
  { to: "/map", label: "Live Attack Map" },
  { to: "/behavior", label: "User Behavior" },
  { to: "/endpoints", label: "Endpoint Details" },
  { to: "/quarantine", label: "Quarantine" },
  { to: "/health", label: "System Health" },
  { to: "/checklist", label: "Demo Checklist" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-cyber-cyan/10 bg-[#060a12] p-5 lg:block">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.28em] text-cyber-cyan">Sentinel</div>
        <div className="mt-2 text-lg font-semibold text-white">AI SOC Platform</div>
        <div className="mt-1 text-xs text-slate-500">Virus Detection System</div>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg border px-4 py-3 text-sm transition ${
                isActive
                  ? "border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-cyber-green/20 bg-cyber-green/5 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Agent Mode</div>
        <div className="mt-2 text-sm text-cyber-green">Endpoint telemetry active</div>
      </div>
    </aside>
  );
}
