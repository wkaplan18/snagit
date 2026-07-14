import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllUserOrgs, getActiveOrgId } from '@/lib/activeOrg'
import { PLANS, planCode, type PlanId } from '@/lib/billing'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json() as { planId: PlanId }
  const plan = PLANS[planId]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const code = planCode(planId)
  if (!code) return NextResponse.json({ error: 'Plan not configured' }, { status: 500 })

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 })

  const allOrgs = await getAllUserOrgs(user.id)
  const orgId = await getActiveOrgId(user.id, allOrgs)
  if (!orgId) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

  const callerRole = allOrgs.find(o => o.org_id === orgId)?.role
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    return NextResponse.json({ error: 'Only owners and admins can manage billing' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('plan, subscription_status, paystack_subscription_code')
    .eq('id', orgId)
    .single()

  if (org?.plan === planId && org?.subscription_status === 'active') {
    return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 })
  }

  // Enforce property limits per plan (a property = a project)
  const { count } = await admin
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'archived')
  if ((count ?? 0) > plan.maxProperties) {
    return NextResponse.json({
      error: `The ${plan.name} plan is limited to ${plan.maxProperties} ${plan.maxProperties === 1 ? 'property' : 'properties'}, but you have ${count}. Please choose a bigger plan or archive properties first.`,
    }, { status: 400 })
  }

  // Upgrade/downgrade: cancel the existing Paystack subscription before creating a new one
  if (org?.paystack_subscription_code && org.subscription_status === 'active') {
    const subRes = await fetch(`https://api.paystack.co/subscription/${org.paystack_subscription_code}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const subData = await subRes.json()
    const emailToken = subData?.data?.email_token

    if (emailToken) {
      await fetch('https://api.paystack.co/subscription/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: org.paystack_subscription_code, token: emailToken }),
      })
    }

    // Clear old subscription code — new code arrives via subscription.create webhook
    await admin
      .from('organizations')
      .update({ paystack_subscription_code: null })
      .eq('id', orgId)
  }

  const reference = `SNAG-sub-${orgId.slice(0, 8)}-${planId}-${Date.now()}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.snagitapp.co.za'
  const callbackUrl = `${appUrl}/api/paystack/subscription-callback?ref=${reference}`

  // Store pending reference on org
  await admin
    .from('organizations')
    .update({ paystack_reference: reference, paystack_pending_plan: planId })
    .eq('id', orgId)

  // Initialize transaction with plan code — Paystack auto-creates the subscription after first payment
  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: plan.price * 100, // cents
      reference,
      currency: 'ZAR',
      callback_url: callbackUrl,
      plan: code,
      metadata: {
        org_id: orgId,
        plan: planId,
        user_email: user.email,
      },
    }),
  })

  const paystackData = await paystackRes.json()
  if (!paystackRes.ok || !paystackData.status) {
    return NextResponse.json({ error: paystackData.message ?? 'Paystack error' }, { status: 500 })
  }

  return NextResponse.json({ authorization_url: paystackData.data.authorization_url })
}
