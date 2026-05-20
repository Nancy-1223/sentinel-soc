export function formatBytes(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(value) {
  if (!value) return "Unknown";
  const text = String(value);
  const hasTimezone = /z$|[+-]\d{2}:\d{2}$/i.test(text);
  const date = new Date(hasTimezone ? text : `${text}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function riskTone(score = 0) {
  const value = Number(score) || 0;
  if (value >= 75) return "text-cyber-red border-cyber-red/30 bg-cyber-red/10";
  if (value >= 45) return "text-cyber-amber border-cyber-amber/30 bg-cyber-amber/10";
  return "text-cyber-green border-cyber-green/30 bg-cyber-green/10";
}

export function predictionTone(prediction = "") {
  const normalized = String(prediction).toLowerCase();
  if (normalized === "malicious") return "text-cyber-red border-cyber-red/30 bg-cyber-red/10";
  if (normalized === "suspicious") return "text-cyber-amber border-cyber-amber/30 bg-cyber-amber/10";
  return "text-cyber-green border-cyber-green/30 bg-cyber-green/10";
}
