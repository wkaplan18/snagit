'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, AlertCircle, Users, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',     label: 'Projects',  icon: FolderOpen },
  { href: '/snags',        label: 'Snags',     icon: AlertCircle },
  { href: '/contractors',  label: 'Team',      icon: Users },
  { href: '/settings',     label: 'Settings',  icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sf-bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sf-nav-item ${active ? 'active' : ''}`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
