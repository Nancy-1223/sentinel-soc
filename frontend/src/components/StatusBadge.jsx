import { predictionTone, riskTone } from "../utils/format";

export function PredictionBadge({ value }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${predictionTone(value)}`}>
      {value || "Unknown"}
    </span>
  );
}

export function RiskBadge({ score }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${riskTone(score)}`}>
      Risk {Number(score) || 0}
    </span>
  );
}
