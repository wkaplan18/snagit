import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewProjectClient from './NewProjectClient'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!orgMember) redirect('/onboarding')

  return <NewProjectClient orgId={orgMember.org_id} />
}
