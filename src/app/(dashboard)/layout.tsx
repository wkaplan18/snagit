import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/BottomNav'
import OrgSwitcher from '@/components/ui/OrgSwitcher'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS } from '@/types'
import type { OrgType } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let terms = DASHBOARD_TERMS['builder']
  let fixedCount = 0
  let orgs: Awaited<ReturnType<typeof getAllUserOrgs>> = []
  let activeOrgId = ''

  if (user) {
    const [allOrgs, { count }] = await Promise.all([
      getAllUserOrgs(user.id),
      supabase.from('snags').select('id', { count: 'exact', head: true }).eq('status', 'fixed'),
    ])

    orgs = allOrgs
    activeOrgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''

    const activeOrg = allOrgs.find(o => o.org_id === activeOrgId)
    const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
    terms = DASHBOARD_TERMS[orgType]
    fixedCount = count ?? 0
  }

  return (
    <div className="relative min-h-screen pt-safe">
      {orgs.length > 1 && (
        <div className="sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-2">
          <p className="text-xs text-slate-400 font-medium">Workspace</p>
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
        </div>
      )}
      {children}
      <BottomNav terms={terms} fixedCount={fixedCount} />
    </div>
  )
}
