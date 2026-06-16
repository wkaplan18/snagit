import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddJobClient from './AddJobClient'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types' // still needed for cast below

export default async function AddJobPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; unitId?: string }>
}) {
  const { projectId: qProject, unitId: qUnit } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberData } = await supabase
    .from('org_members')
    .select('org_id, organizations(org_type)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const raw = memberData?.organizations
  const org = Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null | undefined
  const orgType = (org?.org_type ?? 'builder') as OrgType
  const orgId = memberData?.org_id ?? ''
  const terms = DASHBOARD_TERMS[orgType]

  let projectId = qProject ?? ''
  let unitId = qUnit ?? ''

  if (orgType === 'homeowner' && (!projectId || !unitId)) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle()

    if (!project) redirect('/projects/new')
    projectId = project.id

    let { data: unit } = await supabase
      .from('units')
      .select('id')
      .eq('project_id', project.id)
      .limit(1)
      .maybeSingle()

    if (!unit) {
      const { data: created } = await supabase
        .from('units')
        .insert({ project_id: project.id, name: 'Main', unit_type: 'house' })
        .select('id')
        .single()
      unit = created
    }

    if (!unit) redirect('/projects')
    unitId = unit.id
  }

  if (!projectId || !unitId) redirect('/projects')

  const [{ data: rooms }, { data: contractors }] = await Promise.all([
    supabase.from('rooms').select('*').eq('unit_id', unitId).order('room_order'),
    supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('name'),
  ])

  return (
    <AddJobClient
      projectId={projectId}
      unitId={unitId}
      orgId={orgId}
      terms={terms}
      initialRooms={rooms ?? []}
      initialContractors={contractors ?? []}
    />
  )
}
