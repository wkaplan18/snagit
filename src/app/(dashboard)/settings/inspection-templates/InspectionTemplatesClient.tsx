'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ClipboardList, ChevronRight, Loader2, X } from 'lucide-react'
import type { InspectionTemplate } from '@/types'

export default function InspectionTemplatesClient({ initialTemplates }: { initialTemplates: InspectionTemplate[] }) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function createTemplate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/inspection-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const created = await res.json()
        router.push(`/settings/inspection-templates/${created.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inspection Checklists</h1>
          <p className="mt-0.5 text-sm text-slate-400">Templates used for move-in / move-out audits</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#1A56DB] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1340B2] active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-base font-semibold text-slate-900">No checklists yet</p>
          <p className="mt-1 text-sm text-slate-400 max-w-xs">Create a checklist so inspectors have a consistent room-by-room list to work through.</p>
        </div>
      )}

      {templates.length > 0 && (
        <div className="sf-card divide-y divide-slate-100 overflow-hidden">
          {templates.map(t => {
            const roomCount = t.rooms?.length ?? 0
            const itemCount = t.rooms?.reduce((sum, r) => sum + (r.items?.length ?? 0), 0) ?? 0
            return (
              <Link
                key={t.id}
                href={`/settings/inspection-templates/${t.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1A56DB]">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{roomCount} rooms · {itemCount} items{!t.is_active ? ' · Inactive' : ''}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
              </Link>
            )
          })}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setCreating(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">New checklist</h2>
              <button onClick={() => setCreating(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Standard Apartment"
              className="sf-input mb-4"
            />
            <button
              onClick={createTemplate}
              disabled={!name.trim() || saving}
              className="sf-btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create & add rooms'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
