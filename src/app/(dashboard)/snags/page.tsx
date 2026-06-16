'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import SnagCard from '@/components/snags/SnagCard'
import { useSnags } from '@/hooks/useSnags'
import { createClient } from '@/lib/supabase/client'

const FILTERS = [
  { value: 'open,assigned,rejected', label: 'Open' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'approved', label: 'Approved' },
  { value: '', label: 'All' },
]

const EMPTY_MESSAGES: Record<string, string> = {
  'open,assigned,rejected': 'No open snags',
  'fixed': 'No snags awaiting sign-off',
  'approved': 'No approved snags yet',
  '': 'No snags yet',
}

function SnagsInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialFilter = FILTERS.find(f => f.value === tabParam)?.value ?? 'open,assigned,rejected'

  const [status, setStatus] = useState(initialFilter)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const { snags, loading } = useSnags({ ...(status ? { status } : {}), ...(projectId ? { projectId } : {}) })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Snags</h1>

      {projects.length > 1 && (
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="sf-input mb-3"
        >
          <option value="">All projects</option>
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
          <p className="text-sm font-medium text-slate-900">{EMPTY_MESSAGES[status] ?? 'No snags'}</p>
          <p className="mt-1 text-sm text-slate-500">Open a project and a unit to log your first snag.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snags.map(s => <SnagCard key={s.id} snag={s} />)}
        </div>
      )}
    </div>
  )
}

export default function SnagsPage() {
  return (
    <Suspense>
      <SnagsInner />
    </Suspense>
  )
}
