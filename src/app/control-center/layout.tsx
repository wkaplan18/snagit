import { createClient } from '@/lib/supabase/server'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { redirect } from 'next/navigation'
import ControlCenterSidebar from './ControlCenterSidebar'
import { getControlCenterData } from './data'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ControlCenterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isPlatformOwner(user.email)) redirect('/dashboard')

  // Cached via React cache() — this and each section page share one fetch per request
  const { kpis, orphanUsers, orgs } = await getControlCenterData()
  const pendingInvites = orgs.reduce((sum, o) => sum + o.pendingInvites.length, 0)

  return (
    <div className="md:flex md:min-h-screen bg-slate-50 pt-safe">
      <ControlCenterSidebar
        needsAttentionCount={kpis.needsAttentionCount}
        orgCount={kpis.totalOrgs}
        peopleCount={orphanUsers.length + pendingInvites}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
