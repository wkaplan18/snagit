import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  // Resolve the caller's active org and require owner/admin there
  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = allOrgs.find(o => o.org_id === orgId)?.role
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can remove team members' }, { status: 403 })
  }

  const admin = createAdminClient()

  // The org owner can never be removed
  const { data: target } = await admin
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'The organisation owner cannot be removed' }, { status: 403 })
  }

  const { error } = await admin
    .from('org_members')
    .delete()
    .eq('user_id', userId)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
