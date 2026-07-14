'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users as UsersIcon, UserX, Mail } from 'lucide-react'
import type { OrgRow, OrphanUser } from '../lib'
import MemberRow from '../components/MemberRow'
import PendingInviteRow from '../components/PendingInviteRow'
import OrphanUserRow from '../components/OrphanUserRow'

export default function UsersSectionClient({ orgs, orphanUsers }: { orgs: OrgRow[]; orphanUsers: OrphanUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [removedOrphanIds, setRemovedOrphanIds] = useState<Set<string>>(new Set())

  const allMembers = useMemo(
    () => orgs.flatMap(o => o.members.map(m => ({ member: m, orgName: o.name }))),
    [orgs]
  )
  const allInvites = useMemo(() => orgs.flatMap(o => o.pendingInvites), [orgs])

  const q = query.trim().toLowerCase()
  const filteredMembers = q
    ? allMembers.filter(({ member, orgName }) => member.email.toLowerCase().includes(q) || orgName.toLowerCase().includes(q))
    : allMembers

  const visibleOrphans = orphanUsers.filter(u => !removedOrphanIds.has(u.id))

  function handleOrphanDeleted(id: string) {
    setRemovedOrphanIds(prev => new Set(prev).add(id))
    router.refresh()
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Users</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-violet-500" />
          {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}
        </h1>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by email or org…"
          className="w-full text-sm rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/10 focus:border-violet-300"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500">
          Organization members
        </div>
        <ul className="divide-y divide-slate-50 px-4 py-3 space-y-1.5">
          {filteredMembers.map(({ member, orgName }) => (
            <MemberRow key={`${orgName}-${member.userId}`} member={member} orgName={orgName} onChanged={() => router.refresh()} />
          ))}
          {filteredMembers.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-400 list-none">No members match your search</li>
          )}
        </ul>
      </div>

      {allInvites.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">Pending invites ({allInvites.length})</p>
          </div>
          <ul className="px-4 py-3 space-y-1.5">
            {allInvites.map(inv => (
              <PendingInviteRow key={inv.id} invite={inv} showOrgName />
            ))}
          </ul>
        </div>
      )}

      {visibleOrphans.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <UserX className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">Users without an org ({visibleOrphans.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Signed up</th>
                  <th className="px-4 py-2 font-medium">Confirmed</th>
                  <th className="px-4 py-2 font-medium">Last sign-in</th>
                  <th className="px-4 py-2 font-medium">Delete</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrphans.map(u => <OrphanUserRow key={u.id} user={u} onDeleted={handleOrphanDeleted} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
