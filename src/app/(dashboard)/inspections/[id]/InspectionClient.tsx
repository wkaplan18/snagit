'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Loader2, CheckCircle2, AlertTriangle, Scale, Printer, CloudOff } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'
import SignaturePad from '@/components/inspections/SignaturePad'
import { reliableFetch, getQueueCount, onQueueChange, startAutoFlush } from '@/lib/offlineQueue'
import { CONDITION_CONFIG, type Inspection, type InspectionItem, type InspectionStatus, type ItemCondition, type Tenant, type Attachment } from '@/types'

const CONDITIONS: ItemCondition[] = ['good', 'fair', 'damaged', 'missing', 'not_applicable']

interface InspectionWithRelations extends Inspection {
  tenant: Tenant | null
  unit: { id: string; name: string } | null
  items: (InspectionItem & { attachments?: Attachment[] })[]
}

function groupByRoom(items: InspectionItem[]) {
  const order: string[] = []
  const groups: Record<string, InspectionItem[]> = {}
  for (const item of items.slice().sort((a, b) => a.item_order - b.item_order)) {
    if (!groups[item.room_name]) { groups[item.room_name] = []; order.push(item.room_name) }
    groups[item.room_name].push(item)
  }
  return order.map(room => ({ room, items: groups[room] }))
}

