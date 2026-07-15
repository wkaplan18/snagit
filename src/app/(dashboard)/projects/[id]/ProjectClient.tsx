'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Home, ChevronDown, ChevronRight, Camera, MapPin, Printer, AlertCircle, X, Loader2, Link2, ClipboardList } from 'lucide-react'
import { waLink } from '@/lib/whatsappLink'
import SnagCard from '@/components/snags/SnagCard'
import { DEFAULT_ROOMS, DEFAULT_HOTEL_ROOM_AREAS, HOTEL_UNIT_TYPES, BUILDER_UNIT_TYPES, type Contractor, type DashboardTerms, type OrgType, type Room, type Snag, type UnitType } from '@/types'

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
  client_name: string | null
  client_whatsapp: string | null
  share_token: string | null
}


function UnitSnags({ projectId, unitId, unitName, snags, terms, bare = false }: { projectId: string; unitId: string; unitName: string; snags: Snag[]; terms: DashboardTerms; bare?: boolean }) {
  return (
    <div className={bare ? 'pt-3' : 'border-t border-slate-100 px-4 pb-4 pt-3'}>
      <Link
        href={`/snags/new?projectId=${projectId}&unitId=${unitId}`}
        className="sf-btn-primary mb-3 flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        <Camera className="h-4 w-4" /> Add {terms.issue.toLowerCase()} to {unitName}
      </Link>
      {snags.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">No {terms.issues.toLowerCase()} logged yet.</p>
      ) : (
        <div className="space-y-2">
          {snags.map(s => <SnagCard key={s.id} snag={s} />)}
        </div>
      )}
    </div>
  )
}

