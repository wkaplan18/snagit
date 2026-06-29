'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordClient() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
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
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Set a new password</h2>
        <p className="mb-5 text-sm text-slate-500">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="sf-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="sf-input"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="sf-btn-primary w-full">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