export default function InspectionClient({ inspection }: { inspection: InspectionWithRelations }) {
  const [items, setItems] = useState(inspection.items)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(
    Object.fromEntries(inspection.items.map(i => [i.id, i.note ?? '']))
  )
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<InspectionStatus>(inspection.status)
  const [completedAt, setCompletedAt] = useState(inspection.completed_at)
  const [tenantSigUrl, setTenantSigUrl] = useState(inspection.tenant_signature_url)
  const [inspectorSigUrl, setInspectorSigUrl] = useState(inspection.inspector_signature_url)
  const [savingSig, setSavingSig] = useState<'tenant' | 'inspector' | null>(null)
  const [completing, setCompleting] = useState(false)
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingPhotoPreviews, setPendingPhotoPreviews] = useState<Record<string, string[]>>({})
  const [queuedSigPreview, setQueuedSigPreview] = useState<{ tenant?: string; inspector?: string }>({})
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const readOnly = status !== 'draft'
  const grouped = useMemo(() => groupByRoom(items), [items])

  useEffect(() => {
    startAutoFlush()
    getQueueCount().then(setPendingCount)
    return onQueueChange(count => {
      setPendingCount(prev => {
        if (count < prev) reconcileFromServer()
        return count
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function reconcileFromServer() {
    const res = await fetch(`/api/inspections/${inspection.id}`)
    if (!res.ok) return
    const fresh = await res.json()
    setItems(fresh.items ?? [])
    setStatus(fresh.status)
    setTenantSigUrl(fresh.tenant_signature_url)
    setInspectorSigUrl(fresh.inspector_signature_url)
    setPendingPhotoPreviews({})
    setQueuedSigPreview({})
  }

  async function updateItem(itemId: string, fields: { condition?: ItemCondition; note?: string }) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...fields } : i))
    const result = await reliableFetch(`/api/inspections/${inspection.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (result.queued) setPendingCount(await getQueueCount())
  }

  async function uploadPhoto(itemId: string, file: File) {
    setUploadingItemId(itemId)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('inspectionItemId', itemId)
      const result = await reliableFetch('/api/uploads/inspection-photo', { method: 'POST', body: formData })
      if (result.queued) {
        setPendingPhotoPreviews(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), URL.createObjectURL(compressed)] }))
        setPendingCount(await getQueueCount())
      } else if (result.ok) {
        const attachment = result.data as Attachment
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, attachments: [...(i.attachments ?? []), attachment] } : i))
      }
    } finally {
      setUploadingItemId(null)
    }
  }

  async function submitInspection() {
    if (!confirm('Submit this inspection? You can still review it afterwards, but items can no longer be edited.')) return
    setSubmitting(true)
    try {
      const result = await reliableFetch(`/api/inspections/${inspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      })
      if (result.ok || result.queued) {
        setStatus('submitted')
        if (result.queued) setPendingCount(await getQueueCount())
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function saveSignature(role: 'tenant' | 'inspector', file: File) {
    setSavingSig(role)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('role', role)
      const result = await reliableFetch(`/api/inspections/${inspection.id}/signature`, { method: 'POST', body: formData })
      if (result.queued) {
        setQueuedSigPreview(prev => ({ ...prev, [role]: URL.createObjectURL(file) }))
        setPendingCount(await getQueueCount())
      } else if (result.ok) {
        const updated = result.data as Inspection
        if (role === 'tenant') setTenantSigUrl(updated.tenant_signature_url)
        else setInspectorSigUrl(updated.inspector_signature_url)
      } else {
        alert('Could not save signature. Please try again.')
      }
    } finally {
      setSavingSig(null)
    }
  }

  async function convertToSnag(itemId: string) {
    if (!confirm('Log this as a maintenance snag? A new issue will be created for this item.')) return
    setConvertingItemId(itemId)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/items/${itemId}/convert-to-snag`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, converted_snag_id: data.converted_snag_id, attachments: data.attachments } : i))
      } else {
        alert(data.error ?? 'Could not convert to a snag.')
      }
    } finally {
      setConvertingItemId(null)
    }
  }

  async function completeInspection() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/complete`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setStatus('completed')
        setCompletedAt(data.completed_at)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Could not complete inspection.')
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link
        href={inspection.unit ? `/units/${inspection.unit.id}` : '/inspections'}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> {inspection.unit?.name ?? 'Back'}
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {inspection.type === 'move_in' ? 'Move-in' : 'Move-out'} inspection
          </h1>
          <p className="text-xs text-slate-400">
            {inspection.tenant?.full_name ?? '—'} · {status === 'completed' ? 'Completed' : status === 'submitted' ? 'Submitted' : 'In progress'}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {status !== 'draft' && (
            <Link
              href={`/inspections/${inspection.id}/report`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" /> Report
            </Link>
          )}
          {inspection.type === 'move_out' && inspection.linked_move_in_inspection_id && (
            <Link
              href={`/inspections/${inspection.id}/compare`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Scale className="h-3.5 w-3.5" /> Compare
            </Link>
          )}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
          <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
          {pendingCount} change{pendingCount > 1 ? 's' : ''} waiting for signal — will save automatically once you're back online.
        </div>
      )}

      <div className="space-y-5">
        {grouped.map(({ room, items: roomItems }) => (
          <div key={room}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{room}</p>
            <div className="sf-card divide-y divide-slate-100 overflow-hidden">
              {roomItems.map(item => {
                const cfg = CONDITION_CONFIG[item.condition]
                return (
                  <div key={item.id} className="p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-900">{item.item_label}</p>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {CONDITIONS.map(c => {
                        const active = item.condition === c
                        const ccfg = CONDITION_CONFIG[c]
                        return (
                          <button
                            key={c}
                            disabled={readOnly}
                            onClick={() => updateItem(item.id, { condition: c })}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-[transform,opacity] active:scale-95 disabled:active:scale-100 ${
                              active ? `${ccfg.bg} ${ccfg.color} border-current` : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {ccfg.label}
                          </button>
                        )
                      })}
                    </div>

                    {!readOnly ? (
                      <textarea
                        value={noteDrafts[item.id] ?? ''}
                        onChange={e => setNoteDrafts(d => ({ ...d, [item.id]: e.target.value }))}
                        onBlur={e => updateItem(item.id, { note: e.target.value.trim() || undefined })}
                        placeholder="Note (optional)"
                        rows={2}
                        className="sf-input mb-2 resize-none text-sm"
                      />
                    ) : item.note ? (
                      <p className="mb-2 text-xs text-slate-500 italic">&ldquo;{item.note}&rdquo;</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {(item.attachments ?? []).map(a => (
                        <img key={a.id} src={a.public_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      ))}
                      {(pendingPhotoPreviews[item.id] ?? []).map((url, i) => (
                        <div key={i} className="relative h-16 w-16 flex-shrink-0">
                          <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
                            <CloudOff className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ))}
                      {!readOnly && (
                        <>
                          <input
                            ref={el => { fileInputs.current[item.id] = el }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(item.id, f); e.target.value = '' }}
                          />
                          <button
                            onClick={() => fileInputs.current[item.id]?.click()}
                            disabled={uploadingItemId === item.id}
                            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-300 hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors"
                          >
                            {uploadingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-5 w-5" />}
                          </button>
                        </>
                      )}
                    </div>

                    {(item.condition === 'damaged' || item.condition === 'missing') && (
                      item.converted_snag_id ? (
                        <Link
                          href={`/snags/${item.converted_snag_id}`}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56DB] hover:underline"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> View snag
                        </Link>
                      ) : (
                        <button
                          onClick={() => convertToSnag(item.id)}
                          disabled={convertingItemId === item.id}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {convertingItemId === item.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <AlertTriangle className="h-3.5 w-3.5" />}
                          Log as maintenance snag
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {status !== 'draft' && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Sign-off</p>
          <div className="space-y-3">
            {tenantSigUrl ? (
              <div className="sf-card p-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">Tenant signature</p>
                <img src={tenantSigUrl} alt="Tenant signature" className="h-24 rounded-lg border border-slate-100 bg-white" />
              </div>
            ) : queuedSigPreview.tenant ? (
              <div className="sf-card p-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">Tenant signature</p>
                <img src={queuedSigPreview.tenant} alt="Tenant signature (pending sync)" className="h-24 rounded-lg border border-slate-100 bg-white opacity-60" />
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600"><CloudOff className="h-3 w-3" /> Pending sync</p>
              </div>
            ) : status === 'submitted' ? (
              <SignaturePad
                label="Tenant signature"
                signerName={inspection.tenant?.full_name ?? undefined}
                onSave={file => saveSignature('tenant', file)}
              />
            ) : null}

            {inspectorSigUrl ? (
              <div className="sf-card p-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">Inspector signature</p>
                <img src={inspectorSigUrl} alt="Inspector signature" className="h-24 rounded-lg border border-slate-100 bg-white" />
              </div>
            ) : queuedSigPreview.inspector ? (
              <div className="sf-card p-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">Inspector signature</p>
                <img src={queuedSigPreview.inspector} alt="Inspector signature (pending sync)" className="h-24 rounded-lg border border-slate-100 bg-white opacity-60" />
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600"><CloudOff className="h-3 w-3" /> Pending sync</p>
              </div>
            ) : status === 'submitted' && (tenantSigUrl || queuedSigPreview.tenant) ? (
              <SignaturePad label="Inspector signature" onSave={file => saveSignature('inspector', file)} />
            ) : null}
          </div>

          {status === 'completed' && (
            <div className="mt-4 flex flex-col items-center justify-center gap-1 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Inspection completed</span>
              {completedAt && (
                <span className="text-xs font-normal text-green-600">
                  {new Date(completedAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {(!readOnly || (status === 'submitted' && tenantSigUrl && inspectorSigUrl)) && (
        <>
          {!readOnly ? (
            <button
              onClick={submitInspection}
              disabled={submitting}
              className="sf-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-40"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit inspection'}
            </button>
          ) : (
            <button
              onClick={completeInspection}
              disabled={completing || savingSig !== null}
              className="sf-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-40"
            >
              {completing ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing…</> : 'Complete inspection'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
