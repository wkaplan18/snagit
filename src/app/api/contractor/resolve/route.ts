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

  // Mark snag as fixed
  await supabase
    .from('snags')
    .update({
      status: 'fixed',
      fixed_at: new Date().toISOString(),
    })
    .eq('id', snagId)

  return NextResponse.json({ success: true })
}
