'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, PRICE_BY_PLAN, type OrgRow, type Kpis } from '../lib'
import KpiTile from '../components/KpiTile'
import BillingPanel from '../components/BillingPanel'

const PLAN_ORDER = ['solo', 'contractor', 'portfolio', 'enterprise']

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

interface RowGroup {
  key: string
  label: string
  className: string
  orgs: OrgRow[]
}

function BillingRow({ org, onChanged }: { org: OrgRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Fragment>
      <tr className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50" onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3 font-medium text-slate-800">{org.name}</td>
        <td className="px-4 py-3 text-slate-600">{planLabel(org.plan)}</td>
        <td className="px-4 py-3 text-slate-600">{PRICE_BY_PLAN[org.plan] ? formatCurrency(PRICE_BY_PLAN[org.plan]!) : '—'}</td>
        <td className="px-4 py-3 text-slate-500">{org.nextPaymentDate ? formatDate(org.nextPaymentDate) : '—'}</td>
        <td className="px-4 py-3 text-slate-500">{org.hasPaystackSub ? 'Paystack' : 'Manual'}</td>
      </tr>
      {open && (
        <tr className="border-b border-slate-50 last:border-0 bg-slate-50/50">
          <td colSpan={5} className="px-4 py-4">
            <BillingPanel org={org} onChanged={onChanged} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function BillingSectionClient({ orgs, kpis }: { orgs: OrgRow[]; kpis: Kpis }) {
  const router = useRouter()

  const nonInternal = useMemo(() => orgs.filter(o => !o.isInternalTest), [orgs])

  const revenueByPlan = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    for (const o of nonInternal) {
      const isPaying = o.subscriptionStatus === 'active' || (o.subscriptionStatus === 'none' && !o.isTrial && o.planStatus !== 'expired')
      if (!isPaying) continue
      const price = PRICE_BY_PLAN[o.plan]
      const entry = map.get(o.plan) ?? { count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += price ?? 0
      map.set(o.plan, entry)
    }
    return PLAN_ORDER.map(plan => ({ plan, ...(map.get(plan) ?? { count: 0, revenue: 0 }) })).filter(r => r.count > 0)
  }, [nonInternal])

  const maxRevenue = Math.max(1, ...revenueByPlan.map(r => r.revenue))

  const groups: RowGroup[] = useMemo(() => [
    {
      key: 'active',
      label: 'Active (Paystack)',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-100',
      orgs: nonInternal.filter(o => o.subscriptionStatus === 'active'),
    },
    {
      key: 'past_due',
      label: 'Payment overdue',
      className: 'bg-amber-50 text-amber-800 border-amber-100',
      orgs: nonInternal.filter(o => o.subscriptionStatus === 'past_due'),
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      className: 'bg-red-50 text-red-800 border-red-100',
      orgs: nonInternal.filter(o => o.subscriptionStatus === 'cancelled'),
    },
    {
      key: 'manual',
      label: 'Paying manually (no Paystack subscription)',
      className: 'bg-slate-50 text-slate-700 border-slate-100',
      orgs: nonInternal.filter(o => o.subscriptionStatus === 'none' && !o.isTrial && o.planStatus !== 'expired'),
    },
  ], [nonInternal])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Billing</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-emerald-500" />
          Revenue & subscriptions
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile accent="emerald" label="MRR" value={formatCurrency(kpis.mrr)} />
        <KpiTile accent="emerald" label="Paystack subscribers" value={String(kpis.payingViaPaystack)} />
        <KpiTile accent="slate" label="Manual subscribers" value={String(kpis.payingManually)} sub="EFT / off-platform" />
        <KpiTile accent="amber" label="Billing issues" value={String(kpis.needsAttentionCount)} />
      </div>

      {revenueByPlan.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Revenue by plan</p>
          </div>
          <div className="space-y-3">
            {revenueByPlan.map(r => (
              <div key={r.plan}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{planLabel(r.plan)} · {r.count} {r.count === 1 ? 'org' : 'orgs'}</span>
                  <span className="text-slate-400">{formatCurrency(r.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.map(group => group.orgs.length > 0 && (
        <div key={group.key} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className={`px-4 py-2.5 border-b text-xs font-semibold ${group.className}`}>
            {group.label} ({group.orgs.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2 font-medium">Org</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Next payment</th>
                <th className="px-4 py-2 font-medium">Billed via</th>
              </tr>
            </thead>
            <tbody>
              {group.orgs.map(org => (
                <BillingRow key={org.id} org={org} onChanged={() => router.refresh()} />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {groups.every(g => g.orgs.length === 0) && (
        <p className="text-sm text-slate-400 text-center py-8">No paying organizations yet.</p>
      )}
    </div>
  )
}
