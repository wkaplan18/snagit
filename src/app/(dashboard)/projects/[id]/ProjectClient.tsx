'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Home, ChevronDown, ChevronRight, Camera, MapPin, Printer, AlertCircle } from 'lucide-react'
import SnagCard from '@/components/snags/SnagCard'
import { useSnags } from '@/hooks/useSnags'
import { DEFAULT_ROOMS, DEFAULT_HOTEL_ROOM_AREAS, HOTEL_UNIT_TYPES, BUILDER_UNIT_TYPES, type Contractor, type DashboardTerms, type OrgType, type Room, type UnitType } from '@/types'

interface UnitRow {
  id: string
  name: string
  unit_type: UnitType
  floor_number: number | null
  rooms: Room[]
}

interface ProjectInfo {
  id: string
  org_id: string
  name: string
  address: string | null
  city: string | null
  province: string | null
  status: string
  description: string | null
}


function UnitSnags({ projectId, unitId, terms, bare = false }: { projectId: string; unitId: string; terms: DashboardTerms; bare?: boolean }) {
  const { snags, loading } = useSnags({ unitId })

  return (
    <div className={bare ? 'pt-3' : 'border-t border-slate-100 px-4 pb-4 pt-3'}>
      {loading ? (
        <p className="py-2 text-xs text-slate-400">Loading {terms.issues.toLowerCase()}…</p>
      ) : snags.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">No {terms.issues.toLowerCase()} logged yet.</p>
      ) : (
        <div className="space-y-2">
          {snags.map(s => <SnagCard key={s.id} snag={s} />)}
        </div>
      )}
      <Link
        href={`/snags/new?projectId=${projectId}&unitId=${unitId}`}
        className="sf-btn-primary mt-3 flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        <Camera className="h-4 w-4" /> Add {terms.issue.toLowerCase()}
      </Link>
    </div>
  )
}

export default function ProjectClient({ project, units, contractors, terms, orgType, openCountsByUnit }: { project: ProjectInfo; units: UnitRow[]; contractors: Contractor[]; terms: DashboardTerms; orgType: OrgType; openCountsByUnit: Record<string, number> }) {
  const isSingleProperty = units.length === 1 && units[0].name === project.name
  const [openUnit, setOpenUnit] = useState<string | null>(units.length === 1 ? units[0].id : null)
  const [showAddUnit, setShowAddUnit] = useState(units.length === 0)
  const [unitName, setUnitName] = useState('')
  const isHotel = orgType === 'hotel'
  const displayUnits = isHotel ? units.filter(u => (openCountsByUnit[u.id] ?? 0) > 0) : units
  const unitTypeOptions = isHotel ? HOTEL_UNIT_TYPES : BUILDER_UNIT_TYPES
  const [unitType, setUnitType] = useState<UnitType>(isHotel ? 'standard_room' : 'apartment')
  const [seedRooms, setSeedRooms] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleDeleteProject() {
    if (!confirm(`Delete "${project.name}" and ALL its data? This cannot be undone.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) alert(error.message)
    else { router.push('/projects'); router.refresh() }
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .insert({ project_id: project.id, name: unitName.trim(), unit_type: unitType })
      .select('id')
      .single()

    if (unitError || !unit) {
      setError(unitError?.message ?? 'Could not create the unit')
      setSaving(false)
      return
    }

    if (seedRooms) {
      const roomList = isHotel ? DEFAULT_HOTEL_ROOM_AREAS : DEFAULT_ROOMS
      await supabase.from('rooms').insert(
        roomList.map((name, i) => ({ unit_id: unit.id, name, room_order: i }))
      )
    }

    setUnitName('')
    setShowAddUnit(false)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> {terms.projects}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
          {(project.address || project.city) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {[project.address, project.city, project.province].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="sf-badge bg-slate-50 border-slate-200 text-slate-600 capitalize">{project.status}</span>
          <Link
            href={`/snags/report?project_id=${project.id}`}
            target="_blank"
            title="Print / Save PDF report"
            className="sf-btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-sm"
          >
            <Printer className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {isSingleProperty ? (
        <div className="mt-6">
          <UnitSnags projectId={project.id} unitId={units[0].id} terms={terms} bare />
        </div>
      ) : (
        <>
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{terms.units}</h2>
            {!isHotel && (
              <button onClick={() => setShowAddUnit(v => !v)} className="inline-flex items-center gap-1 text-sm font-medium text-[#1A56DB]">
                <Plus className="h-4 w-4" /> Add {terms.unit.toLowerCase()}
              </button>
            )}
          </div>

          {isHotel && (
            <Link
              href={`/snags/new?projectId=${project.id}`}
              className="sf-btn-primary mb-4 flex w-full items-center justify-center gap-2 py-3 text-sm"
            >
              <AlertCircle className="h-4 w-4" /> Log an issue
            </Link>
          )}

          {isHotel && displayUnits.length === 0 && (
            <div className="sf-card flex flex-col items-center p-8 text-center">
              {units.length === 0 ? (
                <>
                  <Home className="mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">No rooms logged yet</p>
                  <p className="mt-1 text-xs text-slate-400">Tap &quot;Log an issue&quot; above — enter the room number and it&apos;s created automatically.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-medium text-slate-700">All clear</p>
                  <p className="mt-1 text-xs text-slate-400">No open issues across any rooms.</p>
                </>
              )}
            </div>
          )}

          {!isHotel && showAddUnit && (
            <form onSubmit={handleAddUnit} className="sf-card mb-4 space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{terms.unit} name</label>
                  <input type="text" required minLength={1} value={unitName} onChange={e => setUnitName(e.target.value)}
                    placeholder="Unit 14" className="sf-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                  <select value={unitType} onChange={e => setUnitType(e.target.value as UnitType)} className="sf-input capitalize">
                    {unitTypeOptions.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={seedRooms} onChange={e => setSeedRooms(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Add standard SA rooms (kitchen, bedrooms, bathrooms…)
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={saving || !unitName.trim()} className="sf-btn-primary w-full py-2.5 text-sm disabled:opacity-60">
                {saving ? 'Adding…' : `Add ${terms.unit.toLowerCase()}`}
              </button>
            </form>
          )}

          {!isHotel && units.length === 0 && !showAddUnit ? (
            <div className="sf-card flex flex-col items-center p-8 text-center">
              <Home className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No {terms.units.toLowerCase()} yet — add the first {terms.unit.toLowerCase()} to start logging {terms.issues.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayUnits.map(u => {
                const open = openUnit === u.id
                const openCount = openCountsByUnit[u.id] ?? 0
                return (
                  <div key={u.id} className="sf-card overflow-hidden">
                    <button onClick={() => setOpenUnit(open ? null : u.id)} className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF]">
                          <Home className="h-5 w-5 text-[#1A56DB]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                          {!isHotel && <p className="text-xs capitalize text-slate-400">{u.unit_type.replace(/_/g, ' ')}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {openCount > 0 && (
                          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-600">
                            {openCount}
                          </span>
                        )}
                        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>
                    {open && <UnitSnags projectId={project.id} unitId={u.id} terms={terms} />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <button onClick={handleDeleteProject} className="mt-10 w-full text-center text-xs font-medium text-red-400 hover:text-red-600">
        Delete this {terms.project.toLowerCase()}
      </button>
    </div>
  )
}
