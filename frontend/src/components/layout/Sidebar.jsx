import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CircleHelp,
  Gauge,
  HardDrive,
  LogOut,
  LockKeyhole,
  Settings,
  Shield,
  UserRoundCog,
} from "lucide-react";
import { clearSession, endpointNeedsTeam, getStoredUser, getUserRole } from "../../utils/auth";

const adminNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/alerts", label: "Alerts Panel", icon: Bell },
  { to: "/behavior", label: "User Behavior", icon: UserRoundCog },
  { to: "/endpoint-management", label: "Endpoint Management", icon: Shield },
  { to: "/quarantine", label: "Quarantine", icon: LockKeyhole },
  { to: "/health", label: "System Health", icon: Activity },
  { to: "/users", label: "Users", icon: UserRoundCog },
  { to: "/settings", label: "Settings", icon: Settings },
];

const endpointNavItems = [
  { to: "/endpoint-portal", label: "My Dashboard", icon: Gauge },
  { to: "/my-alerts", label: "My Alerts", icon: Bell },
  { to: "/my-behavior", label: "My Behavior", icon: UserRoundCog },
  { to: "/my-endpoint", label: "My Endpoint", icon: HardDrive },
  { to: "/my-quarantine", label: "My Quarantine", icon: LockKeyhole },
  { to: "/about", label: "About Us", icon: CircleHelp },
];

function SidebarFrame({ title, subtitle, navItems, footerText, onLogout }) {
  return (
    <aside className="premium-sidebar fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-cyber-cyan/10 p-5 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan shadow-glow">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-cyber-cyan">Sentinel</div>
          <div className="mt-1 text-lg font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs font-medium text-slate-400">{subtitle}</div>
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
              `sidebar-link flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "sidebar-link-active border-cyber-cyan/40 bg-cyber-cyan/10 text-white"
                  : "border-transparent text-slate-100 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
          );
        })}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="sidebar-link flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </button>
        )}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cyber-green/20 bg-cyber-green/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">SOC Mode</div>
        <div className="mt-2 text-sm text-cyber-green">{footerText}</div>
      </div>
    </aside>
  );
}

export function AdminSidebar() {
  return (
    <SidebarFrame
      title="AI SOC Platform"
      subtitle="Endpoint Defense Mesh"
      navItems={adminNavItems}
      footerText="Investigation workspace ready"
    />
  );
}

export function EndpointSidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const navItems = endpointNeedsTeam(user)
    ? [{ to: "/connect-team", label: "Connect Team", icon: HardDrive }]
    : endpointNavItems;

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <SidebarFrame
      title="Endpoint Portal"
      subtitle="Assigned endpoint view"
      navItems={navItems}
      footerText="Endpoint workspace ready"
      onLogout={logout}
    />
  );
}

export default function Sidebar() {
  const role = getUserRole(getStoredUser());
  return role === "endpoint" ? <EndpointSidebar /> : <AdminSidebar />;
}
