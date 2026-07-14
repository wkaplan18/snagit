-- Paystack subscription billing fields on organizations
-- subscription_status: none | active | past_due | cancelled
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT,
  ADD COLUMN IF NOT EXISTS paystack_pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orgs_paystack_subscription_code
  ON organizations(paystack_subscription_code)
  WHERE paystack_subscription_code IS NOT NULL;
