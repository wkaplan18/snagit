import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inspection } = await supabase
    .from('inspections')
    .select('tenant_signature_url, inspector_signature_url')
    .eq('id', id)
    .single()

  if (!inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  if (!inspection.tenant_signature_url || !inspection.inspector_signature_url) {
    return NextResponse.json({ error: 'Both tenant and inspector signatures are required before completing' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('inspections')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
