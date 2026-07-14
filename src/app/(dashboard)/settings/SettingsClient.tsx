'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Check, LogOut, Building2, Users, X, Send, Mail, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { DASHBOARD_TERMS, ORG_TYPE_CONFIG } from '@/types'
import type { OrgType } from '@/types'
import PushNotificationToggle from '@/components/settings/PushNotificationToggle'

interface Member {
  user_id: string
  role: string
  email: string
  name: string | null
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
}

interface Props {
  email: string
  currentUserId: string
  profile: { full_name: string | null; whatsapp: string | null; phone: string | null; job_title: string | null }
  orgName: string | null
  orgEmail: string | null
  orgType: string | null
  orgId: string | null
  members: Member[]
  pendingInvites: PendingInvite[]
}

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export default function SettingsClient({ email, currentUserId, profile, orgName, orgEmail, orgType, orgId, members, pendingInvites }: Props) {
  const myRole = members.find(m => m.user_id === currentUserId)?.role
  const canManagePush = myRole === 'owner' || myRole === 'admin'
  const canManageTeam = canManagePush
  const orgTypeConfig = orgType ? ORG_TYPE_CONFIG[orgType as OrgType] : null
  const terms = DASHBOARD_TERMS[(orgType ?? 'builder') as OrgType]
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? '')
  const [orgNameVal, setOrgNameVal] = useState(orgName ?? '')
  const [orgEmailVal, setOrgEmailVal] = useState(orgEmail ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [localInvites, setLocalInvites] = useState<PendingInvite[]>(pendingInvites)
  const [localMembers, setLocalMembers] = useState<Member[]>(members)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const [{ error }, { error: orgError }] = await Promise.all([
      supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        whatsapp: whatsapp.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
      }).eq('id', user!.id),
      orgId ? supabase.from('organizations').update({ name: orgNameVal.trim() || null, email: orgEmailVal.trim() || null }).eq('id', orgId) : Promise.resolve({ error: null }),
    ])

    if (error || orgError) {
      setError((error ?? orgError)!.message)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    const json = await res.json()

    if (!res.ok) {
      setInviteError(json.error ?? 'Could not send invite')
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`)
      setLocalInvites(prev => [
        { id: crypto.randomUUID(), email: inviteEmail.trim(), role: 'admin', created_at: new Date().toISOString() },
        ...prev.filter(i => i.email !== inviteEmail.trim()),
      ])
      setInviteEmail('')
    }
    setInviting(false)
  }

  async function cancelInvite(id: string, invEmail: string) {
    if (!confirm(`Cancel invite for ${invEmail}?`)) return
    const res = await fetch('/api/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setLocalInvites(prev => prev.filter(i => i.id !== id))
  }

  async function removeMember(userId: string, memberEmail: string) {
    if (!confirm(`Remove ${memberEmail} from your team?`)) return
    setRemovingId(userId)
    const res = await fetch('/api/team/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) setLocalMembers(prev => prev.filter(m => m.user_id !== userId))
    setRemovingId(null)
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

      {orgTypeConfig && (
        <div className="sf-card mb-4 flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF]">
            <Building2 className="h-5 w-5 text-[#1A56DB]" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Organisation type</p>
            <p className="text-sm font-semibold text-slate-900">{orgTypeConfig.label}</p>
            {orgName && <p className="text-xs text-slate-400">{orgName}</p>}
          </div>
        </div>
      )}

      {canManageTeam && (
        <Link href="/settings/billing" className="sf-card mb-4 flex items-center gap-3 p-4 transition-opacity hover:opacity-80 active:scale-[0.99]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF]">
            <CreditCard className="h-5 w-5 text-[#1A56DB]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Billing & Plan</p>
            <p className="text-xs text-slate-500">Subscription, payments and plan changes</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </Link>
      )}

      {canManagePush && <PushNotificationToggle />}

      <form onSubmit={handleSave} className="sf-card space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Organisation name</label>
          <input
            type="text"
            value={orgNameVal}
            onChange={e => setOrgNameVal(e.target.value)}
            placeholder="My Organisation"
            className="sf-input"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Office email</label>
          <input
            type="email"
            value={orgEmailVal}
            onChange={e => setOrgEmailVal(e.target.value)}
            placeholder="office@example.com"
            className="sf-input"
          />
          <p className="mt-1 text-xs text-slate-400">Material requests and client questions will be emailed here.</p>
        </div>

        <div className="h-px bg-slate-100" />

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
          <label className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp number</label>
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

      {/* ── Team Section ── */}
      {orgId && (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Team access</h2>
          </div>

          {/* Current members */}
          <div className="sf-card mb-3 divide-y divide-slate-100 overflow-hidden">
            {localMembers.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-[11px] font-bold text-[#1A56DB]">
                  {initials(m.name, m.email)}
                </div>
                <div className="min-w-0 flex-1">
                  {m.name && <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>}
                  <p className="text-xs text-slate-500 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                    {m.role}
                  </span>
                  {m.user_id === currentUserId ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">You</span>
                  ) : canManageTeam && m.role !== 'owner' && (
                    <button
                      onClick={() => removeMember(m.user_id, m.email)}
                      disabled={removingId === m.user_id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Remove member"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending invites */}
          {localInvites.length > 0 && (
            <div className="sf-card mb-3 divide-y divide-slate-100 overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pending invites</p>
              {localInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
                    <Mail className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{inv.email}</p>
                    <p className="text-[10px] text-slate-400">Invite sent · awaiting acceptance</p>
                  </div>
                  {canManageTeam && (
                    <button
                      onClick={() => cancelInvite(inv.id, inv.email)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Cancel invite"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invite form */}
          {canManageTeam && (
          <form onSubmit={handleInvite} className="sf-card p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Invite someone to your team</p>
            <p className="mb-3 text-xs text-slate-500">
              They'll get an email with a link to join. Once accepted, they can log in and manage {terms.issues.toLowerCase()} just like you.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="sf-input flex-1"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-[#1A56DB] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {inviting ? 'Sending…' : 'Invite'}
              </button>
            </div>
            {inviteError && <p className="mt-2 text-xs text-red-600">{inviteError}</p>}
            {inviteSuccess && <p className="mt-2 text-xs text-green-700">{inviteSuccess}</p>}
          </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut()
          window.location.href = '/'
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-[0.97]"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>

      <p className="mt-6 text-center text-xs text-slate-400">POPIA compliant · Data stored securely</p>
    </div>
  )
}
