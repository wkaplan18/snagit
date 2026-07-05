'use client'

import { useMemo, useState } from 'react'
import { ORG_TYPE_CONFIG } from '@/types'
import type { OrgType } from '@/types'

export interface OrgRow {
  id: string
  name: string
  orgType: OrgType
  plan: string
  planExpiresAt: string | null
  planStatus: 'expired' | 'expiring_soon' | 'active' | 'no_expiry'
  email: string | null
  createdAt: string
  memberCount: number
  activeProjects: number
  totalProjects: number
  openSnags: number
}

interface Kpis {
  totalOrgs: number
  activeOrgs: number
  totalActiveProjects: number
  estimatedMrr: number
  expiringSoonCount: number
}

const PLAN_STATUS_CONFIG: Record<OrgRow['planStatus'], { label: string; className: string }> = {
  expired: { label: 'Expired', className: 'text-red-700 bg-red-50 border-red-200' },
  expiring_soon: { label: 'Expiring soon', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  active: { label: 'Active', className: 'text-green-700 bg-green-50 border-green-200' },
  no_expiry: { label: 'No expiry set', className: 'text-slate-500 bg-slate-50 border-slate-200' },
}

const PLAN_STATUS_SORT_ORDER: Record<OrgRow['planStatus'], number> = {
  expired: 0,
  expiring_soon: 1,
  no_expiry: 2,
  active: 3,
}

type SortKey = 'planStatus' | 'createdAt'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-semibold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ControlCenterClient({ orgs, kpis }: { orgs: OrgRow[]; kpis: Kpis }) {
  const [sortKey, setSortKey] = useState<SortKey>('planStatus')

  const sortedOrgs = useMemo(() => {
    const copy = [...orgs]
    if (sortKey === 'planStatus') {
      copy.sort((a, b) => PLAN_STATUS_SORT_ORDER[a.planStatus] - PLAN_STATUS_SORT_ORDER[b.planStatus])
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return copy
  }, [orgs, sortKey])

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total orgs" value={String(kpis.totalOrgs)} />
        <KpiTile label="Active orgs" value={String(kpis.activeOrgs)} />
        <KpiTile label="Billable projects" value={String(kpis.totalActiveProjects)} sub="active projects/properties" />
        <KpiTile label="Estimated MRR" value={formatCurrency(kpis.estimatedMrr)} sub="R1,499 × active projects" />
        <KpiTile label="Expiring soon" value={String(kpis.expiringSoonCount)} sub="within 14 days" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Organizations</h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setSortKey('planStatus')}
            className={`px-2 py-1 rounded-md border ${sortKey === 'planStatus' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}
          >
            Sort: plan status
          </button>
          <button
            onClick={() => setSortKey('createdAt')}
            className={`px-2 py-1 rounded-md border ${sortKey === 'createdAt' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}
          >
            Sort: newest
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2 font-medium">Org</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium">Projects</th>
              <th className="px-4 py-2 font-medium">Open snags</th>
              <th className="px-4 py-2 font-medium">Customer since</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrgs.map(org => {
              const status = PLAN_STATUS_CONFIG[org.planStatus]
              return (
                <tr key={org.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{org.name}</p>
                    {org.email && <p className="text-xs text-slate-400">{org.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ORG_TYPE_CONFIG[org.orgType]?.label ?? org.orgType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(org.planExpiresAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{org.memberCount}</td>
                  <td className="px-4 py-3 text-slate-600">{org.activeProjects} / {org.totalProjects}</td>
                  <td className="px-4 py-3 text-slate-600">{org.openSnags}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(org.createdAt)}</td>
                </tr>
              )
            })}
            {sortedOrgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No organizations yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
