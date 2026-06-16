'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  HardHat, BedDouble, Home, Building, Users, Warehouse,
  Key, UtensilsCrossed, GraduationCap, ShoppingBag,
  ArrowLeft, ArrowRight, Check,
} from 'lucide-react'
import type { OrgType } from '@/types'
import { ORG_TYPE_CONFIG } from '@/types'

const ORG_TYPE_ICONS: Record<OrgType, React.ElementType> = {
  builder:           HardHat,
  hotel:             BedDouble,
  homeowner:         Home,
  property_manager:  Building,
  body_corporate:    Users,
  facilities:        Warehouse,
  short_term_rental: Key,
  restaurant:        UtensilsCrossed,
  school:            GraduationCap,
  retail:            ShoppingBag,
}

const ORG_TYPES = Object.entries(ORG_TYPE_CONFIG) as [OrgType, { label: string; description: string }][]

export default function OnboardingClient({ email }: { email: string }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [orgType, setOrgType] = useState<OrgType | null>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!orgType) return
    setLoading(true)
    setError('')
    const { error } = await supabase.rpc('create_organization_for_user', {
      org_name: orgName,
      org_type_val: orgType,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-5 py-10">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A56DB]">
          <svg viewBox="0 0 32 32" fill="none" className="h-9 w-9">
            <path d="M8 6h16v4H8zM6 12h20v4H6zM10 18h12v4H10z" fill="white" opacity=".9"/>
            <circle cx="24" cy="22" r="6" fill="#22C55E"/>
            <path d="M21.5 22l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome to SnagandGo</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {email}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white">
          {step === 2 ? <Check className="h-3.5 w-3.5" /> : '1'}
        </div>
        <div className={`h-px w-8 ${step === 2 ? 'bg-[#1A56DB]' : 'bg-slate-200'}`} />
        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? 'bg-[#1A56DB] text-white' : 'bg-slate-200 text-slate-500'}`}>
          2
        </div>
      </div>

      {step === 1 ? (
        <div className="w-full max-w-2xl">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-bold text-slate-900">What best describes you?</h2>
            <p className="mt-1 text-sm text-slate-500">We'll tailor the experience to how you work</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ORG_TYPES.map(([key, config]) => {
              const Icon = ORG_TYPE_ICONS[key]
              const selected = orgType === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOrgType(key)}
                  className={`flex flex-col items-start gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-150 ${
                    selected
                      ? 'border-[#1A56DB] bg-[#EEF4FF]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 ${selected ? 'bg-[#1A56DB]' : 'bg-slate-100'}`}>
                    <Icon className={`h-4 w-4 ${selected ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold leading-tight ${selected ? 'text-[#1A56DB]' : 'text-slate-800'}`}>
                      {config.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{config.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={!orgType}
            onClick={() => setStep(2)}
            className="sf-btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="sf-card p-6">
            {orgType && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#EEF4FF] px-3 py-2">
                {(() => {
                  const Icon = ORG_TYPE_ICONS[orgType]
                  return <Icon className="h-4 w-4 text-[#1A56DB]" />
                })()}
                <span className="text-sm font-medium text-[#1A56DB]">{ORG_TYPE_CONFIG[orgType].label}</span>
              </div>
            )}

            <h2 className="text-lg font-bold text-slate-900">Name your organisation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your projects and snags live under your organisation. Invite your team later.
            </p>

            <form onSubmit={handleCreate} className="mt-5">
              <label htmlFor="orgName" className="block text-sm font-medium text-slate-700">
                Organisation name
              </label>
              <input
                id="orgName"
                type="text"
                required
                minLength={2}
                autoFocus
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Kaplan Developments"
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1A56DB] focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20"
              />

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || orgName.trim().length < 2}
                className="sf-btn-primary mt-4 w-full disabled:opacity-60"
              >
                {loading ? 'Setting up…' : 'Create organisation'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">POPIA compliant · Data stored securely</p>
        </div>
      )}
    </div>
  )
}
