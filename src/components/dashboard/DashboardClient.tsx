'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock, FolderOpen, Plus, ClipboardCheck, Settings } from 'lucide-react'
import type { ProjectStats } from '@/types'

interface Props {
  orgName: string
  projects: Array<{ id: string; name: string; status: string; image_url: string | null; city: string | null }>
  projectStats: Array<ProjectStats & { project_name: string; project_id: string }>
  recentSnags: Array<{
    id: string; snag_number: number; title: string; status: string; priority: string; created_at: string
    project?: { name: string } | null
    unit?: { name: string } | null
    room?: { name: string } | null
    contractor?: { name: string } | null
  }>
  needsReview: number
}

const DONUT_COLORS = ['#DC2626', '#EA580C', '#1A56DB', '#16A34A', '#64748B']

export default function DashboardClient({ orgName, projects, projectStats, recentSnags, needsReview }: Props) {
  const totals = projectStats.reduce(
    (acc, p) => ({
      total: acc.total + (p.total_snags ?? 0),
      open: acc.open + (p.open_snags ?? 0),
      critical: acc.critical + (p.critical_snags ?? 0),
      resolved: acc.resolved + (p.resolved_snags ?? 0),
    }),
    { total: 0, open: 0, critical: 0, resolved: 0 }
  )

  const completionPct = totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0

  const donutData = [
    { name: 'Open', value: totals.open },
    { name: 'In Progress', value: totals.total - totals.open - totals.resolved },
    { name: 'Resolved', value: totals.resolved },
  ].filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-sf-base pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-safe pb-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between pt-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{orgName}</h1>
              <p className="text-xs text-slate-500">Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
                <Settings className="h-4 w-4" />
              </Link>
              <Link href="/projects/new" className="sf-btn-primary py-2.5 px-4 text-sm">
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4 space-y-5">
        {/* Needs Review alert */}
        {needsReview > 0 && (
          <Link
            href="/snags?tab=fixed"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition-colors hover:bg-amber-100"
          >
            <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {needsReview} snag{needsReview === 1 ? '' : 's'} need{needsReview === 1 ? 's' : ''} your sign-off
              </p>
              <p className="text-xs text-amber-700">Contractors have marked these as fixed — tap to review</p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">{needsReview}</span>
          </Link>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="sf-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Snags</p>
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Critical</p>
                <p className="mt-1 text-3xl font-bold text-orange-600">{totals.critical}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-200 mt-0.5" />
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
        </div>

        {/* Projects */}
        <div className="sf-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Active Projects</h2>
            <Link href="/projects" className="text-xs font-medium text-[#1A56DB]">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No active projects. <Link href="/projects/new" className="text-[#1A56DB]">Create one →</Link>
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
                    <p className="text-xs text-red-500">{stat?.open_snags ?? 0} open</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Status chart */}
        {donutData.length > 0 && (
          <div className="sf-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Status Breakdown</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={donutData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                    <span className="ml-auto text-xs font-semibold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Project completion bar chart */}
        {projectStats.length > 0 && (
          <div className="sf-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Completion by Project</h2>
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

        {/* Recent snags */}
        <div className="sf-card overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent Snags</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSnags.map(snag => (
              <Link key={snag.id} href={`/snags/${snag.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                  snag.priority === 'critical' ? 'bg-red-500' :
                  snag.priority === 'high' ? 'bg-orange-500' :
                  snag.priority === 'medium' ? 'bg-yellow-500' : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">#{snag.snag_number} {snag.title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {snag.project?.name} · {snag.unit?.name}
                    {snag.room ? ` · ${snag.room.name}` : ''}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  snag.status === 'open' ? 'bg-red-50 text-red-700' :
                  snag.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {snag.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
