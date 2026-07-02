'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Package, Clock, CheckCircle, ShoppingCart, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react'
import type { MaterialRequest, MaterialRequestStatus } from '@/types'

const STATUS_CONFIG: Record<MaterialRequestStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',  icon: Clock },
  ordered:   { label: 'Ordered',   color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',    icon: ShoppingCart },
  fulfilled: { label: 'Fulfilled', color: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
}

export default function MaterialsClient({ initialRequests }: { initialRequests: MaterialRequest[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statusNote, setStatusNote] = useState('')

  async function deleteRequest(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
        setExpandedId(null)
        setConfirmDeleteId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function updateStatus(id: string, status: MaterialRequestStatus) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/materials/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, status_note: statusNote.trim() || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
        setExpandedId(null)
        setStatusNote('')
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const sections: { label: string; status: MaterialRequestStatus }[] = [
    { label: 'Pending', status: 'pending' },
    { label: 'Ordered', status: 'ordered' },
    { label: 'Fulfilled', status: 'fulfilled' },
  ]

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Materials</h1>
        <Link
          href="/materials/new"
          className="flex items-center gap-1.5 rounded-xl bg-[#1A56DB] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1340B2] active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" /> Request
        </Link>
      </div>

      {requests.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Package className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-base font-semibold text-slate-900">No requests yet</p>
          <p className="mt-1 text-sm text-slate-400 max-w-xs">Tap Request to ask the office for materials.</p>
          <Link
            href="/materials/new"
            className="mt-6 rounded-xl bg-[#1A56DB] px-6 py-3 text-sm font-bold text-white active:scale-[0.97] transition-transform"
          >
            + New request
          </Link>
        </div>
      )}

      {sections.map(({ label, status }) => {
        const items = requests.filter(r => r.status === status)
        if (items.length === 0) return null
        return (
          <div key={status} className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <div className="sf-card divide-y divide-slate-100 overflow-hidden">
              {items.map(req => {
                const cfg = STATUS_CONFIG[req.status]
                const StatusIcon = cfg.icon
                const isExpanded = expandedId === req.id
                const nextStatus: MaterialRequestStatus | null =
                  req.status === 'pending' ? 'ordered' :
                  req.status === 'ordered' ? 'fulfilled' : null

                return (
                  <div key={req.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${cfg.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 truncate">{req.item}</p>
                          {req.urgency === 'urgent' && (
                            <span className="flex-shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">URGENT</span>
                          )}
                        </div>
                        {req.quantity && <p className="text-xs text-slate-500">Qty: {req.quantity}</p>}
                        <p className="text-xs text-slate-400">
                          {req.project?.name} · {new Date(req.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </p>
                        {req.status_note && (
                          <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{req.status_note}&rdquo;</p>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-300 mt-1" />
                        : <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-300 mt-1" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                        {req.notes && (
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold">Notes:</span> {req.notes}
                          </p>
                        )}
                        {nextStatus && (
                          <>
                            <input
                              type="text"
                              value={statusNote}
                              onChange={e => setStatusNote(e.target.value)}
                              placeholder={
                                nextStatus === 'ordered'
                                  ? 'e.g. Ordered from Builders Warehouse'
                                  : 'e.g. Delivered to site office'
                              }
                              className="sf-input text-sm"
                            />
                            <button
                              onClick={() => updateStatus(req.id, nextStatus)}
                              disabled={updatingId === req.id}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A56DB] py-2.5 text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] transition-[transform,opacity]"
                            >
                              {updatingId === req.id
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                                : nextStatus === 'ordered' ? 'Mark as Ordered' : 'Mark as Fulfilled'
                              }
                            </button>
                          </>
                        )}
                        {confirmDeleteId === req.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 active:scale-[0.98] transition-transform"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteRequest(req.id)}
                              disabled={deletingId === req.id}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] transition-[transform,opacity]"
                            >
                              {deletingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              {deletingId === req.id ? 'Deleting…' : 'Confirm Delete'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(req.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 active:scale-[0.98] transition-transform"
                          >
                            <Trash2 className="h-4 w-4" /> Delete request
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
