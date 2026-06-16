import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const snagId = formData.get('snagId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const ext = file.type.includes('png') ? 'png' : 'jpg'
  const folder = snagId ? `snags/${snagId}` : `snags/temp/${user.id}`
  const fileName = `${folder}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('snag-photos')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('snag-photos').getPublicUrl(fileName)

  if (snagId) {
    await supabase.from('attachments').insert({
      snag_id: snagId,
      storage_path: fileName,
      public_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
  }

  return NextResponse.json({ url: urlData.publicUrl, path: fileName })
}
