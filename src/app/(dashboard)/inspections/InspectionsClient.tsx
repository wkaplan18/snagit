'use client'

import Link from 'next/link'
import { ClipboardList, ChevronRight } from 'lucide-react'
import type { Inspection } from '@/types'

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'In progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  submitted: { label: 'Submitted',   color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Completed',   color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
}

export default function InspectionsClient({ initialInspections }: { initialInspections: Inspection[] }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Inspections</h1>

      {initialInspections.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-base font-semibold text-slate-900">No inspections yet</p>
          <p className="mt-1 text-sm text-slate-400 max-w-xs">Start a move-in or move-out inspection from a unit&apos;s page.</p>
        </div>
      ) : (
        <div className="sf-card divide-y divide-slate-100 overflow-hidden">
          {initialInspections.map(insp => {
            const cfg = STATUS_LABEL[insp.status]
            return (
              <Link
                key={insp.id}
                href={`/inspections/${insp.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${cfg.bg}`}>
                  <ClipboardList className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {insp.unit?.name ?? 'Unit'} · {insp.type === 'move_in' ? 'Move-in' : 'Move-out'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {insp.tenant?.full_name ?? '—'} · {new Date(insp.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
