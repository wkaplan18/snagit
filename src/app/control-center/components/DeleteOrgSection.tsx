'use client'

import { useState } from 'react'
import type { OrgRow } from '../lib'

export default function DeleteOrgSection({ org, onDeleted }: { org: OrgRow; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/control-center/orgs/${org.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmName: confirmText }),
    })
    setDeleting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to delete')
      return
    }
    onDeleted()
  }

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-red-700">Danger zone</p>
      <p className="text-xs text-red-600">
        This permanently deletes <span className="font-semibold">{org.name}</span> and, most likely, all of its projects, snags, photos, and contractors. This cannot be undone.
      </p>
      <p className="text-xs text-red-600">Type <span className="font-mono font-semibold">{org.name}</span> to confirm:</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          className="text-sm rounded-md border border-red-300 px-2 py-1.5 flex-1 max-w-xs"
          placeholder={org.name}
        />
        <button
          onClick={handleDelete}
          disabled={deleting || confirmText.trim() !== org.name}
          className="text-xs font-semibold text-white bg-red-600 rounded-md px-3 py-1.5 disabled:opacity-40"
        >
          {deleting ? 'Deleting…' : 'Delete organization'}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
