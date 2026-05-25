import { motion } from "framer-motion";

export default function StatCard({ label, value, detail, tone = "cyan", icon: Icon }) {
  const tones = {
    cyan: "text-cyber-cyan shadow-glow",
    green: "text-cyber-green shadow-greenGlow",
    amber: "text-cyber-amber",
    red: "text-cyber-red",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass cyber-border hover-glow-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
        {Icon && <Icon className={`h-5 w-5 ${tones[tone]}`} />}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-2 text-sm text-slate-400">{detail}</div>
    </motion.div>
  );
}
