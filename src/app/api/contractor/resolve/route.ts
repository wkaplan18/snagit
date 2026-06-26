import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Contractors have no auth session — the access token below IS the auth,
  // so writes must run as service role (anon is blocked by RLS).
  const supabase = createAdminClient()
  const formData = await req.formData()

  const snagId = formData.get('snagId') as string
  const contractorToken = formData.get('contractorToken') as string

  if (!snagId || !contractorToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate token
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('access_token', contractorToken)
    .eq('is_active', true)
    .gt('token_expires_at', new Date().toISOString())
    .single()

  if (!contractor) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Verify snag belongs to this contractor
  const { data: snag } = await supabase
    .from('snags')
    .select('id, project_id')
    .eq('id', snagId)
    .eq('assigned_to', contractor.id)
    .single()

  if (!snag) {
    return NextResponse.json({ error: 'Snag not found or not assigned to you' }, { status: 404 })
  }

  // Handle resolution photo upload
  const resolutionPhoto = formData.get('resolutionPhoto') as File | null
  if (resolutionPhoto && resolutionPhoto.size > 0) {
    const buffer = await resolutionPhoto.arrayBuffer()
    const fileName = `snags/${snagId}/resolution-${Date.now()}.jpg`

    await supabase.storage
      .from('snag-photos')
      .upload(fileName, buffer, { contentType: resolutionPhoto.type, upsert: true })

    const { data: urlData } = supabase.storage.from('snag-photos').getPublicUrl(fileName)

    await supabase.from('attachments').insert({
      snag_id: snagId,
      storage_path: fileName,
      public_url: urlData.publicUrl,
      file_name: resolutionPhoto.name,
      file_size: resolutionPhoto.size,
      mime_type: resolutionPhoto.type,
      is_resolution: true,
      uploaded_by_contractor: true,
    })
  }

  const resolutionNote = formData.get('resolutionNote') as string | null

  console.log(`[resolve] snagId=${snagId} contractorId=${contractor.id} — attempting update to fixed`)

  // Mark snag as fixed
  const { error: updateError, data: updated } = await supabase
    .from('snags')
    .update({ status: 'fixed', fixed_at: new Date().toISOString() })
    .eq('id', snagId)
    .select('id, status')

  console.log(`[resolve] update result: error=${JSON.stringify(updateError)} updated=${JSON.stringify(updated)}`)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Could not update snag status — no rows matched' }, { status: 500 })
  }

  // Save resolution note if provided
  if (resolutionNote?.trim()) {
    const { error: noteError } = await supabase
      .from('snags')
      .update({ resolution_note: resolutionNote.trim() })
      .eq('id', snagId)
    console.log(`[resolve] note update error=${JSON.stringify(noteError)}`)
  }

  // Re-read AFTER all updates
  const { data: verify } = await supabase
    .from('snags')
    .select('status')
    .eq('id', snagId)
    .single()

  console.log(`[resolve] final verify status=${verify?.status}`)

  if (verify?.status !== 'fixed') {
    return NextResponse.json({
      error: `DB shows "${verify?.status}" after update — a trigger or policy is reverting the status`,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
