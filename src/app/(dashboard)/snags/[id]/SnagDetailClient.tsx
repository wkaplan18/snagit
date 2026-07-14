'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BookUser, Camera, ChevronRight, Loader2, MapPin, MessageCircle, Pencil, Plus, User, CalendarClock, X } from 'lucide-react'
import { waLink } from '@/lib/whatsappLink'
import { compressImage } from '@/lib/compressImage'
import { STATUS_CONFIG, TRADES, HOTEL_ROLES, type Attachment, type Contractor, type DashboardTerms, type SnagStatus } from '@/types'

interface SnagQuestion {
  id: string
  snag_id: string
  body: string
  created_at: string
  reply_body: string | null
  replied_at: string | null
}

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
  due_date: string | null
  assigned_to: string | null
  resolution_note: string | null
  created_at: string
  attachments?: Attachment[]
  contractor: Contractor | null
  room: { id: string; name: string } | null
  unit: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 active:scale-95 transition-[transform,background-color]"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt=""
        onClick={e => e.stopPropagation()}
        className="rounded-xl object-contain"
        style={{ maxHeight: '88vh', maxWidth: '95vw' }}
      />
    </div>
  )
}

function formatWhatsApp(raw: string): string {
  const num = raw.replace(/[\s\-().]/g, '')
  if (num.startsWith('0027')) return '+27' + num.slice(4)
  if (num.startsWith('00')) return '+' + num.slice(2)
  if (num.startsWith('0')) return '+27' + num.slice(1)
  if (/^\d/.test(num) && !num.startsWith('+')) return '+' + num
  return num
}

