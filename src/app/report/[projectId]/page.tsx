import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import ReportClient from './ReportClient'

export default async function ReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, name, organizations!inner(org_type)')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) notFound()

  const raw = project.organizations
  const orgType = (Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null)?.org_type

  if (orgType !== 'property_manager' && orgType !== 'body_corporate') notFound()

  const unitLabel = orgType === 'body_corporate' ? 'unit or area' : 'unit or apartment'

  return (
    <ReportClient
      projectId={project.id}
      projectName={project.name}
      unitLabel={unitLabel}
    />
  )
}
