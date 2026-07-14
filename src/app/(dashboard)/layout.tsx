import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import OrgSwitcher from '@/components/ui/OrgSwitcher'
import AppBadgeSync from '@/components/ui/AppBadgeSync'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let terms = DASHBOARD_TERMS['builder']
  let fixedCount = 0
  let badgeCount = 0
  let orgs: Awaited<ReturnType<typeof getAllUserOrgs>> = []
  let activeOrgId = ''

  if (user) {
    const allOrgs = await getAllUserOrgs(user.id)
    orgs = allOrgs
    activeOrgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''

    const activeOrg = allOrgs.find(o => o.org_id === activeOrgId)
    const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
    terms = DASHBOARD_TERMS[orgType]

    // Billing lock: expired unpaid trials and cancelled subscriptions lose app
    // access and are sent to the standalone billing page to subscribe.
    if (activeOrgId && !isPlatformOwner(user.email)) {
      const admin = createAdminClient()
      const { data: orgFlags } = await admin
        .from('organizations')
        .select('is_trial, is_internal_test, plan_expires_at, subscription_status')
        .eq('id', activeOrgId)
        .single()

      if (orgFlags && !orgFlags.is_internal_test && orgFlags.subscription_status !== 'active') {
        // A future plan_expires_at is a manual override (trial extension / grace period)
        const hasFuturePeriod = orgFlags.plan_expires_at && new Date(orgFlags.plan_expires_at) > new Date()
        const trialExpired = orgFlags.is_trial && orgFlags.plan_expires_at && new Date(orgFlags.plan_expires_at) < new Date()
        if (!hasFuturePeriod && (trialExpired || orgFlags.subscription_status === 'cancelled')) {
          redirect('/billing?locked=1')
        }
      }
    }

    const [{ count: fixed }, { count: badge }] = await Promise.all([
      supabase.from('snags').select('id', { count: 'exact', head: true }).eq('status', 'fixed'),
      activeOrgId
        ? supabase
            .from('snags')
            .select('id, project:projects!inner(org_id)', { count: 'exact', head: true })
            .eq('project.org_id', activeOrgId)
            .in('status', ['open', 'fixed'])
        : Promise.resolve({ count: 0 }),
    ])
    fixedCount = fixed ?? 0
    badgeCount = badge ?? 0
  }

  const activeOrg = orgs.find(o => o.org_id === activeOrgId)
  const orgType2 = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const isOwner = isPlatformOwner(user?.email)

  return (
    <div className="relative min-h-screen pt-safe">
      {(orgs.length > 1 || isOwner) && (
        <div className="sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-2">
          <p className="text-xs text-slate-400 font-medium">Workspace</p>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Link href="/control-center" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
                Control Center
              </Link>
            )}
            {orgs.length > 1 && <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />}
          </div>
        </div>
      )}
      {children}
      <BottomNav terms={terms} fixedCount={fixedCount} orgType={orgType2} />
      <AppBadgeSync count={badgeCount} />
    </div>
  )
}
