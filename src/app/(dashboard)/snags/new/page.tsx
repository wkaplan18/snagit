import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'
import AddJobClient from './AddJobClient'

export default async function AddJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  if (allOrgs.length === 0) redirect('/onboarding')

  const orgId = (await getActiveOrgId(user.id, allOrgs))!
  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType

  return (
    <Suspense>
      <AddJobClient orgId={orgId} orgType={orgType} />
    </Suspense>
  )
}
