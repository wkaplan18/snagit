'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Building2 } from 'lucide-react'
import { ORG_TYPE_CONFIG } from '@/types'
import {
  PLAN_STATUS_CONFIG, PLAN_STATUS_SORT_ORDER, SUB_STATUS_CONFIG,
  formatDate, type OrgRow,
} from '../lib'
import BillingPanel from '../components/BillingPanel'
import MemberRow from '../components/MemberRow'
import PendingInviteRow from '../components/PendingInviteRow'
import OrgEditForm from '../components/OrgEditForm'
import DeleteOrgSection from '../components/DeleteOrgSection'

type SortKey = 'planStatus' | 'createdAt'

export default function OrganizationsClient({ orgs }: { orgs: OrgRow[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [sortKey, setSortKey] = useState<SortKey>('planStatus')
  const [expandedId, setExpandedId] = useState<string | null>(highlightId)
  const [query, setQuery] = useState('')
  const highlightRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId])

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      o.members.some(m => m.email.toLowerCase().includes(q))
    )
  }, [orgs, query])

  const sortedOrgs = useMemo(() => {
    const copy = [...filteredOrgs]
    if (sortKey === 'planStatus') {
      copy.sort((a, b) => PLAN_STATUS_SORT_ORDER[a.planStatus] - PLAN_STATUS_SORT_ORDER[b.planStatus])
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return copy
  }, [filteredOrgs, sortKey])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organizations</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-slate-400" />
          {orgs.length} {orgs.length === 1 ? 'organization' : 'organizations'}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by org, email or member…"
            className="w-full text-sm rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-300"
          />
        </div>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setSortKey('planStatus')}
            className={`px-2.5 py-1.5 rounded-md border ${sortKey === 'planStatus' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200 bg-white'}`}
          >
            Sort: plan status
          </button>
          <button
            onClick={() => setSortKey('createdAt')}
            className={`px-2.5 py-1.5 rounded-md border ${sortKey === 'createdAt' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200 bg-white'}`}
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
              const isExpanded = expandedId === org.id
              const isHighlighted = highlightId === org.id
              return (
                <Fragment key={org.id}>
                  <tr
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 ${isHighlighted ? 'bg-amber-50/60' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : org.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        {org.name}
                        {org.isInternalTest && (
                          <span className="text-[10px] font-semibold uppercase text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-1.5 py-0.5">Internal</span>
                        )}
                        {org.isTrial && !org.isInternalTest && (
                          <span className="text-[10px] font-semibold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">Trial</span>
                        )}
                      </p>
                      {org.email && <p className="text-xs text-slate-400">{org.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ORG_TYPE_CONFIG[org.orgType]?.label ?? org.orgType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      {SUB_STATUS_CONFIG[org.subscriptionStatus] && (
                        <span className={`ml-1 inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${SUB_STATUS_CONFIG[org.subscriptionStatus].className}`}>
                          {SUB_STATUS_CONFIG[org.subscriptionStatus].label}
                        </span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{org.plan} · {formatDate(org.planExpiresAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{org.members.length}</td>
                    <td className="px-4 py-3 text-slate-600">{org.activeProjects} / {org.totalProjects}</td>
                    <td className="px-4 py-3 text-slate-600">{org.openSnags}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(org.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-slate-50 last:border-0 bg-slate-50/50">
                      <td colSpan={7} className="px-4 py-4 space-y-4">
                        <BillingPanel org={org} onChanged={() => router.refresh()} />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Members</p>
                          {org.members.length === 0 ? (
                            <p className="text-xs text-slate-400">No members</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {org.members.map(m => (
                                <MemberRow key={m.userId} member={m} onChanged={() => router.refresh()} />
                              ))}
                            </ul>
                          )}
                        </div>
                        {org.pendingInvites.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">Pending invites</p>
                            <ul className="space-y-1.5">
                              {org.pendingInvites.map(inv => (
                                <PendingInviteRow key={inv.id} invite={inv} />
                              ))}
                            </ul>
                          </div>
                        )}
                        <OrgEditForm org={org} onSaved={() => router.refresh()} />
                        <DeleteOrgSection org={org} onDeleted={() => { setExpandedId(null); router.refresh() }} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {sortedOrgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No organizations match your search</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
