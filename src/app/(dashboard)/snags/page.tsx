'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import SnagCard from '@/components/snags/SnagCard'
import AddSnagSheet from '@/components/snags/AddSnagSheet'
import { useSnags } from '@/hooks/useSnags'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_TERMS } from '@/types'
import type { Contractor, DashboardTerms, OrgType, Room } from '@/types'

const FILTERS = [
  { value: 'open,assigned,rejected', label: 'Open' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'approved', label: 'Approved' },
  { value: '', label: 'All' },
]

interface AddContext {
  projectId: string
  unitId: string
  orgId: string
  rooms: Room[]
  contractors: Contractor[]
}

interface InnerProps {
  terms: DashboardTerms
  orgType: OrgType
  addContext: AddContext | null
}

function SnagsInner({ terms, orgType, addContext }: InnerProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialFilter = FILTERS.find(f => f.value === tabParam)?.value ?? 'open,assigned,rejected'

  const [status, setStatus] = useState(initialFilter)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [adding, setAdding] = useState(false)
  const { snags, loading, refetch } = useSnags({ ...(status ? { status } : {}), ...(projectId ? { projectId } : {}) })
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
        {addContext ? (
          <button
            onClick={() => setAdding(true)}
            className="sf-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add {terms.issue.toLowerCase()}
          </button>
        ) : (
          <Link
            href="/projects"
            className="sf-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add {terms.issue.toLowerCase()}
          </Link>
        )}
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
            {addContext
              ? `Tap "Add ${terms.issue.toLowerCase()}" above to log your first one.`
              : `Open a ${terms.project.toLowerCase()} to log your first ${issue}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {snags.map(s => <SnagCard key={s.id} snag={s} />)}
        </div>
      )}

      {adding && addContext && (
        <AddSnagSheet
          projectId={addContext.projectId}
          unitId={addContext.unitId}
          rooms={addContext.rooms}
          contractors={addContext.contractors}
          terms={terms}
          orgType={orgType}
          orgId={addContext.orgId}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); refetch() }}
        />
      )}
    </div>
  )
}

function SnagsWithTerms() {
  const [terms, setTerms] = useState<DashboardTerms | null>(null)
  const [orgType, setOrgType] = useState<OrgType>('builder')
  const [addContext, setAddContext] = useState<AddContext | null>(null)
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
      const orgId = memberData?.org_id ?? ''

      setOrgType(type)
      setTerms(DASHBOARD_TERMS[type])

      // For homeowners: pre-fetch project + unit so Add Job opens directly
      if (type === 'homeowner' && orgId) {
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('org_id', orgId)
          .limit(1)
          .maybeSingle()

        if (project) {
          const [{ data: unit }, { data: contractors }] = await Promise.all([
            supabase.from('units').select('id, rooms(*)').eq('project_id', project.id).limit(1).maybeSingle(),
            supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('name'),
          ])

          if (unit) {
            const rooms = Array.isArray(unit.rooms) ? unit.rooms : []
            setAddContext({ projectId: project.id, unitId: unit.id, orgId, rooms, contractors: contractors ?? [] })
          }
        }
      }
    })
  }, [])

  if (!terms) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#1A56DB]" />
    </div>
  )

  return (
    <Suspense>
      <SnagsInner terms={terms} orgType={orgType} addContext={addContext} />
    </Suspense>
  )
}

export default function SnagsPage() {
  return <SnagsWithTerms />
}
