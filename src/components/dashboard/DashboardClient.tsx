'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { CheckCircle, Clock, FolderOpen, Plus, ClipboardCheck, Settings, XCircle } from 'lucide-react'
import type { ProjectStats, DashboardTerms } from '@/types'

interface Props {
  orgName: string
  terms: DashboardTerms
  projects: Array<{ id: string; name: string; status: string; image_url: string | null; city: string | null }>
  projectStats: Array<ProjectStats & { project_name: string; project_id: string }>
  needsReview: number
  totalRejected: number
}


export default function DashboardClient({ orgName, terms, projects, projectStats, needsReview, totalRejected }: Props) {
  const totals = projectStats.reduce(
    (acc, p) => ({
      total: acc.total + (p.total_snags ?? 0),
      open: acc.open + (p.open_snags ?? 0),
      resolved: acc.resolved + (p.resolved_snags ?? 0),
    }),
    { total: 0, open: 0, resolved: 0 }
  )

  const completionPct = totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0

  return (
    <div className="min-h-screen bg-sf-base pb-28">
      {/* Header */}
      <div className="pt-safe" style={{ background: 'linear-gradient(150deg, #1E63EB 0%, #1340B2 100%)' }}>
        <div className="mx-auto max-w-2xl px-4 pb-5 pt-4">
          <div className="flex items-center justify-between">
            {/* Logo + org */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5">
                  <circle cx="16" cy="16" r="8.5" stroke="white" strokeWidth="2.5"/>
                  <circle cx="16" cy="16" r="2.5" fill="white"/>
                  <line x1="16" y1="4" x2="16" y2="9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="4" y1="16" x2="9" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
                  Snag<span style={{ color: '#4ADE80' }}>IT</span>
                </p>
                <h1 className="text-base font-bold leading-tight text-white">{orgName}</h1>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white transition-colors hover:bg-white/25">
                <Settings className="h-4 w-4" />
              </Link>
              <Link href="/projects/new" className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#1340B2] transition-colors hover:bg-white/90">
                <Plus className="h-3.5 w-3.5" />
                New {terms.project}
              </Link>
            </div>
          </div>
        </div>
        {/* Rounded bottom edge into content */}
        <div className="h-5 rounded-t-[20px] bg-sf-base" />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4 space-y-5">

        {/* Get started — shown only when no projects exist yet */}
        {projects.length === 0 && (
          <div className="rounded-2xl border border-[#1A56DB]/20 bg-[#EEF4FF] p-5">
            <p className="text-base font-bold text-slate-900">Welcome — let's get you set up 👋</p>
            <p className="mt-1 text-sm text-slate-500">Three steps to get your first job sent to a service provider.</p>
            <div className="mt-4 space-y-3">
              {[
                { n: 1, label: `Add your ${terms.project.toLowerCase()}`, sub: `Give it a name and address`, href: '/projects/new', done: false },
                { n: 2, label: `Log your first ${terms.issue.toLowerCase()}`, sub: 'Take a photo and describe the problem', href: null, done: false },
                { n: 3, label: 'Send it to your service provider', sub: 'They get a WhatsApp link to view and update it', href: null, done: false },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white">
                    {step.n}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="text-xs text-slate-500">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/projects/new"
              className="sf-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3"
            >
              <Plus className="h-4 w-4" /> Add your first {terms.project.toLowerCase()}
            </Link>
          </div>
        )}

        {/* Needs Review alert */}
        {needsReview > 0 && (
          <Link
            href="/snags?tab=fixed"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition-colors hover:bg-amber-100"
          >
            <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {needsReview} {needsReview === 1 ? terms.issue.toLowerCase() : terms.issues.toLowerCase()} need{needsReview === 1 ? 's' : ''} your sign-off
              </p>
              <p className="text-xs text-amber-700">{terms.contractor}s have marked these as fixed — tap to review</p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">{needsReview}</span>
          </Link>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="sf-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total {terms.issues}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{totals.total}</p>
              </div>
              <FolderOpen className="h-5 w-5 text-slate-300 mt-0.5" />
            </div>
          </div>

          <div className="sf-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Open</p>
                <p className="mt-1 text-3xl font-bold text-red-600">{totals.open}</p>
              </div>
              <Clock className="h-5 w-5 text-red-200 mt-0.5" />
            </div>
          </div>

          <div className="sf-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Complete</p>
                <p className="mt-1 text-3xl font-bold text-green-600">{completionPct}%</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-200 mt-0.5" />
            </div>
          </div>

          <Link href="/snags?tab=rejected" className="sf-card p-4 transition-colors hover:bg-slate-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rejected</p>
                <p className={`mt-1 text-3xl font-bold ${totalRejected > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{totalRejected}</p>
              </div>
              <XCircle className={`h-5 w-5 mt-0.5 ${totalRejected > 0 ? 'text-amber-300' : 'text-slate-200'}`} />
            </div>
          </Link>
        </div>

        {/* Projects */}
        <div className="sf-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Active {terms.projects}</h2>
            <Link href="/projects" className="text-xs font-medium text-[#1A56DB]">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No active {terms.projects.toLowerCase()}. <Link href="/projects/new" className="text-[#1A56DB]">Create one →</Link>
              </div>
            )}
            {projects.map(p => {
              const stat = projectStats.find(s => s.project_id === p.id)
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-100 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.city ?? 'South Africa'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">{stat?.completion_pct ?? 0}%</p>
                    <p className="text-xs text-red-500">{stat?.open_snags ?? 0} open {terms.issues.toLowerCase()}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Project completion bar chart */}
        {projectStats.length > 0 && (
          <div className="sf-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Completion by {terms.project}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={projectStats} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="project_name" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v) => [`${v}%`, 'Complete']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="completion_pct" fill="#1A56DB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  )
}
