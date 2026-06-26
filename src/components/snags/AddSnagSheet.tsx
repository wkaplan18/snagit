'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Loader2, ChevronDown, BookUser } from 'lucide-react'
import PhotoAnnotator from '@/components/snags/PhotoAnnotator'
import { createClient } from '@/lib/supabase/client'
import type { Contractor, DashboardTerms, OrgType, Room } from '@/types'
import { compressImage } from '@/lib/compressImage'

interface Props {
  projectId: string
  unitId: string
  rooms: Room[]
  contractors: Contractor[]
  terms: DashboardTerms
  orgType: OrgType
  orgId?: string // enables inline "add contractor" without leaving the sheet
  onClose: () => void
  onSaved: () => void
}

const ADD_NEW = '__add_new__'

function formatWhatsApp(raw: string): string {
  let num = raw.replace(/[\s\-().]/g, '')
  if (num.startsWith('0027')) return '+27' + num.slice(4)
  if (num.startsWith('00')) return '+' + num.slice(2)
  if (num.startsWith('0')) return '+27' + num.slice(1)
  if (/^\d/.test(num) && !num.startsWith('+')) return '+' + num
  return num
}
const BASE_CATEGORIES = ['paint', 'crack', 'tile', 'water', 'fitting', 'alignment', 'finishing', 'electrical', 'plumbing', 'structural', 'carpentry', 'glazing', 'hvac', 'other']

type Step = 'camera' | 'annotate' | 'form' | 'success'

