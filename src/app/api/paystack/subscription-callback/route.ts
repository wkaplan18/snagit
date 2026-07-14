import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref') ?? req.nextUrl.searchParams.get('trxref') ?? req.nextUrl.searchParams.get('reference')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.snagitapp.co.za'

  if (!ref) return NextResponse.redirect(`${appUrl}/settings/billing?payment=failed`)

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return NextResponse.redirect(`${appUrl}/settings/billing?payment=failed`)

  const admin = createAdminClient()

  // Look up the org by the pending reference
  const { data: org } = await admin
    .from('organizations')
    .select('id, paystack_pending_plan')
    .eq('paystack_reference', ref)
    .single()

  if (!org) return NextResponse.redirect(`${appUrl}/settings/billing?payment=failed`)

  // Verify with Paystack
  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const paystackData = await paystackRes.json()

  if (!paystackRes.ok || paystackData.data?.status !== 'success') {
    return NextResponse.redirect(`${appUrl}/settings/billing?payment=failed`)
  }

  const plan = org.paystack_pending_plan ?? paystackData.data?.metadata?.plan
  const customerCode: string | undefined = paystackData.data?.customer?.customer_code

  // Try to capture the subscription code now, in case the subscription.create
  // webhook fired before we stored the customer code
  let subscriptionCode: string | null = null
  if (customerCode) {
    const subsRes = await fetch(`https://api.paystack.co/subscription?customer=${encodeURIComponent(customerCode)}&perPage=5`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const subsData = await subsRes.json()
    const active = (subsData?.data ?? []).find((s: { status: string }) => s.status === 'active')
    subscriptionCode = active?.subscription_code ?? null
  }

  await admin
    .from('organizations')
    .update({
      subscription_status: 'active',
      plan,
      is_trial: false,
      plan_expires_at: null,
      paystack_pending_plan: null,
      paystack_reference: null,
      paystack_customer_code: customerCode ?? null,
      ...(subscriptionCode ? { paystack_subscription_code: subscriptionCode } : {}),
    })
    .eq('id', org.id)

  return NextResponse.redirect(`${appUrl}/settings/billing?payment=success`)
}
