import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: stats } = await supabase
    .from('snag_stats_by_project')
    .select('*')
    .order('project_name')

  const rows = stats ?? []
  const totals = rows.reduce(
    (t, r) => ({
      total: t.total + Number(r.total_snags ?? 0),
      open: t.open + Number(r.open_snags ?? 0),
      progress: t.progress + Number(r.in_progress_snags ?? 0),
      resolved: t.resolved + Number(r.resolved_snags ?? 0),
      critical: t.critical + Number(r.critical_snags ?? 0),
    }),
    { total: 0, open: 0, progress: 0, resolved: 0, critical: 0 }
  )

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
      <p className="mb-5 text-sm text-slate-500">Snag progress across all projects.</p>

      {/* Org totals */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: totals.total, color: 'text-slate-900' },
          { label: 'Open', value: totals.open, color: 'text-red-600' },
          { label: 'Busy', value: totals.progress, color: 'text-blue-600' },
          { label: 'Done', value: totals.resolved, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="sf-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="sf-card flex flex-col items-center p-10 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">Nothing to report yet</p>
          <p className="mt-1 text-sm text-slate-500">Stats appear here as soon as you log snags.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Link key={r.project_id} href={`/projects/${r.project_id}`} className="sf-card block p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{r.project_name}</p>
                <p className="text-sm font-bold text-slate-700">{r.completion_pct ?? 0}%</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#1A56DB]" style={{ width: `${r.completion_pct ?? 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {r.total_snags} snags · {r.open_snags} open · {r.in_progress_snags} in progress · {r.resolved_snags} resolved
                {Number(r.critical_snags) > 0 && <span className="font-medium text-red-600"> · {r.critical_snags} critical</span>}
              </p>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">PDF snag reports for clients — coming soon.</p>
    </div>
  )
}
