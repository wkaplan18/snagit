import Link from 'next/link'
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react'
import { getControlCenterData } from './data'
import { attentionReason, formatCurrency, formatDate } from './lib'
import KpiTile from './components/KpiTile'
import { ORG_TYPE_CONFIG } from '@/types'

export default async function OverviewPage() {
  const { orgs, kpis, needsAttentionOrgs } = await getControlCenterData()

  const recentOrgs = [...orgs]
    .filter(o => !o.isInternalTest)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-6 max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1A56DB]">Overview</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Here's how SnagIT is doing right now.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile accent="blue" label="Monthly recurring revenue" value={formatCurrency(kpis.mrr)} sub={`${kpis.payingViaPaystack + kpis.payingManually} paying orgs`} />
        <KpiTile accent="slate" label="Total organizations" value={String(kpis.totalOrgs)} sub="excl. internal testing" />
        <KpiTile accent="emerald" label="Billable projects" value={String(kpis.totalActiveProjects)} sub="active properties" />
        <KpiTile accent="amber" label="Needs attention" value={String(kpis.needsAttentionCount)} sub="billing issues & trials" />
      </div>

      {needsAttentionOrgs.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-3 border-b border-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Needs attention ({needsAttentionOrgs.length})</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {needsAttentionOrgs.map(org => (
              <li key={org.id}>
                <Link
                  href={`/control-center/organizations?highlight=${org.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{org.name}</p>
                    <p className="text-xs text-amber-600 mt-0.5">{attentionReason(org)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Recent signups</p>
        </div>
        <ul className="divide-y divide-slate-50">
          {recentOrgs.map(org => (
            <li key={org.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{org.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ORG_TYPE_CONFIG[org.orgType]?.label ?? org.orgType} · {org.plan} · {formatDate(org.createdAt)}</p>
              </div>
              {org.isTrial && (
                <span className="text-[10px] font-semibold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 shrink-0">Trial</span>
              )}
            </li>
          ))}
          {recentOrgs.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-400">No organizations yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}
