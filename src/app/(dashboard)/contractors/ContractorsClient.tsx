'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Users, Mail, MessageCircle, FileSpreadsheet, Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { waLink } from '@/lib/whatsappLink'
import type { Contractor, DashboardTerms } from '@/types'

// Exact template headers — the import matches these case-insensitively.
const TEMPLATE_HEADERS = ['Name', 'Trade', 'Company', 'WhatsApp', 'Email', 'Phone'] as const

const TRADES = ['Painter', 'Tiler', 'Plumber', 'Electrician', 'Carpenter', 'Builder', 'Glazier', 'HVAC', 'Waterproofing', 'General']

type Tab = 'all' | 'internal' | 'external'

export default function ContractorsClient({ orgId, contractors, terms }: { orgId: string; contractors: Contractor[]; terms: DashboardTerms }) {
  const [showAdd, setShowAdd] = useState(contractors.length === 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [trade, setTrade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => setOrigin(window.location.origin), [])

  function startEdit(c: Contractor) {
    setEditingId(c.id)
    setName(c.name)
    setCompany(c.company ?? '')
    setTrade(c.trade ?? '')
    setWhatsapp(c.whatsapp ?? '')
    setEmail(c.email ?? '')
    setIsInternal(c.is_internal)
    setShowAdd(true)
    setError('')
  }

  function resetForm() {
    setEditingId(null)
    setName(''); setCompany(''); setTrade(''); setWhatsapp(''); setEmail('')
    setIsInternal(false)
    setShowAdd(false)
    setError('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fields = {
      name: name.trim(),
      company: company.trim() || null,
      trade: trade || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      is_internal: isInternal,
    }
    const { error } = editingId
      ? await supabase.from('contractors').update(fields).eq('id', editingId)
      : await supabase.from('contractors').insert({ org_id: orgId, ...fields })
    if (error) {
      setError(error.message)
    } else {
      resetForm()
      router.refresh()
    }
    setSaving(false)
  }

  const importInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState('')

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      [...TEMPLATE_HEADERS],
      ['Sipho Dlamini', 'Electrician', 'Dlamini Electrical cc', '0825550000', 'sipho@example.co.za', '0115550000'],
    ])
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contractors')
    XLSX.writeFile(wb, 'snagandgo-contractors-template.xlsx')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setImportResult('')
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]])
      if (!rows.length) throw new Error('The sheet has no rows under the header line.')

      // case-insensitive header lookup per row
      const get = (row: Record<string, unknown>, header: string) => {
        const key = Object.keys(row).find(k => k.trim().toLowerCase() === header.toLowerCase())
        const v = key ? String(row[key]).trim() : ''
        return v && v !== 'undefined' ? v : ''
      }

      const existing = new Set(contractors.map(c => c.name.toLowerCase()))
      const toInsert = []
      let skipped = 0
      for (const row of rows) {
        const cname = get(row, 'Name')
        if (!cname) { skipped++; continue }
        if (existing.has(cname.toLowerCase())) { skipped++; continue }
        existing.add(cname.toLowerCase())
        toInsert.push({
          org_id: orgId,
          name: cname,
          trade: get(row, 'Trade') || null,
          company: get(row, 'Company') || null,
          whatsapp: get(row, 'WhatsApp') || null,
          email: get(row, 'Email') || null,
          phone: get(row, 'Phone') || null,
        })
      }
      if (!toInsert.length) throw new Error(`Nothing to import — ${skipped} row(s) skipped (missing name or already on your team).`)

      const { error } = await supabase.from('contractors').insert(toInsert)
      if (error) throw new Error(error.message)
      setImportResult(`✓ Imported ${toInsert.length} contractor${toInsert.length === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped (duplicate or no name)` : ''}`)
      router.refresh()
    } catch (err) {
      setImportResult('✗ ' + (err instanceof Error ? err.message : 'Could not read that file. Use the template.'))
    }
    setImporting(false)
  }

  async function deactivate(c: Contractor) {
    if (!confirm(`Remove ${c.name} from your team? Their portal link will stop working.`)) return
    const { error } = await supabase.from('contractors').update({ is_active: false }).eq('id', c.id)
    if (error) alert(error.message)
    else { resetForm(); router.refresh() }
  }

  function portalMailtoLink(c: Contractor) {
    const url = `${origin}/c/${c.access_token}`
    const subject = encodeURIComponent('Your SnagandGo portal link')
    const body = encodeURIComponent(
      `Hi ${c.name},\n\nHere is your secure SnagandGo portal link — it shows all snags assigned to you:\n\n${url}\n\nThis link is private, please do not share it with anyone.`
    )
    return `mailto:${c.email ? encodeURIComponent(c.email) : ''}?subject=${subject}&body=${body}`
  }

  const filtered = contractors.filter(c =>
    tab === 'all' ? true : tab === 'internal' ? c.is_internal : !c.is_internal
  )

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team</h1>
        <button onClick={() => (showAdd ? resetForm() : setShowAdd(true))} className="sf-btn-primary px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> Add person
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['all', 'internal', 'external'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'all' ? 'All' : t === 'internal' ? terms.internalLabel : terms.externalLabel}
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="sf-card mb-4 space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-900">{editingId ? 'Edit person' : 'Add person'}</p>

          {/* Internal / External toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${!isInternal ? 'border-[#1A56DB] bg-[#EEF4FF] text-[#1A56DB]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              {terms.externalLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${isInternal ? 'border-[#1A56DB] bg-[#EEF4FF] text-[#1A56DB]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              {terms.internalLabel}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Sipho Dlamini" className="sf-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Trade</label>
              <select value={trade} onChange={e => setTrade(e.target.value)} className="sf-input">
                <option value="">Select…</option>
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Company <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Dlamini Painting cc" className="sf-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp</label>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+27 82 000 0000" className="sf-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" className="sf-input" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="sf-btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="sf-btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add person'}
            </button>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => { const c = contractors.find(x => x.id === editingId); if (c) deactivate(c) }}
              className="w-full text-center text-xs font-medium text-red-500 hover:text-red-600"
            >
              Remove from team
            </button>
          )}
        </form>
      )}

      {/* Bulk import (desktop) */}
      <div className="sf-card mb-4 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Import from Excel</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Download the template, fill in one contractor per row (only <strong>Name</strong> is required), then upload it back. Columns: {TEMPLATE_HEADERS.join(', ')}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="sf-btn-secondary px-3 py-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Download template (.xlsx)
              </button>
              <button onClick={() => importInputRef.current?.click()} disabled={importing} className="sf-btn-secondary px-3 py-2 text-xs disabled:opacity-60">
                <Upload className="h-3.5 w-3.5" /> {importing ? 'Importing…' : 'Upload filled sheet'}
              </button>
              <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            </div>
            {importResult && (
              <p className={`mt-2 text-xs font-medium ${importResult.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{importResult}</p>
            )}
          </div>
        </div>
      </div>

      {contractors.length === 0 && !showAdd ? (
        <div className="sf-card flex flex-col items-center p-10 text-center">
          <Users className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">No one added yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your {terms.internalLabel.toLowerCase()} or {terms.externalLabel.toLowerCase()} — they get a no-login portal link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="sf-card p-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => startEdit(c)} className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 underline-offset-2 hover:underline">{c.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.is_internal ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {c.is_internal ? terms.internalLabel : terms.externalLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{[c.trade, c.company].filter(Boolean).join(' · ') || '—'} · <span className="text-[#1A56DB]">edit</span></p>
                  {c.whatsapp && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MessageCircle className="h-3 w-3" /> {c.whatsapp}
                    </p>
                  )}
                </button>
                <div className="flex flex-shrink-0 gap-2">
                  {c.whatsapp && origin && (
                    <a
                      href={waLink(c.whatsapp, `Hi ${c.name}, here's your SnagandGo link — it shows all snags assigned to you, now and in future:\n${origin}/c/${c.access_token}`)}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1EBE5B] active:scale-[0.97] transition-[transform,opacity]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  {origin && (
                    <a
                      href={portalMailtoLink(c)}
                      className="inline-flex items-center gap-1.5 sf-btn-secondary px-3 py-2 text-xs"
                    >
                      <Mail className="h-3.5 w-3.5" /> Send link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
