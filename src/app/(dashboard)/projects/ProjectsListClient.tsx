'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'

interface ProjectListItem {
  id: string
  name: string
  address: string | null
  city: string | null
  status: string
}

export default function ProjectsListClient({ projects, countsByProject }: {
  projects: ProjectListItem[]
  countsByProject: Record<string, { active: number; review: number; approved: number }>
}) {
  const [search, setSearch] = useState('')
  const showSearch = projects.length > 20
  const q = search.trim().toLowerCase()
  const filtered = q
    ? projects.filter(p => [p.name, p.address, p.city].filter(Boolean).join(' ').toLowerCase().includes(q))
    : projects

  return (
    <>
      {showSearch && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or address…"
            className="sf-input pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No matches for &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const c = countsByProject[p.id] ?? { active: 0, review: 0, approved: 0 }
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="sf-card block p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{p.name}</p>
                    {(p.address || p.city) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {[p.address, p.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="sf-badge bg-slate-50 border-slate-200 text-slate-600 capitalize">{p.status}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-xs">
                  <span className={c.active > 0 ? 'font-medium text-red-600' : 'text-slate-400'}>{c.active} active</span>
                  <span className="text-slate-200">·</span>
                  <span className={c.review > 0 ? 'font-medium text-orange-500' : 'text-slate-400'}>{c.review} review</span>
                  <span className="text-slate-200">·</span>
                  <span className={c.approved > 0 ? 'font-medium text-green-600' : 'text-slate-400'}>{c.approved} approved</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
