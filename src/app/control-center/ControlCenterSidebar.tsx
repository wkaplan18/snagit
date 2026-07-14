'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, CreditCard, Users, ArrowLeft, Menu, X } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  accent: string
  activeBg: string
  badge?: number
  badgeTone?: 'neutral' | 'warning'
}

export default function ControlCenterSidebar({ needsAttentionCount, orgCount, peopleCount }: { needsAttentionCount: number; orgCount: number; peopleCount: number }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items: NavItem[] = [
    { href: '/control-center', label: 'Overview', icon: LayoutDashboard, accent: 'text-[#1A56DB]', activeBg: 'bg-[#EEF4FF]' },
    { href: '/control-center/organizations', label: 'Organizations', icon: Building2, accent: 'text-slate-700', activeBg: 'bg-slate-100', badge: orgCount, badgeTone: 'neutral' },
    { href: '/control-center/billing', label: 'Billing', icon: CreditCard, accent: 'text-emerald-600', activeBg: 'bg-emerald-50', badge: needsAttentionCount || undefined, badgeTone: 'warning' },
    { href: '/control-center/users', label: 'Users', icon: Users, accent: 'text-violet-600', activeBg: 'bg-violet-50', badge: peopleCount, badgeTone: 'neutral' },
  ]

  function isActive(href: string) {
    if (href === '/control-center') return pathname === '/control-center'
    return pathname.startsWith(href)
  }

  const NavLinks = (
    <nav className="space-y-1">
      {items.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? `${item.activeBg} ${item.accent}` : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${active ? item.accent : 'text-slate-400'}`} />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 ${
                item.badgeTone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-bold text-slate-800">Control Center</p>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 text-slate-500">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white h-full p-4 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Control Center</p>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            {NavLinks}
            <Link href="/dashboard" className="mt-auto flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </Link>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-slate-200 bg-white/60 px-3 py-5">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">Control Center</p>
            <p className="text-[11px] text-slate-400 mt-0.5">SnagIT admin</p>
          </div>
        </div>
        {NavLinks}
        <Link href="/dashboard" className="mt-auto flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to app
        </Link>
      </aside>
    </>
  )
}
