'use client'

import { useState } from 'react'
import { formatDate, type PendingInvite } from '../lib'

export default function PendingInviteRow({ invite, showOrgName }: { invite: PendingInvite; showOrgName?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function resend() {
    setBusy(true)
    setStatus('')
    const res = await fetch('/api/control-center/invites/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: invite.id }),
    })
    setBusy(false)
    setStatus(res.ok ? 'Resent ✓' : 'Failed to resend')
  }

  return (
    <li className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
      <span className="font-medium">{invite.email}</span>
      {showOrgName && <span className="text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5">{invite.orgName}</span>}
      <span className="text-slate-400 uppercase text-[10px] bg-slate-100 rounded-full px-1.5 py-0.5">{invite.role}</span>
      <span className={`text-[11px] ${invite.expired ? 'text-red-500' : 'text-slate-400'}`}>
        {invite.expired ? 'Expired' : `Expires ${formatDate(invite.expiresAt)}`}
      </span>
      <button
        onClick={resend}
        disabled={busy}
        className="text-[11px] font-semibold text-slate-500 border border-slate-200 rounded-md px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-40"
      >
        {busy ? 'Sending…' : 'Resend invite'}
      </button>
      {status && <span className={status.includes('✓') ? 'text-green-600' : 'text-red-600'}>{status}</span>}
    </li>
  )
}
