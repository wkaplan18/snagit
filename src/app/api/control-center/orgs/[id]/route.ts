import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformOwner } from '@/lib/isPlatformOwner'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformOwner(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const update: Record<string, string | boolean | null> = {}
  if (typeof body.plan === 'string') update.plan = body.plan
  if (body.plan_expires_at === null || typeof body.plan_expires_at === 'string') update.plan_expires_at = body.plan_expires_at
  if (typeof body.is_trial === 'boolean') update.is_trial = body.is_trial
  if (typeof body.is_internal_test === 'boolean') update.is_internal_test = body.is_internal_test

  const admin = createAdminClient()
  const { data, error } = await admin.from('organizations').update(update).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
