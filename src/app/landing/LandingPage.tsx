'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  HardHat, BedDouble, Building, Users,
  Camera, Zap, CheckCircle, Bell, BarChart3, Smartphone,
  ArrowRight, ChevronRight, X,
} from 'lucide-react'

const USER_TYPES = [
  { icon: HardHat,   label: 'Builder / Developer',  color: '#F97316', bg: '#FFF7ED' },
  { icon: BedDouble, label: 'Hotel / Hospitality',  color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: Building,  label: 'Property Manager',     color: '#10B981', bg: '#ECFDF5' },
  { icon: Users,     label: 'Body Corporate / HOA', color: '#F43F5E', bg: '#FFF1F2' },
]

const STEPS = [
  {
    num: '01',
    title: 'Spot it',
    desc: 'Walk the property, snap a photo, log the issue in seconds. Add a title, priority, and category — done.',
    color: '#0EA5E9',
    icon: Camera,
  },
  {
    num: '02',
    title: 'Assign it',
    desc: 'Send it to an internal team member or an external contractor with one tap. They get notified instantly — no app needed.',
    color: '#8B5CF6',
    icon: Zap,
  },
  {
    num: '03',
    title: 'Done',
    desc: 'The contractor uploads a fix photo. You approve or reject. Every action is logged with a full audit trail.',
    color: '#10B981',
    icon: CheckCircle,
  },
]

