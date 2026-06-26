'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle, Plus, Printer } from 'lucide-react'
import Link from 'next/link'
import SnagCard from '@/components/snags/SnagCard'
import type { Snag, DashboardTerms } from '@/types'

const FILTERS = [
  { value: 'open,assigned,rejected', label: 'Open' },
  { value: 'fixed', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: '', label: 'All' },
]

interface Props {
  initialSnags: Snag[]
  projects: { id: string; name: string }[]
  terms: DashboardTerms
  fixedCount: number
}

export default function SnagsClient({ initialSnags, projects, terms, fixedCount }: Props) {
  const [status, setStatus] = useState('open,assigned,rejected')
  const [projectId, setProjectId] = useState('')
  const [snags, setSnags] = useState<Snag[]>(initialSnags)
  const [loading, setLoading] = useState(false)
  const mounted = useRef(false)

  const issue = terms.issue.toLowerCase()
  const issues = terms.issues.toLowerCase()

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (projectId) params.set('project_id', projectId)
    fetch(`/api/snags?${params}`)
      .then(r => r.json())
      .then(data => { setSnags(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, projectId])

  const EMPTY_MESSAGES: Record<string, string> = {
    'open,assigned,rejected': `No open ${issues}`,
    'fixed': `No ${issues} awaiting sign-off`,
    'approved': `No approved ${issues} yet`,
    '': `No ${issues} yet`,
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{terms.issues}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/snags/report?${new URLSearchParams({ ...(status ? { status } : {}), ...(projectId ? { project_id: projectId } : {}) })}`}
            target="_blank"
            title="Print / Save PDF report"
            className="sf-btn-secondary flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <Printer className="h-4 w-4" />
          </Link>
          <Link href="/snags/new" className="sf-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm">
            <Plus className="h-4 w-4" /> Add {issue}
          </Link>
        </div>
      </div>

      {projects.length > 1 && (
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="sf-input mb-3">
          <option value="">All {terms.projects.toLowerCase()}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => {
          const active = status === f.value
          const showBadge = f.value === 'fixed' && fixedCount > 0
          return (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#1A56DB] bg-[#1A56DB] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
              {showBadge && (
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? 'bg-white text-[#1A56DB]' : 'bg-orange-500 text-white'
                }`}>
                  {fixedCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : snags.length === 0 ? (
        <div className="sf-card flex flex-col items-center p-10 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">{EMPTY_MESSAGES[status] ?? `No ${issues}`}</p>
          <p className="mt-1 text-sm text-slate-500">
            Tap &ldquo;Add {issue}&rdquo; above to log your first one.
          </p>
        </div>
      ) : (() => {
        // Group by unit when multiple units are present
        const unitIds = [...new Set(snags.map(s => s.unit_id))]
        const grouped = unitIds.length > 1

        if (!grouped) {
          return (
            <div className="space-y-2">
              {snags.map(s => <SnagCard key={s.id} snag={s} />)}
            </div>
          )
        }

        const byUnit = unitIds.map(uid => ({
          unitName: snags.find(s => s.unit_id === uid)?.unit?.name ?? uid,
          snags: snags.filter(s => s.unit_id === uid),
        }))

        return (
          <div className="space-y-5">
            {byUnit.map(group => (
              <div key={group.unitName}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.unitName}</p>
                <div className="space-y-2">
                  {group.snags.map(s => <SnagCard key={s.id} snag={s} />)}
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
