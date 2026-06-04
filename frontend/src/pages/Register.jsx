import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createApiClient, getApiErrorMessage } from "../api/client";
import BackendStatus from "../components/BackendStatus";
import Button from "../components/Button";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const api = createApiClient();
      await api.post("/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "admin",
      });
      setMessage("Account created. You can login now.");
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
        <h1 className="mt-3 text-xl font-semibold text-white">Create Analyst Account</h1>
        <div className="mt-5">
          <BackendStatus />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-400 outline-none" placeholder="Role" value={form.role} readOnly />
          <input className="sm:col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="sm:col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60" placeholder="Password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
