import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import ClientView from './ClientView'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  noStore()
  const { token } = await params
  const supabase = createAdminClient()

  // Lookup project by share token
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, address, city, province')
    .eq('share_token', token)
    .maybeSingle()

  if (!project) notFound()

  // Fetch all units for this project
  const { data: units } = await supabase
    .from('units')
    .select('id, name')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })

  // Fetch all snags with rooms and attachments
  const { data: snags } = await supabase
    .from('snags')
    .select(`
      id, snag_number, title, description, status, category,
      unit_id, room_id,
      attachments(id, public_url, is_resolution),
      room:rooms(name)
    `)
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const flatSnags = (snags ?? []).map(s => ({
    ...s,
    attachments: Array.isArray(s.attachments) ? s.attachments : (s.attachments ? [s.attachments] : []),
    room: one(s.room),
  }))

  // Group snags into units → rooms
  const unitGroups = (units ?? []).map(unit => {
    const unitSnags = flatSnags.filter(s => s.unit_id === unit.id)

    // Group by room name (or unit name if no room)
    const roomMap = new Map<string, typeof unitSnags>()
    for (const snag of unitSnags) {
      const roomName = snag.room?.name ?? unit.name
      roomMap.set(roomName, [...(roomMap.get(roomName) ?? []), snag])
    }

    return {
      id: unit.id,
      name: unit.name,
      rooms: [...roomMap.entries()].map(([name, snagList]) => ({ name, snags: snagList })),
    }
  }).filter(u => u.rooms.some(r => r.snags.length > 0))

  const resolved = flatSnags.filter(s => ['approved', 'closed'].includes(s.status)).length
  const inProgress = flatSnags.filter(s => !['approved', 'closed'].includes(s.status)).length

  return (
    <ClientView
      project={project}
      units={unitGroups}
      stats={{ total: flatSnags.length, resolved, inProgress }}
      token={token}
    />
  )
}
