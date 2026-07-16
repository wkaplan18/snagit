import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import ProjectsListClient from './ProjectsListClient'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''
  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const terms = DASHBOARD_TERMS[(activeOrg?.org?.org_type ?? 'builder') as OrgType]

  const { data: projects } = await supabase
    .from('projects').select('id, name, address, city, status, image_url').eq('org_id', orgId).order('updated_at', { ascending: false })

  const projectIds = (projects ?? []).map(p => p.id)
  const { data: snagRows } = projectIds.length > 0
    ? await supabase.from('snags').select('project_id, status').in('project_id', projectIds)
    : { data: [] }

  const ACTIVE = new Set(['open', 'assigned', 'rejected'])
  const countsByProject: Record<string, { active: number; review: number; approved: number }> = {}
  for (const s of snagRows ?? []) {
    const c = countsByProject[s.project_id] ?? (countsByProject[s.project_id] = { active: 0, review: 0, approved: 0 })
    if (ACTIVE.has(s.status)) c.active++
    else if (s.status === 'fixed') c.review++
    else if (s.status === 'approved') c.approved++
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{terms.projects}</h1>
        <Link href="/projects/new" className="sf-btn-primary px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New {terms.project.toLowerCase()}
        </Link>
      </div>

      {(projects ?? []).length === 0 ? (
        <div className="sf-card flex flex-col items-center p-10 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">No {terms.projects.toLowerCase()} yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first {terms.project.toLowerCase()} to start tracking {terms.issues.toLowerCase()}.</p>
          <Link href="/projects/new" className="sf-btn-primary mt-5 px-5 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Add {terms.project.toLowerCase()}
          </Link>
        </div>
      ) : (
        <ProjectsListClient projects={projects ?? []} countsByProject={countsByProject} />
      )}
    </div>
  )
}
