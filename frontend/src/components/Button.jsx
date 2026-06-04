import { forwardRef } from "react";

const toneClasses = {
  cyan: "border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10",
  green: "border-cyber-green/30 text-cyber-green hover:bg-cyber-green/10",
  amber: "border-cyber-amber/30 text-cyber-amber hover:bg-cyber-amber/10",
  red: "border-cyber-red/30 text-cyber-red hover:bg-cyber-red/10",
  slate: "border-white/10 text-slate-300 hover:bg-white/[0.04]",
  solidCyan: "border-cyber-cyan bg-cyber-cyan text-slate-950 hover:bg-cyan-300",
  solidGreen: "border-cyber-green bg-cyber-green text-slate-950 hover:bg-green-300",
};

const sizeClasses = {
  xs: "px-3 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-sm",
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

const Button = forwardRef(function Button(
  {
    children,
    className = "",
    tone = "slate",
    size = "md",
    loading = false,
    loadingText = "Working...",
    disabled = false,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      className={`hover-glow-button inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition ${sizeClasses[size]} ${toneClasses[tone]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {loading ? loadingText : children}
    </button>
  );
});

export default Button;
