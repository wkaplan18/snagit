import Link from 'next/link'
import { AlertTriangle, Camera, User } from 'lucide-react'
import type { Snag } from '@/types'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types'

interface Props {
  snag: Snag
}

export default function SnagCard({ snag }: Props) {
  const status = STATUS_CONFIG[snag.status]
  const priority = PRIORITY_CONFIG[snag.priority]
  const coverPhoto = snag.attachments?.find(a => !a.is_resolution)

  return (
    <Link
      href={`/snags/${snag.id}`}
      className="flex items-start gap-3 rounded-2xl bg-white border border-slate-200 p-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}
    >
      {/* Photo / placeholder */}
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
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 leading-tight truncate">
            #{snag.snag_number} {snag.title}
          </p>
          {snag.priority === 'critical' && (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Status badge */}
          <span className={`sf-badge ${status.bg} ${status.color}`}>
            {status.label}
          </span>

          {/* Priority dot */}
          <span className={`inline-flex items-center gap-1 text-xs ${priority.color}`}>
            <span className={`sf-priority-dot ${priority.dot}`} />
            {priority.label}
          </span>

          {/* Room */}
          {snag.room && (
            <span className="text-xs text-slate-400">{snag.room.name}</span>
          )}
        </div>

        {/* Contractor */}
        {snag.contractor && (
          <div className="mt-1.5 flex items-center gap-1">
            <User className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-500">{snag.contractor.name}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
