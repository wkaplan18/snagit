import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // On Vercel, use the forwarded host to ensure https://
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'snagitapp.co.za'
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const base = `${proto}://${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${base}${next}`)
    }
    return NextResponse.redirect(`${base}/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${base}/login?error=no_code`)
}
