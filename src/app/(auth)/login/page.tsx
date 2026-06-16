'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // With a password we sign in directly; left blank we fall back to a magic link.
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-5">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A56DB]">
          <svg viewBox="0 0 32 32" fill="none" className="h-9 w-9">
            <path d="M8 6h16v4H8zM6 12h20v4H6zM10 18h12v4H10z" fill="white" opacity=".9"/>
            <circle cx="24" cy="22" r="6" fill="#22C55E"/>
            <path d="M21.5 22l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SnagandGo</h1>
        <p className="mt-1 text-sm text-slate-500">Construction snagging made simple</p>
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
              We sent a magic link to <strong>{email}</strong>. Tap the link to sign in.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-5 text-lg font-semibold text-slate-900">Sign in to SnagandGo</h2>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="sf-btn-secondary mb-4 w-full"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Magic link */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave blank for a magic link"
                  className="sf-input"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="sf-btn-primary w-full">
                {loading ? 'Signing in…' : password ? 'Sign in' : 'Send magic link'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        By signing in you agree to our Terms of Service and Privacy Policy.
        <br />POPIA compliant · Data stored in South Africa
      </p>
    </div>
  )
}
