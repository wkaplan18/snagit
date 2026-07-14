'use client'

import { useState } from 'react'
import { formatCurrency, formatDate, SUB_STATUS_CONFIG, type OrgRow } from '../lib'

interface Payment {
  paidAt: string
  amount: number
  status: string
  reference: string
  channel: string
}

export default function BillingPanel({ org, onChanged }: { org: OrgRow; onChanged: () => void }) {
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
