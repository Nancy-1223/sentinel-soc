import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApiClient, getApiErrorMessage } from "../api/client";
import BackendStatus from "../components/BackendStatus";
import Button from "../components/Button";

export default function ConnectTeam() {
  const navigate = useNavigate();
  const [teamPassword, setTeamPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const api = createApiClient();
      const response = await api.post("/connect-team", {
        team_password: teamPassword,
      });
      const token = localStorage.getItem("soc_token");
      localStorage.setItem("soc_user", JSON.stringify({ ...response.data.user, token }));
      navigate("/endpoint-portal", { replace: true });
    } catch (exc) {
      setMessage(getApiErrorMessage(exc, "Could not connect to team."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <form onSubmit={submit} className="glass cyber-border hover-glow-card w-full max-w-md rounded-lg p-7">
        <div className="text-xs uppercase tracking-[0.28em] text-cyber-cyan">Endpoint Access</div>
        <h1 className="mt-3 text-xl font-semibold text-white">Connect Team</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Enter your Sentinel SOC team passcode to connect this endpoint user account to the admin team.
        </p>
        <div className="mt-5">
          <BackendStatus />
        </div>
        <label className="mt-6 grid gap-2 text-sm text-slate-300">
          <span>Enter Team Passcode</span>
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-cyber-cyan/60"
            placeholder="Enter Team Passcode"
            type="password"
            required
            value={teamPassword}
            onChange={(event) => setTeamPassword(event.target.value)}
          />
        </label>
        {message && <div className="mt-4 rounded-md border border-cyber-red/30 bg-cyber-red/10 p-3 text-sm text-cyber-red">{message}</div>}
        <Button type="submit" loading={loading} loadingText="Connecting..." tone="solidCyan" size="lg" className="mt-6 w-full">
          Connect Team
        </Button>
      </form>
    </div>
  );
}
