'use client'

import { useState } from 'react'
import { PLAN_OPTIONS, toDateInputValue, type OrgRow } from '../lib'

export default function OrgEditForm({ org, onSaved }: { org: OrgRow; onSaved: () => void }) {
  const [plan, setPlan] = useState(org.plan)
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(org.planExpiresAt))
  const [isTrial, setIsTrial] = useState(org.isTrial)
  const [isInternalTest, setIsInternalTest] = useState(org.isInternalTest)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const planIsKnown = PLAN_OPTIONS.some(p => p.value === plan)

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/control-center/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        plan_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_trial: isTrial,
        is_internal_test: isInternalTest,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
        <select value={planIsKnown ? plan : ''} onChange={e => setPlan(e.target.value)} className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5">
          {!planIsKnown && <option value="">{plan} (unrecognized)</option>}
          {PLAN_OPTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Plan expires</label>
        <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        On trial (not yet paying)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={isInternalTest} onChange={e => setIsInternalTest(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Internal testing (exclude from KPIs)
      </label>
      {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-semibold text-white bg-slate-800 rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
