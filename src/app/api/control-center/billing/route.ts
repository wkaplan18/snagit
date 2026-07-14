import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformOwner } from '@/lib/isPlatformOwner'

async function requirePlatformOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isPlatformOwner(user.email)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

// GET ?orgId= — payment history for an org's Paystack customer
export async function GET(req: NextRequest) {
  const auth = await requirePlatformOwner()
  if (auth.error) return auth.error

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('paystack_customer_code')
    .eq('id', orgId)
    .single()

  if (!org?.paystack_customer_code) {
    return NextResponse.json({ payments: [] })
  }

  const customerRes = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(org.paystack_customer_code)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const customerData = await customerRes.json()
  const customerId = customerData?.data?.id
  if (!customerId) return NextResponse.json({ payments: [] })

  const txRes = await fetch(`https://api.paystack.co/transaction?customer=${customerId}&perPage=24`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const txData = await txRes.json()

  const payments = (txData?.data ?? []).map((t: any) => ({
    paidAt: t.paid_at ?? t.created_at,
    amount: (t.amount ?? 0) / 100,
    status: t.status,
    reference: t.reference,
    channel: t.channel,
  }))

  return NextResponse.json({ payments })
}

// POST { action: 'cancel', orgId } — cancel an org's Paystack subscription
export async function POST(req: NextRequest) {
  const auth = await requirePlatformOwner()
  if (auth.error) return auth.error

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 })

  const { action, orgId } = await req.json()
  if (action !== 'cancel' || !orgId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('paystack_subscription_code')
    .eq('id', orgId)
    .single()

  if (!org?.paystack_subscription_code) {
    return NextResponse.json({ error: 'This org has no Paystack subscription on record' }, { status: 400 })
  }

  const subRes = await fetch(`https://api.paystack.co/subscription/${org.paystack_subscription_code}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const subData = await subRes.json()
  const emailToken = subData?.data?.email_token
  if (!emailToken) return NextResponse.json({ error: 'Could not fetch subscription from Paystack' }, { status: 500 })

  const disableRes = await fetch('https://api.paystack.co/subscription/disable', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: org.paystack_subscription_code, token: emailToken }),
  })
  const disableData = await disableRes.json()
  if (!disableRes.ok || !disableData.status) {
    return NextResponse.json({ error: disableData.message ?? 'Paystack cancel failed' }, { status: 500 })
  }

  await admin
    .from('organizations')
    .update({ subscription_status: 'cancelled' })
    .eq('id', orgId)

  return NextResponse.json({ success: true })
}
