import type { OrgType } from '@/types'

export interface OrgMember {
  userId: string
  email: string
  name: string | null
  role: string
}

export interface PendingInvite {
  id: string
  orgId: string
  orgName: string
  email: string
  role: string
  expiresAt: string
  expired: boolean
}

export interface OrgRow {
  id: string
  name: string
  orgType: OrgType
  plan: string
  planExpiresAt: string | null
  planStatus: 'expired' | 'expiring_soon' | 'active' | 'no_expiry'
  isTrial: boolean
  isInternalTest: boolean
  email: string | null
  createdAt: string
  subscriptionStatus: string
  hasPaystackSub: boolean
  hasPaystackCustomer: boolean
  nextPaymentDate: string | null
  members: OrgMember[]
  pendingInvites: PendingInvite[]
  activeProjects: number
  totalProjects: number
  openSnags: number
}

export interface OrphanUser {
  id: string
  email: string
  createdAt: string
  confirmedAt: string | null
  lastSignInAt: string | null
  source: { type: 'invited'; orgName: string; expired: boolean } | { type: 'self_registered' }
}

export interface Kpis {
  totalOrgs: number
  payingViaPaystack: number
  payingManually: number
  totalActiveProjects: number
  mrr: number
  needsAttentionCount: number
}

export const PRICE_BY_PLAN: Record<string, number | null> = {
  solo: 1499,
  contractor: 2999,
  portfolio: 8999,
  enterprise: null, // custom pricing — excluded from MRR auto-calc
}

export const PLAN_OPTIONS = [
  { value: 'solo', label: 'Solo — R1,499/mo' },
  { value: 'contractor', label: 'Contractor — R2,999/mo' },
  { value: 'portfolio', label: 'Portfolio — R8,999/mo' },
  { value: 'enterprise', label: 'Enterprise — custom' },
]

export const PLAN_STATUS_CONFIG: Record<OrgRow['planStatus'], { label: string; className: string }> = {
  expired: { label: 'Expired', className: 'text-red-700 bg-red-50 border-red-200' },
  expiring_soon: { label: 'Expiring soon', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  active: { label: 'Active', className: 'text-green-700 bg-green-50 border-green-200' },
  no_expiry: { label: 'No expiry set', className: 'text-slate-500 bg-slate-50 border-slate-200' },
}

export const PLAN_STATUS_SORT_ORDER: Record<OrgRow['planStatus'], number> = {
  expired: 0,
  expiring_soon: 1,
  no_expiry: 2,
  active: 3,
}

export const SUB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Paystack · active', className: 'text-green-700 bg-green-50 border-green-200' },
  past_due: { label: 'Paystack · overdue', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  cancelled: { label: 'Paystack · cancelled', className: 'text-red-700 bg-red-50 border-red-200' },
}

export function attentionReason(org: OrgRow): string | null {
  if (org.subscriptionStatus === 'past_due') return 'Subscription payment failed'
  if (org.subscriptionStatus === 'cancelled') return 'Subscription cancelled'
  if (org.isTrial && org.planStatus === 'expired') return 'Trial expired — not paying'
  if (org.isTrial && org.planStatus === 'expiring_soon') return 'Trial ending soon'
  return null
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}
