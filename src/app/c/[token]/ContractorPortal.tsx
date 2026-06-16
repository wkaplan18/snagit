'use client'

import { useState, useRef } from 'react'
import { Camera, CheckCircle, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { PRIORITY_CONFIG } from '@/types'

function buildWhatsAppUrl(managerWhatsapp: string | null, message: string) {
  if (managerWhatsapp) {
    const digits = managerWhatsapp.replace(/\D/g, '')
    const e164 = digits.startsWith('0') ? '27' + digits.slice(1) : digits
    return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

function buildWhatsAppMessage(contractorName: string, snags: ContractorSnag[]) {
  const fixed = snags.filter(s => s.status === 'fixed')
  if (!fixed.length) return null
  const byProject = new Map<string, typeof fixed>()
  for (const s of fixed) {
    const key = s.project?.name ?? 'Project'
    byProject.set(key, [...(byProject.get(key) ?? []), s])
  }
  const lines = [`Hi, this is ${contractorName}. I've completed the following snag fixes and they're ready for your review:\n`]
  for (const [project, items] of byProject) {
    lines.push(`📋 ${project}`)
    for (const s of items) {
      const loc = [s.unit?.name, s.room?.name].filter(Boolean).join(' › ')
      lines.push(`  ✅ #${s.snag_number} ${s.title}${loc ? ` (${loc})` : ''}`)
    }
    lines.push('')
  }
  lines.push('Please review and approve when you get a chance. Thanks.')
  return lines.join('\n')
}

function groupByProject(snags: ContractorSnag[]) {
  const map = new Map<string, ContractorSnag[]>()
  for (const s of snags) {
    const key = s.project?.name ?? 'Project'
    map.set(key, [...(map.get(key) ?? []), s])
  }
  return map
}

interface ContractorSnag {
  id: string
  snag_number: number
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  created_at: string
  attachments: Array<{ id: string; public_url: string; is_resolution: boolean }>
  unit: { name: string } | null
  room: { name: string } | null
  project: { name: string; address: string | null; city: string | null } | null
}

interface Props {
  contractor: { id: string; name: string; company: string | null; trade: string | null; org_id: string }
  snags: ContractorSnag[]
  token: string
  managerWhatsapp: string | null
}

export default function ContractorPortal({ contractor, snags, token, managerWhatsapp }: Props) {
  const [localSnags, setLocalSnags] = useState(snags)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'todo' | 'completed'>('todo')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const todoSnags = localSnags.filter(s => ['assigned', 'in_progress', 'rejected'].includes(s.status))
  const completedSnags = localSnags.filter(s => ['fixed', 'approved', 'closed'].includes(s.status))
  const waMessage = buildWhatsAppMessage(contractor.name, localSnags)

  const handlePhotoAndFix = async (snagId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(snagId)
    try {
      const formData = new FormData()
      formData.append('snagId', snagId)
      formData.append('contractorToken', token)
      formData.append('resolutionPhoto', file)
      const res = await fetch('/api/contractor/resolve', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Failed')
      setLocalSnags(prev => prev.map(s => s.id === snagId ? { ...s, status: 'fixed' } : s))
      // switch to completed tab so they see the result
      setActiveTab('completed')
    } catch {
      alert('Failed to update. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  function SnagCard({ snag }: { snag: ContractorSnag }) {
    const isExpanded = expandedId === snag.id
    const isRejected = snag.status === 'rejected'
    const isDone = snag.status === 'approved' || snag.status === 'closed'
    const isFixed = snag.status === 'fixed'
    const isUploading = uploading === snag.id
    const priority = PRIORITY_CONFIG[snag.priority as keyof typeof PRIORITY_CONFIG]
    const problemPhoto = snag.attachments.find(a => !a.is_resolution)
    const fixPhoto = snag.attachments.find(a => a.is_resolution)

    return (
      <div className="sf-card overflow-hidden">
        <button
          onClick={() => setExpandedId(isExpanded ? null : snag.id)}
          className="flex w-full items-start gap-3 p-4 text-left"
        >
          <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${priority?.dot ?? 'bg-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">#{snag.snag_number} {snag.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {snag.project?.name}
              {snag.unit?.name ? ` · ${snag.unit.name}` : ''}
              {snag.room?.name ? ` · ${snag.room.name}` : ''}
            </p>
            {snag.project?.address || snag.project?.city ? (
              <p className="text-xs text-slate-400 mt-0.5">
                {[snag.project.address, snag.project.city].filter(Boolean).join(', ')}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDone ? <CheckCircle className="h-4 w-4 text-green-500" />
              : isFixed ? <CheckCircle className="h-4 w-4 text-teal-500" />
              : isRejected ? <AlertTriangle className="h-4 w-4 text-rose-500" />
              : snag.priority === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-500" />
              : <Clock className="h-4 w-4 text-slate-300" />}
            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100 px-4 pb-4 space-y-3">

            {/* Problem photo */}
            {problemPhoto && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Problem</p>
                <div className="h-48 overflow-hidden rounded-xl">
                  <img src={problemPhoto.public_url} alt="Problem" className="h-full w-full object-cover" />
                </div>
              </div>
            )}

            {/* Fix photo — only shown on completed snags */}
            {fixPhoto && (isFixed || isDone) && (
              <div>
                <p className="mb-1 text-xs font-medium text-teal-600 uppercase tracking-wide">Fix photo</p>
                <div className="h-48 overflow-hidden rounded-xl border-2 border-teal-200">
                  <img src={fixPhoto.public_url} alt="Fix" className="h-full w-full object-cover" />
                </div>
              </div>
            )}

            {snag.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{snag.description}</p>
            )}

            {snag.due_date && (
              <p className="text-xs text-slate-400">Due: {new Date(snag.due_date).toLocaleDateString('en-ZA')}</p>
            )}

            {isRejected && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-rose-700">Fix not accepted</p>
                <p className="text-xs text-rose-600 mt-0.5">The manager has rejected your fix. Please redo the work and upload a new photo.</p>
              </div>
            )}

            {isFixed && (
              <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-3 py-2.5">
                <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <p className="text-sm font-medium text-teal-700">Marked as fixed — awaiting manager approval</p>
              </div>
            )}

            {isDone && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-green-700">Approved — all done</p>
              </div>
            )}

            {(snag.status === 'assigned' || snag.status === 'in_progress' || isRejected) && (
              <div className="pt-1">
                <button
                  onClick={() => fileRefs.current[snag.id]?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {isUploading ? 'Uploading…' : isRejected ? 'Upload photo & resubmit fix' : 'Upload photo & mark fixed'}
                </button>
                <p className="mt-1.5 text-center text-xs text-slate-400">A photo of the completed work is required</p>
                <input
                  ref={el => { fileRefs.current[snag.id] = el }}
                  type="file" accept="image/*" capture="environment"
                  className="hidden"
                  onChange={e => handlePhotoAndFix(snag.id, e)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const allProjects = [...new Set(localSnags.map(s => s.project?.name ?? 'Project'))]
  const activeSnags = (activeTab === 'todo' ? todoSnags : completedSnags)
    .filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter)
  const grouped = groupByProject(activeSnags)

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-[#1A56DB] px-4 pt-safe pb-4">
        <div className="mx-auto max-w-lg pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-lg">
              {contractor.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold">{contractor.name}</p>
              <p className="text-blue-200 text-sm">{contractor.company ?? contractor.trade ?? 'Contractor'}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('todo')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                activeTab === 'todo'
                  ? 'bg-white text-[#1A56DB]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              To Do
              {todoSnags.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeTab === 'todo' ? 'bg-[#1A56DB] text-white' : 'bg-white/30 text-white'
                }`}>
                  {todoSnags.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-white text-[#1A56DB]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Completed
              {completedSnags.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeTab === 'completed' ? 'bg-[#1A56DB] text-white' : 'bg-white/30 text-white'
                }`}>
                  {completedSnags.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pt-5 pb-12">
        {allProjects.length > 1 && (
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="sf-input mb-4"
          >
            <option value="all">All projects</option>
            {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}

        {activeSnags.length === 0 && (
          <div className="sf-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <p className="font-semibold text-slate-900">
              {activeTab === 'todo' ? 'Nothing to do — all done!' : 'No completed snags yet'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'todo' ? 'Check the Completed tab to see your fixes.' : 'Fix a snag and it will appear here.'}
            </p>
          </div>
        )}

        <div className="space-y-5">
          {[...grouped.entries()].map(([project, items]) => (
            <div key={project}>
              <p className="mb-2 text-sm font-semibold text-slate-700">📋 {project}</p>
              <div className="space-y-2">
                {items.map(snag => <SnagCard key={snag.id} snag={snag} />)}
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp button — completed tab only, when fixes awaiting approval */}
        {activeTab === 'completed' && waMessage && (
          <a
            href={buildWhatsAppUrl(managerWhatsapp, waMessage)}
            target="_blank"
            rel="noopener"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1EBE5B] transition-colors active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Send fixes to manager via WhatsApp
          </a>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 px-6">
        Powered by SnagandGo · kaplan.co.za/snagandgo
        <br />This link is private — do not share
      </p>
    </div>
  )
}
