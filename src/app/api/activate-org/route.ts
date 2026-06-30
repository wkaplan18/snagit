import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const next = searchParams.get('next') ?? '/dashboard'

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'snagitapp.co.za'
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const base = `${proto}://${host}`

  if (!orgId) return NextResponse.redirect(`${base}${next}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (data) {
      const res = NextResponse.redirect(`${base}${next}`)
      res.cookies.set('snagit_active_org', orgId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      return res
    }
  }

  return NextResponse.redirect(`${base}${next}`)
}
