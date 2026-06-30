import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewProjectClient from './NewProjectClient'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  if (allOrgs.length === 0) redirect('/onboarding')

  const orgId = (await getActiveOrgId(user.id, allOrgs))!
  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]

  return <NewProjectClient orgId={orgId} terms={terms} orgType={orgType} />
}
