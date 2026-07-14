import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToOrgAdmins } from '@/lib/notifications/push'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: item } = await admin
    .from('inspection_items')
    .select('*, attachments(*)')
    .eq('id', itemId)
    .eq('inspection_id', id)
    .single()

  if (!item) return NextResponse.json({ error: 'Inspection item not found' }, { status: 404 })
  if (item.converted_snag_id) return NextResponse.json({ error: 'This item has already been converted to a snag' }, { status: 400 })

  const { data: inspection } = await admin
    .from('inspections')
    .select('unit_id, org_id')
    .eq('id', id)
    .single()
  if (!inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

  const { data: unit } = await admin.from('units').select('project_id').eq('id', inspection.unit_id).single()
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const { data: snag, error: snagError } = await admin
    .from('snags')
    .insert({
      project_id: unit.project_id,
      unit_id: inspection.unit_id,
      title: `${item.room_name} — ${item.item_label}`,
      description: item.note ?? `Flagged as ${item.condition} during inspection.`,
      category: 'other',
      status: 'open',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (snagError || !snag) {
    return NextResponse.json({ error: snagError?.message ?? 'Could not create snag' }, { status: 500 })
  }

  // Re-point the item's photos onto the new snag rather than duplicating storage objects —
  // the attachments_one_parent_chk constraint means a photo can belong to only one of the two.
  if ((item.attachments ?? []).length > 0) {
    await admin
      .from('attachments')
      .update({ snag_id: snag.id, inspection_item_id: null })
      .eq('inspection_item_id', itemId)
  }

  const { data: updatedItem, error: updateError } = await admin
    .from('inspection_items')
    .update({ converted_snag_id: snag.id, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select('*, attachments(*)')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  try {
    await sendPushToOrgAdmins(inspection.org_id, {
      title: 'New snag logged',
      body: snag.title,
      url: `/snags/${snag.id}`,
      tag: `snag-${snag.id}`,
    }, user.id)
  } catch (err) {
    console.error('[push] send failed', err)
  }

  return NextResponse.json(updatedItem)
}
