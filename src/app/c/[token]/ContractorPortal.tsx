'use client'

import { useState, useRef } from 'react'
import { Camera, CheckCircle, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'

// ─── Photo lightbox ───────────────────────────────────────────────────────────
function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* X button — always above the image */}
      <button
        onClick={onClose}
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20 hover:bg-white/25 active:scale-95 transition-[transform,background-color]"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt=""
        onClick={e => e.stopPropagation()}
        className="rounded-xl object-contain"
        style={{ maxHeight: '88vh', maxWidth: '95vw' }}
      />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  due_date: string | null
  created_at: string
  attachments: Array<{ id: string; public_url: string; is_resolution: boolean }>
  unit: { name: string } | null
  room: { name: string } | null
  project: { name: string; address: string | null; city: string | null } | null
}

interface SnagCardProps {
  snag: ContractorSnag
  isExpanded: boolean
  isResolving: boolean
  isUploading: boolean
  resolveNote: string
  resolvePhotoPreview: string | null
  photoPickerRef: React.RefObject<HTMLInputElement | null>
  onToggleExpand: () => void
  onOpenResolvePanel: () => void
  onCancelResolve: () => void
  onSubmitResolve: () => void
  onNoteChange: (v: string) => void
  onRemovePhoto: () => void
  onPickerClick: () => void
  onViewPhoto: (url: string) => void
}

function SnagCard({
  snag, isExpanded, isResolving, isUploading,
  resolveNote, resolvePhotoPreview, photoPickerRef,
  onToggleExpand, onOpenResolvePanel, onCancelResolve, onSubmitResolve,
  onNoteChange, onRemovePhoto, onPickerClick, onViewPhoto,
}: SnagCardProps) {
  const isRejected = snag.status === 'rejected'
  const isDone = snag.status === 'approved' || snag.status === 'closed'
  const isFixed = snag.status === 'fixed'
  const canResolve = snag.status === 'assigned' || snag.status === 'in_progress' || isRejected
  const problemPhoto = snag.attachments.find(a => !a.is_resolution)
  const fixPhoto = snag.attachments.find(a => a.is_resolution)

  return (
    <div className="sf-card overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#1A56DB]" />
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
          {isDone
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : isFixed
              ? <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">In Review</span>
              : isRejected
                ? <span className="rounded-full bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wide">Rejected</span>
                : <Clock className="h-4 w-4 text-slate-300" />}
          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 space-y-3">

          {problemPhoto && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Problem</p>
              <button
                onClick={() => onViewPhoto(problemPhoto.public_url)}
                className="block h-48 w-full overflow-hidden rounded-xl active:scale-[0.98] transition-transform"
              >
                <img src={problemPhoto.public_url} alt="Problem" className="h-full w-full object-cover" />
              </button>
            </div>
          )}

          {fixPhoto && (isFixed || isDone) && (
            <div>
              <p className="mb-1 text-xs font-medium text-teal-600 uppercase tracking-wide">Fix photo</p>
              <button
                onClick={() => onViewPhoto(fixPhoto.public_url)}
                className="block h-48 w-full overflow-hidden rounded-xl border-2 border-teal-200 active:scale-[0.98] transition-transform"
              >
                <img src={fixPhoto.public_url} alt="Fix" className="h-full w-full object-cover" />
              </button>
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
              <p className="text-xs text-rose-600 mt-0.5">The manager has rejected your fix. Please redo the work and resubmit.</p>
            </div>
          )}

          {isFixed && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-700">Submitted — waiting for manager approval</p>
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-700">Approved — all done</p>
            </div>
          )}

          {canResolve && !isResolving && (
            <button
              onClick={onOpenResolvePanel}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              {isRejected ? 'Resubmit as completed' : 'Mark as completed'}
            </button>
          )}

          {canResolve && isResolving && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div>
                {resolvePhotoPreview ? (
                  <div className="relative h-36 overflow-hidden rounded-xl">
                    <img src={resolvePhotoPreview} alt="Fix" className="h-full w-full object-cover" />
                    <button
                      onClick={onRemovePhoto}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onPickerClick}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-3 text-sm text-slate-500 hover:border-slate-400"
                  >
                    <Camera className="h-4 w-4" /> Add photo (optional)
                  </button>
                )}
              </div>

              <textarea
                value={resolveNote}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={3}
                className="sf-input resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={onSubmitResolve}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {isUploading ? 'Submitting…' : 'Submit'}
                </button>
                <button
                  onClick={onCancelResolve}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  contractor: { id: string; name: string; company: string | null; trade: string | null; org_id: string }
  snags: ContractorSnag[]
  token: string
}

