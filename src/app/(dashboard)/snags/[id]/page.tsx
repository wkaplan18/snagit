import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import SnagDetailClient from './SnagDetailClient'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function SnagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  const [{ data: snag }, { data: contractors }] = await Promise.all([
    supabase.from('snags').select(`
      *,
      attachments(*),
      contractor:contractors(id, name, company, whatsapp, trade, access_token),
      room:rooms(id, name),
      unit:units(id, name),
      project:projects(id, name)
    `).eq('id', id).maybeSingle(),
    supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('name'),
  ])

  if (!snag) notFound()

  const { data: rooms } = await supabase
    .from('rooms').select('id, name, room_order')
    .eq('unit_id', snag.unit_id).order('room_order')

  const terms = DASHBOARD_TERMS[(activeOrg?.org?.org_type ?? 'builder') as OrgType]

  // Supabase types FK joins as arrays — flatten each to a single object
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const flat = {
    ...snag,
    contractor: one(snag.contractor),
    room: one(snag.room),
    unit: one(snag.unit),
    project: one(snag.project),
  }

  return <SnagDetailClient snag={flat} contractors={contractors ?? []} terms={terms} orgId={orgId} rooms={rooms ?? []} />
}
