'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, User, Plus, ClipboardList, ChevronRight, Loader2, X, LogOut, Scale } from 'lucide-react'
import type { Tenant, Inspection, DashboardTerms } from '@/types'

interface UnitInfo {
  id: string
  project_id: string
  name: string
  unit_type: string
  floor_number: number | null
  project: { id: string; name: string; org_id: string } | null
}

const INSPECTION_STATUS_LABEL: Record<string, string> = {
  draft: 'In progress',
  submitted: 'Submitted',
  completed: 'Completed',
}

export default function UnitClient({ unit, tenants, inspections, terms }: {
  unit: UnitInfo
  tenants: Tenant[]
  inspections: Inspection[]
  terms: DashboardTerms
}) {
  const router = useRouter()
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [leaseStart, setLeaseStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [startingType, setStartingType] = useState<'move_in' | 'move_out' | null>(null)
  const [endingTenancy, setEndingTenancy] = useState(false)

  const activeTenant = tenants.find(t => t.status === 'active') ?? null
  const pastTenants = tenants.filter(t => t.status === 'ended')

  const hasMoveIn = activeTenant
    ? inspections.some(i => i.type === 'move_in' && i.tenant_id === activeTenant.id)
    : false
  const hasMoveOut = activeTenant
    ? inspections.some(i => i.type === 'move_out' && i.tenant_id === activeTenant.id)
    : false

  const compareTarget = inspections
    .filter(i => i.type === 'move_out' && i.linked_move_in_inspection_id)
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return -1
      if (b.status === 'completed' && a.status !== 'completed') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })[0] ?? null

  async function addTenant() {
    if (!fullName.trim() || !leaseStart) return
    setSaving(true)
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unit.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          lease_start_date: leaseStart,
        }),
      })
      if (res.ok) {
        setShowAddTenant(false)
        setFullName(''); setPhone('')
        router.refresh()
      } else {
        alert('Could not add tenant. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function endTenancy() {
    if (!activeTenant) return
    if (!confirm(`End ${activeTenant.full_name}'s tenancy?`)) return
    setEndingTenancy(true)
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', move_out_date: new Date().toISOString().slice(0, 10) }),
      })
      if (res.ok) router.refresh()
      else alert('Could not end tenancy. Please try again.')
    } finally {
      setEndingTenancy(false)
    }
  }

  async function startInspection(type: 'move_in' | 'move_out') {
    if (!activeTenant) return
    setStartingType(type)
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: unit.id, tenant_id: activeTenant.id, type }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/inspections/${data.id}`)
      } else {
        alert(data.error ?? 'Could not start inspection.')
      }
    } finally {
      setStartingType(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link
        href={unit.project ? `/projects/${unit.project.id}` : '/projects'}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> {unit.project?.name ?? 'Back'}
      </Link>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF]">
            <Home className="h-5 w-5 text-[#1A56DB]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{unit.name}</h1>
            <p className="text-xs capitalize text-slate-400">
              {unit.unit_type.replace(/_/g, ' ')}{unit.floor_number != null ? ` · Floor ${unit.floor_number}` : ''}
            </p>
          </div>
        </div>
        {compareTarget && (
          <Link
            href={`/inspections/${compareTarget.id}/compare`}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <Scale className="h-3.5 w-3.5" /> Compare
          </Link>
        )}
      </div>

      {/* Tenant section */}
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Current tenant</p>
      {activeTenant ? (
        <div className="sf-card mb-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB]/10 text-sm font-bold text-[#1A56DB]">
              {activeTenant.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{activeTenant.full_name}</p>
              <p className="text-xs text-slate-400">
                Lease start {new Date(activeTenant.lease_start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={endTenancy}
              disabled={endingTenancy}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              {endingTenancy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              End tenancy
            </button>
          </div>

          <div className="mt-3">
            {!hasMoveIn ? (
              <button
                onClick={() => startInspection('move_in')}
                disabled={startingType !== null}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1A56DB] py-2.5 text-sm font-bold text-white active:scale-[0.97] transition-[transform,opacity] disabled:opacity-50"
              >
                {startingType === 'move_in' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move-in inspection'}
              </button>
            ) : !hasMoveOut ? (
              <button
                onClick={() => startInspection('move_out')}
                disabled={startingType !== null}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 active:scale-[0.97] transition-[transform,opacity] disabled:opacity-50"
              >
                {startingType === 'move_out' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move-out inspection'}
              </button>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">
                Move-out inspection already done for this tenant — end the tenancy when ready.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="sf-card mb-3 flex flex-col items-center p-6 text-center">
          <User className="mb-2 h-7 w-7 text-slate-200" />
          <p className="text-sm text-slate-500 mb-3">No active tenant for this {terms.unit.toLowerCase()}.</p>
          <button
            onClick={() => setShowAddTenant(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1A56DB] px-4 py-2.5 text-sm font-bold text-white active:scale-[0.97] transition-transform"
          >
            <Plus className="h-4 w-4" /> Add tenant
          </button>
        </div>
      )}

      {pastTenants.length > 0 && (
        <details className="mb-5">
          <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
            {pastTenants.length} past tenant{pastTenants.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {pastTenants.map(t => (
              <div key={t.id} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="text-sm font-medium text-slate-700">{t.full_name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(t.lease_start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' – '}
                  {t.move_out_date ? new Date(t.move_out_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Inspection history */}
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Inspections</p>
      {inspections.length === 0 ? (
        <div className="sf-card flex flex-col items-center p-6 text-center">
          <ClipboardList className="mb-2 h-7 w-7 text-slate-200" />
          <p className="text-sm text-slate-500">No inspections yet.</p>
        </div>
      ) : (
        <div className="sf-card divide-y divide-slate-100 overflow-hidden">
          {inspections.map(insp => (
            <Link
              key={insp.id}
              href={`/inspections/${insp.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1A56DB]">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {insp.type === 'move_in' ? 'Move-in' : 'Move-out'} inspection
                  {insp.status === 'completed' && insp.completed_at && (
                    <span className="ml-1.5 font-normal text-slate-400">
                      · {new Date(insp.completed_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {insp.tenant?.full_name ?? '—'} · {INSPECTION_STATUS_LABEL[insp.status]}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
            </Link>
          ))}
        </div>
      )}

      {showAddTenant && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowAddTenant(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add tenant</h2>
              <button onClick={() => setShowAddTenant(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                <input type="text" autoFocus value={fullName} onChange={e => setFullName(e.target.value)} className="sf-input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone <span className="font-normal text-slate-400">(optional)</span></label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="sf-input" placeholder="082 123 4567" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Lease start date</label>
                <input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} className="sf-input" />
              </div>
              <button
                onClick={addTenant}
                disabled={!fullName.trim() || !leaseStart || saving}
                className="sf-btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : 'Add tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
