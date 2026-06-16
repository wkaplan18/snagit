'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import SnagCard from '@/components/snags/SnagCard'
import { useSnags } from '@/hooks/useSnags'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_TERMS } from '@/types'
import type { DashboardTerms, OrgType } from '@/types'

const FILTERS = [
  { value: 'open,assigned,rejected', label: 'Open' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'approved', label: 'Approved' },
  { value: '', label: 'All' },
]

function SnagsInner({ terms }: { terms: DashboardTerms }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialFilter = FILTERS.find(f => f.value === tabParam)?.value ?? 'open,assigned,rejected'

  const [status, setStatus] = useState(initialFilter)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const { snags, loading } = useSnags({ ...(status ? { status } : {}), ...(projectId ? { projectId } : {}) })
  const supabase = createClient()

  const issue = terms.issue.toLowerCase()
  const issues = terms.issues.toLowerCase()
  const projects_term = terms.projects.toLowerCase()

  const EMPTY_MESSAGES: Record<string, string> = {
    'open,assigned,rejected': `No open ${issues}`,
    'fixed': `No ${issues} awaiting sign-off`,
    'approved': `No approved ${issues} yet`,
    '': `No ${issues} yet`,
  }

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{terms.issues}</h1>
        <Link
          href="/snags/new"
          className="sf-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add {issue}
        </Link>
      </div>

      {projects.length > 1 && (
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="sf-input mb-3"
        >
          <option value="">All {projects_term}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              status === f.value
                ? 'border-[#1A56DB] bg-[#1A56DB] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
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
      ) : (
        <div className="space-y-2">
          {snags.map(s => <SnagCard key={s.id} snag={s} />)}
        </div>
      )}
    </div>
  )
}

function SnagsWithTerms() {
  const [terms, setTerms] = useState<DashboardTerms | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: memberData } = await supabase
        .from('org_members')
        .select('org_id, organizations(org_type)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      const raw = memberData?.organizations
      const org = Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null | undefined
      const type = (org?.org_type ?? 'builder') as OrgType
      setTerms(DASHBOARD_TERMS[type])
    })
  }, [])

  if (!terms) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#1A56DB]" />
    </div>
  )

  return (
    <Suspense>
      <SnagsInner terms={terms} />
    </Suspense>
  )
}

export default function SnagsPage() {
  return <SnagsWithTerms />
}
