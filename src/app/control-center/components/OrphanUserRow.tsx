'use client'

import { useState } from 'react'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { formatDate, type OrphanUser } from '../lib'

export default function OrphanUserRow({ user, onDeleted }: { user: OrphanUser; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const isOwner = isPlatformOwner(user.email)

  async function handleDelete() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/control-center/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail: user.email }),
    })
    if (!res.ok) {
      setDeleting(false)
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to delete')
      return
    }
    onDeleted(user.id)
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-4 py-3 text-slate-800 font-medium">{user.email}</td>
      <td className="px-4 py-3">
        {isOwner ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-purple-700 bg-purple-50 border-purple-200">Admin</span>
        ) : user.source.type === 'invited' ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${user.source.expired ? 'text-red-700 bg-red-50 border-red-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
            Invited to {user.source.orgName}{user.source.expired ? ' (expired)' : ''}
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-slate-500 bg-slate-50 border-slate-200">Self-registered</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{user.confirmedAt ? 'Yes' : 'No'}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{user.lastSignInAt ? formatDate(user.lastSignInAt) : 'Never'}</td>
      <td className="px-4 py-3">
        {isOwner ? (
          <span className="text-xs text-slate-300">—</span>
        ) : (
          <>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold text-white bg-red-600 rounded-md px-2 py-1 disabled:opacity-40"
            >
              {deleting ? '…' : 'Delete'}
            </button>
            {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
          </>
        )}
      </td>
    </tr>
  )
}
