'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Camera, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import PhotoAnnotator from '@/components/snags/PhotoAnnotator'
import { createClient } from '@/lib/supabase/client'
import type { AISuggestion, Contractor, Room, SnagPriority } from '@/types'
import { DEFAULT_ROOMS } from '@/types'

interface Props {
  projectId: string
  unitId: string
  rooms: Room[]
  contractors: Contractor[]
  orgId?: string // enables inline "add contractor" without leaving the sheet
  onClose: () => void
  onSaved: () => void
}

const ADD_NEW = '__add_new__'
const BASE_CATEGORIES = ['paint', 'crack', 'tile', 'water', 'fitting', 'alignment', 'finishing', 'electrical', 'plumbing', 'structural', 'carpentry', 'glazing', 'hvac', 'other']

type Step = 'camera' | 'annotate' | 'ai_loading' | 'form'

export default function AddSnagSheet({ projectId, unitId, rooms, contractors, orgId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('camera')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields (pre-filled by AI)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [priority, setPriority] = useState<SnagPriority>('medium')
  const [roomId, setRoomId] = useState<string>('')
  const [contractorId, setContractorId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')

  // Inline "add new" without leaving the sheet
  const supabase = createClient()
  const [localRooms, setLocalRooms] = useState<Room[]>(rooms)
  const [localContractors, setLocalContractors] = useState<Contractor[]>(contractors)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingContractor, setAddingContractor] = useState(false)
  const [newContractorName, setNewContractorName] = useState('')
  const [newContractorTrade, setNewContractorTrade] = useState('')
  const [newContractorWhatsApp, setNewContractorWhatsApp] = useState('')
  const [inlineBusy, setInlineBusy] = useState(false)

  async function addRoom() {
    if (!newRoomName.trim()) return
    setInlineBusy(true)
    const { data, error } = await supabase
      .from('rooms')
      .insert({ unit_id: unitId, name: newRoomName.trim(), room_order: localRooms.length })
      .select('*')
      .single()
    if (!error && data) {
      setLocalRooms(r => [...r, data])
      setRoomId(data.id)
      setNewRoomName('')
      setAddingRoom(false)
    } else {
      alert(error?.message ?? 'Could not add room')
    }
    setInlineBusy(false)
  }

  function addCategory() {
    const c = newCategoryName.trim().toLowerCase()
    if (!c) return
    if (![...BASE_CATEGORIES, ...customCategories].includes(c)) setCustomCategories(x => [...x, c])
    setCategory(c)
    setNewCategoryName('')
    setAddingCategory(false)
  }

  async function addContractor() {
    if (!newContractorName.trim() || !orgId) return
    setInlineBusy(true)
    const { data, error } = await supabase
      .from('contractors')
      .insert({
        org_id: orgId,
        name: newContractorName.trim(),
        trade: newContractorTrade.trim() || null,
        whatsapp: newContractorWhatsApp.trim() || null,
      })
      .select('*')
      .single()
    if (!error && data) {
      setLocalContractors(c => [...c, data])
      setContractorId(data.id)
      setNewContractorName(''); setNewContractorTrade(''); setNewContractorWhatsApp('')
      setAddingContractor(false)
    } else {
      alert(error?.message ?? 'Could not add contractor')
    }
    setInlineBusy(false)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Flip to true to re-enable AI defect analysis on photos (needs OPENAI_API_KEY).
  const AI_ANALYSIS_ENABLED = false

  const handlePhotoTaken = useCallback((file: File) => {
    setPhoto(file)
    setPhotoUrl(URL.createObjectURL(file))
    setStep('annotate')
  }, [])

  // Runs after the markup step (with the annotated file, or the original if skipped)
  const proceedAfterPhoto = useCallback(async (file: File) => {
    if (!AI_ANALYSIS_ENABLED) {
      setStep('form')
      return
    }

    setStep('ai_loading')

    // Upload to Supabase storage then call AI
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/uploads/snag-photo', { method: 'POST', body: formData })
      const { url: uploadedUrl } = await uploadRes.json()

      const aiRes = await fetch('/api/ai/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadedUrl }),
      })
      const suggestion: AISuggestion = await aiRes.json()

      setAiSuggestion(suggestion)
      setTitle(suggestion.title)
      setDescription(suggestion.description)
      setCategory(suggestion.category)
      setPriority(suggestion.severity)
    } catch {
      // AI failed — go to form with empty fields
    }
    setStep('form')
  }, [AI_ANALYSIS_ENABLED])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoTaken(file)
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    try {
      const res = await fetch('/api/snags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          unit_id: unitId,
          room_id: roomId || null,
          title,
          description,
          category,
          priority,
          assigned_to: contractorId || null,
          due_date: dueDate || null,
          ai_suggested: !!aiSuggestion,
          ai_confidence: aiSuggestion?.confidence ?? null,
        }),
      })

      if (!res.ok) throw new Error('Save failed')

      const snag = await res.json()

      // Attach photo if uploaded
      if (photo && snag.id) {
        const formData = new FormData()
        formData.append('file', photo)
        formData.append('snagId', snag.id)
        await fetch('/api/uploads/snag-photo', { method: 'POST', body: formData })
      }

      // Trigger WhatsApp if assigned
      if (contractorId && snag.id) {
        await fetch('/api/notifications/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snagId: snag.id }),
        })
      }

      onSaved()
    } catch {
      alert('Failed to save snag. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 pt-safe">
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 active:bg-slate-200 transition-colors">
          <X className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">Add Snag</h2>
        <div className="w-9" />
      </div>

      {/* Camera step */}
      {step === 'camera' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EEF4FF]">
            <Camera className="h-12 w-12 text-[#1A56DB]" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">Take a photo</p>
            <p className="mt-1 text-sm text-slate-500">Then circle the problem with your finger</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="sf-btn-primary w-full max-w-xs py-4 text-base"
          >
            <Camera className="h-5 w-5" />
            Open Camera
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => setStep('form')}
            className="text-sm text-slate-400 underline underline-offset-2"
          >
            Skip photo, add manually
          </button>
        </div>
      )}

      {/* Markup step — circle or tap the defect on the photo */}
      {step === 'annotate' && photoUrl && (
        <PhotoAnnotator
          imageUrl={photoUrl}
          onDone={(file) => {
            setPhoto(file)
            setPhotoUrl(URL.createObjectURL(file))
            proceedAfterPhoto(file)
          }}
          onSkip={() => photo && proceedAfterPhoto(photo)}
        />
      )}

      {/* AI loading step */}
      {step === 'ai_loading' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          {photoUrl && (
            <div className="h-48 w-full max-w-xs overflow-hidden rounded-2xl">
              <img src={photoUrl} alt="Snag" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#1A56DB]" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Analysing defect…</p>
              <p className="text-xs text-slate-400">AI is identifying the issue</p>
            </div>
          </div>
        </div>
      )}

      {/* Form step */}
      {step === 'form' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 space-y-4">
              {/* Photo preview */}
              {photoUrl && (
                <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100">
                  <img src={photoUrl} alt="Snag" className="h-full w-full object-cover" />
                  {aiSuggestion && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
                      <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-xs font-medium text-white">
                        AI detected · {Math.round((aiSuggestion.confidence ?? 0) * 100)}% confidence
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Paint peeling on ceiling"
                  className="sf-input"
                  autoFocus={!aiSuggestion}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add details…"
                  rows={3}
                  className="sf-input resize-none"
                />
              </div>

              {/* Priority + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                  <div className="relative">
                    <select value={priority} onChange={e => setPriority(e.target.value as SnagPriority)} className="sf-input appearance-none pr-8">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={e => e.target.value === ADD_NEW ? setAddingCategory(true) : setCategory(e.target.value)}
                      className="sf-input appearance-none pr-8 capitalize"
                    >
                      {[...BASE_CATEGORIES, ...customCategories].map(c => (
                        <option key={c} value={c} className="capitalize">{c === 'hvac' ? 'HVAC' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                      <option value={ADD_NEW}>+ Add new category…</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {addingCategory && (
                <div className="flex gap-2">
                  <input type="text" autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Roofing" className="sf-input flex-1" />
                  <button type="button" onClick={addCategory} className="sf-btn-primary px-4 py-2 text-sm">Add</button>
                  <button type="button" onClick={() => setAddingCategory(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
                </div>
              )}

              {/* Room */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Room</label>
                <div className="relative">
                  <select
                    value={roomId}
                    onChange={e => e.target.value === ADD_NEW ? setAddingRoom(true) : setRoomId(e.target.value)}
                    className="sf-input appearance-none pr-8"
                  >
                    <option value="">— Select room —</option>
                    {localRooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    <option value={ADD_NEW}>+ Add new room…</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </div>
                {addingRoom && (
                  <div className="mt-2 flex gap-2">
                    <input type="text" autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                      placeholder="e.g. Wine cellar" className="sf-input flex-1" />
                    <button type="button" onClick={addRoom} disabled={inlineBusy} className="sf-btn-primary px-4 py-2 text-sm disabled:opacity-60">Add</button>
                    <button type="button" onClick={() => setAddingRoom(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
                  </div>
                )}
              </div>

              {/* Assign contractor */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign contractor</label>
                <div className="relative">
                  <select
                    value={contractorId}
                    onChange={e => e.target.value === ADD_NEW ? setAddingContractor(true) : setContractorId(e.target.value)}
                    className="sf-input appearance-none pr-8"
                  >
                    <option value="">— Unassigned —</option>
                    {localContractors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.trade ? ` · ${c.trade}` : ''}</option>
                    ))}
                    {orgId && <option value={ADD_NEW}>+ Add new contractor…</option>}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </div>
                {addingContractor && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <input type="text" autoFocus value={newContractorName} onChange={e => setNewContractorName(e.target.value)}
                      placeholder="Name *" className="sf-input" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={newContractorTrade} onChange={e => setNewContractorTrade(e.target.value)}
                        placeholder="Trade (e.g. Tiler)" className="sf-input" />
                      <input type="tel" value={newContractorWhatsApp} onChange={e => setNewContractorWhatsApp(e.target.value)}
                        placeholder="WhatsApp number" className="sf-input" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={addContractor} disabled={inlineBusy || !newContractorName.trim()} className="sf-btn-primary flex-1 py-2 text-sm disabled:opacity-60">Add contractor</button>
                      <button type="button" onClick={() => setAddingContractor(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
                    </div>
                  </div>
                )}
                {contractorId && !addingContractor && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    After saving, use the snag's WhatsApp button to notify them
                  </p>
                )}
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="sf-input"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="border-t border-slate-200 bg-white px-4 pb-safe pt-3">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="sf-btn-primary w-full py-4 text-base disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Snag'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
