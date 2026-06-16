import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for token-validated server routes (contractor portal).
// Bypasses RLS — never expose to the browser, and always validate the
// contractor access token before using it.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
