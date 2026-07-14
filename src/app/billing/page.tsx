import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import BillingClient from '../(dashboard)/settings/billing/BillingClient'

// Standalone billing page, outside the (dashboard) group so locked-out
// orgs can still reach it — the dashboard layout redirects here.
export default async function StandaloneBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const role = allOrgs.find(o => o.org_id === orgId)?.role ?? 'manager'

  const admin = createAdminClient()
  const [{ data: org }, { count: propertyCount }] = await Promise.all([
    admin
      .from('organizations')
      .select('plan, subscription_status, plan_expires_at, is_trial')
      .eq('id', orgId)
      .single(),
    admin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'archived'),
  ])

  return (
    <div className="min-h-screen bg-slate-50 pt-safe">
      <BillingClient
        currentPlan={org?.plan ?? 'starter'}
        subscriptionStatus={org?.subscription_status ?? 'none'}
        isTrial={org?.is_trial ?? false}
        planExpiresAt={org?.plan_expires_at ?? null}
        propertyCount={propertyCount ?? 0}
        canManage={role === 'owner' || role === 'admin'}
        standalone
      />
    </div>
  )
}
