import { createAdminClient } from '@/lib/supabase/admin'
import ControlCenterClient, { type OrgRow } from './ControlCenterClient'

const PRICE_PER_ACTIVE_PROJECT = 1499

export default async function ControlCenterPage() {
  const admin = createAdminClient()

  const [{ data: orgs }, { data: members }, { data: projects }, { data: snags }] = await Promise.all([
    admin.from('organizations').select('id, name, org_type, plan, plan_expires_at, email, created_at'),
    admin.from('org_members').select('org_id'),
    admin.from('projects').select('id, org_id, status'),
    admin.from('snags').select('id, status, project:projects(org_id)'),
  ])

  const memberCounts = new Map<string, number>()
  for (const m of members ?? []) {
    memberCounts.set(m.org_id, (memberCounts.get(m.org_id) ?? 0) + 1)
  }

  const projectCounts = new Map<string, { active: number; total: number }>()
  for (const p of projects ?? []) {
    const c = projectCounts.get(p.org_id) ?? { active: 0, total: 0 }
    c.total++
    if (p.status === 'active') c.active++
    projectCounts.set(p.org_id, c)
  }

  const openSnagCounts = new Map<string, number>()
  const ACTIVE_SNAG_STATUSES = new Set(['open', 'assigned', 'in_progress'])
  for (const s of snags ?? []) {
    const project = Array.isArray(s.project) ? s.project[0] : s.project
    const orgId = project?.org_id
    if (orgId && ACTIVE_SNAG_STATUSES.has(s.status)) {
      openSnagCounts.set(orgId, (openSnagCounts.get(orgId) ?? 0) + 1)
    }
  }

  const now = Date.now()
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

  const orgRows: OrgRow[] = (orgs ?? []).map(o => {
    const expiresAt = o.plan_expires_at ? new Date(o.plan_expires_at).getTime() : null
    let planStatus: OrgRow['planStatus'] = 'no_expiry'
    if (expiresAt !== null) {
      if (expiresAt < now) planStatus = 'expired'
      else if (expiresAt - now <= FOURTEEN_DAYS_MS) planStatus = 'expiring_soon'
      else planStatus = 'active'
    }

    return {
      id: o.id,
      name: o.name,
      orgType: o.org_type,
      plan: o.plan,
      planExpiresAt: o.plan_expires_at,
      planStatus,
      email: o.email,
      createdAt: o.created_at,
      memberCount: memberCounts.get(o.id) ?? 0,
      activeProjects: projectCounts.get(o.id)?.active ?? 0,
      totalProjects: projectCounts.get(o.id)?.total ?? 0,
      openSnags: openSnagCounts.get(o.id) ?? 0,
    }
  })

  const totalActiveProjects = orgRows.reduce((sum, o) => sum + o.activeProjects, 0)

  const kpis = {
    totalOrgs: orgRows.length,
    activeOrgs: orgRows.filter(o => o.planStatus === 'active' || o.planStatus === 'expiring_soon').length,
    totalActiveProjects,
    estimatedMrr: totalActiveProjects * PRICE_PER_ACTIVE_PROJECT,
    expiringSoonCount: orgRows.filter(o => o.planStatus === 'expiring_soon').length,
  }

  return <ControlCenterClient orgs={orgRows} kpis={kpis} />
}
