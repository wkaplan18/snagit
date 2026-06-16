import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractorsClient from './ContractorsClient'

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: orgMember }, { data: contractors }] = await Promise.all([
    supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('contractors').select('*').eq('is_active', true).order('created_at', { ascending: false }),
  ])

  if (!orgMember) redirect('/onboarding')

  return <ContractorsClient orgId={orgMember.org_id} contractors={contractors ?? []} />
}
