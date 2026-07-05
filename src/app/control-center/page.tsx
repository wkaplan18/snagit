import { createAdminClient } from '@/lib/supabase/admin'
import ControlCenterClient, { type OrgRow, type OrphanUser } from './ControlCenterClient'

const PRICE_BY_PLAN: Record<string, number | null> = {
  solo: 1499,
  contractor: 2999,
  portfolio: 8999,
  enterprise: null, // custom pricing — excluded from MRR auto-calc
}

export default async function ControlCenterPage() {
  const admin = createAdminClient()

  const [{ data: orgs }, { data: rawMembers }, { data: projects }, { data: snags }, { data: { users } }, { data: invites }] = await Promise.all([
    admin.from('organizations').select('id, name, org_type, plan, plan_expires_at, is_trial, is_internal_test, email, created_at'),
    admin.from('org_members').select('org_id, user_id, role'),
    admin.from('projects').select('id, org_id, status'),
    admin.from('snags').select('id, status, project:projects(org_id)'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('org_invites').select('email, accepted_at, expires_at, organizations(name)').is('accepted_at', null),
  ])

  // Resolve member emails/names once, then group by org
  const memberIds = new Set((rawMembers ?? []).map(m => m.user_id))
  const userMap = new Map(users.map(u => [u.id, u.email ?? '']))
  let profileMap = new Map<string, string | null>()
  if (memberIds.size > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', Array.from(memberIds))
    profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
  }

  const membersByOrg = new Map<string, { email: string; name: string | null; role: string }[]>()
  for (const m of rawMembers ?? []) {
    const list = membersByOrg.get(m.org_id) ?? []
    list.push({ email: userMap.get(m.user_id) ?? '', name: profileMap.get(m.user_id) ?? null, role: m.role })
    membersByOrg.set(m.org_id, list)
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
      isTrial: o.is_trial,
      isInternalTest: o.is_internal_test,
      email: o.email,
      createdAt: o.created_at,
      members: membersByOrg.get(o.id) ?? [],
      activeProjects: projectCounts.get(o.id)?.active ?? 0,
      totalProjects: projectCounts.get(o.id)?.total ?? 0,
      openSnags: openSnagCounts.get(o.id) ?? 0,
    }
  })

  const billableOrgs = orgRows.filter(o => !o.isInternalTest && !o.isTrial && o.planStatus !== 'expired')
  const nonInternalOrgs = orgRows.filter(o => !o.isInternalTest)

  const kpis = {
    totalOrgs: nonInternalOrgs.length,
    activeOrgs: nonInternalOrgs.filter(o => o.planStatus === 'active' || o.planStatus === 'expiring_soon').length,
    totalActiveProjects: nonInternalOrgs.reduce((sum, o) => sum + o.activeProjects, 0),
    estimatedMrr: billableOrgs.reduce((sum, o) => sum + (PRICE_BY_PLAN[o.plan] ?? 0), 0),
    expiringSoonCount: nonInternalOrgs.filter(o => o.planStatus === 'expiring_soon').length,
  }

  const pendingInviteByEmail = new Map<string, { orgName: string; expired: boolean }>()
  for (const inv of invites ?? []) {
    const org = Array.isArray(inv.organizations) ? inv.organizations[0] : inv.organizations
    pendingInviteByEmail.set(inv.email.toLowerCase(), {
      orgName: org?.name ?? 'Unknown org',
      expired: new Date(inv.expires_at) < new Date(now),
    })
  }

  const orphanUsers: OrphanUser[] = users
    .filter(u => !memberIds.has(u.id))
    .map(u => {
      const invite = u.email ? pendingInviteByEmail.get(u.email.toLowerCase()) : undefined
      return {
        id: u.id,
        email: u.email ?? '',
        createdAt: u.created_at,
        confirmedAt: u.confirmed_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        source: invite
          ? { type: 'invited' as const, orgName: invite.orgName, expired: invite.expired }
          : { type: 'self_registered' as const },
      }
    })

  return <ControlCenterClient orgs={orgRows} kpis={kpis} orphanUsers={orphanUsers} />
}
