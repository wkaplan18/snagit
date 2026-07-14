import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect, notFound } from 'next/navigation'
import CompareClient from './CompareClient'
import type { OrgType } from '@/types'

export default async function CompareInspectionsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: moveOut } = await supabase
    .from('inspections')
    .select('*, tenant:tenants(*), unit:units(id, name), items:inspection_items(*, attachments(*))')
    .eq('id', id)
    .single()

  if (!moveOut || !moveOut.linked_move_in_inspection_id) notFound()

  const { data: moveIn } = await supabase
    .from('inspections')
    .select('*, items:inspection_items(*, attachments(*))')
    .eq('id', moveOut.linked_move_in_inspection_id)
    .single()

  if (!moveIn) notFound()

  const rawUnit = moveOut.unit
  const unit = Array.isArray(rawUnit) ? rawUnit[0] ?? null : rawUnit
  const rawTenant = moveOut.tenant
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] ?? null : rawTenant

  return <CompareClient moveOut={{ ...moveOut, unit, tenant }} moveIn={moveIn} />
}
