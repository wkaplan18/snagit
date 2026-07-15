import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import ProjectClient from './ProjectClient'
import { DASHBOARD_TERMS } from '@/types'
import type { Room, OrgType, Snag } from '@/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  const [{ data: project }, { data: units }, { data: contractors }, { data: allSnags }] = await Promise.all([
    supabase.from('projects').select('id, org_id, name, address, city, province, status, description, client_name, client_whatsapp, share_token').eq('id', id).maybeSingle(),
    supabase.from('units').select('id, name, unit_type, floor_number, rooms(id, unit_id, name, room_order, created_at)').eq('project_id', id).order('created_at', { ascending: true }),
    supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('name'),
    supabase.from('snags').select('*, attachments(*), contractor:contractors(id, name, company, whatsapp, trade, access_token), room:rooms(id, name), unit:units(id, name)').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]

  const ACTIVE = ['open', 'assigned', 'rejected']
  const openCountsByUnit: Record<string, number> = {}
  const snagsByUnit: Record<string, Snag[]> = {}
  for (const snag of (allSnags ?? []) as Snag[]) {
    if (ACTIVE.includes(snag.status)) {
      openCountsByUnit[snag.unit_id] = (openCountsByUnit[snag.unit_id] ?? 0) + 1
    }
    snagsByUnit[snag.unit_id] = snagsByUnit[snag.unit_id] ?? []
    snagsByUnit[snag.unit_id].push(snag)
  }

  const flatUnits = (units ?? []).map(u => ({
    id: u.id,
    name: u.name,
    unit_type: u.unit_type,
    floor_number: u.floor_number,
    rooms: ((u.rooms ?? []) as Room[]).sort((a, b) => a.room_order - b.room_order),
  }))

  // Tenancy status per unit (property_manager/body_corporate only, but cheap enough to always compute)
  const unitIds = flatUnits.map(u => u.id)
  const { data: activeTenants } = unitIds.length
    ? await supabase.from('tenants').select('id, unit_id, full_name').eq('status', 'active').in('unit_id', unitIds)
    : { data: [] }

  const tenantIds = (activeTenants ?? []).map(t => t.id)
  const { data: moveInInspections } = tenantIds.length
    ? await supabase.from('inspections').select('tenant_id, status').eq('type', 'move_in').in('tenant_id', tenantIds)
    : { data: [] }

  const moveInCompletedByTenant = new Set(
    (moveInInspections ?? []).filter(i => i.status === 'completed').map(i => i.tenant_id)
  )

  const tenancyByUnit: Record<string, { tenantName: string; moveInCompleted: boolean }> = {}
  for (const t of activeTenants ?? []) {
    tenancyByUnit[t.unit_id] = { tenantName: t.full_name, moveInCompleted: moveInCompletedByTenant.has(t.id) }
  }

  return <ProjectClient project={project} units={flatUnits} contractors={contractors ?? []} terms={terms} orgType={orgType} openCountsByUnit={openCountsByUnit} snagsByUnit={snagsByUnit} tenancyByUnit={tenancyByUnit} />
}
