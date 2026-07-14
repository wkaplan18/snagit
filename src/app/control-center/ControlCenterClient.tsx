'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORG_TYPE_CONFIG } from '@/types'
import type { OrgType } from '@/types'
import { isPlatformOwner } from '@/lib/isPlatformOwner'

export interface OrgMember {
  userId: string
  email: string
  name: string | null
  role: string
}

export interface PendingInvite {
  id: string
  email: string
  role: string
  expiresAt: string
  expired: boolean
}

export interface OrgRow {
  id: string
  name: string
  orgType: OrgType
  plan: string
  planExpiresAt: string | null
  planStatus: 'expired' | 'expiring_soon' | 'active' | 'no_expiry'
  isTrial: boolean
  isInternalTest: boolean
  email: string | null
  createdAt: string
  subscriptionStatus: string
  hasPaystackSub: boolean
  hasPaystackCustomer: boolean
  nextPaymentDate: string | null
  members: OrgMember[]
  pendingInvites: PendingInvite[]
  activeProjects: number
  totalProjects: number
  openSnags: number
}

interface Kpis {
  totalOrgs: number
  payingViaPaystack: number
  payingManually: number
  totalActiveProjects: number
  mrr: number
  needsAttentionCount: number
}

const PLAN_OPTIONS = [
  { value: 'solo', label: 'Solo — R1,499/mo' },
  { value: 'contractor', label: 'Contractor — R2,999/mo' },
  { value: 'portfolio', label: 'Portfolio — R8,999/mo' },
  { value: 'enterprise', label: 'Enterprise — custom' },
]

