import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createApiClient, getApiErrorMessage } from "../api/client";
import BackendStatus from "../components/BackendStatus";
import Button from "../components/Button";
import { getRoleHome, getUserRole } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("soc_token");
    if (!token) return;

    let cancelled = false;

    async function validateExistingSession() {
      try {
        const api = createApiClient();
        const response = await api.get("/me");
        if (cancelled) return;
        const existingUser = { ...response.data, token };
        localStorage.setItem("soc_user", JSON.stringify(existingUser));
        navigate(getRoleHome(getUserRole(existingUser)), { replace: true });
      } catch {
        localStorage.removeItem("soc_token");
        localStorage.removeItem("soc_user");
      }
    }

    validateExistingSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const api = createApiClient();
      const response = await api.post("/login", {
        email: form.email.trim(),
        password: form.password,
      });
      localStorage.setItem("soc_token", response.data.token);
      localStorage.setItem("soc_user", JSON.stringify({ ...response.data.user, token: response.data.token }));
      navigate(getRoleHome(getUserRole(response.data.user)));
    } catch (exc) {
      setError(getApiErrorMessage(exc, "Login failed. Check backend and credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="glass cyber-border hover-glow-card w-full max-w-md rounded-lg p-7"
      >
        <div className="text-xs uppercase tracking-[0.28em] text-cyber-cyan">Sentinel SOC</div>
        <h1 className="mt-3 text-xl font-semibold text-white">Analyst Login</h1>
        <p className="mt-2 text-sm text-slate-400">Access the endpoint threat monitoring console.</p>
        <div className="mt-5">
          <BackendStatus />
        </div>
        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
            placeholder="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        {error && <div className="mt-4 rounded-md border border-cyber-red/30 bg-cyber-red/10 p-3 text-sm text-cyber-red">{error}</div>}
        <Button type="submit" loading={loading} loadingText="Authenticating..." tone="solidCyan" size="lg" className="mt-6 w-full">
          Login
        </Button>
        <div className="mt-5 text-center text-sm text-slate-400">
          New SOC user? <Link className="text-cyber-cyan" to="/register">Create account</Link>
        </div>
      </motion.form>
    </div>
  );
}
