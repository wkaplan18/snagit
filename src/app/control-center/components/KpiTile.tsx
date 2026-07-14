export default function KpiTile({ label, value, sub, accent = 'slate' }: { label: string; value: string; sub?: string; accent?: 'slate' | 'blue' | 'emerald' | 'violet' | 'amber' }) {
  const accentBar: Record<string, string> = {
    slate: 'bg-slate-300',
    blue: 'bg-[#1A56DB]',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
  }
  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar[accent]}`} />
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-semibold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
