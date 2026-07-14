import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPlatformOwner } from '@/lib/isPlatformOwner'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.snagitapp.co.za'

// POST { email } — send a password-reset email to any user
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformOwner(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${BASE_URL}/auth/callback?next=/auth/reset-password`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
