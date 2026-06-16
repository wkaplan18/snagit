'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, MapPin, User, CalendarClock, Sparkles, MessageCircle } from 'lucide-react'
import { waLink } from '@/lib/whatsappLink'
import { STATUS_CONFIG, PRIORITY_CONFIG, type Attachment, type Contractor, type SnagStatus } from '@/types'

const STATUS_FLOW: SnagStatus[] = ['open', 'assigned', 'fixed', 'approved']

const ACTIVE_PILL: Partial<Record<SnagStatus, string>> = {
  open:     'border-red-500    bg-red-500    text-white',
  assigned: 'border-orange-500 bg-orange-500 text-white',
  fixed:    'border-teal-600   bg-teal-600   text-white',
  approved: 'border-green-600  bg-green-600  text-white',
  rejected: 'border-rose-500   bg-rose-500   text-white',
}

interface SnagDetail {
  id: string
  snag_number: number
  title: string
  description: string | null
  category: string
  status: SnagStatus
  priority: keyof typeof PRIORITY_CONFIG
  due_date: string | null
  assigned_to: string | null
  ai_suggested: boolean
  created_at: string
  attachments?: Attachment[]
  contractor: Contractor | null
  room: { id: string; name: string } | null
  unit: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

export default function SnagDetailClient({ snag, contractors }: { snag: SnagDetail; contractors: Contractor[] }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => setOrigin(window.location.origin), [])

  const status = STATUS_CONFIG[snag.status]
  const priority = PRIORITY_CONFIG[snag.priority]
  const photos = (snag.attachments ?? []).filter(a => !a.is_resolution)
  const resolutionPhotos = (snag.attachments ?? []).filter(a => a.is_resolution)

  async function update(fields: Record<string, unknown>) {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('snags').update(fields).eq('id', snag.id)
    if (error) setError(error.message)
    else router.refresh()
    setBusy(false)
  }

  async function setStatus(s: SnagStatus) {
    const fields: Record<string, unknown> = { status: s }
    if (s === 'fixed') fields.fixed_at = new Date().toISOString()
    if (s === 'closed') fields.closed_at = new Date().toISOString()
    await update(fields)
  }

  async function handleDelete() {
    if (!confirm(`Delete snag #${snag.snag_number} (${snag.title})? This cannot be undone.`)) return
    setBusy(true)
    const { error } = await supabase.from('snags').delete().eq('id', snag.id)
    if (error) { setError(error.message); setBusy(false) }
    else { router.push(snag.project ? `/projects/${snag.project.id}` : '/snags'); router.refresh() }
  }

  async function assign(contractorId: string) {
    if (!contractorId) {
      await update({ assigned_to: null, status: 'open' })
      return
    }
    await update({ assigned_to: contractorId, status: 'assigned', assigned_at: new Date().toISOString() })
    // Fire-and-forget WhatsApp notification (no-op until Interakt is configured)
    fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snagId: snag.id }),
    }).catch(() => {})
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {snag.project && (
        <Link href={`/projects/${snag.project.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> {snag.project.name}
        </Link>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold leading-snug tracking-tight text-slate-900">
          #{snag.snag_number} {snag.title}
        </h1>
        <span className={`sf-badge flex-shrink-0 ${status.bg} ${status.color}`}>{status.label}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className={`inline-flex items-center gap-1 ${priority.color}`}>
          <span className={`sf-priority-dot ${priority.dot}`} /> {priority.label}
        </span>
        {snag.unit && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {snag.unit.name}{snag.room ? ` · ${snag.room.name}` : ''}</span>}
        {snag.due_date && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> due {new Date(snag.due_date).toLocaleDateString('en-ZA')}</span>}
        {snag.ai_suggested && <span className="flex items-center gap-1 text-violet-600"><Sparkles className="h-3 w-3" /> AI suggested</span>}
        <span className="capitalize">{snag.category}</span>
      </div>

      {snag.description && (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{snag.description}</p>
      )}

      {/* Photos */}
      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {photos.map(p => (
            <a key={p.id} href={p.public_url} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl border border-slate-200">
              <img src={p.public_url} alt={snag.title} className="aspect-square w-full object-cover" />
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
          <Camera className="h-4 w-4" /> No photos attached
        </div>
      )}

      {resolutionPhotos.length > 0 && (
        <>
          <h2 className="mt-5 text-sm font-semibold text-slate-900">Resolution photos</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {resolutionPhotos.map(p => (
              <a key={p.id} href={p.public_url} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl border border-green-200">
                <img src={p.public_url} alt="Resolution" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        </>
      )}

      {/* Contractor */}
      <div className="sf-card mt-6 p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <User className="h-4 w-4 text-slate-400" /> Assigned contractor
        </h2>
        <select
          value={snag.assigned_to ?? ''}
          onChange={e => assign(e.target.value)}
          disabled={busy}
          className="sf-input"
        >
          <option value="">Unassigned</option>
          {contractors.map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.trade ? ` — ${c.trade}` : ''}</option>
          ))}
        </select>
        {contractors.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            No contractors yet — <Link href="/contractors" className="text-[#1A56DB]">add your team</Link> first.
          </p>
        )}
        {snag.contractor?.whatsapp && origin && (
          <a
            href={waLink(
              snag.contractor.whatsapp,
              `Hi ${snag.contractor.name}, you've been assigned snag #${snag.snag_number} (${snag.title})` +
                `${snag.project ? ` on ${snag.project.name}` : ''}` +
                `${snag.unit ? ` — ${snag.unit.name}${snag.room ? `, ${snag.room.name}` : ''}` : ''}.` +
                `\nView it and upload your fix photo here:\n${origin}/c/${snag.contractor.access_token}`
            )}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1EBE5B] active:scale-[0.97] transition-[transform,opacity]"
          >
            <MessageCircle className="h-4 w-4" /> Send via WhatsApp
          </a>
        )}
      </div>

      {/* Status */}
      <div className="sf-card mt-3 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Update status</h2>

        {snag.status === 'rejected' && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5">
            <span className="text-rose-700 text-sm font-medium">Fix rejected — contractor has been notified to redo this.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = snag.status === s
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={busy || active}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-[transform,opacity] active:scale-95 ${
                  active
                    ? ACTIVE_PILL[s]
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {active && <span className="mr-1">✓</span>}{cfg.label}
              </button>
            )
          })}
        </div>

        {snag.status === 'fixed' && (
          <button
            onClick={() => { if (confirm('Reject this fix? The contractor will see it as rejected and must redo it.')) setStatus('rejected') }}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
          >
            Reject fix
          </button>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <button onClick={handleDelete} disabled={busy} className="mt-8 w-full text-center text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50">
        Delete this snag
      </button>
    </div>
  )
}
