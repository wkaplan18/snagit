import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { OrgType } from '@/types'

export interface OrgSummary {
  org_id: string
  role: string
  org: { id: string; name: string; org_type: OrgType } | null
}

export async function getAllUserOrgs(userId: string): Promise<OrgSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name, org_type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(m => {
    const raw = m.organizations
    const org = Array.isArray(raw) ? raw[0] : raw as { id: string; name: string; org_type: OrgType } | null
    return { org_id: m.org_id, role: m.role, org }
  })
}

export async function getActiveOrgId(userId: string, orgs: OrgSummary[]): Promise<string | null> {
  if (orgs.length === 0) return null
  const cookieStore = await cookies()
  const stored = cookieStore.get('snagit_active_org')?.value
  if (stored && orgs.some(o => o.org_id === stored)) return stored
  return orgs[0].org_id
}

export async function setActiveOrgCookie(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('snagit_active_org', orgId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}