const FEATURES = [
  { icon: Camera,      title: 'Photo logging',       desc: 'Snap and log defects with before/after photos in under 30 seconds.', color: '#F97316' },
  { icon: Zap,         title: 'Instant assignment',  desc: 'Assign to internal staff or an external contractor with a single tap.',  color: '#8B5CF6' },
  { icon: Bell,        title: 'Instant alerts',      desc: 'Contractors get notified the moment a job is assigned — no app install, no friction.',   color: '#10B981' },
  { icon: BarChart3,   title: 'Live reports',        desc: 'Track open snags, completion rates, and contractor performance at a glance.',    color: '#0EA5E9' },
  { icon: Users,       title: 'Team & contractors',  desc: 'Manage internal staff and external trades from a single dashboard.',            color: '#F43F5E' },
  { icon: Smartphone,  title: 'Mobile first',        desc: 'Built for the field — works perfectly on any phone, even offline.',              color: '#1A56DB' },
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function FadeUp({ children, delay = 0, className = '', style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', properties: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setStatus('success')
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
        <div className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Enterprise</p>
              <h3 className="mt-1 text-2xl font-black text-white">Let's talk</h3>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white/10 active:scale-95" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {status === 'success' ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12" style={{ color: '#22C55E' }} />
              <p className="text-lg font-bold text-white">We'll be in touch soon.</p>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Thanks for reaching out — expect a reply within 24 hours.</p>
              <button onClick={onClose} className="mt-6 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Name', key: 'name', required: true, placeholder: 'Your name' },
                  { label: 'Company', key: 'company', required: false, placeholder: 'Company name' },
                  { label: 'Email', key: 'email', required: true, placeholder: 'you@company.com' },
                  { label: 'Phone', key: 'phone', required: false, placeholder: '+27 ...' },
                ].map(({ label, key, required, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}{required && ' *'}</label>
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      required={required}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Number of properties</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 25"
                  value={form.properties}
                  onChange={e => setForm(f => ({ ...f, properties: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Message</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your needs..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              {status === 'error' && <p className="text-sm" style={{ color: '#F87171' }}>{errorMsg || 'Something went wrong — please try again.'}</p>}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
              >
                {status === 'loading' ? 'Sending…' : 'Send enquiry'}
              </button>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>We'll reply within 24 hours</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const doubled = [...USER_TYPES, ...USER_TYPES]
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  return (
    <div className="font-display overflow-x-hidden bg-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5" style={{ background: 'rgba(5,14,31,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <circle cx="12" cy="12" r="6.5" stroke="white" strokeWidth="1.5" opacity="0.9"/>
              <circle cx="12" cy="12" r="2" fill="white"/>
              <line x1="12" y1="3" x2="12" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="3" y1="12" x2="7" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="17" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Snag<span style={{ color: '#22C55E' }}>IT</span></span>
        </div>
        <div className="hidden items-center gap-7 sm:flex">
          <a href="#how" className="text-sm font-medium text-white/60 hover:text-white transition-colors">How it works</a>
          <a href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Pricing</a>
          <Link href={isLoggedIn ? '/dashboard' : '/login'} className="text-sm font-medium text-white/60 hover:text-white transition-colors">{isLoggedIn ? 'Dashboard' : 'Sign in'}</Link>
        </div>
        <Link href="/register" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: '#1A56DB', boxShadow: '0 0 20px rgba(26,86,219,0.4)' }}>
          Get started free
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center" style={{ background: '#050E1F' }}>

        {/* Animated orbs */}
        <div className="animate-float-slow pointer-events-none absolute left-[10%] top-[20%] h-72 w-72 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #1A56DB, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="animate-float-med pointer-events-none absolute right-[8%] top-[30%] h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)', filter: 'blur(40px)', animationDelay: '1.5s' }} />
        <div className="animate-float-fast pointer-events-none absolute bottom-[20%] left-[20%] h-56 w-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #0EA5E9, transparent 70%)', filter: 'blur(50px)', animationDelay: '2.5s' }} />
        <div className="animate-float-slow pointer-events-none absolute bottom-[25%] right-[15%] h-48 w-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)', filter: 'blur(40px)', animationDelay: '3.5s' }} />

        {/* Spinning ring */}
        <div className="animate-spin-slow pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5" style={{ border: '1px solid white' }} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5" style={{ border: '1px solid white', animation: 'spin-slow 30s linear infinite reverse' }} />

        {/* Badge */}
        <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', animationDelay: '100ms', opacity: 0 }}>
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: '#22C55E' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Built for builders, hotels & property managers</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up mb-6 max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ opacity: 0, animationDelay: '200ms' }}>
          Log it. Assign it.{' '}
          <span className="text-gradient-vivid">Fixed.</span>
        </h1>

        <p className="animate-fade-up mb-10 max-w-xl text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', opacity: 0, animationDelay: '350ms' }}>
          The fault-logging platform for construction sites, hotel teams, and property managers. Snag a fault in 30 seconds — assign, track, and close it from your phone.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3" style={{ opacity: 0, animationDelay: '500ms' }}>
          <Link href="/register" className="group flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #1A56DB, #6366F1)', boxShadow: '0 4px 30px rgba(26,86,219,0.5)' }}>
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="#how" className="flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
            See how it works
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Floating stat pills */}
        <div className="animate-fade-up mt-16 flex flex-wrap items-center justify-center gap-4" style={{ opacity: 0, animationDelay: '650ms' }}>
          {[
            { val: '4', label: 'Property types' },
            { val: '30s', label: 'To log a snag' },
            { val: '100%', label: 'Mobile ready' },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-2xl px-5 py-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 flex items-start justify-center pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="h-2 w-0.5 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* ── USER TYPE TICKER ── */}
      <section className="overflow-hidden border-y py-10" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Built for these property types</p>
        <div className="flex animate-ticker gap-4" style={{ width: 'max-content' }}>
          {doubled.map(({ icon: Icon, label, color, bg }, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2.5 rounded-2xl border px-5 py-3" style={{ background: bg, borderColor: color + '33' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: color + '22' }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#0F172A' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="px-6 py-24">
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#1A56DB' }}>How it works</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Three steps. Done.</h2>
        </FadeUp>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {STEPS.map(({ num, title, desc, color, icon: Icon }, i) => (
            <FadeUp key={num} delay={i * 120} className="relative rounded-3xl p-8" style={{ background: '#0F172A', border: `1px solid ${color}33` }}>
              {/* Pulse ring */}
              <div className="absolute -top-4 -left-4 h-16 w-16">
                <div className="animate-pulse-ring absolute inset-0 rounded-full" style={{ background: color + '33' }} />
                <div className="absolute inset-2 flex items-center justify-center rounded-full text-lg font-black" style={{ background: color, color: 'white' }}>{num.slice(1)}</div>
              </div>

              <div className="mb-4 mt-6 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: color + '22' }}>
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{desc}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-6 py-24" style={{ background: '#F8FAFC' }}>
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#1A56DB' }}>Features</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Everything you need</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">From logging a snag to signing it off — the full maintenance lifecycle in one place.</p>
        </FadeUp>

        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <FadeUp key={title} delay={i * 80}>
              <div className="group h-full rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: '#E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110" style={{ background: color + '18' }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="px-6 py-24 bg-white">
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#1A56DB' }}>Pricing</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Simple, flat pricing.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">You manage everything. Your contractors just fix things — no logins, no app installs, no per-user fees. Ever.</p>
        </FadeUp>

        <div className="mx-auto grid max-w-6xl items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">

          {/* Solo plan */}
          <FadeUp className="flex">
            <div className="flex w-full flex-col overflow-hidden rounded-3xl" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="flex flex-1 flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Solo</span>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>1 property</span>
                </div>
                <div className="mb-2 flex items-end gap-1.5">
                  <span className="mb-1 text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>R</span>
                  <span className="text-5xl font-black leading-none text-white">1,499</span>
                  <span className="mb-1 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>Hotels, homeowners & single-site managers.</p>
                <div className="mb-6 h-px w-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    '1 property',
                    'Unlimited contractors',
                    'Photo before & after logging',
                    'Live dashboard & reports',
                    'Full audit trail',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-80 active:scale-[0.98]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Start free trial
                </Link>
                <p className="mt-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>14 days free · No credit card</p>
              </div>
            </div>
          </FadeUp>

          {/* Contractor plan */}
          <FadeUp delay={75} className="flex">
            <div className="flex w-full flex-col overflow-hidden rounded-3xl" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex flex-1 flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Contractor</span>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>5 properties</span>
                </div>
                <div className="mb-2 flex items-end gap-1.5">
                  <span className="mb-1 text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>R</span>
                  <span className="text-5xl font-black leading-none text-white">2,999</span>
                  <span className="mb-1 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>Builders & contractors running multiple sites.</p>
                <div className="mb-6 h-px w-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    'Up to 5 properties',
                    'Unlimited contractors',
                    'Photo before & after logging',
                    'Live dashboard & reports',
                    'Full audit trail',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-80 active:scale-[0.98]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Start free trial
                </Link>
                <p className="mt-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>14 days free · No credit card</p>
              </div>
            </div>
          </FadeUp>

          {/* Portfolio plan — highlighted */}
          <FadeUp delay={150} className="flex">
            <div className="flex w-full flex-col overflow-hidden rounded-3xl" style={{ background: '#0A1628', border: '1px solid rgba(26,86,219,0.45)', boxShadow: '0 0 0 1px rgba(26,86,219,0.15), 0 8px 64px rgba(26,86,219,0.2)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #1A56DB, #6366F1)' }} />
              <div className="flex flex-1 flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Portfolio</span>
                  <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: 'rgba(26,86,219,0.3)', color: '#93B4FF', border: '1px solid rgba(26,86,219,0.4)' }}>Most popular</span>
                </div>
                <div className="mb-2 flex items-end gap-1.5">
                  <span className="mb-1 text-lg font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>R</span>
                  <span className="text-5xl font-black leading-none text-white">8,999</span>
                  <span className="mb-1 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>Property managers & hotel groups with large portfolios.</p>
                <div className="mb-6 h-px w-full" style={{ background: 'rgba(26,86,219,0.3)' }} />
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    'Up to 20 properties',
                    'Unlimited contractors',
                    'Photo before & after logging',
                    'Live dashboard & reports',
                    'Full audit trail',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #1A56DB, #6366F1)', boxShadow: '0 4px 24px rgba(26,86,219,0.45)' }}>
                  Start free trial
                </Link>
                <p className="mt-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>14 days free · No credit card</p>
              </div>
            </div>
          </FadeUp>

          {/* Enterprise plan */}
          <FadeUp delay={225} className="flex">
            <div className="flex w-full flex-col overflow-hidden rounded-3xl" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
              <div className="flex flex-1 flex-col p-7">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Enterprise</span>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}>20+ properties</span>
                </div>
                <div className="mb-2">
                  <span className="text-5xl font-black leading-none text-white">Custom</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>Large groups, chains & developers. Tailored to your scale.</p>
                <div className="mb-6 h-px w-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    'Unlimited properties',
                    'Unlimited contractors',
                    'Photo before & after logging',
                    'Live dashboard & reports',
                    'Full audit trail',
                    'Dedicated account manager',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowEnterpriseModal(true)} className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-80 active:scale-[0.98]" style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.4)' }}>
                  Contact us
                </button>
                <p className="mt-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Custom pricing · Volume discounts</p>
              </div>
            </div>
          </FadeUp>

        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-6 py-28 text-center animate-gradient" style={{ background: 'linear-gradient(135deg, #050E1F, #1A56DB, #8B5CF6, #0EA5E9)' }}>
        {/* Background orbs */}
        <div className="animate-float-slow pointer-events-none absolute left-[5%] top-[10%] h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="animate-float-med pointer-events-none absolute right-[5%] bottom-[10%] h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #22C55E, transparent 70%)', filter: 'blur(40px)' }} />

        <FadeUp>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">Get started today</p>
          <h2 className="mb-6 text-4xl font-bold text-white sm:text-6xl">
            Your property.<br />Under control.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-white/60">
            Join builders, hotel managers, property managers and body corporates who log, assign, and close maintenance faster.
          </p>
          <Link href="/register" className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold transition-all hover:scale-105 active:scale-95" style={{ color: '#1A56DB', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            Start 14-day free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:flex-row sm:justify-between" style={{ background: '#050E1F', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="6.5" stroke="white" strokeWidth="1.5" opacity="0.9"/>
              <circle cx="12" cy="12" r="2" fill="white"/>
              <line x1="12" y1="3" x2="12" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="3" y1="12" x2="7" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="17" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/70">Snag<span style={{ color: '#22C55E' }}>IT</span></span>
        </div>
        <p className="text-xs text-white/30">POPIA compliant · Data stored securely · Built in South Africa</p>
        <Link href={isLoggedIn ? '/dashboard' : '/login'} className="text-sm font-medium text-white/50 hover:text-white transition-colors">{isLoggedIn ? 'Dashboard →' : 'Sign in →'}</Link>
      </footer>

      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}
    </div>
  )
}
