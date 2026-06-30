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
    supabase.from('snags').select('*, attachments(*), contractor:contractors(id, name, company), room:rooms(id, name), unit:units(id, name)').eq('project_id', id).order('created_at', { ascending: false }),
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

  return <ProjectClient project={project} units={flatUnits} contractors={contractors ?? []} terms={terms} orgType={orgType} openCountsByUnit={openCountsByUnit} snagsByUnit={snagsByUnit} />
}
