import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { DASHBOARD_TERMS, STATUS_CONFIG } from '@/types'
import type { OrgType, Snag } from '@/types'
import ReportClient from './ReportClient'

const DONE_STATUSES = new Set(['fixed', 'approved', 'closed'])


const SnagITLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36">
    <rect width="32" height="32" rx="7" fill="#1A56DB"/>
    <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
    <circle cx="16" cy="16" r="2.5" fill="white"/>
    <line x1="16" y1="4" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="4" y1="16" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export default async function SnagReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project_id?: string }>
}) {
  const { status: statusParam, project_id: projectId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = (await getActiveOrgId(user.id, allOrgs)) ?? ''
  const activeOrg = allOrgs.find(o => o.org_id === orgId)

  // Get active org's project IDs to scope snags correctly
  const { data: orgProjects } = await supabase.from('projects').select('id').eq('org_id', orgId)
  const orgProjectIds = (orgProjects ?? []).map(p => p.id)

  let snagsQuery = supabase
    .from('snags')
    .select(`
      *, attachments(*),
      contractor:contractors(id, name, company, trade),
      room:rooms(id, name),
      project:projects(id, name)
    `)
    .order('snag_number', { ascending: true })

  if (projectId) {
    snagsQuery = snagsQuery.eq('project_id', projectId)
  } else if (orgProjectIds.length > 0) {
    snagsQuery = snagsQuery.in('project_id', orgProjectIds)
  }

  if (statusParam) {
    const statuses = statusParam.split(',')
    snagsQuery = statuses.length > 1
      ? snagsQuery.in('status', statuses)
      : snagsQuery.eq('status', statuses[0])
  }

  const [{ data: snags }, { data: project }] = await Promise.all([
    orgProjectIds.length > 0 || projectId ? snagsQuery : Promise.resolve({ data: [] }),
    projectId
      ? supabase.from('projects').select('name').eq('id', projectId).single()
      : Promise.resolve({ data: null }),
  ])

  const orgType = (activeOrg?.org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]
  const orgName = activeOrg?.org?.name ?? 'My Organisation'

  const allSnags = (snags ?? []) as Snag[]

  const filterLabel = statusParam
    ? statusParam
        .split(',')
        .map(s => STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s)
        .join(', ')
    : 'All'

  const now = new Date().toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const statCounts = allSnags.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="min-h-screen bg-white">
      <ReportClient />

      <div className="mx-auto max-w-5xl px-8 py-8 print:px-4 print:py-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6 print:mb-4 print:pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <SnagITLogo />
              <span className="text-xl font-bold text-slate-900">SnagIT</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{terms.issues} Report</h1>
            <p className="mt-1 text-sm text-slate-500">
              {orgName}
              {project?.name && (
                <> · <span className="font-medium text-slate-700">{project.name}</span></>
              )}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-medium text-slate-700">Generated {now}</p>
            <p className="mt-1">
              Filter:{' '}
              <span className="font-medium text-slate-800">{filterLabel}</span>
            </p>
            <p className="mt-0.5">
              Total:{' '}
              <span className="font-medium text-slate-800">
                {allSnags.length}{' '}
                {allSnags.length === 1
                  ? terms.issue.toLowerCase()
                  : terms.issues.toLowerCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Summary stats */}
        {allSnags.length > 0 && (
          <div className="mb-8 grid grid-cols-5 gap-3 print:mb-4">
            {(
              ['open', 'assigned', 'fixed', 'approved', 'rejected'] as const
            ).map(s => (
              <div
                key={s}
                className="rounded-xl border border-slate-100 p-3 text-center"
              >
                <p className="text-xl font-bold text-slate-900">
                  {statCounts[s] ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {STATUS_CONFIG[s].label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Status key */}
        <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 print:mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status Key</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 whitespace-nowrap">Open</span>
              <span>Logged but not yet assigned to anyone</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 whitespace-nowrap">Assigned</span>
              <span>Contractor or staff member has been assigned</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 whitespace-nowrap">Fixed</span>
              <span>Contractor marked as resolved — awaiting sign-off</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap">Approved</span>
              <span>Fix confirmed and signed off — issue closed ✓</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 whitespace-nowrap">Rejected</span>
              <span>Fix was inspected and not accepted — needs redo</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Items with a blue left border still need action. Strikethrough items are resolved.</p>
        </div>

        {/* Snag list */}
        {allSnags.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            No {terms.issues.toLowerCase()} found for the selected filters.
          </p>
        ) : (
          <div className="space-y-3">
            {allSnags.map((s, i) => {
              const status = STATUS_CONFIG[s.status]
              const photo = s.attachments?.find(a => !a.is_resolution)
              const c = s.contractor
              const done = DONE_STATUSES.has(s.status)
              return (
                <div
                  key={s.id}
                  style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  className={`flex gap-4 overflow-hidden rounded-xl border p-4 ${
                    done
                      ? 'border-slate-200 bg-slate-50 opacity-60'
                      : 'border-slate-200 bg-white border-l-4 border-l-[#1A56DB]'
                  }`}
                >
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.public_url}
                        alt={s.title}
                        className="h-40 w-40 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-slate-100">
                        <span className="text-xs text-slate-300">No photo</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">#{s.snag_number}</span>
                        {s.project && (
                          <span className="text-xs font-medium text-[#1A56DB]">{s.project.name}</span>
                        )}
                      </div>
                      <p className={`text-base font-semibold leading-snug ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {s.title}
                      </p>
                      {s.description && (
                        <p className={`mt-1 text-sm leading-relaxed ${done ? 'text-slate-300 line-through' : 'text-slate-500'}`}>
                          {s.description}
                        </p>
                      )}
                    </div>

                    {/* Meta grid */}
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                      <div>
                        <p className="font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-wide text-slate-400">Date Logged</p>
                        <p className="mt-0.5 text-slate-700">
                          {new Date(s.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {s.room?.name && (
                        <div>
                          <p className="font-semibold uppercase tracking-wide text-slate-400">Room / Area</p>
                          <p className="mt-0.5 text-slate-700">{s.room.name}</p>
                        </div>
                      )}
                      {c && (
                        <div>
                          <p className="font-semibold uppercase tracking-wide text-slate-400">Assigned To</p>
                          <p className="mt-0.5 text-slate-700">{c.company ? `${c.name} (${c.company})` : c.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 print:mt-6">
          Report generated by SnagIT · {now}
        </div>
      </div>
    </div>
  )
}
