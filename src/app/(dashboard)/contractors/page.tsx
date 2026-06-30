import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractorsClient from './ContractorsClient'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

const UNATTENDED_STATUSES = ['open', 'assigned', 'rejected']

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  if (allOrgs.length === 0) redirect('/onboarding')

  const orgId = (await getActiveOrgId(user.id, allOrgs))!
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  const [{ data: contractors }, { data: projects }] = await Promise.all([
    supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('projects').select('id').eq('org_id', orgId),
  ])

  const projectIds = (projects ?? []).map(p => p.id)

  const openCountByContractor: Record<string, number> = {}
  if (projectIds.length > 0) {
    const { data: snagRows } = await supabase
      .from('snags')
      .select('assigned_to')
      .in('project_id', projectIds)
      .in('status', UNATTENDED_STATUSES)
      .not('assigned_to', 'is', null)

    for (const s of snagRows ?? []) {
      if (s.assigned_to) {
        openCountByContractor[s.assigned_to] = (openCountByContractor[s.assigned_to] ?? 0) + 1
      }
    }
  }

  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]

  return <ContractorsClient orgId={orgId} contractors={contractors ?? []} terms={terms} openCountByContractor={openCountByContractor} />
}
