import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { z } from 'zod'

const SaveTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  unit_type: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  rooms: z.array(z.object({
    name: z.string().min(1).max(200),
    room_order: z.number().int().optional().default(0),
    items: z.array(z.object({
      label: z.string().min(1).max(200),
      item_order: z.number().int().optional().default(0),
    })),
  })),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inspection_templates')
    .select('*, rooms:inspection_template_rooms(*, items:inspection_template_items(*))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json(data)
}

// Replaces the whole room/item tree in one request — simpler and less error-prone
// than diffing client-side edits against existing rows across three tables.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = SaveTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'No organisation found' }, { status: 403 })

  const callerRole = allOrgs.find(o => o.org_id === orgId)?.role
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can edit checklist templates' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('inspection_templates')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const { name, unit_type, is_active, rooms } = parsed.data

  const { error: updateError } = await admin
    .from('inspection_templates')
    .update({ name, unit_type: unit_type ?? null, ...(is_active !== undefined ? { is_active } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Cascade-deletes existing rooms + their items, then reinsert the submitted tree
  await admin.from('inspection_template_rooms').delete().eq('template_id', id)

  for (const room of rooms) {
    const { data: insertedRoom, error: roomError } = await admin
      .from('inspection_template_rooms')
      .insert({ template_id: id, name: room.name, room_order: room.room_order })
      .select('id')
      .single()
    if (roomError || !insertedRoom) {
      return NextResponse.json({ error: roomError?.message ?? 'Could not save room' }, { status: 500 })
    }

    if (room.items.length > 0) {
      const { error: itemsError } = await admin
        .from('inspection_template_items')
        .insert(room.items.map(item => ({
          template_room_id: insertedRoom.id,
          label: item.label,
          item_order: item.item_order,
        })))
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  const { data: final } = await admin
    .from('inspection_templates')
    .select('*, rooms:inspection_template_rooms(*, items:inspection_template_items(*))')
    .eq('id', id)
    .single()

  return NextResponse.json(final)
}
