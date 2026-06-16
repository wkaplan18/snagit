'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  HardHat, BedDouble, Home, Building, Users, Warehouse,
  Key, UtensilsCrossed, GraduationCap, ShoppingBag,
  Camera, Zap, CheckCircle, Bell, BarChart3, Smartphone,
  ArrowRight, ChevronRight,
} from 'lucide-react'

const USER_TYPES = [
  { icon: HardHat,         label: 'Builder',           color: '#F97316', bg: '#FFF7ED' },
  { icon: BedDouble,       label: 'Hotel Manager',      color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: Home,            label: 'Home Owner',         color: '#0EA5E9', bg: '#F0F9FF' },
  { icon: Building,        label: 'Property Manager',   color: '#10B981', bg: '#ECFDF5' },
  { icon: Users,           label: 'Body Corporate',     color: '#F43F5E', bg: '#FFF1F2' },
  { icon: Warehouse,       label: 'Facilities Manager', color: '#1A56DB', bg: '#EEF4FF' },
  { icon: Key,             label: 'Short-term Rental',  color: '#D97706', bg: '#FFFBEB' },
  { icon: UtensilsCrossed, label: 'Restaurant / F&B',   color: '#EF4444', bg: '#FEF2F2' },
  { icon: GraduationCap,   label: 'School / Campus',    color: '#6366F1', bg: '#EEF2FF' },
  { icon: ShoppingBag,     label: 'Retail Chain',       color: '#14B8A6', bg: '#F0FDFA' },
]

const STEPS = [
  {
    num: '01',
    title: 'Spot it',
    desc: 'Walk the property, snap a photo, log the issue in seconds. AI suggests the category and priority automatically.',
    color: '#0EA5E9',
    icon: Camera,
  },
  {
    num: '02',
    title: 'Assign it',
    desc: 'Send it to an internal team member or an external contractor with one tap. They get a WhatsApp link — no app needed.',
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
  { icon: Camera,      title: 'Photo logging',       desc: 'Snap, annotate, and log defects with before/after photos in under 30 seconds.', color: '#F97316' },
  { icon: Zap,         title: 'AI triage',           desc: 'Automatic category and severity suggestions from every photo you upload.',       color: '#8B5CF6' },
  { icon: Bell,        title: 'WhatsApp alerts',     desc: 'Contractors get notified via WhatsApp — no app install, no friction.',           color: '#10B981' },
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

export default function LandingPage() {
  const doubled = [...USER_TYPES, ...USER_TYPES]

  return (
    <div className="font-display overflow-x-hidden bg-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: 'rgba(5,14,31,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M4 5h16v3H4zM3 10h18v3H3zM7 15h10v3H7z" fill="white" opacity=".9"/>
              <circle cx="18" cy="17" r="4" fill="#22C55E"/>
              <path d="M16.3 17l1.3 1.3 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-white">snagnmaintain</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-white/70 hover:text-white transition-colors sm:block">Sign in</Link>
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: '#1A56DB', boxShadow: '0 0 20px rgba(26,86,219,0.4)' }}>
            Get started free
          </Link>
        </div>
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
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>10+ property types supported</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up mb-6 max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ opacity: 0, animationDelay: '200ms' }}>
          Property maintenance,{' '}
          <span className="text-gradient-vivid">finally sorted.</span>
        </h1>

        <p className="animate-fade-up mb-10 max-w-xl text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', opacity: 0, animationDelay: '350ms' }}>
          Spot it. Assign it. Fixed. One platform for builders, hotel managers, homeowners, and every property type in between.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3" style={{ opacity: 0, animationDelay: '500ms' }}>
          <Link href="/login" className="group flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #1A56DB, #6366F1)', boxShadow: '0 4px 30px rgba(26,86,219,0.5)' }}>
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
            { val: '10+', label: 'Property types' },
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
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Built for every property type</p>
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
      <section className="px-6 py-24" style={{ background: '#F8FAFC' }}>
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
            Join builders, hotel managers, homeowners and facilities teams who log, assign, and close maintenance faster.
          </p>
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold transition-all hover:scale-105 active:scale-95" style={{ color: '#1A56DB', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            Start free — no credit card
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:flex-row sm:justify-between" style={{ background: '#050E1F', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M4 5h16v3H4zM3 10h18v3H3zM7 15h10v3H7z" fill="white" opacity=".9"/>
              <circle cx="18" cy="17" r="4" fill="#22C55E"/>
              <path d="M16.3 17l1.3 1.3 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/70">snagnmaintain</span>
        </div>
        <p className="text-xs text-white/30">POPIA compliant · Data stored securely · Built in South Africa</p>
        <Link href="/login" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Sign in →</Link>
      </footer>
    </div>
  )
}
