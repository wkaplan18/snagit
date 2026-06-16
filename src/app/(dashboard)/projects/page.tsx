import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, FolderOpen } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: projects }, { data: stats }] = await Promise.all([
    supabase.from('projects').select('id, name, address, city, status, image_url').order('updated_at', { ascending: false }),
    supabase.from('snag_stats_by_project').select('*'),
  ])
  const statsByProject = new Map((stats ?? []).map(s => [s.project_id, s]))

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
        <Link href="/projects/new" className="sf-btn-primary px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New project
        </Link>
      </div>

      {(projects ?? []).length === 0 ? (
        <div className="sf-card flex flex-col items-center p-10 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first project to start snagging.</p>
          <Link href="/projects/new" className="sf-btn-primary mt-5 px-5 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Create project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(projects ?? []).map(p => {
            const s = statsByProject.get(p.id)
            const pct = s?.completion_pct ?? 0
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="sf-card block p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{p.name}</p>
                    {(p.address || p.city) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {[p.address, p.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="sf-badge bg-slate-50 border-slate-200 text-slate-600 capitalize">{p.status}</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{(s?.open_snags ?? 0) + (s?.in_progress_snags ?? 0)} active · {s?.resolved_snags ?? 0} done</span>
                    <span className="font-semibold text-slate-700">{pct ?? 0}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#1A56DB]" style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
