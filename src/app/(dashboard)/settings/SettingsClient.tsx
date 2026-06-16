'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Check } from 'lucide-react'
import Link from 'next/link'

interface Props {
  email: string
  profile: { full_name: string | null; whatsapp: string | null; phone: string | null; job_title: string | null }
}

export default function SettingsClient({ email, profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        whatsapp: whatsapp.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
      })
      .eq('id', (await supabase.auth.getUser()).data.user!.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF]">
          <User className="h-6 w-6 text-[#1A56DB]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Profile & Settings</h1>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="sf-card space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Warren Kaplan"
            className="sf-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            WhatsApp number
            <span className="ml-1.5 text-xs font-normal text-slate-400">— contractors will send fix updates here</span>
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="+27 82 000 0000"
            className="sf-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+27 11 000 0000"
            className="sf-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Job title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            placeholder="Site Manager"
            className="sf-input"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="sf-btn-primary w-full py-3 text-sm disabled:opacity-60"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
