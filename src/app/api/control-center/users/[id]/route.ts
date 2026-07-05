import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformOwner } from '@/lib/isPlatformOwner'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformOwner(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: targetUser, error: fetchError } = await admin.auth.admin.getUserById(id)
  if (fetchError || !targetUser?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const email = targetUser.user.email ?? ''
  if (isPlatformOwner(email)) return NextResponse.json({ error: 'Cannot delete the platform owner account' }, { status: 400 })
  if (typeof body.confirmEmail !== 'string' || body.confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'Confirmation email does not match' }, { status: 400 })
  }

  // Clean up any still-pending invite for this email so the org can re-invite the same address
  await admin.from('org_invites').delete().is('accepted_at', null).ilike('email', email)

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
