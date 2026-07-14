'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, AlertCircle, Users, FileText, Package, ClipboardList } from 'lucide-react'
import type { DashboardTerms, OrgType } from '@/types'

export default function BottomNav({ terms, fixedCount = 0, orgType = 'builder' }: { terms: DashboardTerms; fixedCount?: number; orgType?: OrgType }) {
  const pathname = usePathname()

  const NAV_ITEMS = [
    { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, badge: 0 },
    { href: '/projects',    label: terms.projects, icon: FolderOpen,      badge: 0 },
    { href: '/snags',       label: terms.issues,   icon: AlertCircle,     badge: fixedCount },
    { href: '/contractors', label: 'Team',         icon: Users,           badge: 0 },
    orgType === 'builder'
      ? { href: '/materials', label: 'Materials', icon: Package, badge: 0 }
      : orgType === 'property_manager' || orgType === 'body_corporate'
      ? { href: '/inspections', label: terms.inspections, icon: ClipboardList, badge: 0 }
      : { href: '/reports', label: 'Reports', icon: FileText, badge: 0 },
  ]

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
            <div className="relative">
              <Icon className="h-6 w-6" />
              {item.badge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
