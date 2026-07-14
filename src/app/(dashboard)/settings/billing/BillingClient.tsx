'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Check, CheckCircle, AlertTriangle, Loader2, Lock } from 'lucide-react'

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    price: 'R1,499',
    tagline: 'Hotels, homeowners & single-site managers.',
    features: ['1 property', 'Unlimited users', 'Unlimited contractors', 'Photo before & after logging', 'Live dashboard & reports', 'Full audit trail'],
  },
  {
    id: 'contractor',
    name: 'Contractor',
    price: 'R2,999',
    tagline: 'Builders & contractors running multiple sites.',
    features: ['Up to 5 properties', 'Unlimited users', 'Unlimited contractors', 'Photo before & after logging', 'Live dashboard & reports', 'Full audit trail'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    price: 'R8,999',
    tagline: 'Hotel groups & property portfolios.',
    features: ['Up to 20 properties', 'Unlimited users', 'Unlimited contractors', 'Photo before & after logging', 'Live dashboard & reports', 'Full audit trail'],
  },
]

interface Props {
  currentPlan: string
  subscriptionStatus: string
  isTrial: boolean
  planExpiresAt: string | null
  propertyCount: number
  canManage: boolean
  standalone?: boolean
}

export default function BillingClient({ currentPlan, subscriptionStatus, isTrial, planExpiresAt, propertyCount, canManage, standalone = false }: Props) {
  const searchParams = useSearchParams()
  const payment = searchParams.get('payment')
  const locked = searchParams.get('locked') === '1'
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isActive = subscriptionStatus === 'active'
  const trialExpired = isTrial && planExpiresAt !== null && new Date(planExpiresAt) < new Date()

  async function subscribe(planId: string) {
    setLoadingPlan(planId)
    setError('')
    const res = await fetch('/api/paystack/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const json = await res.json()
    if (!res.ok || !json.authorization_url) {
      setError(json.error ?? 'Something went wrong. Please try again.')
      setLoadingPlan(null)
      return
    }
    window.location.href = json.authorization_url
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {!standalone && (
        <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      )}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF]">
          <CreditCard className="h-6 w-6 text-[#1A56DB]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Billing & Plan</h1>
          <p className="text-sm text-slate-500">Manage your SnagIT subscription</p>
        </div>
      </div>

      {locked && payment !== 'success' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            {canManage
              ? 'Your free trial has ended. Choose a plan below to keep using SnagIT — all your data is safe and waiting.'
              : 'This organisation’s free trial has ended. Ask your organisation owner to choose a plan to restore access.'}
          </p>
        </div>
      )}
      {payment === 'success' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm font-medium text-green-800">Payment successful — your subscription is now active. Thank you!</p>
        </div>
      )}
      {payment === 'failed' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">Payment was not completed. Please try again.</p>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="sf-card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Current plan</p>
            <p className="text-lg font-bold capitalize text-slate-900">{isActive ? currentPlan : isTrial ? 'Free trial' : currentPlan}</p>
            <p className="text-xs text-slate-400">{propertyCount} {propertyCount === 1 ? 'property' : 'properties'} in use</p>
          </div>
          {isActive && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">Active</span>
          )}
          {subscriptionStatus === 'past_due' && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Payment overdue</span>
          )}
          {subscriptionStatus === 'cancelled' && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Cancelled</span>
          )}
          {!isActive && subscriptionStatus !== 'past_due' && subscriptionStatus !== 'cancelled' && isTrial && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${trialExpired ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>
              {trialExpired ? 'Trial expired' : planExpiresAt ? `Trial ends ${new Date(planExpiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : 'On trial'}
            </span>
          )}
        </div>
        {subscriptionStatus === 'past_due' && (
          <p className="mt-3 text-sm text-slate-500">Your last payment failed. Paystack will retry automatically — or choose a plan below to pay now.</p>
        )}
      </div>

      {!canManage && (
        <p className="mb-4 text-sm text-slate-500">Only organisation owners and admins can manage billing.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map(plan => {
          const isCurrent = isActive && currentPlan === plan.id
          return (
            <div key={plan.id} className={`sf-card flex flex-col p-5 ${isCurrent ? 'ring-2 ring-[#1A56DB]' : ''}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.name}</p>
                {isCurrent && <span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-semibold text-[#1A56DB]">Current</span>}
              </div>
              <div className="mb-1 flex items-end gap-1">
                <span className="text-3xl font-black leading-none text-slate-900">{plan.price}</span>
                <span className="mb-0.5 text-xs text-slate-400">/mo</span>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-slate-500">{plan.tagline}</p>
              <ul className="mb-5 flex-1 space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={!canManage || isCurrent || loadingPlan !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A56DB] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A56DB] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCurrent ? 'Your plan' : isActive ? 'Switch to this plan' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Secure card payments by Paystack · Billed monthly in ZAR · Cancel anytime
      </p>
    </div>
  )
}
