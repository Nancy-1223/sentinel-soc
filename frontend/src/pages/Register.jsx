import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createApiClient, getApiErrorMessage } from "../api/client";
import BackendStatus from "../components/BackendStatus";
import Button from "../components/Button";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "endpoint", teamPassword: "", confirmTeamPassword: "" });
  const [teamExists, setTeamExists] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTeamStatus() {
      try {
        const api = createApiClient();
        const response = await api.get("/team/status");
        if (!cancelled) setTeamExists(Boolean(response.data?.team_exists));
      } catch {
        if (!cancelled) setTeamExists(true);
      }
    }
    fetchTeamStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (form.role === "admin" && !teamExists && form.teamPassword !== form.confirmTeamPassword) {
      setMessage("Team passcodes do not match.");
      return;
    }
    setLoading(true);
    try {
      const api = createApiClient();
      await api.post("/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        team_password: form.role === "admin" ? form.teamPassword : undefined,
        team_password_confirm: form.role === "admin" && !teamExists ? form.confirmTeamPassword : undefined,
      });
      setMessage(form.role === "admin" ? "Admin account created successfully. You can login now." : "Account created. You can login now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (exc) {
      setMessage(getApiErrorMessage(exc, "Registration failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="glass cyber-border hover-glow-card w-full max-w-lg rounded-lg p-7">
        <div className="text-xs uppercase tracking-[0.28em] text-cyber-green">SOC Onboarding</div>
        <h1 className="mt-3 text-xl font-semibold text-white">Create Sentinel Account</h1>
        <div className="mt-5">
          <BackendStatus />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Full Name</span>
            <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Full Name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Account Type</span>
            <select className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, teamPassword: "", confirmTeamPassword: "" })}>
              <option value="admin">Admin</option>
              <option value="endpoint">Endpoint User</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
            <span>Email</span>
            <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
            <span>Create Password</span>
            <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Create Password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
            <span>Confirm Password</span>
            <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Confirm Password" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </label>
          {form.role === "admin" && (
            <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
              <span>{teamExists ? "Enter Team Passcode" : "Create Team Passcode"}</span>
              <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder={teamExists ? "Enter Team Passcode" : "Create Team Passcode"} type="password" required value={form.teamPassword} onChange={(e) => setForm({ ...form, teamPassword: e.target.value })} />
              <span className="text-xs leading-5 text-slate-500">
                {teamExists
                  ? "This is the existing team passcode used to verify authorization for admin account creation."
                  : "This creates the first team passcode. Store it securely for future admins and endpoint users."}
              </span>
              {!teamExists && (
                <>
                  <span className="mt-2">Confirm Team Passcode</span>
                  <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Confirm Team Passcode" type="password" required value={form.confirmTeamPassword} onChange={(e) => setForm({ ...form, confirmTeamPassword: e.target.value })} />
                </>
              )}
            </label>
          )}
        </div>
        {message && <div className="mt-4 text-sm text-cyber-cyan">{message}</div>}
        <Button type="submit" loading={loading} loadingText="Creating account..." tone="solidGreen" size="lg" className="mt-6 w-full">
          Register
        </Button>
        <div className="mt-5 text-center text-sm text-slate-400">
          Already registered? <Link className="text-cyber-cyan" to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
