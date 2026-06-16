'use client'

import Link from 'next/link'
import { AlertTriangle, Camera, User } from 'lucide-react'
import type { Snag } from '@/types'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types'

const WA_SVG = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const INCOMPLETE = new Set(['open', 'assigned', 'in_progress', 'rejected'])

export default function SnagCard({ snag }: { snag: Snag }) {
  const status = STATUS_CONFIG[snag.status]
  const priority = PRIORITY_CONFIG[snag.priority]
  const coverPhoto = snag.attachments?.find(a => !a.is_resolution)
  const c = snag.contractor
  const showWa = !!(c?.whatsapp && c?.access_token && INCOMPLETE.has(snag.status))

  function openWa(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const digits = c!.whatsapp!.replace(/\D/g, '')
    const e164 = digits.startsWith('0') ? '27' + digits.slice(1) : digits
    const link = `${window.location.origin}/c/${c!.access_token}?t=${Date.now()}`
    const msg = `Hi ${c!.name}, reminder about "${snag.title}" — view and update your jobs here:\n${link}`
    window.open(`https://wa.me/${e164}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return (
    <div
      className="flex items-stretch rounded-2xl bg-white border border-slate-200 overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}
    >
      <Link
        href={`/snags/${snag.id}`}
        className="flex flex-1 items-start gap-3 p-3 hover:bg-slate-50 active:bg-slate-100 transition-colors min-w-0"
      >
        {/* Photo */}
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {coverPhoto ? (
            <img src={coverPhoto.public_url} alt={snag.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-5 w-5 text-slate-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {snag.project && (
            <p className="text-[11px] font-medium text-[#1A56DB] truncate mb-0.5">{snag.project.name}</p>
          )}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-900 leading-tight truncate">
              #{snag.snag_number} {snag.title}
            </p>
            {snag.priority === 'critical' && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`sf-badge ${status.bg} ${status.color}`}>{status.label}</span>
            <span className={`inline-flex items-center gap-1 text-xs ${priority.color}`}>
              <span className={`sf-priority-dot ${priority.dot}`} />
              {priority.label}
            </span>
            {snag.room && <span className="text-xs text-slate-400">{snag.room.name}</span>}
          </div>

          {c && (
            <div className="mt-1.5 flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500">{c.name}</span>
            </div>
          )}
        </div>
      </Link>

      {showWa && (
        <button
          onClick={openWa}
          aria-label="Send WhatsApp reminder"
          className="flex w-12 flex-shrink-0 items-center justify-center bg-[#25D366] hover:bg-[#1EBE5B] active:bg-[#1AAD57] transition-colors border-l border-[#20BF5B] text-white"
        >
          {WA_SVG}
        </button>
      )}
    </div>
  )
}
