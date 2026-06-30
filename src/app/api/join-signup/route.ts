import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { token, email, password } = await req.json()
  if (!token || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Validate the invite is real, not expired, not already used
  const { data: invite } = await admin
    .from('org_invites')
    .select('id, email, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'Email does not match invite' }, { status: 400 })
  }

  // Create user via admin — email_confirm: true skips verification since invite validates the email
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    // User already exists — that's fine, they should sign in instead
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
