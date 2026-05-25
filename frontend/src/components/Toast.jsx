import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";

export default function Toast({ alert, onClose }) {
  const risk = Number(alert?.risk_score || 0);
  const tone = risk >= 70 ? "border-cyber-red/40 text-cyber-red" : risk >= 45 ? "border-cyber-amber/40 text-cyber-amber" : "border-cyber-cyan/40 text-cyber-cyan";

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, x: 26, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 26, y: 8, scale: 0.96 }}
          transition={{ duration: 0.24 }}
          className={`hover-glow-card fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] rounded-lg border bg-[#102847]/95 p-4 shadow-[0_16px_42px_rgba(4,16,33,.42)] backdrop-blur-xl ${tone}`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-current/30 bg-current/10 p-2">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Threat notification</div>
              <div className="mt-1 truncate text-sm text-slate-200">{alert.filename}</div>
              <div className="mt-1 text-xs text-slate-500">{alert.pc_name} - Risk {alert.risk_score}</div>
            </div>
            <button className="hover-glow-button rounded-md p-1 text-slate-400 hover:text-white" onClick={onClose} aria-label="Close toast">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
