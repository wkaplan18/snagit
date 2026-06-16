import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'
import SnagsClient from './SnagsClient'

export default async function SnagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: orgMember }, { data: initialSnags }, { data: projects }, { count: fixedCount }] = await Promise.all([
    supabase.from('org_members').select('org_id, organizations(org_type)').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('snags').select(`
      *, attachments(*),
      contractor:contractors(id, name, company, whatsapp, trade, access_token),
      room:rooms(id, name),
      project:projects(id, name)
    `).in('status', ['open', 'assigned', 'rejected']).order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('snags').select('id', { count: 'exact', head: true }).eq('status', 'fixed'),
  ])

  const raw = orgMember?.organizations
  const org = Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null | undefined
  const terms = DASHBOARD_TERMS[(org?.org_type ?? 'builder') as OrgType]

  return (
    <SnagsClient
      initialSnags={initialSnags ?? []}
      projects={projects ?? []}
      terms={terms}
      fixedCount={fixedCount ?? 0}
    />
  )
}