export default function SnagDetailClient({ snag, contractors, terms, orgId, rooms, questions: initialQuestions }: { snag: SnagDetail; contractors: Contractor[]; terms: DashboardTerms; orgId: string; rooms: { id: string; name: string; room_order: number }[]; questions: SnagQuestion[] }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')
  const [questions, setQuestions] = useState<SnagQuestion[]>(initialQuestions)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [replyBusy, setReplyBusy] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Assign UI state
  const [assignMode, setAssignMode] = useState<'view' | 'picking' | 'adding'>('view')
  const [localContractor, setLocalContractor] = useState<Contractor | null>(snag.contractor)
  const [allContractors, setAllContractors] = useState<Contractor[]>(contractors)
  const [contractorBusy, setContractorBusy] = useState(false)
  const [newCName, setNewCName] = useState('')
  const [newCTrade, setNewCTrade] = useState('')
  const [newCWhatsApp, setNewCWhatsApp] = useState('')
  const [newCIsInternal, setNewCIsInternal] = useState(false)

  // Edit mode
  const canEdit = snag.status === 'open' || snag.status === 'assigned'
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(snag.title)
  const [editDescription, setEditDescription] = useState(snag.description ?? '')
  const [editRoomId, setEditRoomId] = useState(snag.room?.id ?? '')

  const [supportsContacts, setSupportsContacts] = useState(false)
  useEffect(() => {
    setOrigin(window.location.origin)
    setSupportsContacts('contacts' in navigator)
  }, [])

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= 3) return
    setUploadingPhoto(true)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('snagId', snag.id)
      const res = await fetch('/api/uploads/snag-photo', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      router.refresh()
    } catch {
      alert('Could not upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const status = STATUS_CONFIG[snag.status]

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
    if (!confirm(`Delete ${terms.issue.toLowerCase()} #${snag.snag_number} (${snag.title})? This cannot be undone.`)) return
    setBusy(true)
    const { error } = await supabase.from('snags').delete().eq('id', snag.id)
    if (error) { setError(error.message); setBusy(false) }
    else { router.push(snag.project ? `/projects/${snag.project.id}` : '/snags'); router.refresh() }
  }

  async function handleAssign(contractor: Contractor) {
    setContractorBusy(true)
    const { error } = await supabase
      .from('snags')
      .update({ assigned_to: contractor.id, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', snag.id)
    if (!error) {
      setLocalContractor(contractor)
      setAssignMode('view')
      router.refresh()
      fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snagId: snag.id }),
      }).catch(() => {})
    }
    setContractorBusy(false)
  }

  async function addAndAssign() {
    if (!newCName.trim()) return
    setContractorBusy(true)
    const { data, error } = await supabase
      .from('contractors')
      .insert({ org_id: orgId, name: newCName.trim(), trade: newCTrade.trim() || null, whatsapp: newCWhatsApp.trim() || null, is_internal: newCIsInternal })
      .select('*')
      .single()
    if (!error && data) {
      setAllContractors(c => [...c, data])
      await handleAssign(data)
      setNewCName(''); setNewCTrade(''); setNewCWhatsApp(''); setNewCIsInternal(false)
    }
    setContractorBusy(false)
  }

  async function saveEdit() {
    if (!editTitle.trim()) return
    await update({ title: editTitle.trim(), description: editDescription.trim() || null, room_id: editRoomId || null })
    setEditing(false)
  }

  async function sendReply(qid: string) {
    const text = replyDraft[qid]?.trim()
    if (!text || replyBusy) return
    setReplyBusy(qid)
    try {
      const res = await fetch(`/api/snags/${snag.id}/questions/${qid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_body: text }),
      })
      if (res.ok) {
        const updated: SnagQuestion = await res.json()
        setQuestions(prev => prev.map(q => q.id === qid ? updated : q))
        setReplyDraft(prev => { const n = { ...prev }; delete n[qid]; return n })
      }
    } finally {
      setReplyBusy(null)
    }
  }

  async function pickContact() {
    const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts?: object) => Promise<Array<{ tel?: string[]; name?: string[] }>> } }
    if (!nav.contacts) return
    try {
      const results = await nav.contacts.select(['name', 'tel'], { multiple: false })
      const picked = results?.[0]
      if (picked?.tel?.[0]) setNewCWhatsApp(formatWhatsApp(picked.tel[0]))
      if (picked?.name?.[0] && !newCName.trim()) setNewCName(picked.name[0])
    } catch { /* user cancelled */ }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {viewingPhoto && <PhotoViewer url={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      {snag.project && (
        <Link href={`/projects/${snag.project.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> {snag.project.name}
        </Link>
      )}

      {editing ? (
        <div className="sf-card mt-1 p-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</label>
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="sf-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              placeholder="Any details…"
              className="sf-input resize-none"
            />
          </div>
          {rooms.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</label>
              <div className="flex flex-wrap gap-2">
                {rooms.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditRoomId(editRoomId === r.id ? '' : r.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      editRoomId === r.id
                        ? 'border-[#1A56DB] bg-[#1A56DB] text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={busy || !editTitle.trim()} className="sf-btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save changes'}
            </button>
            <button onClick={() => { setEditing(false); setEditTitle(snag.title); setEditDescription(snag.description ?? ''); setEditRoomId(snag.room?.id ?? '') }} className="sf-btn-secondary px-4 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-snug tracking-tight text-slate-900">
              #{snag.snag_number} {snag.title}
            </h1>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className={`sf-badge ${status.bg} ${status.color}`}>{status.label}</span>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 active:bg-slate-100 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {snag.unit && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {snag.unit.name}{snag.room ? ` · ${snag.room.name}` : ''}</span>}
            {snag.due_date && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> due {new Date(snag.due_date).toLocaleDateString('en-ZA')}</span>}
            <span className="capitalize">{snag.category}</span>
          </div>

          {snag.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{snag.description}</p>
          )}
        </>
      )}

      {/* Photos */}
      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {photos.map(p => (
            <button
              key={p.id}
              onClick={() => setViewingPhoto(p.public_url)}
              className="block overflow-hidden rounded-2xl border border-slate-200 active:scale-[0.97] transition-transform"
            >
              <Image src={p.public_url} alt={snag.title} width={600} height={600} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
          <Camera className="h-4 w-4" /> No photos attached
        </div>
      )}
      {photos.length < 3 && (
        <label className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${uploadingPhoto ? 'opacity-50 pointer-events-none text-[#1A56DB]' : 'text-[#1A56DB] hover:underline'}`}>
          {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {uploadingPhoto ? 'Uploading…' : '+ Add photo'}
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
        </label>
      )}

      {resolutionPhotos.length > 0 && (
        <>
          <h2 className="mt-5 text-sm font-semibold text-slate-900">Resolution photos</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {resolutionPhotos.map(p => (
              <button
                key={p.id}
                onClick={() => setViewingPhoto(p.public_url)}
                className="block overflow-hidden rounded-2xl border border-green-200 active:scale-[0.97] transition-transform"
              >
                <Image src={p.public_url} alt="Resolution" width={600} height={600} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}

      {snag.resolution_note && (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-600">Note from {terms.contractor.toLowerCase()}</p>
          <p className="text-sm leading-relaxed text-slate-700">{snag.resolution_note}</p>
        </div>
      )}

      {/* Contractor */}
      <div className="sf-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <User className="h-4 w-4 text-slate-400" /> Assigned {terms.contractor.toLowerCase()}
          </h2>
          {assignMode === 'view' && localContractor && (
            <button onClick={() => setAssignMode('picking')} className="text-xs font-medium text-[#1A56DB]">Change</button>
          )}
        </div>

        {/* VIEW: assigned */}
        {assignMode === 'view' && localContractor && (() => {
          const isApproved = snag.status === 'approved' || snag.status === 'closed'
          const isInReview = snag.status === 'fixed'
          const isRejected = snag.status === 'rejected'
          return (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB]/10 text-sm font-bold text-[#1A56DB]">
                  {localContractor.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{localContractor.name}</p>
                  {localContractor.trade && <p className="text-xs text-slate-500">{localContractor.trade}</p>}
                  {localContractor.whatsapp
                    ? <p className="text-xs text-green-600">{localContractor.whatsapp}</p>
                    : <p className="text-xs text-slate-400">No WhatsApp number</p>}
                </div>
                {isApproved && (
                  <span className="flex-shrink-0 rounded-full bg-green-100 border border-green-300 px-2.5 py-1 text-xs font-bold text-green-700">
                    ✓ Done
                  </span>
                )}
                {isInReview && (
                  <span className="flex-shrink-0 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-700">
                    In Review
                  </span>
                )}
                {isRejected && (
                  <span className="flex-shrink-0 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-1 text-xs font-bold text-rose-700">
                    Rejected
                  </span>
                )}
              </div>
              {/* Only show WhatsApp button when job is still open/in-progress */}
              {localContractor.whatsapp && origin && !isApproved && (
                <a
                  href={waLink(
                    localContractor.whatsapp,
                    isRejected
                      ? `Hi ${localContractor.name}, your fix for ${terms.issue.toLowerCase()} #${snag.snag_number} (${snag.title})` +
                        `${snag.project ? ` on ${snag.project.name}` : ''}` +
                        `${snag.unit ? ` — ${snag.unit.name}${snag.room ? `, ${snag.room.name}` : ''}` : ''}` +
                        ` was rejected and needs to be redone.` +
                        `\nView it here:\n${origin}/c/${localContractor.access_token}?t=${Date.now()}`
                      : `Hi ${localContractor.name}, you've been assigned ${terms.issue.toLowerCase()} #${snag.snag_number} (${snag.title})` +
                        `${snag.project ? ` on ${snag.project.name}` : ''}` +
                        `${snag.unit ? ` — ${snag.unit.name}${snag.room ? `, ${snag.room.name}` : ''}` : ''}.` +
                        `\nView it and upload your fix photo here:\n${origin}/c/${localContractor.access_token}?t=${Date.now()}`
                  )}
                  target="_blank"
                  rel="noopener"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white active:scale-[0.97] transition-[transform,opacity]"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Send via WhatsApp
                </a>
              )}
            </div>
          )
        })()}

        {/* VIEW: unassigned */}
        {assignMode === 'view' && !localContractor && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setAssignMode('picking')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-500 hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors"
            >
              <Plus className="h-4 w-4" /> Assign a {terms.contractor.toLowerCase()}
            </button>
          </div>
        )}

        {/* PICKING from list */}
        {assignMode === 'picking' && (
          <div>
            {allContractors.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {allContractors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAssign(c)}
                    disabled={contractorBusy}
                    className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB]/10 text-sm font-bold text-[#1A56DB]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      {c.trade && <p className="text-xs text-slate-500">{c.trade}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 pb-2 text-sm text-slate-400">No {terms.contractor.toLowerCase()}s yet — add one below.</p>
            )}
            <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
              <button
                onClick={() => setAssignMode('adding')}
                className="flex-1 rounded-xl border border-[#1A56DB] py-2.5 text-sm font-medium text-[#1A56DB] hover:bg-[#EEF4FF] transition-colors"
              >
                + Add new {terms.contractor.toLowerCase()}
              </button>
              <button onClick={() => setAssignMode('view')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ADDING new */}
        {assignMode === 'adding' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-sm font-medium">
              <button type="button" onClick={() => setNewCIsInternal(false)}
                className={`flex-1 py-2.5 transition-colors ${!newCIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500'}`}>
                {terms.externalLabel}
              </button>
              <button type="button" onClick={() => setNewCIsInternal(true)}
                className={`flex-1 py-2.5 transition-colors ${newCIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500'}`}>
                {terms.internalLabel}
              </button>
            </div>
            <input autoFocus type="text" value={newCName} onChange={e => setNewCName(e.target.value)} placeholder="Name *" className="sf-input" />
            <select value={newCTrade} onChange={e => setNewCTrade(e.target.value)} className="sf-input">
              <option value="">{terms.contractorTrade} (optional)</option>
              {(terms.contractorTrade === 'Role' ? HOTEL_ROLES : TRADES).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={newCWhatsApp}
                  onChange={e => setNewCWhatsApp(e.target.value)}
                  onBlur={e => { if (e.target.value.trim()) setNewCWhatsApp(formatWhatsApp(e.target.value.trim())) }}
                  placeholder="WhatsApp number"
                  className="sf-input flex-1"
                />
                {supportsContacts && (
                  <button type="button" onClick={pickContact} title="Choose from contacts"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100">
                    <BookUser className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-amber-600">Needed to send the job assignment via WhatsApp</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addAndAssign} disabled={contractorBusy || !newCName.trim()}
                className="sf-btn-primary flex-1 py-3 text-sm disabled:opacity-60">
                {contractorBusy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Add & assign'}
              </button>
              <button onClick={() => setAssignMode('picking')} className="sf-btn-secondary px-4 py-3 text-sm">Back</button>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="sf-card mt-3 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Update status</h2>

        {snag.status === 'rejected' && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5">
            <span className="text-rose-700 text-sm font-medium">Fix rejected — {terms.contractor.toLowerCase()} has been notified to redo this.</span>
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
          <>
            <button
              onClick={() => setStatus('approved')}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-green-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-700 active:scale-[0.98] transition-[transform,colors] disabled:opacity-50"
            >
              ✓ Approve — mark as done
            </button>
            <button
              onClick={() => { if (confirm(`Reject this fix? The ${terms.contractor.toLowerCase()} will see it as rejected and must redo it.`)) setStatus('rejected') }}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              Reject fix
            </button>
          </>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Client Questions */}
      {questions.length > 0 && (
        <div className="sf-card mt-3 p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <MessageCircle className="h-4 w-4 text-slate-400" />
            Client questions
            <span className="ml-1 rounded-full bg-[#1A56DB] px-2 py-0.5 text-[10px] font-bold text-white">{questions.length}</span>
          </h2>
          <div className="space-y-4">
            {questions.map(q => (
              <div key={q.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-2">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <MessageCircle className="h-3 w-3 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 leading-relaxed">{q.body}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(q.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {q.reply_body ? (
                  <div className="ml-7 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                    <p className="text-[11px] font-semibold text-green-700 mb-0.5">Your reply</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{q.reply_body}</p>
                  </div>
                ) : (
                  <div className="ml-7 space-y-2">
                    <textarea
                      value={replyDraft[q.id] ?? ''}
                      onChange={e => setReplyDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your reply…"
                      rows={2}
                      className="sf-input resize-none text-sm"
                    />
                    <button
                      onClick={() => sendReply(q.id)}
                      disabled={replyBusy === q.id || !replyDraft[q.id]?.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.97] transition-[transform,opacity]"
                    >
                      {replyBusy === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Send reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleDelete} disabled={busy} className="mt-8 w-full text-center text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50">
        Delete this {terms.issue.toLowerCase()}
      </button>
    </div>
  )
}
