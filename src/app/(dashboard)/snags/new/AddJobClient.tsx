'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, BookUser, Camera, ChevronRight, Loader2, Pencil, RotateCcw, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compressImage'
import { DASHBOARD_TERMS, DEFAULT_HOTEL_ROOM_AREAS, DEFAULT_ROOMS, TRADES, HOTEL_ROLES } from '@/types'
import type { Contractor, DashboardTerms, OrgType, Room } from '@/types'

type Step = 'project' | 'room_number' | 'photo' | 'details' | 'room' | 'assign' | 'whatsapp'

function formatWhatsApp(raw: string): string {
  const num = raw.replace(/[\s\-().]/g, '')
  if (num.startsWith('0027')) return '+27' + num.slice(4)
  if (num.startsWith('00')) return '+' + num.slice(2)
  if (num.startsWith('0')) return '+27' + num.slice(1)
  if (/^\d/.test(num) && !num.startsWith('+')) return '+' + num
  return num
}

const WA_ICON = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const MARKUP_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#ffffff']

function PhotoMarkupEditor({ photoUrl, onDone, onCancel }: {
  photoUrl: string
  onDone: (file: File) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [color, setColor] = useState('#ef4444')
  const [paths, setPaths] = useState<Array<{ color: string; pts: { x: number; y: number }[] }>>([])
  const drawing = useRef(false)
  const currentPts = useRef<{ x: number; y: number }[]>([])

  const redraw = useCallback((extraPts?: { x: number; y: number }[]) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const all = extraPts ? [...paths, { color, pts: extraPts }] : paths
    for (const path of all) {
      if (path.pts.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = path.color
      ctx.lineWidth = Math.max(3, canvas.width / 120)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(path.pts[0].x, path.pts[0].y)
      for (let i = 1; i < path.pts.length; i++) ctx.lineTo(path.pts[i].x, path.pts[i].y)
      ctx.stroke()
    }
  }, [paths, color])

  function initCanvas(img: HTMLImageElement) {
    const canvas = canvasRef.current!
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    imgRef.current = img
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
  }

  function getXY(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    const src = 'touches' in e ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy }
  }

  function onStart(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    drawing.current = true
    currentPts.current = [getXY(e)]
  }

  function onMove(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    if (!drawing.current) return
    currentPts.current = [...currentPts.current, getXY(e)]
    redraw(currentPts.current)
  }

  function onEnd(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    if (!drawing.current || currentPts.current.length < 2) { drawing.current = false; return }
    const pts = [...currentPts.current]
    currentPts.current = []
    drawing.current = false
    setPaths(p => [...p, { color, pts }])
  }

  useEffect(() => { redraw() }, [redraw])

  function handleDone() {
    const canvas = canvasRef.current
    if (!canvas) { onCancel(); return }
    const timeout = setTimeout(() => onCancel(), 6000)
    canvas.toBlob(blob => {
      clearTimeout(timeout)
      if (!blob) { onCancel(); return }
      onDone(new File([blob], 'marked-up.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <img src={photoUrl} className="hidden" alt="" onLoad={e => initCanvas(e.currentTarget)} />

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full touch-none"
          style={{ cursor: 'crosshair' }}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd}
        />
      </div>

      <div className="bg-black/90" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {/* Colour picker row */}
        <div className="flex items-center justify-center gap-4 px-4 pt-3 pb-2">
          {MARKUP_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-9 w-9 flex-shrink-0 rounded-full border-[3px] transition-transform active:scale-90"
              style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>
        {/* Controls row */}
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => { setPaths(p => p.slice(0, -1)) }}
            disabled={paths.length === 0}
            className="flex items-center gap-1.5 text-sm text-white disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Undo
          </button>
          <button
            onClick={handleDone}
            className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black active:scale-95 transition-transform"
          >
            Done
          </button>
          <button onClick={onCancel} className="text-sm text-slate-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AddJobClient({ orgId: initialOrgId, orgType: initialOrgType }: { orgId: string; orgType: OrgType }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qProjectId = searchParams.get('projectId') ?? ''
  const qUnitId = searchParams.get('unitId') ?? ''
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Context loaded on mount
  const [ready, setReady] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [orgId, setOrgId] = useState(initialOrgId)
  const [isHotel, setIsHotel] = useState(initialOrgType === 'hotel')
  const [isOnTheFly, setIsOnTheFly] = useState(['hotel', 'property_manager', 'body_corporate'].includes(initialOrgType))
  const [orgType, setOrgType] = useState<OrgType>(initialOrgType)
  const [terms, setTerms] = useState<DashboardTerms>(DASHBOARD_TERMS[initialOrgType])
  const [rooms, setRooms] = useState<Room[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([])
  const [supportsContacts, setSupportsContacts] = useState(false)

  // Hotel room number step
  const [roomNumberInput, setRoomNumberInput] = useState('')
  const [roomNumberBusy, setRoomNumberBusy] = useState(false)

  // Wizard state
  const [step, setStep] = useState<Step>('photo')
  const [savedSnagId, setSavedSnagId] = useState<string | null>(null)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [step])

  // Step data
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [showMarkup, setShowMarkup] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [roomId, setRoomId] = useState('')

  // Room add
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [roomBusy, setRoomBusy] = useState(false)

  // Contractor add
  const [addingContractor, setAddingContractor] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrade, setNewTrade] = useState('')
  const [newWhatsApp, setNewWhatsApp] = useState('')
  const [newIsInternal, setNewIsInternal] = useState(false)
  const [contractorBusy, setContractorBusy] = useState(false)

  const [saving, setSaving] = useState(false)
  const [waUrl, setWaUrl] = useState<string | null>(null)
  const [waName, setWaName] = useState<string | null>(null)

  useEffect(() => {
    setSupportsContacts(typeof navigator !== 'undefined' && 'contacts' in navigator)

    async function init() {
      const _orgId = initialOrgId
      const _isHotel = initialOrgType === 'hotel'
      const _isOnTheFly = ['hotel', 'property_manager', 'body_corporate'].includes(initialOrgType)

      let _projectId = qProjectId
      let _unitId = qUnitId

      if (!_projectId || !_unitId) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .eq('org_id', _orgId)
          .order('name')

        const projects = projectsData ?? []
        if (projects.length === 0) { router.push('/projects/new'); return }

        if (!_projectId && projects.length > 1) {
          setAllProjects(projects)
          setOrgId(_orgId)
          setReady(true)
          setStep('project')
          return
        }

        _projectId = _projectId || projects[0].id

        // Hotels & property managers: don't auto-create a unit — let the user type the unit/room number
        if (_isOnTheFly && !_unitId) {
          setProjectId(_projectId)
          const { data: _contractors } = await supabase
            .from('contractors').select('*').eq('org_id', _orgId).eq('is_active', true).order('name')
          setContractors(_contractors ?? [])
          setReady(true)
          setStep('room_number')
          return
        }

        let { data: unit } = await supabase
          .from('units')
          .select('id')
          .eq('project_id', _projectId)
          .limit(1)
          .maybeSingle()

        if (!unit) {
          const { data: created } = await supabase
            .from('units')
            .insert({ project_id: _projectId, name: 'Main', unit_type: 'house' })
            .select('id')
            .single()
          unit = created
        }

        if (!unit) { router.push('/projects'); return }
        _unitId = unit.id
      }

      setProjectId(_projectId)
      setUnitId(_unitId)

      const [{ data: _rooms }, { data: _contractors }] = await Promise.all([
        supabase.from('rooms').select('*').eq('unit_id', _unitId).order('room_order'),
        supabase.from('contractors').select('*').eq('org_id', _orgId).eq('is_active', true).order('name'),
      ])

      setRooms(_rooms ?? [])
      setContractors(_contractors ?? [])
      setReady(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#1A56DB]" />
      </div>
    )
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed)
    setPhotoUrl(URL.createObjectURL(compressed))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function selectProject(id: string) {
    setProjectId(id)
    if (isOnTheFly) {
      setStep('room_number')
      return
    }
    let { data: unit } = await supabase.from('units').select('id').eq('project_id', id).limit(1).maybeSingle()
    if (!unit) {
      const newUnitId = crypto.randomUUID()
      const { error: unitErr } = await supabase
        .from('units').insert({ id: newUnitId, project_id: id, name: 'Main', unit_type: 'house' })
      if (unitErr) return
      unit = { id: newUnitId }
    }
    if (!unit) return
    setUnitId(unit.id)
    const [{ data: _rooms }, { data: _contractors }] = await Promise.all([
      supabase.from('rooms').select('*').eq('unit_id', unit.id).order('room_order'),
      supabase.from('contractors').select('*').eq('org_id', orgId).eq('is_active', true).order('name'),
    ])
    setRooms(_rooms ?? [])
    setContractors(_contractors ?? [])
    setStep('photo')
  }

  async function selectRoomNumber() {
    const roomName = roomNumberInput.trim()
    if (!roomName) return
    setRoomNumberBusy(true)

    // Check for existing unit first
    const { data: existing } = await supabase
      .from('units').select('id').eq('project_id', projectId).eq('name', roomName).maybeSingle()

    let _unitId: string
    if (existing) {
      _unitId = existing.id
    } else {
      // Generate ID client-side so we don't need a SELECT-after-INSERT (avoids RLS read issues)
      _unitId = crypto.randomUUID()
      const unitTypeVal = isHotel ? 'standard_room' : orgType === 'body_corporate' ? 'other' : 'apartment'
      const { error } = await supabase
        .from('units')
        .insert({ id: _unitId, project_id: projectId, name: roomName, unit_type: unitTypeVal })
      if (error) {
        console.error('Unit insert error:', error)
        alert(error.message)
        setRoomNumberBusy(false)
        return
      }
      if (isHotel) {
        await supabase.from('rooms').insert(
          DEFAULT_HOTEL_ROOM_AREAS.map((name, i) => ({ unit_id: _unitId, name, room_order: i }))
        )
      } else if (orgType === 'property_manager') {
        await supabase.from('rooms').insert(
          DEFAULT_ROOMS.map((name, i) => ({ unit_id: _unitId, name, room_order: i }))
        )
      }
    }

    setUnitId(_unitId)
    const { data: _rooms } = await supabase.from('rooms').select('*').eq('unit_id', _unitId).order('room_order')
    setRooms(_rooms ?? [])
    setRoomNumberBusy(false)
    setStep('photo')
  }

  async function addRoom() {
    if (!newRoomName.trim()) return
    setRoomBusy(true)
    const newId = crypto.randomUUID()
    const newRoom: Room = { id: newId, unit_id: unitId, name: newRoomName.trim(), room_order: rooms.length, created_at: new Date().toISOString() }
    const { error } = await supabase
      .from('rooms')
      .insert(newRoom)
    if (!error) {
      setRooms(r => [...r, newRoom])
      setRoomId(newId)
      setNewRoomName('')
      setAddingRoom(false)
    } else {
      alert(error.message ?? 'Could not add room')
    }
    setRoomBusy(false)
  }

  async function saveJob() {
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
          category: 'other',

          assigned_to: null,
          due_date: null,
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(JSON.stringify(errBody))
      }
      const snag = await res.json()

      if (photo && snag.id) {
        const fd = new FormData()
        fd.append('file', photo)
        fd.append('snagId', snag.id)
        await fetch('/api/uploads/snag-photo', { method: 'POST', body: fd })
      }

      setSavedSnagId(snag.id)
      setStep('assign')
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function assignContractor(contractor: Contractor) {
    if (!savedSnagId) return
    setContractorBusy(true)
    const { error: assignError } = await supabase
      .from('snags')
      .update({ assigned_to: contractor.id, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', savedSnagId)

    if (assignError) {
      alert('Could not assign: ' + assignError.message)
      setContractorBusy(false)
      return
    }

    if (contractor.whatsapp) {
      const digits = contractor.whatsapp.replace(/\D/g, '')
      const e164 = digits.startsWith('0') ? '27' + digits.slice(1) : digits
      const msg = `Hi ${contractor.name}, you've been assigned a new ${terms.issue.toLowerCase()}: "${title}". View and update it here:\n${window.location.origin}/c/${contractor.access_token}?t=${Date.now()}`
      setWaUrl(`https://wa.me/${e164}?text=${encodeURIComponent(msg)}`)
      setWaName(contractor.name)
      setStep('whatsapp')
    } else {
      router.push('/snags')
      router.refresh()
    }
    setContractorBusy(false)
  }

  async function pickContact() {
    // Web Contacts API — available on Android Chrome, not on iOS
    const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts?: object) => Promise<Array<{ tel?: string[]; name?: string[] }>> } }
    if (!nav.contacts) return
    try {
      const results = await nav.contacts.select(['name', 'tel'], { multiple: false })
      const picked = results?.[0]
      if (picked?.tel?.[0]) setNewWhatsApp(formatWhatsApp(picked.tel[0]))
      if (picked?.name?.[0] && !newName.trim()) setNewName(picked.name[0])
    } catch {
      // user cancelled
    }
  }

  async function addAndAssignContractor() {
    if (!newName.trim()) return
    setContractorBusy(true)
    const { data, error } = await supabase
      .from('contractors')
      .insert({
        org_id: orgId,
        name: newName.trim(),
        trade: newTrade.trim() || null,
        whatsapp: newWhatsApp.trim() || null,
        is_internal: newIsInternal,
      })
      .select('*')
      .single()
    if (!error && data) {
      setContractors(c => [...c, data])
      await assignContractor(data)
    } else {
      alert(error?.message ?? 'Could not add')
      setContractorBusy(false)
    }
  }

  const hasProjectStep = allProjects.length > 1
  const hasRoomNumberStep = isOnTheFly && !qUnitId
  const totalSteps = (hasProjectStep ? 1 : 0) + (hasRoomNumberStep ? 1 : 0) + 3
  const stepNum = (s: Step) => {
    const order: Step[] = []
    if (hasProjectStep) order.push('project')
    if (hasRoomNumberStep) order.push('room_number')
    order.push('photo', 'details', 'room')
    const idx = order.indexOf(s)
    return idx === -1 ? 0 : idx + 1
  }

  // ─── STEP: Project picker ────────────────────────────────────────────────────
  if (step === 'project') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <button onClick={() => router.push('/snags')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
              <X className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Step 1 of {totalSteps}</p>
              <h1 className="text-base font-bold text-slate-900">Which {terms.project.toLowerCase()}?</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {allProjects.map(p => (
            <button
              key={p.id}
              onClick={() => selectProject(p.id)}
              className="flex w-full items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-xl">
                🏠
              </div>
              <p className="flex-1 text-sm font-semibold text-slate-900">{p.name}</p>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── STEP: Room/Unit number (hotels & property managers) ─────────────────────
  if (step === 'room_number') {
    const unitLabel = orgType === 'body_corporate' ? 'area or unit' : terms.unit.toLowerCase()
    const placeholder = isHotel
      ? 'e.g. 101, Suite 201, Penthouse'
      : orgType === 'body_corporate'
        ? 'e.g. Pool, Gym, Unit 5A, Parking B1'
        : 'e.g. Apt 4B, Unit 12, Studio 3'
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={() => hasProjectStep ? setStep('project') : router.push('/snags')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Step {stepNum('room_number')} of {totalSteps}</p>
              <h1 className="text-base font-bold text-slate-900">Which {unitLabel}?</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-8 gap-3">
          <p className="text-sm text-slate-500">Enter the {unitLabel} number or name where the issue was found.</p>
          <input
            type="text"
            autoFocus
            value={roomNumberInput}
            onChange={e => setRoomNumberInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && roomNumberInput.trim() && selectRoomNumber()}
            placeholder={placeholder}
            className="sf-input text-base"
          />
        </div>

        <div className="px-4 pb-28 pt-4">
          <button
            onClick={selectRoomNumber}
            disabled={!roomNumberInput.trim() || roomNumberBusy}
            className="sf-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base disabled:opacity-40"
          >
            {roomNumberBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Next <ChevronRight className="h-5 w-5" /></>}
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP: Photo ─────────────────────────────────────────────────────────────
  if (step === 'photo') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <button onClick={() => router.push('/snags')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
              <X className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Step {stepNum('photo')} of {totalSteps}</p>
              <h1 className="text-base font-bold text-slate-900">Add a photo</h1>
            </div>
          </div>
        </div>

        {showMarkup && photoUrl && (
          <PhotoMarkupEditor
            photoUrl={photoUrl}
            onDone={file => {
              setPhoto(file)
              setPhotoUrl(URL.createObjectURL(file))
              setShowMarkup(false)
            }}
            onCancel={() => setShowMarkup(false)}
          />
        )}

        <div className="flex flex-1 flex-col items-center justify-center px-6 gap-6">
          {photoUrl ? (
            <div className="w-full max-w-sm">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl">
                <img src={photoUrl} alt="Job photo" className="h-full w-full object-cover" />
                <button
                  onClick={() => { setPhoto(null); setPhotoUrl(null) }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <label className="text-xs font-medium text-slate-400 underline underline-offset-2 cursor-pointer">
                  Retake
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </label>
                <button
                  onClick={() => setShowMarkup(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A56DB] underline underline-offset-2"
                >
                  <Pencil className="h-3.5 w-3.5" /> Mark up photo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-sm flex-col gap-3">
              <label className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 active:bg-slate-100 transition-colors cursor-pointer">
                <Camera className="h-14 w-14" />
                <span className="text-base font-medium">Take a photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </label>
              <label className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors">
                Choose from Library
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

        <div className="px-4 pb-28 pt-4 space-y-2">
          <button onClick={() => setStep('details')} className="sf-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base">
            Next <ChevronRight className="h-5 w-5" />
          </button>
          {!photoUrl && (
            <button onClick={() => setStep('details')} className="w-full py-2 text-sm text-slate-400 underline underline-offset-2">
              Skip photo
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── STEP: Details ───────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <button onClick={() => setStep('photo')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Step {stepNum('details')} of {totalSteps}</p>
              <h1 className="text-base font-bold text-slate-900">Describe the problem</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pt-6 space-y-5">
          {photoUrl && (
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-100">
              <img src={photoUrl} alt="Job photo" className="h-full w-full object-cover" />
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              What&apos;s the problem? <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Leaking tap in bathroom"
              className="sf-input"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Details <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra details…"
              rows={4}
              className="sf-input resize-none"
            />
          </div>
        </div>

        <div className="px-4 pb-28 pt-4">
          <button
            onClick={() => setStep('room')}
            disabled={!title.trim()}
            className="sf-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base disabled:opacity-40"
          >
            Next <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP: Room ──────────────────────────────────────────────────────────────
  if (step === 'room') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <button onClick={() => setStep('details')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-400">Step {stepNum('room')} of {totalSteps}</p>
              <h1 className="text-base font-bold text-slate-900">{isHotel ? 'Which area?' : 'Which room?'}</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pt-6">
          <div className="flex flex-wrap gap-2">
            {rooms.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoomId(roomId === r.id ? '' : r.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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
                className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:border-slate-400 transition-colors"
              >
                + Add room
              </button>
            )}
          </div>

          {addingRoom && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                autoFocus
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRoom()}
                placeholder="e.g. Kitchen"
                className="sf-input flex-1"
              />
              <button onClick={addRoom} disabled={roomBusy} className="sf-btn-primary px-4 py-2 text-sm disabled:opacity-60">Add</button>
              <button onClick={() => setAddingRoom(false)} className="sf-btn-secondary px-3 py-2 text-sm">✕</button>
            </div>
          )}

          {rooms.length === 0 && !addingRoom && (
            <p className="mt-4 text-sm text-slate-400">No rooms yet — add one above, or skip to save.</p>
          )}
        </div>

        <div className="px-4 pb-28 pt-4 space-y-2">
          <button onClick={saveJob} disabled={saving} className="sf-btn-primary w-full py-4 text-base disabled:opacity-50">
            {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</> : `Save ${terms.issue}`}
          </button>
          {!roomId && rooms.length > 0 && (
            <p className="text-center text-xs text-slate-400">Room is optional</p>
          )}
        </div>
      </div>
    )
  }

  // ─── STEP: Assign ────────────────────────────────────────────────────────────
  if (step === 'assign') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <div className="border-b border-slate-200 px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600">{terms.issue} saved!</p>
              <h1 className="text-base font-bold text-slate-900">Who should fix this?</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contractors.length > 0 && !addingContractor && (
            <div className="divide-y divide-slate-100">
              {contractors.map(c => (
                <button
                  key={c.id}
                  onClick={() => assignContractor(c)}
                  disabled={contractorBusy}
                  className="flex w-full items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB]/10 text-sm font-bold text-[#1A56DB]">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    {c.trade && <p className="text-xs text-slate-500">{c.trade}</p>}
                    {c.whatsapp
                      ? <p className="text-xs text-green-600">{c.whatsapp}</p>
                      : <p className="text-xs text-slate-400">No WhatsApp number</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
                </button>
              ))}
              <button
                onClick={() => setAddingContractor(true)}
                className="flex w-full items-center gap-3 px-4 py-4 text-[#1A56DB] hover:bg-[#EEF4FF] transition-colors"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#1A56DB]/30 text-2xl font-light">+</div>
                <span className="text-sm font-medium">Add new {terms.contractor.toLowerCase()}</span>
              </button>
            </div>
          )}

          {contractors.length === 0 && !addingContractor && (
            <div className="flex flex-col items-center px-6 pt-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF4FF] text-3xl">👷</div>
              <p className="text-base font-semibold text-slate-900">No {terms.contractor.toLowerCase()}s yet</p>
              <p className="mt-1 text-sm text-slate-500 max-w-xs">
                Add one to send this {terms.issue.toLowerCase()} via WhatsApp.
              </p>
              <button onClick={() => setAddingContractor(true)} className="mt-6 sf-btn-primary px-6 py-3">
                + Add {terms.contractor.toLowerCase()}
              </button>
            </div>
          )}

          {addingContractor && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">New {terms.contractor.toLowerCase()}</p>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-sm font-medium">
                <button type="button" onClick={() => setNewIsInternal(false)}
                  className={`flex-1 py-2.5 transition-colors ${!newIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500'}`}>
                  {terms.externalLabel}
                </button>
                <button type="button" onClick={() => setNewIsInternal(true)}
                  className={`flex-1 py-2.5 transition-colors ${newIsInternal ? 'bg-[#1A56DB] text-white' : 'text-slate-500'}`}>
                  {terms.internalLabel}
                </button>
              </div>
              <input type="text" autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name *" className="sf-input" />
              <select value={newTrade} onChange={e => setNewTrade(e.target.value)} className="sf-input">
                <option value="">{terms.contractorTrade} (optional)</option>
                {(isHotel ? HOTEL_ROLES : TRADES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={newWhatsApp}
                    onChange={e => setNewWhatsApp(e.target.value)}
                    onBlur={e => { if (e.target.value.trim()) setNewWhatsApp(formatWhatsApp(e.target.value.trim())) }}
                    placeholder="WhatsApp number"
                    className="sf-input flex-1"
                  />
                  {supportsContacts && (
                    <button
                      type="button"
                      onClick={pickContact}
                      title="Choose from contacts"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100"
                    >
                      <BookUser className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-amber-600">Needed to send the job assignment via WhatsApp</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addAndAssignContractor} disabled={contractorBusy || !newName.trim()} className="sf-btn-primary flex-1 py-3 text-sm disabled:opacity-60">
                  {contractorBusy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Add & assign'}
                </button>
                <button onClick={() => setAddingContractor(false)} className="sf-btn-secondary px-4 py-3 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 pb-28 pt-3">
          <button onClick={() => router.push('/snags')} className="w-full py-2 text-sm text-slate-400 underline underline-offset-2">
            Skip — assign later
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP: WhatsApp ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center bg-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">Ready to send!</p>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">
          Send {waName} the link — they can view and update the {terms.issue.toLowerCase()} from their phone.
        </p>
      </div>
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener"
          onClick={() => router.push('/snags')}
          className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 text-base font-bold text-white hover:bg-[#1EBE5B] active:scale-[0.98] transition-[transform,opacity]"
        >
          {WA_ICON}
          Send to {waName} via WhatsApp
        </a>
      )}
      <button onClick={() => router.push('/snags')} className="text-sm text-slate-400 underline underline-offset-2">
        Done
      </button>
    </div>
  )
}
