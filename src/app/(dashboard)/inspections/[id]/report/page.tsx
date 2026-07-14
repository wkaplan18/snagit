import { createClient } from '@/lib/supabase/server'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { redirect, notFound } from 'next/navigation'
import { CONDITION_CONFIG } from '@/types'
import type { InspectionItem, Attachment } from '@/types'
import InspectionReportClient from './InspectionReportClient'

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

function groupByRoom(items: InspectionItem[]) {
  const order: string[] = []
  const groups: Record<string, InspectionItem[]> = {}
  for (const item of items.slice().sort((a, b) => a.item_order - b.item_order)) {
    if (!groups[item.room_name]) { groups[item.room_name] = []; order.push(item.room_name) }
    groups[item.room_name].push(item)
  }
  return order.map(room => ({ room, items: groups[room] }))
}

export default async function InspectionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) redirect('/onboarding')

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, tenant:tenants(*), unit:units(id, name, project:projects(name)), items:inspection_items(*, attachments(*))')
    .eq('id', id)
    .single()

  if (!inspection) notFound()

  const rawTenant = inspection.tenant
  const tenant = Array.isArray(rawTenant) ? rawTenant[0] ?? null : rawTenant
  const rawUnit = inspection.unit
  const unit = Array.isArray(rawUnit) ? rawUnit[0] ?? null : rawUnit
  const rawProject = unit?.project
  const project = Array.isArray(rawProject) ? rawProject[0] ?? null : rawProject

  const activeOrg = allOrgs.find(o => o.org_id === orgId)
  const orgName = activeOrg?.org?.name ?? 'My Organisation'

  const items = (inspection.items ?? []) as (InspectionItem & { attachments?: Attachment[] })[]
  const grouped = groupByRoom(items)

  const now = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  const inspectedDate = inspection.inspected_at
    ? new Date(inspection.inspected_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    : now

  return (
    <div className="min-h-screen bg-white">
      <InspectionReportClient backHref={`/inspections/${id}`} />

      <div className="mx-auto max-w-4xl px-8 py-8 print:px-4 print:py-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6 print:mb-4 print:pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <SnagITLogo />
              <span className="text-xl font-bold text-slate-900">SnagIT</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {inspection.type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {orgName}{project?.name && <> · <span className="font-medium text-slate-700">{project.name}</span></>}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-medium text-slate-700">Inspected {inspectedDate}</p>
            <p className="mt-1">Unit: <span className="font-medium text-slate-800">{unit?.name ?? '—'}</span></p>
            <p className="mt-0.5">Tenant: <span className="font-medium text-slate-800">{tenant?.full_name ?? '—'}</span></p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-6">
          {grouped.map(({ room, items: roomItems }) => (
            <div key={room} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{room}</p>
              <div className="space-y-2">
                {roomItems.map(item => {
                  const cfg = CONDITION_CONFIG[item.condition]
                  const photos = item.attachments ?? []
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{item.item_label}</p>
                        <span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {item.note && <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{item.note}&rdquo;</p>}
                      {photos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {photos.map(a => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={a.id} src={a.public_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-6 border-t border-slate-200 pt-6" style={{ breakInside: 'avoid' }}>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tenant signature</p>
            {inspection.tenant_signature_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inspection.tenant_signature_url} alt="Tenant signature" className="h-20 rounded-lg border border-slate-100" />
            ) : (
              <div className="flex h-20 items-center rounded-lg border border-dashed border-slate-200 px-3 text-xs text-slate-400">Not signed</div>
            )}
            <p className="mt-1 text-xs text-slate-400">{tenant?.full_name}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Inspector signature</p>
            {inspection.inspector_signature_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inspection.inspector_signature_url} alt="Inspector signature" className="h-20 rounded-lg border border-slate-100" />
            ) : (
              <div className="flex h-20 items-center rounded-lg border border-dashed border-slate-200 px-3 text-xs text-slate-400">Not signed</div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 print:mt-6">
          Report generated by SnagIT · {now}
        </div>
      </div>
    </div>
  )
}
