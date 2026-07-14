import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect } from 'next/navigation'
import InspectionTemplatesClient from './InspectionTemplatesClient'
import type { OrgType } from '@/types'

export default async function InspectionTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  if (orgType !== 'property_manager' && orgType !== 'body_corporate') redirect('/dashboard')

  const role = activeOrg?.role
  if (role !== 'owner' && role !== 'admin') redirect('/dashboard')

  const { data: templates } = await supabase
    .from('inspection_templates')
    .select('*, rooms:inspection_template_rooms(id, items:inspection_template_items(id))')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return <InspectionTemplatesClient initialTemplates={templates ?? []} />
}
