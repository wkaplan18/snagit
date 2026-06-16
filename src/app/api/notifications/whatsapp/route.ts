import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSnagAssignedWhatsApp } from '@/lib/notifications/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { snagId } = await req.json()
  if (!snagId) return NextResponse.json({ error: 'snagId required' }, { status: 400 })

  const { data: snag } = await supabase
    .from('snags')
    .select(`
      *,
      contractor:contractors(name, whatsapp, access_token),
      unit:units(name),
      room:rooms(name),
      project:projects(name)
    `)
    .eq('id', snagId)
    .single()

  if (!snag || !snag.contractor?.whatsapp) {
    return NextResponse.json({ error: 'Snag or contractor not found / no WhatsApp number' }, { status: 404 })
  }

  try {
    await sendSnagAssignedWhatsApp({
      contractorName: snag.contractor.name,
      contractorWhatsApp: snag.contractor.whatsapp,
      projectName: snag.project?.name ?? 'Project',
      unitName: snag.unit?.name ?? 'Unit',
      roomName: snag.room?.name ?? 'Room',
      priority: snag.priority,
      description: snag.description ?? snag.title,
      contractorToken: snag.contractor.access_token,
    })

    await supabase.from('notifications').insert({
      org_id: snag.project?.org_id,
      snag_id: snagId,
      recipient_contractor: snag.assigned_to,
      channel: 'whatsapp',
      subject: 'Snag assigned',
      body: snag.title,
      sent_at: new Date().toISOString(),
      delivered: true,
    })

    return NextResponse.json({ sent: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