export default function AddSnagSheet({ projectId, unitId, rooms, contractors, terms, orgType, orgId, onClose, onSaved }: Props) {
  // Lock body scroll while sheet is open — prevents iOS touch-coordinate offset bug
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const [step, setStep] = useState<Step>('camera')
  const [savedWaUrl, setSavedWaUrl] = useState<string | null>(null)
  const [savedContractorName, setSavedContractorName] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('other')
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
  const [newContractorIsInternal, setNewContractorIsInternal] = useState(false)
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

  async function pickContact() {
    if (!('contacts' in navigator)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await (navigator as any).contacts.select(['tel'], { multiple: false })
      const tel = results?.[0]?.tel?.[0]
      if (tel) setNewContractorWhatsApp(formatWhatsApp(tel))
    } catch {
      // user cancelled or permission denied — silently ignore
    }
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
        is_internal: newContractorIsInternal,
      })
      .select('*')
      .single()
    if (!error && data) {
      setLocalContractors(c => [...c, data])
      setContractorId(data.id)
      setNewContractorName(''); setNewContractorTrade(''); setNewContractorWhatsApp(''); setNewContractorIsInternal(false)
      setAddingContractor(false)
    } else {
      alert(error?.message ?? `Could not add ${terms.contractor.toLowerCase()}`)
    }
    setInlineBusy(false)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoTaken = (file: File) => {
    setPhoto(file)
    setPhotoUrl(URL.createObjectURL(file))
    setStep('annotate')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoTaken(await compressImage(file))
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

          assigned_to: contractorId || null,
          due_date: dueDate || null,
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

      // Build WhatsApp prompt if contractor has a number
      const assignedContractor = localContractors.find(c => c.id === contractorId)
      if (assignedContractor?.whatsapp && snag.id) {
        const digits = assignedContractor.whatsapp.replace(/\D/g, '')
        const e164 = digits.startsWith('0') ? '27' + digits.slice(1) : digits
        const msg = `Hi ${assignedContractor.name}, you've been assigned a new ${terms.issue.toLowerCase()}: "${title}". View and update it here:\n${window.location.origin}/c/${assignedContractor.access_token}`
        setSavedWaUrl(`https://wa.me/${e164}?text=${encodeURIComponent(msg)}`)
        setSavedContractorName(assignedContractor.name)
        onSaved()
        setStep('success')
        return
      }

      onSaved()
    } catch {
      alert(`Failed to save ${terms.issue.toLowerCase()}. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 active:bg-slate-200 transition-colors">
          <X className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">Add {terms.issue}</h2>
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
            setStep('form')
          }}
          onSkip={() => setStep('form')}
        />
      )}

      {/* Success + WhatsApp prompt step */}
      {step === 'success' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{terms.issue} saved!</p>
            {savedContractorName && (
              <p className="mt-2 text-sm text-slate-500">
                Send {savedContractorName} the link so they can view and update it.
              </p>
            )}
          </div>
          {savedWaUrl && (
            <a
              href={savedWaUrl}
              target="_blank"
              rel="noopener"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 text-base font-bold text-white hover:bg-[#1EBE5B] active:scale-[0.98] transition-[transform,colors]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send to {savedContractorName} via WhatsApp
            </a>
          )}
          <button onClick={onClose} className="text-sm text-slate-400 underline underline-offset-2">
            {savedWaUrl ? 'Skip for now' : 'Done'}
          </button>
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
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title"
                  className="sf-input"
                  autoFocus
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

              {/* Category */}
              <div className="grid grid-cols-1 gap-3">
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

              {/* Room — pill picker (avoids iOS native select issues in fixed overlays) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Room</label>
                <div className="flex flex-wrap gap-2">
                  {localRooms.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoomId(roomId === r.id ? '' : r.id)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors active:scale-95 ${
                        roomId === r.id
                          ? 'border-[#1A56DB] bg-[#1A56DB] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                  {!addingRoom && (
                    <button
                      type="button"
                      onClick={() => setAddingRoom(true)}
                      className="rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:border-slate-400 transition-colors"
                    >
                      + Add room
                    </button>
                  )}
                </div>
                {addingRoom && (
                  <div className="mt-2 flex gap-2">
                    <input type="text" autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                      placeholder="e.g. Kitchen" className="sf-input flex-1" />
                    <button type="button" onClick={addRoom} disabled={inlineBusy} className="sf-btn-primary px-4 py-2 text-sm disabled:opacity-60">Add</button>
                    <button type="button" onClick={() => setAddingRoom(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
                  </div>
                )}
              </div>

              {/* Assign contractor */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign {terms.contractor.toLowerCase()}</label>
                {localContractors.length === 0 && !addingContractor ? (
                  <button
                    type="button"
                    onClick={() => setAddingContractor(true)}
                    className="w-full rounded-xl border-2 border-dashed border-[#1A56DB]/40 bg-[#EEF4FF] py-3 text-sm font-medium text-[#1A56DB] hover:border-[#1A56DB] transition-colors"
                  >
                    + Add a {terms.contractor.toLowerCase()} to notify via WhatsApp
                  </button>
                ) : (
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
                      {orgId && <option value={ADD_NEW}>+ Add new {terms.contractor.toLowerCase()}…</option>}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                )}
                {addingContractor && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {/* Internal / External toggle */}
                    <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => setNewContractorIsInternal(false)}
                        className={`flex-1 py-2 transition-colors ${!newContractorIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >{terms.externalLabel}</button>
                      <button
                        type="button"
                        onClick={() => setNewContractorIsInternal(true)}
                        className={`flex-1 py-2 transition-colors ${newContractorIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >{terms.internalLabel}</button>
                    </div>
                    <input type="text" autoFocus value={newContractorName} onChange={e => setNewContractorName(e.target.value)}
                      placeholder="Name *" className="sf-input" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={newContractorTrade} onChange={e => setNewContractorTrade(e.target.value)}
                        placeholder={terms.contractorTrade} className="sf-input" />
                      <div className="relative">
                        <input
                          type="tel"
                          value={newContractorWhatsApp}
                          onChange={e => setNewContractorWhatsApp(e.target.value)}
                          onBlur={e => { if (e.target.value.trim()) setNewContractorWhatsApp(formatWhatsApp(e.target.value.trim())) }}
                          placeholder="WhatsApp number"
                          className="sf-input pr-9"
                        />
                        {'contacts' in navigator && (
                          <button
                            type="button"
                            onClick={pickContact}
                            title="Pick from contacts"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-[#1A56DB] transition-colors"
                          >
                            <BookUser className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={addContractor} disabled={inlineBusy || !newContractorName.trim()} className="sf-btn-primary flex-1 py-2 text-sm disabled:opacity-60">Add {terms.contractor.toLowerCase()}</button>
                      <button type="button" onClick={() => setAddingContractor(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
                    </div>
                  </div>
                )}
                {contractorId && !addingContractor && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    After saving, use the {terms.issue.toLowerCase()}'s WhatsApp button to notify them
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
                `Save ${terms.issue}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
