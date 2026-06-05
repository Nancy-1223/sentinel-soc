import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { createApiClient } from "../../api/client";
import { AlertsProvider, useAlerts } from "../../context/AlertsContext";
import { TelemetryProvider } from "../../context/TelemetryContext";
import CyberBackground from "../CyberBackground";
import SentinelAIAssistant from "../SentinelAIAssistant";
import Toast from "../Toast";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { clearSession, getStoredUser, getUserRole, isInvalidTokenError, storeSession } from "../../utils/auth";

function ShellContent() {
  const { latestThreat, clearLatestThreat } = useAlerts();
  const location = useLocation();
  const deniedMessage = location.state?.deniedMessage;

  return (
    <div className="min-h-screen">
      <CyberBackground />
      <Sidebar />
      <div className="lg:pl-72">
        <Topbar />
        <main className="px-4 py-6 lg:px-8">
          {deniedMessage && (
            <div className="mb-4 glass cyber-border rounded-lg border-cyber-amber/30 p-3 text-sm text-cyber-amber">
              {deniedMessage}
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <Toast alert={latestThreat} onClose={clearLatestThreat} />
      <SentinelAIAssistant />
    </div>
  );
}

export default function AppShell() {
  const [authState, setAuthState] = useState(() => (localStorage.getItem("soc_token") ? "checking" : "invalid"));

  useEffect(() => {
    const token = localStorage.getItem("soc_token");
    if (!token) {
      console.warn("[auth] AppShell init: token missing");
      setAuthState("invalid");
      return;
    }
    console.info("[auth] AppShell init: token found", {
      tokenFound: true,
      role: getUserRole(getStoredUser()),
    });

    async function validateToken() {
      try {
        const api = createApiClient();
        const response = await api.get("/me");
        const token = localStorage.getItem("soc_token");
        const user = storeSession(response.data, token);
        console.info("[auth] /me success", {
          role: getUserRole(user),
          userId: user.id,
        });
        setAuthState("valid");
      } catch (error) {
        console.warn("[auth] /me failure", {
          status: error?.response?.status,
          message: error?.message,
          detail: error?.response?.data?.detail,
          tokenFound: Boolean(localStorage.getItem("soc_token")),
          role: getUserRole(getStoredUser()),
        });

        if (isInvalidTokenError(error)) {
          clearSession();
          setAuthState("invalid");
          return;
        }

        if (localStorage.getItem("soc_token") && getStoredUser()) {
          console.warn("[auth] Keeping local session because /me failed without a 401");
          setAuthState("valid");
          return;
        }

        clearSession();
        setAuthState("invalid");
      }
    }

    validateToken();
  }, []);

  if (authState === "checking") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="glass cyber-border rounded-lg p-6 text-sm text-cyber-cyan">Validating session...</div>
      </div>
    );
  }

  if (authState === "invalid") {
    return <Navigate to="/login" replace />;
  }

  return (
    <AlertsProvider>
      <TelemetryProvider>
        <ShellContent />
      </TelemetryProvider>
    </AlertsProvider>
  );
}
