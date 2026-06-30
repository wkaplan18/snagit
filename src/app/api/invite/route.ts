import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'noreply@snagitapp.co.za'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snagitapp.co.za'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role = 'admin' } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Get the user's active org
  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'No organisation found' }, { status: 403 })

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgName = activeOrg?.org?.name ?? 'Your team'

  // Don't invite someone already in the org
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)

  if (existing) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const memberEmails = new Set(
      users.filter(u => existing.some(m => m.user_id === u.id)).map(u => u.email?.toLowerCase())
    )
    if (memberEmails.has(email.toLowerCase())) {
      return NextResponse.json({ error: 'That person is already a member of your organisation' }, { status: 409 })
    }
  }

  // Use admin client to bypass RLS for upsert (UPDATE path blocks with user client)
  const { data: invite, error: inviteError } = await admin
    .from('org_invites')
    .upsert(
      { org_id: orgId, email: email.toLowerCase(), role, invited_by: user.id, accepted_at: null },
      { onConflict: 'org_id,email', ignoreDuplicates: false }
    )
    .select('token')
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message ?? 'Could not create invite' }, { status: 500 })
  }

  const joinUrl = `${BASE_URL}/join/${invite.token}`

  const { error: emailError } = await resend.emails.send({
    from: `SnagIT <${FROM}>`,
    to: email,
    subject: `Join ${orgName} on SnagIT`,
    text: `Hi,\n\nYou've been invited to join ${orgName} on SnagIT — the fault-logging platform for property and construction teams.\n\nAccept your invitation here:\n${joinUrl}\n\nThis link expires in 7 days.\n\n— The SnagIT team\nsnagitapp.co.za`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <!-- Header -->
        <tr><td style="background:#ffffff;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;border-bottom:1px solid #E2E8F0">
          <img src="https://snagitapp.co.za/icons/icon-192.png" alt="SnagIT" width="48" height="48" style="border-radius:12px;display:block;margin:0 auto 10px" />
          <p style="margin:0;font-size:20px;font-weight:700;color:#1E293B">You've been invited</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6">
            You've been invited to join <strong>${orgName}</strong> on SnagIT — the fault-logging platform for property and construction teams.
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#64748B;line-height:1.6">
            Click the button below to accept and get started. This link expires in 7 days.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
            <tr><td style="background:#1A56DB;border-radius:12px;padding:14px 32px;text-align:center">
              <a href="${joinUrl}" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none">Accept invitation →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center">
            Or copy this link: <a href="${joinUrl}" style="color:#1A56DB">${joinUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#CBD5E1">POPIA compliant · snagitapp.co.za</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (emailError) {
    console.error('Resend invite error:', JSON.stringify(emailError))
    return NextResponse.json({ error: `Email failed: ${JSON.stringify(emailError)}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the invite belongs to the user's active org before deleting
  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const membership = { org_id: orgId }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('org_invites')
    .delete()
    .eq('id', id)
    .eq('org_id', membership.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