export default function ProjectClient({ project, units, contractors, terms, orgType, openCountsByUnit, snagsByUnit, tenancyByUnit }: { project: ProjectInfo; units: UnitRow[]; contractors: Contractor[]; terms: DashboardTerms; orgType: OrgType; openCountsByUnit: Record<string, number>; snagsByUnit: Record<string, Snag[]>; tenancyByUnit: Record<string, { tenantName: string; moveInCompleted: boolean }> }) {
  const isSingleProperty = units.length === 1 && units[0].name === project.name
  const [openUnit, setOpenUnit] = useState<string | null>(units.length === 1 ? units[0].id : null)
  const [showAddUnit, setShowAddUnit] = useState(units.length === 0)
  const [unitName, setUnitName] = useState('')
  const isHotel = orgType === 'hotel' || orgType === 'property_manager' || orgType === 'body_corporate'
  const hasTenantPortal = orgType === 'property_manager' || orgType === 'body_corporate'
  const [linkCopied, setLinkCopied] = useState(false)
  const displayUnits = orgType === 'hotel' ? units.filter(u => (openCountsByUnit[u.id] ?? 0) > 0) : units
  const unitTypeOptions = orgType === 'hotel' ? HOTEL_UNIT_TYPES : BUILDER_UNIT_TYPES
  const [unitType, setUnitType] = useState<UnitType>(orgType === 'hotel' ? 'standard_room' : 'apartment')
  const [seedRooms, setSeedRooms] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [clientName, setClientName] = useState(project.client_name ?? '')
  const [clientWhatsapp, setClientWhatsapp] = useState(project.client_whatsapp ?? '')
  const [shareToken, setShareToken] = useState<string | null>(project.share_token)
  const [shareSaving, setShareSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleShareSend(e: React.FormEvent) {
    e.preventDefault()
    setShareSaving(true)
    try {
      const res = await fetch('/api/project/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, client_name: clientName, client_whatsapp: '' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      const token = json.share_token as string
      setShareToken(token)
      const shareUrl = `${window.location.origin}/share/${token}`
      const message = `Hi ${clientName || 'there'}, here's a live view of your ${terms.issues.toLowerCase()} status for *${project.name}*:\n\n${shareUrl}\n\nYou can view all ${terms.issues.toLowerCase()}, their status and photos in real time.`
      window.open(waLink(null, message), '_blank')
      setShowShare(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate share link')
    } finally {
      setShareSaving(false)
    }
  }

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
      .insert({ project_id: project.id, name: unitName.trim(), unit_type: false ? 'other' : unitType })
      .select('id')
      .single()

    if (unitError || !unit) {
      setError(unitError?.message ?? 'Could not create the unit')
      setSaving(false)
      return
    }

    if (seedRooms && !false) {
      const roomList = orgType === 'hotel' ? DEFAULT_HOTEL_ROOM_AREAS : DEFAULT_ROOMS
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
          {hasTenantPortal && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/report/${project.id}`)
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              }}
              title="Copy tenant report link"
              className="relative flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              {linkCopied ? 'Copied!' : 'Tenant link'}
            </button>
          )}
          <Link
            href={`/snags/report?project_id=${project.id}`}
            target="_blank"
            title="Print / Save PDF report"
            className="sf-btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-sm"
          >
            <Printer className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setShowShare(true)}
            title="Share with client via WhatsApp"
            className="flex items-center justify-center rounded-xl px-2.5 py-1.5 text-white transition-[transform,opacity] hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>
      </div>

      {isSingleProperty ? (
        <div className="mt-6">
          <UnitSnags projectId={project.id} unitId={units[0].id} unitName={units[0].name} snags={snagsByUnit[units[0].id] ?? []} terms={terms} bare />
        </div>
      ) : (
        <>
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{terms.units}</h2>
            {(!isHotel || hasTenantPortal) && (
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
              <AlertCircle className="h-4 w-4" /> Log an {terms.issue.toLowerCase()}
            </Link>
          )}

          {isHotel && displayUnits.length === 0 && (
            <div className="sf-card flex flex-col items-center p-8 text-center">
              {units.length === 0 ? (
                <>
                  <Home className="mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">No {terms.units.toLowerCase()} logged yet</p>
                  <p className="mt-1 text-xs text-slate-400">Tap &quot;Log an {terms.issue.toLowerCase()}&quot; above — enter the {terms.unit.toLowerCase()} number and it&apos;s created automatically.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm font-medium text-slate-700">All clear</p>
                  <p className="mt-1 text-xs text-slate-400">No open {terms.issues.toLowerCase()} across any {terms.units.toLowerCase()}.</p>
                </>
              )}
            </div>
          )}

          {(!isHotel || hasTenantPortal) && showAddUnit && (
            <form onSubmit={handleAddUnit} className="sf-card mb-4 space-y-3 p-4">
              <div className={false ? '' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{terms.unit} name</label>
                  <input type="text" required minLength={1} value={unitName} onChange={e => setUnitName(e.target.value)}
                    placeholder={false ? 'e.g. Swimming Pool, Parking B1, Gym' : 'Unit 14'} className="sf-input" />
                </div>
                {!false && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                    <select value={unitType} onChange={e => setUnitType(e.target.value as UnitType)} className="sf-input capitalize">
                      {unitTypeOptions.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {!false && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={seedRooms} onChange={e => setSeedRooms(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  Add standard SA rooms (kitchen, bedrooms, bathrooms…)
                </label>
              )}
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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenUnit(open ? null : u.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpenUnit(open ? null : u.id) }}
                      className="flex w-full cursor-pointer items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF]">
                          <Home className="h-5 w-5 text-[#1A56DB]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                          {orgType !== 'hotel' && <p className="text-xs capitalize text-slate-400">{u.unit_type.replace(/_/g, ' ')}</p>}
                          {hasTenantPortal && (
                            tenancyByUnit[u.id] ? (
                              <p className={`text-xs font-medium ${tenancyByUnit[u.id].moveInCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                                {tenancyByUnit[u.id].moveInCompleted ? 'Tenanted' : 'Pending move-in'} · {tenancyByUnit[u.id].tenantName}
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-slate-400">Vacant</p>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {openCount > 0 && (
                          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-600">
                            {openCount}
                          </span>
                        )}
                        {hasTenantPortal && (
                          <Link
                            href={`/units/${u.id}`}
                            onClick={e => e.stopPropagation()}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1A56DB]"
                            title="Tenants & inspections"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Link>
                        )}
                        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                    {open && <UnitSnags projectId={project.id} unitId={u.id} unitName={u.name} snags={snagsByUnit[u.id] ?? []} terms={terms} />}
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

      {/* Share with client modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4" onClick={() => setShowShare(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 capitalize">Share with {terms.shareRecipient}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Opens WhatsApp with a read-only view of all {terms.issues.toLowerCase()}.</p>
              </div>
              <button onClick={() => setShowShare(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleShareSend} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 capitalize">{terms.shareRecipient} name <span className="font-normal text-slate-400">(optional — used in the message)</span></label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="John Smith"
                  className="sf-input"
                />
              </div>
              {shareToken && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <p className="text-xs text-slate-500 mb-1 capitalize">{terms.shareRecipient} view link</p>
                  <p className="text-xs font-mono text-slate-700 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/share/${shareToken}` : `/share/${shareToken}`}
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={shareSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                style={{ backgroundColor: '#25D366' }}
              >
                {shareSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                )}
                {shareSaving ? 'Saving…' : 'Send via WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
