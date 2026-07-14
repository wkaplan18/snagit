import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'noreply@snagitapp.co.za'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snagitapp.co.za'

// POST { inviteId } — extend an invite by 7 days and resend the email
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isPlatformOwner(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { inviteId } = await req.json()
  if (!inviteId) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('org_invites')
    .select('id, email, token, accepted_at, organizations(name)')
    .eq('id', inviteId)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })

  const orgRaw = invite.organizations
  const orgName = (Array.isArray(orgRaw) ? orgRaw[0]?.name : (orgRaw as { name: string } | null)?.name) ?? 'Your team'

  await admin
    .from('org_invites')
    .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', inviteId)

  const joinUrl = `${BASE_URL}/join/${invite.token}`

  const { error: emailError } = await resend.emails.send({
    from: `SnagIT <${FROM}>`,
    to: invite.email,
    subject: `Reminder: join ${orgName} on SnagIT`,
    text: `Hi,\n\nJust a reminder — you've been invited to join ${orgName} on SnagIT, the fault-logging platform for property and construction teams.\n\nAccept your invitation here:\n${joinUrl}\n\nThis link expires in 7 days.\n\n— The SnagIT team\nsnagitapp.co.za`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="background:#ffffff;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;border-bottom:1px solid #E2E8F0">
          <img src="https://snagitapp.co.za/icons/icon-192.png" alt="SnagIT" width="48" height="48" style="border-radius:12px;display:block;margin:0 auto 10px" />
          <p style="margin:0;font-size:20px;font-weight:700;color:#1E293B">Your invitation is waiting</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6">
            Just a reminder — you've been invited to join <strong>${orgName}</strong> on SnagIT, the fault-logging platform for property and construction teams.
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
    return NextResponse.json({ error: 'Email failed to send' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
