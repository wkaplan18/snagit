'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-5">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A56DB]">
          <svg viewBox="0 0 32 32" fill="none" className="h-9 w-9">
            <circle cx="16" cy="16" r="8.5" stroke="white" strokeWidth="2" opacity="0.9"/>
            <circle cx="16" cy="16" r="2.5" fill="white"/>
            <line x1="16" y1="4" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="16" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Snag<span style={{ color: '#22C55E' }}>IT</span></h1>
        <p className="mt-1 text-sm text-slate-500">Construction, hotels & property — sorted</p>
      </div>

      <div className="sf-card w-full max-w-sm p-6">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500">
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[#1A56DB] hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Reset your password</h2>
            <p className="mb-5 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.co.za"
                  required
                  className="sf-input"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="sf-btn-primary w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-[#1A56DB] hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
