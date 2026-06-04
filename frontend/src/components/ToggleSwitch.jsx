export default function ToggleSwitch({ label, checked, onChange, description, disabled = false }) {
  const stateText = checked ? "On" : "Off";

  return (
    <label className="hover-glow-card flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description && <span className="settings-description mt-1 block text-xs leading-relaxed text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${stateText}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`hover-glow-button relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border px-1 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked
            ? "border-cyber-green/50 bg-cyber-green/90"
            : "border-slate-500/50 bg-slate-700"
        }`}
      >
        <span
          className={`absolute text-[9px] font-bold uppercase tracking-wide text-white transition-opacity ${
            checked ? "left-2 opacity-100" : "left-7 opacity-80"
          }`}
        >
          {stateText}
        </span>
        <span
          className={`relative z-10 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
