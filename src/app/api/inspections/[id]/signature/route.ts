import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const role = formData.get('role') as string | null

  if (!file || (role !== 'tenant' && role !== 'inspector')) {
    return NextResponse.json({ error: 'file and role (tenant|inspector) are required' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const fileName = `inspections/${id}/signature-${role}-${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('snag-photos')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('snag-photos').getPublicUrl(fileName)
  const now = new Date().toISOString()

  const fields = role === 'tenant'
    ? { tenant_signature_url: urlData.publicUrl, tenant_signed_at: now }
    : { inspector_signature_url: urlData.publicUrl, inspector_signed_at: now }

  const { data, error } = await supabase
    .from('inspections')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
