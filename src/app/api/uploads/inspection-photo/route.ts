import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const inspectionItemId = formData.get('inspectionItemId') as string | null

  if (!file || !inspectionItemId) {
    return NextResponse.json({ error: 'file and inspectionItemId are required' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const ext = file.type.includes('png') ? 'png' : 'jpg'
  const fileName = `inspections/${inspectionItemId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('snag-photos')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('snag-photos').getPublicUrl(fileName)

  const { data: attachment, error: insertError } = await supabase
    .from('attachments')
    .insert({
      inspection_item_id: inspectionItemId,
      storage_path: fileName,
      public_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select('*')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json(attachment)
}
