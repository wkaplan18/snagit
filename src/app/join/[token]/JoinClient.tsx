'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  orgName: string
  inviteEmail: string
}

export default function JoinClient({ token, orgName, inviteEmail }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    if (mode === 'signup') {
      // Create account via admin (bypasses email verification — invite validates the email)
      const res = await fetch('/api/join-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: inviteEmail, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          // Already has an account — switch to sign-in mode
          setMode('signin')
          setError('You already have an account. Sign in with your password.')
          setLoading(false)
          return
        }
        setError(json.error ?? 'Could not create account.')
        setLoading(false)
        return
      }
    }

    // Sign in (works for both existing users and newly created ones)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: inviteEmail,
      password,
    })

    if (signInError) {
      if (mode === 'signin' && signInError.message.toLowerCase().includes('invalid')) {
        setError('Incorrect password. If you\'re new, click "Create account" below.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    // Signed in — server component will auto-accept the invite and redirect to /dashboard
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Snag<span style={{ color: '#22C55E' }}>IT</span>
          </p>
        </div>

        <div className="sf-card p-6">
          <h1 className="text-xl font-bold text-slate-900 text-center">You've been invited</h1>
          <p className="mt-1 text-sm text-slate-500 text-center">
            Join <strong className="text-slate-800">{orgName}</strong> on SnagIT
          </p>

          <div className="my-5 rounded-xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs text-slate-400">Joining as</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{inviteEmail}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {mode === 'signup' ? 'Create a password' : 'Your password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
                className="sf-input"
              />
            </div>

            {mode === 'signup' && (
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
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1A56DB] py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account & join →' : 'Sign in & join →'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className="text-sm text-[#1A56DB] hover:underline"
              >
                New to SnagIT? Create account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError('') }}
                className="text-sm text-[#1A56DB] hover:underline"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">POPIA compliant · snagitapp.co.za</p>
      </div>
    </div>
  )
}
