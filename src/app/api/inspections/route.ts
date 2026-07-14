import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { sendPushToOrgAdmins } from '@/lib/notifications/push'
import { z } from 'zod'

const CreateInspectionSchema = z.object({
  unit_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: z.enum(['move_in', 'move_out']),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unitId = searchParams.get('unit_id')

  let query = supabase
    .from('inspections')
    .select('*, tenant:tenants(id, full_name), unit:units(id, name)')
    .order('created_at', { ascending: false })

  if (unitId) query = query.eq('unit_id', unitId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateInspectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { unit_id, tenant_id, type } = parsed.data

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'No organisation found' }, { status: 403 })

  const admin = createAdminClient()

  const { data: unit } = await admin.from('units').select('id, unit_type').eq('id', unit_id).single()
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  // Prefer a template scoped to this unit's type; fall back to an org-wide template
  const { data: templates } = await admin
    .from('inspection_templates')
    .select('id, unit_type')
    .eq('org_id', orgId)
    .eq('is_active', true)

  const template = (templates ?? []).find(t => t.unit_type === unit.unit_type) ?? (templates ?? []).find(t => !t.unit_type)
  if (!template) {
    return NextResponse.json({ error: 'No inspection checklist has been set up yet. Ask an admin to create one in Settings.' }, { status: 400 })
  }

  const { data: templateRooms } = await admin
    .from('inspection_template_rooms')
    .select('*, items:inspection_template_items(*)')
    .eq('template_id', template.id)
    .order('room_order', { ascending: true })

  let linkedMoveInId: string | null = null
  if (type === 'move_out') {
    const { data: moveIn } = await admin
      .from('inspections')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('type', 'move_in')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    linkedMoveInId = moveIn?.id ?? null
  }

  const { data: inspection, error: insertError } = await admin
    .from('inspections')
    .insert({
      org_id: orgId,
      unit_id,
      tenant_id,
      template_id: template.id,
      type,
      status: 'draft',
      inspector_id: user.id,
      linked_move_in_inspection_id: linkedMoveInId,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (insertError || !inspection) {
    return NextResponse.json({ error: insertError?.message ?? 'Could not create inspection' }, { status: 500 })
  }

  const itemRows = (templateRooms ?? []).flatMap(room =>
    (room.items ?? [])
      .sort((a: { item_order: number }, b: { item_order: number }) => a.item_order - b.item_order)
      .map((item: { id: string; label: string; item_order: number }) => ({
        inspection_id: inspection.id,
        template_item_id: item.id,
        room_name: room.name,
        item_label: item.label,
        item_order: item.item_order,
        condition: 'good',
      }))
  )

  if (itemRows.length > 0) {
    const { error: itemsError } = await admin.from('inspection_items').insert(itemRows)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  try {
    await sendPushToOrgAdmins(orgId, {
      title: `${type === 'move_in' ? 'Move-in' : 'Move-out'} inspection started`,
      body: `Unit inspection in progress`,
      url: `/inspections/${inspection.id}`,
      tag: `inspection-${inspection.id}`,
    }, user.id)
  } catch (err) {
    console.error('[push] send failed', err)
  }

  const { data: full } = await admin
    .from('inspections')
    .select('*, items:inspection_items(*, attachments(*))')
    .eq('id', inspection.id)
    .single()

  return NextResponse.json(full, { status: 201 })
}
