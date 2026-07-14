import Link from 'next/link'
import { LayoutDashboard, Building2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

const ACTIVE = new Set(['open', 'assigned', 'rejected'])

function PlatformOwnerChooser() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Welcome back</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Where do you want to go?</h1>
      <div className="space-y-3">
        <Link href="/control-center" className="sf-card flex items-center gap-3 p-4 hover:border-slate-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
            <LayoutDashboard className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Control Center</p>
            <p className="text-xs text-slate-500">Manage organizations, billing and users</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
        </Link>
        <Link href="/onboarding" className="sf-card flex items-center gap-3 p-4 hover:border-slate-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] shrink-0">
            <Building2 className="h-5 w-5 text-[#1A56DB]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Set up my own workspace</p>
            <p className="text-xs text-slate-500">Create a SnagIT organisation for yourself</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
        </Link>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  if (allOrgs.length === 0) {
    if (isPlatformOwner(user.email)) return <PlatformOwnerChooser />
    redirect('/onboarding')
  }

  const orgId = (await getActiveOrgId(user.id, allOrgs))!
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  // Fetch projects first so we can query snags by project IDs
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, image_url, city')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  const projectIds = (projects ?? []).map(p => p.id)

  const [{ data: snagRows }, { count: needsReview }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from('snags').select('project_id, status').in('project_id', projectIds)
      : Promise.resolve({ data: [] as { project_id: string; status: string }[], error: null }),
    projectIds.length > 0
      ? supabase.from('snags').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'fixed')
      : Promise.resolve({ count: 0 }),
  ])

  // Compute per-project stats using the same ACTIVE_STATUSES as the rest of the app
  const statsMap: Record<string, { total: number; open: number; approved: number; rejected: number }> = {}
  for (const s of snagRows ?? []) {
    const c = statsMap[s.project_id] ?? (statsMap[s.project_id] = { total: 0, open: 0, approved: 0, rejected: 0 })
    c.total++
    if (ACTIVE.has(s.status)) c.open++
    if (s.status === 'approved') c.approved++
    if (s.status === 'rejected') c.rejected++
  }

  const projectStats = (projects ?? []).map(p => {
    const c = statsMap[p.id] ?? { total: 0, open: 0, approved: 0, rejected: 0 }
    return {
      project_id: p.id,
      project_name: p.name,
      total_snags: c.total,
      open_snags: c.open,
      in_progress_snags: 0,
      critical_snags: 0,
      resolved_snags: c.approved,
      rejected_snags: c.rejected,
      completion_pct: c.total > 0 ? Math.round((c.approved / c.total) * 100) : 0,
    }
  })

  const totalRejected = (snagRows ?? []).filter(s => s.status === 'rejected').length

  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]

  return (
    <DashboardClient
      orgName={activeOrg?.org?.name ?? 'My Organisation'}
      terms={terms}
      projects={projects ?? []}
      projectStats={projectStats}
      needsReview={needsReview ?? 0}
      totalRejected={totalRejected}
    />
  )
}
