import { formatDate } from "./format";

export function getAiRecommendation(riskScore = 0) {
  const risk = Number(riskScore) || 0;
  if (risk >= 80) return "Critical action required";
  if (risk >= 60) return "Quarantine and investigate";
  if (risk >= 30) return "Monitor carefully";
  return "Low risk";
}

export function buildAlertReport(alert, telemetry) {
  const telemetryText = telemetry
    ? [
        `CPU: ${Math.round(Number(telemetry.cpu || 0))}%`,
        `RAM: ${Math.round(Number(telemetry.ram || 0))}%`,
        `Disk: ${Math.round(Number(telemetry.disk || 0))}%`,
        `Network sent: ${telemetry.network_sent || 0} bytes`,
        `Network received: ${telemetry.network_received || 0} bytes`,
        `Hostname: ${telemetry.hostname || "Unknown"}`,
        `Telemetry timestamp: ${formatDate(telemetry.timestamp)}`,
      ].join("\n")
    : "No telemetry snapshot available.";

  return [
    "AI SOC VIRUS DETECTION - ALERT REPORT",
    "=====================================",
    "",
    `Filename: ${alert.filename}`,
    `PC name: ${alert.pc_name}`,
    `Endpoint ID: ${alert.endpoint_id}`,
    `Prediction: ${alert.prediction}`,
    `Risk score: ${alert.risk_score}`,
    `Action taken: ${alert.action_taken}`,
    `Timestamp: ${formatDate(alert.created_at)}`,
    "",
    "Suspicious content:",
    alert.suspicious_content || "None recorded.",
    "",
    "Telemetry snapshot:",
    telemetryText,
    "",
    `AI recommendation: ${getAiRecommendation(alert.risk_score)}`,
  ].join("\n");
}

export function downloadAlertReport(alert, telemetry) {
  const report = buildAlertReport(alert, telemetry);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alert-report-${alert.id}-${alert.pc_name || "endpoint"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
