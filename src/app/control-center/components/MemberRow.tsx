'use client'

import { useState } from 'react'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import type { OrgMember } from '../lib'

export default function MemberRow({ member, orgName, onChanged }: { member: OrgMember; orgName?: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function resetPassword() {
    setBusy(true)
    setStatus('')
    const res = await fetch('/api/control-center/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: member.email }),
    })
    setBusy(false)
    setStatus(res.ok ? 'Reset email sent ✓' : 'Failed to send')
  }

  async function deleteUser() {
    if (!confirm(`Delete ${member.email} entirely? They lose access to SnagIT. This cannot be undone.`)) return
    setBusy(true)
    setStatus('')
    const res = await fetch(`/api/control-center/users/${member.userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail: member.email }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setStatus(body.error ?? 'Failed to delete')
      return
    }
    onChanged()
  }

  return (
    <li className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
      <span className="font-medium">{member.email}</span>
      {member.name && <span className="text-slate-400">({member.name})</span>}
      {orgName && <span className="text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5">{orgName}</span>}
      <span className="text-slate-400 uppercase text-[10px] bg-slate-100 rounded-full px-1.5 py-0.5">{member.role}</span>
      <button
        onClick={resetPassword}
        disabled={busy}
        className="text-[11px] font-semibold text-slate-500 border border-slate-200 rounded-md px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-40"
      >
        Reset password
      </button>
      {member.role !== 'owner' && !isPlatformOwner(member.email) && (
        <button
          onClick={deleteUser}
          disabled={busy}
          className="text-[11px] font-semibold text-red-500 border border-red-200 rounded-md px-1.5 py-0.5 hover:bg-red-50 disabled:opacity-40"
        >
          Delete
        </button>
      )}
      {status && <span className={status.includes('✓') ? 'text-green-600' : 'text-red-600'}>{status}</span>}
    </li>
  )
}
