// SnagIT subscription plans — prices must match the Paystack plans
// (Paystack dashboard → Payments → Plans) and the landing page.
export const PLANS = {
  solo:      { name: 'Solo',      price: 1499, maxProperties: 1 },
  contractor:{ name: 'Contractor',price: 2999, maxProperties: 5 },
  portfolio: { name: 'Portfolio', price: 8999, maxProperties: 20 },
} as const

export type PlanId = keyof typeof PLANS

export function planCode(planId: PlanId): string {
  switch (planId) {
    case 'solo':       return process.env.PAYSTACK_PLAN_SOLO ?? ''
    case 'contractor': return process.env.PAYSTACK_PLAN_CONTRACTOR ?? ''
    case 'portfolio':  return process.env.PAYSTACK_PLAN_PORTFOLIO ?? ''
  }
}
