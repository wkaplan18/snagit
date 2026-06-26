import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('access_token', token)
    .eq('is_active', true)
    .gt('token_expires_at', new Date().toISOString())
    .single()

  if (!contractor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: snags } = await supabase
    .from('snags')
    .select('id, status')
    .eq('assigned_to', contractor.id)

  return NextResponse.json(snags ?? [])
}
