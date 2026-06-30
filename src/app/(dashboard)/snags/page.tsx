import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'
import SnagsClient from './SnagsClient'

export default async function SnagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  const { data: projects } = await supabase.from('projects').select('id, name').eq('org_id', orgId).order('name')
  const projectIds = (projects ?? []).map(p => p.id)

  const [{ data: initialSnags }, { count: fixedCount }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from('snags').select(`
          *, attachments(*),
          contractor:contractors(id, name, company, whatsapp, trade, access_token),
          room:rooms(id, name),
          unit:units(id, name),
          project:projects(id, name)
        `).in('project_id', projectIds).in('status', ['open', 'assigned', 'rejected']).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('snags').select('id', { count: 'exact', head: true }).in('project_id', projectIds.length > 0 ? projectIds : ['']).eq('status', 'fixed'),
  ])

  const terms = DASHBOARD_TERMS[(activeOrg?.org?.org_type ?? 'builder') as OrgType]

  return (
    <SnagsClient
      initialSnags={initialSnags ?? []}
      projects={projects ?? []}
      terms={terms}
      fixedCount={fixedCount ?? 0}
    />
  )
}
