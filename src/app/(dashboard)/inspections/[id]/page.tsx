import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect, notFound } from 'next/navigation'
import InspectionClient from './InspectionClient'
import type { OrgType } from '@/types'

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  if (orgType !== 'property_manager' && orgType !== 'body_corporate') redirect('/dashboard')

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, tenant:tenants(*), unit:units(id, name), items:inspection_items(*, attachments(*))')
    .eq('id', id)
    .single()

  if (!inspection) notFound()

  const rawTenant = inspection.tenant
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] ?? null : rawTenant
  const rawUnit = inspection.unit
  const unit = Array.isArray(rawUnit) ? rawUnit[0] ?? null : rawUnit

  return <InspectionClient inspection={{ ...inspection, tenant, unit }} />
}
