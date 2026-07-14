import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect, notFound } from 'next/navigation'
import UnitClient from './UnitClient'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: unit } = await supabase
    .from('units')
    .select('id, project_id, name, unit_type, floor_number, project:projects(id, name, org_id)')
    .eq('id', id)
    .single()

  if (!unit) notFound()

  const rawProject = unit.project
  const project = Array.isArray(rawProject) ? rawProject[0] ?? null : rawProject

  const [{ data: tenants }, { data: inspections }] = await Promise.all([
    supabase.from('tenants').select('*').eq('unit_id', id).order('lease_start_date', { ascending: false }),
    supabase.from('inspections').select('*, tenant:tenants(id, full_name)').eq('unit_id', id).order('created_at', { ascending: false }),
  ])

  return (
    <UnitClient
      unit={{ ...unit, project }}
      tenants={tenants ?? []}
      inspections={inspections ?? []}
      terms={DASHBOARD_TERMS[orgType]}
    />
  )
}
