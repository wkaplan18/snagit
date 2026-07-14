import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect } from 'next/navigation'
import InspectionsClient from './InspectionsClient'
import type { OrgType } from '@/types'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  if (orgType !== 'property_manager' && orgType !== 'body_corporate') redirect('/dashboard')

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, tenant:tenants(id, full_name), unit:units(id, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return <InspectionsClient initialInspections={inspections ?? []} />
}
