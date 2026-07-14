import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''
  const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex')
  if (signature !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  let event: Record<string, any>
  try { event = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { event: eventType, data } = event
  const admin = createAdminClient()

  switch (eventType) {

    // ── First payment success — activate org (backup if callback missed) ──────
    case 'charge.success': {
      const orgId = data?.metadata?.org_id
      const planId = data?.metadata?.plan
      if (!orgId) break

      const { data: org } = await admin
        .from('organizations')
        .select('subscription_status, paystack_pending_plan')
        .eq('id', orgId)
        .single()

      // Apply on new subscription OR on plan-change (upgrade/downgrade)
      if (org && (org.subscription_status !== 'active' || org.paystack_pending_plan)) {
        await admin.from('organizations').update({
          subscription_status: 'active',
          plan: planId ?? org.paystack_pending_plan,
          is_trial: false,
          plan_expires_at: null,
          paystack_pending_plan: null,
          paystack_customer_code: data?.customer?.customer_code ?? null,
        }).eq('id', orgId)
      }
      break
    }

    // ── Subscription created — store subscription_code on the org ─────────────
    case 'subscription.create': {
      const subscriptionCode = data?.subscription_code
      const customerCode = data?.customer?.customer_code
      if (!subscriptionCode || !customerCode) break

      // The org is linked to its Paystack customer in charge.success / callback
      await admin.from('organizations')
        .update({ paystack_subscription_code: subscriptionCode })
        .eq('paystack_customer_code', customerCode)
      break
    }

    // ── Monthly renewal succeeded — keep org active ───────────────────────────
    case 'invoice.update': {
      const subscriptionCode = data?.subscription?.subscription_code
      const paid = data?.status === 'success' && data?.paid_at
      if (!subscriptionCode || !paid) break

      await admin.from('organizations')
        .update({ subscription_status: 'active' })
        .eq('paystack_subscription_code', subscriptionCode)
      break
    }

    // ── Monthly renewal failed — mark as past_due ─────────────────────────────
    case 'invoice.payment_failed': {
      const subscriptionCode = data?.subscription?.subscription_code
      if (!subscriptionCode) break

      await admin.from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('paystack_subscription_code', subscriptionCode)
      break
    }

    // ── Subscription cancelled/disabled — deactivate org ─────────────────────
    case 'subscription.disable':
    case 'subscription.not_renew': {
      const subscriptionCode = data?.subscription_code
      if (!subscriptionCode) break

      await admin.from('organizations')
        .update({ subscription_status: 'cancelled' })
        .eq('paystack_subscription_code', subscriptionCode)
      break
    }
  }

  return NextResponse.json({ received: true })
}