const PLAN_STATUS_CONFIG: Record<OrgRow['planStatus'], { label: string; className: string }> = {
  expired: { label: 'Expired', className: 'text-red-700 bg-red-50 border-red-200' },
  expiring_soon: { label: 'Expiring soon', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  active: { label: 'Active', className: 'text-green-700 bg-green-50 border-green-200' },
  no_expiry: { label: 'No expiry set', className: 'text-slate-500 bg-slate-50 border-slate-200' },
}

const SUB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Paystack · active', className: 'text-green-700 bg-green-50 border-green-200' },
  past_due: { label: 'Paystack · overdue', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  cancelled: { label: 'Paystack · cancelled', className: 'text-red-700 bg-red-50 border-red-200' },
}

function attentionReason(org: OrgRow): string | null {
  if (org.subscriptionStatus === 'past_due') return 'Subscription payment failed'
  if (org.subscriptionStatus === 'cancelled') return 'Subscription cancelled'
  if (org.isTrial && org.planStatus === 'expired') return 'Trial expired — not paying'
  if (org.isTrial && org.planStatus === 'expiring_soon') return 'Trial ending soon'
  return null
}

const PLAN_STATUS_SORT_ORDER: Record<OrgRow['planStatus'], number> = {
  expired: 0,
  expiring_soon: 1,
  no_expiry: 2,
  active: 3,
}

type SortKey = 'planStatus' | 'createdAt'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-semibold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function OrgEditForm({ org, onSaved }: { org: OrgRow; onSaved: () => void }) {
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

interface Payment {
  paidAt: string
  amount: number
  status: string
  reference: string
  channel: string
}

function BillingPanel({ org, onChanged }: { org: OrgRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const sub = SUB_STATUS_CONFIG[org.subscriptionStatus]

  async function extendTrial(days: number) {
    setBusy(true)
    setError('')
    const current = org.planExpiresAt ? new Date(org.planExpiresAt).getTime() : 0
    const base = current > Date.now() ? current : Date.now()
    const res = await fetch(`/api/control-center/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_expires_at: new Date(base + days * 24 * 60 * 60 * 1000).toISOString(),
        is_trial: true,
      }),
    })
    setBusy(false)
    if (!res.ok) { setError('Failed to extend trial'); return }
    setNotice(`Trial extended by ${days} days`)
    onChanged()
  }

  async function cancelSubscription() {
    if (!confirm(`Cancel ${org.name}'s Paystack subscription? No further charges will go through.`)) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/control-center/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', orgId: org.id }),
    })
    setBusy(false)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { setError(body.error ?? 'Failed to cancel'); return }
    setNotice('Subscription cancelled')
    onChanged()
  }

  async function loadPayments() {
    if (payments) { setPayments(null); return }
    setLoadingPayments(true)
    setError('')
    const res = await fetch(`/api/control-center/billing?orgId=${org.id}`)
    const body = await res.json().catch(() => ({}))
    setLoadingPayments(false)
    if (!res.ok) { setError(body.error ?? 'Failed to load payments'); return }
    setPayments(body.payments ?? [])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-slate-500">Billing</p>
        {sub ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sub.className}`}>{sub.label}</span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-slate-500 bg-slate-50 border-slate-200">
            {org.isTrial ? 'On trial — no subscription' : 'No Paystack subscription (manual billing)'}
          </span>
        )}
        {org.nextPaymentDate && org.subscriptionStatus === 'active' && (
          <span className="text-xs text-slate-400">Next payment: {formatDate(org.nextPaymentDate)}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 mr-1">Extend trial:</span>
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => extendTrial(d)}
            disabled={busy}
            className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            +{d} days
          </button>
        ))}
        {org.hasPaystackCustomer && (
          <button
            onClick={loadPayments}
            disabled={loadingPayments}
            className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            {loadingPayments ? 'Loading…' : payments ? 'Hide payments' : 'View payments'}
          </button>
        )}
        {org.hasPaystackSub && org.subscriptionStatus !== 'cancelled' && (
          <button
            onClick={cancelSubscription}
            disabled={busy}
            className="text-xs font-semibold text-red-600 border border-red-200 rounded-md px-2 py-1 hover:bg-red-50 disabled:opacity-40"
          >
            Cancel subscription
          </button>
        )}
      </div>

      {payments && (
        payments.length === 0 ? (
          <p className="text-xs text-slate-400">No payments on record.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-1 pr-3 font-medium">Date</th>
                <th className="py-1 pr-3 font-medium">Amount</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.reference} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-600">{formatDate(p.paidAt)}</td>
                  <td className="py-1.5 pr-3 text-slate-800 font-medium">{formatCurrency(p.amount)}</td>
                  <td className={`py-1.5 pr-3 font-medium ${p.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{p.status}</td>
                  <td className="py-1.5 text-slate-400 font-mono text-[10px]">{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {notice && <p className="text-xs text-green-600">{notice}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function MemberRow({ member, onChanged }: { member: OrgMember; onChanged: () => void }) {
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

function PendingInviteRow({ invite }: { invite: PendingInvite }) {
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

function DeleteOrgSection({ org, onDeleted }: { org: OrgRow; onDeleted: () => void }) {
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

export interface OrphanUser {
  id: string
  email: string
  createdAt: string
  confirmedAt: string | null
  lastSignInAt: string | null
  source: { type: 'invited'; orgName: string; expired: boolean } | { type: 'self_registered' }
}

function OrphanUserRow({ user, onDeleted }: { user: OrphanUser; onDeleted: (id: string) => void }) {
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

function OrphanUsersSection({ users, onDeleted }: { users: OrphanUser[]; onDeleted: (id: string) => void }) {
  if (users.length === 0) return null
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">Users without an org ({users.length})</h2>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Signed up</th>
              <th className="px-4 py-2 font-medium">Confirmed</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
              <th className="px-4 py-2 font-medium">Delete</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => <OrphanUserRow key={u.id} user={u} onDeleted={onDeleted} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ControlCenterClient({ orgs, kpis, orphanUsers }: { orgs: OrgRow[]; kpis: Kpis; orphanUsers: OrphanUser[] }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('planStatus')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set())

  function handleUserDeleted(id: string) {
    setRemovedUserIds(prev => new Set(prev).add(id))
    router.refresh()
  }

  const visibleOrphanUsers = orphanUsers.filter(u => !removedUserIds.has(u.id))

  const attentionOrgs = orgs.filter(o => !o.isInternalTest && attentionReason(o) !== null)

  const sortedOrgs = useMemo(() => {
    const copy = [...orgs]
    if (sortKey === 'planStatus') {
      copy.sort((a, b) => PLAN_STATUS_SORT_ORDER[a.planStatus] - PLAN_STATUS_SORT_ORDER[b.planStatus])
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return copy
  }, [orgs, sortKey])

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total orgs" value={String(kpis.totalOrgs)} sub="excl. internal testing" />
        <KpiTile label="MRR" value={formatCurrency(kpis.mrr)} sub={`${kpis.payingViaPaystack} via Paystack · ${kpis.payingManually} manual`} />
        <KpiTile label="Paying subscribers" value={String(kpis.payingViaPaystack + kpis.payingManually)} />
        <KpiTile label="Billable projects" value={String(kpis.totalActiveProjects)} sub="active projects/properties" />
        <KpiTile label="Needs attention" value={String(kpis.needsAttentionCount)} sub="billing issues & trials" />
      </div>

      {attentionOrgs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800">Needs attention</p>
          {attentionOrgs.map(org => (
            <button
              key={org.id}
              onClick={() => setExpandedId(org.id)}
              className="flex w-full items-center justify-between gap-2 text-left text-xs hover:opacity-70"
            >
              <span className="font-medium text-amber-900">{org.name}</span>
              <span className="text-amber-700">{attentionReason(org)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Organizations</h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setSortKey('planStatus')}
            className={`px-2 py-1 rounded-md border ${sortKey === 'planStatus' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}
          >
            Sort: plan status
          </button>
          <button
            onClick={() => setSortKey('createdAt')}
            className={`px-2 py-1 rounded-md border ${sortKey === 'createdAt' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200'}`}
          >
            Sort: newest
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2 font-medium">Org</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium">Projects</th>
              <th className="px-4 py-2 font-medium">Open snags</th>
              <th className="px-4 py-2 font-medium">Customer since</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrgs.map(org => {
              const status = PLAN_STATUS_CONFIG[org.planStatus]
              const isExpanded = expandedId === org.id
              return (
                <Fragment key={org.id}>
                  <tr
                    className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(isExpanded ? null : org.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        {org.name}
                        {org.isInternalTest && (
                          <span className="text-[10px] font-semibold uppercase text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-1.5 py-0.5">Internal</span>
                        )}
                        {org.isTrial && !org.isInternalTest && (
                          <span className="text-[10px] font-semibold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">Trial</span>
                        )}
                      </p>
                      {org.email && <p className="text-xs text-slate-400">{org.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ORG_TYPE_CONFIG[org.orgType]?.label ?? org.orgType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      {SUB_STATUS_CONFIG[org.subscriptionStatus] && (
                        <span className={`ml-1 inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${SUB_STATUS_CONFIG[org.subscriptionStatus].className}`}>
                          {SUB_STATUS_CONFIG[org.subscriptionStatus].label}
                        </span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{org.plan} · {formatDate(org.planExpiresAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{org.members.length}</td>
                    <td className="px-4 py-3 text-slate-600">{org.activeProjects} / {org.totalProjects}</td>
                    <td className="px-4 py-3 text-slate-600">{org.openSnags}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(org.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-slate-50 last:border-0 bg-slate-50/50">
                      <td colSpan={7} className="px-4 py-4 space-y-4">
                        <BillingPanel org={org} onChanged={() => router.refresh()} />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Members</p>
                          {org.members.length === 0 ? (
                            <p className="text-xs text-slate-400">No members</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {org.members.map(m => (
                                <MemberRow key={m.userId} member={m} onChanged={() => router.refresh()} />
                              ))}
                            </ul>
                          )}
                        </div>
                        {org.pendingInvites.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">Pending invites</p>
                            <ul className="space-y-1.5">
                              {org.pendingInvites.map(inv => (
                                <PendingInviteRow key={inv.id} invite={inv} />
                              ))}
                            </ul>
                          </div>
                        )}
                        <OrgEditForm org={org} onSaved={() => router.refresh()} />
                        <DeleteOrgSection org={org} onDeleted={() => { setExpandedId(null); router.refresh() }} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {sortedOrgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No organizations yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OrphanUsersSection users={visibleOrphanUsers} onDeleted={handleUserDeleted} />
    </div>
  )
}
