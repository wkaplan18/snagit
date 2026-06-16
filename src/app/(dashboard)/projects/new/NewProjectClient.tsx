'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SA_PROVINCES } from '@/types'
import type { DashboardTerms } from '@/types'

export default function NewProjectClient({ orgId, terms }: { orgId: string; terms: DashboardTerms }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('projects')
      .insert({
        org_id: orgId,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        province: province || null,
        description: description.trim() || null,
      })
      .select('id')
      .single()

    if (error || !data) {
      setError(error?.message ?? 'Could not create the project')
      setLoading(false)
    } else {
      router.push(`/projects/${data.id}`)
      router.refresh()
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> {terms.projects}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">New {terms.project.toLowerCase()}</h1>
      <p className="mt-1 text-sm text-slate-500">Add a {terms.project.toLowerCase()} to start tracking {terms.issues.toLowerCase()}.</p>

      <form onSubmit={handleCreate} className="sf-card mt-5 space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{terms.project} name</label>
          <input type="text" required minLength={2} value={name} onChange={e => setName(e.target.value)}
            placeholder={`Your ${terms.project.toLowerCase()} name`} className="sf-input" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Address <span className="font-normal text-slate-400">(optional)</span></label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Street address" className="sf-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="Johannesburg" className="sf-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Province</label>
            <select value={province} onChange={e => setProvince(e.target.value)} className="sf-input">
              <option value="">Select…</option>
              {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder={`Notes about this ${terms.project.toLowerCase()}`} className="sf-input resize-none" />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={loading || name.trim().length < 2} className="sf-btn-primary w-full disabled:opacity-60">
          {loading ? 'Creating…' : `Create ${terms.project.toLowerCase()}`}
        </button>
      </form>
    </div>
  )
}
