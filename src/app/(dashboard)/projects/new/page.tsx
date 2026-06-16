import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewProjectClient from './NewProjectClient'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id, organizations(org_type)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!orgMember) redirect('/onboarding')

  const raw = orgMember?.organizations
  const org = Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null | undefined
  const terms = DASHBOARD_TERMS[(org?.org_type ?? 'builder') as OrgType]

  return <NewProjectClient orgId={orgMember.org_id} terms={terms} />
}
