import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractorsClient from './ContractorsClient'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: orgMember }, { data: contractors }] = await Promise.all([
    supabase.from('org_members').select('org_id, organizations(org_type)').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('contractors').select('*').eq('is_active', true).order('created_at', { ascending: false }),
  ])

  if (!orgMember) redirect('/onboarding')

  const org = Array.isArray(orgMember.organizations) ? orgMember.organizations[0] : orgMember.organizations as { org_type?: string } | null
  const orgType = (org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]

  return <ContractorsClient orgId={orgMember.org_id} contractors={contractors ?? []} terms={terms} />
}
