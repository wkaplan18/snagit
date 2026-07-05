import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

const ACTIVE = new Set(['open', 'assigned', 'rejected'])

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  if (allOrgs.length === 0) {
    if (isPlatformOwner(user.email)) redirect('/control-center')
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
    supabase.from('snags').select('id', { count: 'exact', head: true }).eq('status', 'fixed'),
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
