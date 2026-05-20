import AttackMap from "../components/AttackMap";

export default function LiveAttackMap() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-white">Live Attack Map</h1>
          <p className="mt-1 text-sm text-slate-400">Endpoint risk paths across India, APAC, Europe, and North America.</p>
        </div>
        <div className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-cyber-cyan">
          Presentation view
        </div>
      </div>
      <AttackMap large />
    </div>
  );
}
