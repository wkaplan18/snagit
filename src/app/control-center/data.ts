import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { attentionReason, PRICE_BY_PLAN, type OrgRow, type OrphanUser, type Kpis } from './lib'

interface PaystackSub {
  status: string
  nextPaymentDate: string | null
}

// Live subscription state from Paystack, keyed by subscription_code
async function fetchPaystackSubs(): Promise<Map<string, PaystackSub>> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  const map = new Map<string, PaystackSub>()
  if (!secretKey) return map
  try {
    const res = await fetch('https://api.paystack.co/subscription?perPage=100', {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json()
    for (const s of json?.data ?? []) {
      if (s.subscription_code) {
        map.set(s.subscription_code, { status: s.status, nextPaymentDate: s.next_payment_date ?? null })
      }
    }
  } catch {
    // Paystack unreachable — dashboard degrades to DB-only data
  }
  return map
}

export interface ControlCenterData {
  orgs: OrgRow[]
  kpis: Kpis
  orphanUsers: OrphanUser[]
  needsAttentionOrgs: OrgRow[]
}

// React cache() dedupes this across layout.tsx + page.tsx within one request —
// they'd otherwise both trigger the full set of Supabase + Paystack calls.
export const getControlCenterData = cache(async (): Promise<ControlCenterData> => {
  const admin = createAdminClient()

  const [{ data: orgs }, { data: rawMembers }, { data: projects }, { data: snags }, { data: { users } }, { data: invites }, paystackSubs] = await Promise.all([
    admin.from('organizations').select('id, name, org_type, plan, plan_expires_at, is_trial, is_internal_test, email, created_at, subscription_status, paystack_subscription_code, paystack_customer_code'),
    admin.from('org_members').select('org_id, user_id, role'),
    admin.from('projects').select('id, org_id, status'),
    admin.from('snags').select('id, status, project:projects(org_id)'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('org_invites').select('id, org_id, email, role, accepted_at, expires_at, organizations(name)').is('accepted_at', null),
    fetchPaystackSubs(),
  ])

  const memberIds = new Set((rawMembers ?? []).map(m => m.user_id))
  const userMap = new Map(users.map(u => [u.id, u.email ?? '']))
  let profileMap = new Map<string, string | null>()
  if (memberIds.size > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', Array.from(memberIds))
    profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
  }

  const membersByOrg = new Map<string, { userId: string; email: string; name: string | null; role: string }[]>()
  for (const m of rawMembers ?? []) {
    const list = membersByOrg.get(m.org_id) ?? []
    list.push({ userId: m.user_id, email: userMap.get(m.user_id) ?? '', name: profileMap.get(m.user_id) ?? null, role: m.role })
    membersByOrg.set(m.org_id, list)
  }

  const orgNameById = new Map((orgs ?? []).map(o => [o.id, o.name]))

  const invitesByOrg = new Map<string, OrgRow['pendingInvites']>()
  for (const inv of invites ?? []) {
    const list = invitesByOrg.get(inv.org_id) ?? []
    list.push({
      id: inv.id,
      orgId: inv.org_id,
      orgName: orgNameById.get(inv.org_id) ?? 'Unknown org',
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
      expired: new Date(inv.expires_at) < new Date(),
    })
    invitesByOrg.set(inv.org_id, list)
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

    const liveSub = o.paystack_subscription_code ? paystackSubs.get(o.paystack_subscription_code) : undefined

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
      subscriptionStatus: o.subscription_status ?? 'none',
      hasPaystackSub: !!o.paystack_subscription_code,
      hasPaystackCustomer: !!o.paystack_customer_code,
      nextPaymentDate: liveSub?.nextPaymentDate ?? null,
      members: membersByOrg.get(o.id) ?? [],
      pendingInvites: invitesByOrg.get(o.id) ?? [],
      activeProjects: projectCounts.get(o.id)?.active ?? 0,
      totalProjects: projectCounts.get(o.id)?.total ?? 0,
      openSnags: openSnagCounts.get(o.id) ?? 0,
    }
  })

  const nonInternalOrgs = orgRows.filter(o => !o.isInternalTest)
  const paystackPaying = nonInternalOrgs.filter(o => o.subscriptionStatus === 'active')
  // Manually-managed paying orgs (EFT / enterprise) — billed outside Paystack
  const manualPaying = nonInternalOrgs.filter(o =>
    o.subscriptionStatus === 'none' && !o.isTrial && o.planStatus !== 'expired'
  )

  const needsAttentionOrgs = nonInternalOrgs.filter(o => attentionReason(o) !== null)

  const kpis: Kpis = {
    totalOrgs: nonInternalOrgs.length,
    payingViaPaystack: paystackPaying.length,
    payingManually: manualPaying.length,
    totalActiveProjects: nonInternalOrgs.reduce((sum, o) => sum + o.activeProjects, 0),
    mrr: [...paystackPaying, ...manualPaying].reduce((sum, o) => sum + (PRICE_BY_PLAN[o.plan] ?? 0), 0),
    needsAttentionCount: needsAttentionOrgs.length,
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

  return { orgs: orgRows, kpis, orphanUsers, needsAttentionOrgs }
})
