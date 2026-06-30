'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check } from 'lucide-react'
import type { OrgSummary } from '@/lib/activeOrg'

interface Props {
  orgs: OrgSummary[]
  activeOrgId: string
}

export default function OrgSwitcher({ orgs, activeOrgId }: Props) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const router = useRouter()

  const active = orgs.find(o => o.org_id === activeOrgId)

  async function switchOrg(orgId: string) {
    if (orgId === activeOrgId) { setOpen(false); return }
    setSwitching(true)
    await fetch('/api/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    router.refresh()
    setOpen(false)
    setSwitching(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={switching}
        className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
      >
        <Building2 className="h-4 w-4 text-[#1A56DB] flex-shrink-0" />
        <span className="max-w-[140px] truncate">{active?.org?.name ?? 'Select workspace'}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Your workspaces</p>
            {orgs.map(o => (
              <button
                key={o.org_id}
                onClick={() => switchOrg(o.org_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF]">
                  <Building2 className="h-4 w-4 text-[#1A56DB]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{o.org?.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-slate-400 capitalize">{o.org?.org_type?.replace('_', ' ') ?? ''}</p>
                </div>
                {o.org_id === activeOrgId && <Check className="h-4 w-4 text-[#1A56DB] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
