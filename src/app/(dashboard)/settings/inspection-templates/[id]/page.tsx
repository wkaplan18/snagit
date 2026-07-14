import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect, notFound } from 'next/navigation'
import TemplateEditorClient from './TemplateEditorClient'
import type { OrgType } from '@/types'

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  if (orgType !== 'property_manager' && orgType !== 'body_corporate') redirect('/dashboard')

  const role = activeOrg?.role
  if (role !== 'owner' && role !== 'admin') redirect('/dashboard')

  const { data: template } = await supabase
    .from('inspection_templates')
    .select('*, rooms:inspection_template_rooms(*, items:inspection_template_items(*))')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!template) notFound()

  return <TemplateEditorClient template={template} />
}
