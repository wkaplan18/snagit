import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DASHBOARD_TERMS, STATUS_CONFIG, PRIORITY_CONFIG } from '@/types'
import type { OrgType, Snag } from '@/types'
import ReportClient from './ReportClient'

export default async function SnagReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project_id?: string }>
}) {
  const { status: statusParam, project_id: projectId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let snagsQuery = supabase
    .from('snags')
    .select(`
      *, attachments(*),
      contractor:contractors(id, name, company, trade),
      room:rooms(id, name),
      project:projects(id, name)
    `)
    .order('snag_number', { ascending: true })

  if (projectId) snagsQuery = snagsQuery.eq('project_id', projectId)
  if (statusParam) {
    const statuses = statusParam.split(',')
    snagsQuery = statuses.length > 1
      ? snagsQuery.in('status', statuses)
      : snagsQuery.eq('status', statuses[0])
  }

  const [{ data: orgMember }, { data: snags }, { data: project }] = await Promise.all([
    supabase
      .from('org_members')
      .select('organizations(org_type, name)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    snagsQuery,
    projectId
      ? supabase.from('projects').select('name').eq('id', projectId).single()
      : Promise.resolve({ data: null }),
  ])

  const raw = orgMember?.organizations
  const org = (Array.isArray(raw) ? raw[0] : raw) as { org_type?: string; name?: string } | null
  const orgType = (org?.org_type ?? 'builder') as OrgType
  const terms = DASHBOARD_TERMS[orgType]
  const orgName = org?.name ?? 'My Organisation'

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
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A56DB]">
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span className="text-lg font-bold text-slate-900">SnagIT</span>
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

        {/* Snag table */}
        {allSnags.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            No {terms.issues.toLowerCase()} found for the selected filters.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-3 font-medium">#</th>
                <th className="pb-3 pr-3 font-medium">Photo</th>
                <th className="pb-3 pr-3 font-medium">{terms.issue}</th>
                <th className="pb-3 pr-3 font-medium">Status</th>
                <th className="pb-3 pr-3 font-medium">Priority</th>
                <th className="pb-3 pr-3 font-medium">Room</th>
                <th className="pb-3 pr-3 font-medium">Assigned To</th>
                <th className="pb-3 font-medium">Logged</th>
              </tr>
            </thead>
            <tbody>
              {allSnags.map((s, i) => {
                const status = STATUS_CONFIG[s.status]
                const priority = PRIORITY_CONFIG[s.priority]
                const photo = s.attachments?.find(a => !a.is_resolution)
                const c = s.contractor
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 break-inside-avoid ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                  >
                    <td className="py-3 pr-3 align-top font-mono text-xs text-slate-400">
                      #{s.snag_number}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.public_url}
                          alt={s.title}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                          <span className="text-xs text-slate-300">—</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <p className="font-medium text-slate-900">{s.title}</p>
                      {s.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {s.description}
                        </p>
                      )}
                      {s.project && (
                        <p className="mt-0.5 text-xs font-medium text-[#1A56DB]">
                          {s.project.name}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <span className={`text-xs font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3 align-top text-xs text-slate-600">
                      {s.room?.name ?? '—'}
                    </td>
                    <td className="py-3 pr-3 align-top text-xs text-slate-600">
                      {c
                        ? c.company
                          ? `${c.name} (${c.company})`
                          : c.name
                        : '—'}
                    </td>
                    <td className="py-3 align-top text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('en-ZA', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 print:mt-6">
          Report generated by SnagIT · {now}
        </div>
      </div>
    </div>
  )
}
