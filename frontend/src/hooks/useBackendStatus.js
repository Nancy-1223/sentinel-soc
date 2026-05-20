import { useCallback, useEffect, useState } from "react";
import { createApiClient } from "../api/client";

export function useBackendStatus() {
  const [status, setStatus] = useState("checking");

  const checkBackend = useCallback(async () => {
    try {
      const api = createApiClient();
      await api.get("/health");
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkBackend();
    const timer = window.setInterval(checkBackend, 5000);
    return () => window.clearInterval(timer);
  }, [checkBackend]);

  return {
    status,
    online: status === "online",
    offline: status === "offline",
    checking: status === "checking",
    checkBackend,
  };
}
