import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, whatsapp, phone, job_title')
    .eq('id', user.id)
    .single()

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? null
  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const org = activeOrg?.org ?? null

  // Fetch team members + pending invites in parallel
  const admin = createAdminClient()
  const [{ data: rawMembers }, { data: invites }] = await Promise.all([
    orgId
      ? admin.from('org_members').select('user_id, role, created_at').eq('org_id', orgId)
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.from('org_invites').select('id, email, role, created_at, expires_at').is('accepted_at', null).eq('org_id', orgId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // Get emails for all org members via admin
  let members: { user_id: string; role: string; email: string; name: string | null }[] = []
  if (rawMembers && rawMembers.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const memberIds = new Set(rawMembers.map(m => m.user_id))
    const userMap = new Map(users.filter(u => memberIds.has(u.id)).map(u => [u.id, u.email ?? '']))

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', rawMembers.map(m => m.user_id))

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

    members = rawMembers.map(m => ({
      user_id: m.user_id,
      role: m.role,
      email: userMap.get(m.user_id) ?? '',
      name: profileMap.get(m.user_id) ?? null,
    }))
  }

  return (
    <SettingsClient
      email={user.email ?? ''}
      currentUserId={user.id}
      profile={profile ?? { full_name: null, whatsapp: null, phone: null, job_title: null }}
      orgName={org?.name ?? null}
      orgType={org?.org_type ?? null}
      orgId={orgId}
      members={members}
      pendingInvites={(invites ?? []).filter(i => new Date(i.expires_at) > new Date())}
    />
  )
}