export default function ContractorPortal({ contractor, snags, token }: Props) {
  const [localSnags, setLocalSnags] = useState(snags)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolvePhoto, setResolvePhoto] = useState<File | null>(null)
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'todo' | 'completed'>('todo')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const photoPickerRef = useRef<HTMLInputElement | null>(null)

  const openSnags = localSnags.filter(s => ['assigned', 'in_progress', 'rejected'].includes(s.status))
  const awaitingSnags = localSnags.filter(s => s.status === 'fixed')
  const todoSnags = [...openSnags, ...awaitingSnags]
  const completedSnags = localSnags.filter(s => ['approved', 'closed'].includes(s.status))

  function openResolvePanel(snagId: string) {
    setResolvingId(snagId)
    setResolveNote('')
    setResolvePhoto(null)
    setResolvePhotoPreview(null)
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setResolvePhoto(compressed)
    setResolvePhotoPreview(URL.createObjectURL(compressed))
  }

  async function handleSubmitResolve(snagId: string) {
    setUploading(snagId)
    try {
      const formData = new FormData()
      formData.append('snagId', snagId)
      formData.append('contractorToken', token)
      if (resolvePhoto) formData.append('resolutionPhoto', resolvePhoto)
      if (resolveNote.trim()) formData.append('resolutionNote', resolveNote.trim())
      const res = await fetch('/api/contractor/resolve', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed')
      }

      // Read real statuses back from DB immediately — don't rely on page refresh
      const statusRes = await fetch(`/api/contractor/status?token=${encodeURIComponent(token)}`)
      if (statusRes.ok) {
        const updates: Array<{ id: string; status: string }> = await statusRes.json()
        setLocalSnags(prev => prev.map(s => {
          const u = updates.find(x => x.id === s.id)
          return u ? { ...s, status: u.status } : s
        }))
      } else {
        // Fallback: optimistically set to fixed
        setLocalSnags(prev => prev.map(s => s.id === snagId ? { ...s, status: 'fixed' } : s))
      }
      setResolvingId(null)
    } catch (err) {
      alert(`Failed to submit: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(null)
    }
  }

  const allProjects = [...new Set(localSnags.map(s => s.project?.name ?? 'Project'))]
  const activeSnags = completedSnags
    .filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter)
  const grouped = groupByProject(activeSnags)

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {viewingPhoto && <PhotoViewer url={viewingPhoto} onClose={() => setViewingPhoto(null)} />}

      <div className="bg-[#1A56DB] px-4 pt-safe pb-4">
        <div className="mx-auto max-w-lg pt-4">
          {/* Logo + refresh row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              {/* Icon */}
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="7" fill="white" fillOpacity="0.25"/>
                  <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
                  <circle cx="16" cy="16" r="2.5" fill="white"/>
                  <line x1="16" y1="4" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4" y1="16" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Wordmark */}
              <div>
                <p className="text-xl font-extrabold leading-none tracking-tight text-white">
                  Snag<span style={{ color: '#22C55E' }}>IT</span>
                </p>
                <p className="text-[10px] text-blue-200 font-medium tracking-wide mt-0.5">Log it. Assign it. Fixed.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/25 active:scale-95 transition-[transform,background-color]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* Contractor greeting */}
          <div className="flex items-center gap-2.5 mt-4 mb-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-base flex-shrink-0">
              {contractor.name.charAt(0)}
            </div>
            <div>
              <p className="text-blue-200 text-xs font-medium">Hi, {contractor.name} 👋</p>
              <p className="text-white font-semibold text-sm">Your assigned jobs</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('todo')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                activeTab === 'todo' ? 'bg-white text-[#1A56DB]' : 'bg-white/15 text-white hover:bg-white/25'
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
                activeTab === 'completed' ? 'bg-white text-[#1A56DB]' : 'bg-white/15 text-white hover:bg-white/25'
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

        {activeTab === 'todo' ? (
          <>
            {/* Open work section */}
            {openSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter).length === 0 && awaitingSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter).length === 0 && (
              <div className="sf-card p-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="font-semibold text-slate-900">Nothing left to do!</p>
                <p className="text-sm text-slate-500 mt-1">Check the Completed tab to see your approved fixes.</p>
              </div>
            )}

            {openSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter).length > 0 && (
              <div className="space-y-5 mb-5">
                {[...groupByProject(openSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter)).entries()].map(([project, items]) => (
                  <div key={project}>
                    <p className="mb-2 text-sm font-semibold text-slate-700">📋 {project}</p>
                    <div className="space-y-2">
                      {items.map(snag => (
                        <SnagCard
                          key={snag.id}
                          snag={snag}
                          isExpanded={expandedId === snag.id}
                          isResolving={resolvingId === snag.id}
                          isUploading={uploading === snag.id}
                          resolveNote={resolveNote}
                          resolvePhotoPreview={resolvePhotoPreview}
                          photoPickerRef={photoPickerRef}
                          onToggleExpand={() => setExpandedId(expandedId === snag.id ? null : snag.id)}
                          onOpenResolvePanel={() => openResolvePanel(snag.id)}
                          onCancelResolve={() => setResolvingId(null)}
                          onSubmitResolve={() => handleSubmitResolve(snag.id)}
                          onNoteChange={setResolveNote}
                          onRemovePhoto={() => { setResolvePhoto(null); setResolvePhotoPreview(null) }}
                          onPickerClick={() => photoPickerRef.current?.click()}
                          onViewPhoto={setViewingPhoto}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Awaiting approval section */}
            {awaitingSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-amber-200" />
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-600">Submitted — awaiting approval</span>
                  <div className="h-px flex-1 bg-amber-200" />
                </div>
                <div className="space-y-2">
                  {awaitingSnags.filter(s => projectFilter === 'all' || (s.project?.name ?? 'Project') === projectFilter).map(snag => (
                    <SnagCard
                      key={snag.id}
                      snag={snag}
                      isExpanded={expandedId === snag.id}
                      isResolving={resolvingId === snag.id}
                      isUploading={uploading === snag.id}
                      resolveNote={resolveNote}
                      resolvePhotoPreview={resolvePhotoPreview}
                      photoPickerRef={photoPickerRef}
                      onToggleExpand={() => setExpandedId(expandedId === snag.id ? null : snag.id)}
                      onOpenResolvePanel={() => openResolvePanel(snag.id)}
                      onCancelResolve={() => setResolvingId(null)}
                      onSubmitResolve={() => handleSubmitResolve(snag.id)}
                      onNoteChange={setResolveNote}
                      onRemovePhoto={() => { setResolvePhoto(null); setResolvePhotoPreview(null) }}
                      onPickerClick={() => photoPickerRef.current?.click()}
                      onViewPhoto={setViewingPhoto}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {activeSnags.length === 0 && (
              <div className="sf-card p-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="font-semibold text-slate-900">No completed snags yet</p>
                <p className="text-sm text-slate-500 mt-1">Fixes will appear here once the manager approves them.</p>
              </div>
            )}
            <div className="space-y-5">
              {[...grouped.entries()].map(([project, items]) => (
                <div key={project}>
                  <p className="mb-2 text-sm font-semibold text-slate-700">📋 {project}</p>
                  <div className="space-y-2">
                    {items.map(snag => (
                      <SnagCard
                        key={snag.id}
                        snag={snag}
                        isExpanded={expandedId === snag.id}
                        isResolving={resolvingId === snag.id}
                        isUploading={uploading === snag.id}
                        resolveNote={resolveNote}
                        resolvePhotoPreview={resolvePhotoPreview}
                        photoPickerRef={photoPickerRef}
                        onToggleExpand={() => setExpandedId(expandedId === snag.id ? null : snag.id)}
                        onOpenResolvePanel={() => openResolvePanel(snag.id)}
                        onCancelResolve={() => setResolvingId(null)}
                        onSubmitResolve={() => handleSubmitResolve(snag.id)}
                        onNoteChange={setResolveNote}
                        onRemovePhoto={() => { setResolvePhoto(null); setResolvePhotoPreview(null) }}
                        onPickerClick={() => photoPickerRef.current?.click()}
                        onViewPhoto={setViewingPhoto}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <input
        ref={photoPickerRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelect}
      />
    </div>
  )
}
