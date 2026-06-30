import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setActiveOrgCookie } from '@/lib/activeOrg'
import JoinClient from './JoinClient'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  // Validate the invite token
  const { data: invite } = await admin
    .from('org_invites')
    .select('id, org_id, email, role, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .single()

  if (!invite) {
    return <ErrorScreen message="This invite link is invalid or has already been used." />
  }

  if (invite.accepted_at) {
    return <ErrorScreen message="This invite has already been accepted." />
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorScreen message="This invite link has expired. Ask your admin to send a new one." />
  }

  const org = Array.isArray(invite.organizations) ? invite.organizations[0] : invite.organizations as { name?: string } | null
  const orgName = org?.name ?? 'Your team'

  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <ErrorScreen message={`This invite was sent to ${invite.email}. You're signed in as ${user.email}. Please sign out first and try again.`} />
      )
    }

    // Correct user — accept the invite
    const { data: alreadyMember } = await admin
      .from('org_members')
      .select('id')
      .eq('org_id', invite.org_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!alreadyMember) {
      await admin.from('org_members').insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
      })
    }

    await admin.from('org_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
    await setActiveOrgCookie(invite.org_id)

    redirect('/dashboard')
  }

  return <JoinClient token={token} orgName={orgName} inviteEmail={invite.email} />
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-slate-900">Invite unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <a href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1A56DB] px-5 py-3 text-sm font-bold text-white">
          Go to SnagIT
        </a>
      </div>
    </div>
  )
}
