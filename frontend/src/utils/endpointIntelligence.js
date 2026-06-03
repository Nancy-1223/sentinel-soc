export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

export function isThreat(alert) {
  return String(alert?.prediction || "").toLowerCase() !== "safe";
}

export function riskLevel(score = 0) {
  const value = Number(score) || 0;
  if (value >= 71) return { label: "High", tone: "red" };
  if (value >= 31) return { label: "Medium", tone: "amber" };
  return { label: "Low", tone: "green" };
}

export function endpointTone(endpoint) {
  const mode = String(endpoint?.agent_mode || "running").toLowerCase();
  const status = String(endpoint?.status || "").toLowerCase();
  const risk = Number(endpoint?.riskScore || endpoint?.max_risk_score || endpoint?.maxRisk || 0);
  if (mode === "stopped" || status === "offline") return "red";
  if (mode === "paused" || endpoint?.detection_enabled === false || risk >= 31) return risk >= 71 ? "red" : "amber";
  return "green";
}

export function formatDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function buildEndpointRows(endpointStatus = [], latestTelemetry = [], alerts = []) {
  const rows = new Map();

  alerts.forEach((alert) => {
    const current = rows.get(alert.endpoint_id) || {};
    rows.set(alert.endpoint_id, {
      ...current,
      endpoint_id: alert.endpoint_id,
      pc_name: alert.pc_name || current.pc_name,
      status: current.status || "Observed",
      protection_status: Number(alert.risk_score || 0) >= 70 ? "Under Attack" : "Protected",
      max_risk_score: Math.max(Number(current.max_risk_score || 0), Number(alert.risk_score || 0)),
      total_alerts: Number(current.total_alerts || 0) + 1,
    });
  });

  latestTelemetry.forEach((row) => {
    const current = rows.get(row.endpoint_id) || {};
    rows.set(row.endpoint_id, {
      ...current,
      endpoint_id: row.endpoint_id,
      pc_name: row.pc_name || current.pc_name,
      telemetry: row,
      status: current.status || "Online",
    });
  });

  endpointStatus.forEach((endpoint) => {
    rows.set(endpoint.endpoint_id, {
      ...rows.get(endpoint.endpoint_id),
      ...endpoint,
    });
  });

  return Array.from(rows.values())
    .map((endpoint) => enrichEndpoint(endpoint, alerts))
    .sort((a, b) => Number(a.endpoint_id || 0) - Number(b.endpoint_id || 0));
}

export function enrichEndpoint(endpoint, alerts = []) {
  const endpointAlerts = alerts.filter((alert) => String(alert.endpoint_id) === String(endpoint.endpoint_id));
  const maliciousAlerts = endpointAlerts.filter((alert) => String(alert.prediction).toLowerCase() === "malicious");
  const suspiciousFiles = endpointAlerts.filter((alert) => String(alert.prediction).toLowerCase() === "suspicious");
  const quarantined = endpointAlerts.filter((alert) => String(alert.action_taken).toLowerCase().includes("quarantine"));
  const telemetry = endpoint.telemetry || {};
  const mode = String(endpoint.agent_mode || "running").toLowerCase();
  const detectionEnabled = endpoint.detection_enabled !== false;
  const lastSeenTime = endpoint.last_seen ? new Date(endpoint.last_seen).getTime() : 0;
  const stale = !lastSeenTime || Date.now() - lastSeenTime > 30000;
  const reasons = [];

  let score = 0;
  if (maliciousAlerts.length) {
    score += maliciousAlerts.length * 24;
    reasons.push(`${maliciousAlerts.length} malware alert${maliciousAlerts.length === 1 ? "" : "s"}`);
  }
  if (suspiciousFiles.length) {
    score += suspiciousFiles.length * 12;
    reasons.push(`${suspiciousFiles.length} suspicious file${suspiciousFiles.length === 1 ? "" : "s"}`);
  }
  if (quarantined.length) {
    score += quarantined.length * 8;
    reasons.push(`${quarantined.length} quarantine action${quarantined.length === 1 ? "" : "s"}`);
  }
  if (mode === "paused") {
    score += 16;
    reasons.push("agent paused");
  }
  if (mode === "stopped") {
    score += 28;
    reasons.push("agent stopped");
  }
  if (!detectionEnabled) {
    score += 18;
    reasons.push("detection paused");
  }
  if (stale || endpoint.status !== "Online") {
    score += 16;
    reasons.push("endpoint offline or stale");
  }
  if (Number(telemetry.cpu || 0) >= 85) {
    score += 10;
    reasons.push("high CPU usage");
  }
  if (Number(telemetry.ram || 0) >= 85) {
    score += 10;
    reasons.push("high memory usage");
  }

  const riskScore = clamp(Math.max(score, Number(endpoint.max_risk_score || 0)));
  const healthScore = clamp(100 - riskScore - (Number(telemetry.cpu || 0) > 80 ? 8 : 0) - (Number(telemetry.ram || 0) > 80 ? 8 : 0));
  const level = riskLevel(riskScore);

  return {
    ...endpoint,
    riskScore,
    riskLevel: level.label,
    riskTone: level.tone,
    riskReasons: reasons.length ? reasons : ["normal telemetry and protection state"],
    healthScore,
    agentVersion: telemetry.agent_version || "unknown",
    uptimeSeconds: telemetry.uptime_seconds || 0,
    detectionStatus: detectionEnabled && mode === "running" ? "Detection Active" : "Detection Paused",
    agentModeLabel: mode === "paused" ? "Agent Paused" : mode === "stopped" ? "Agent Stopped" : "Agent Running",
  };
}
