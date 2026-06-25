import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, company, email, phone, properties, message } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error: dbError } = await supabase
    .from('enterprise_enquiries')
    .insert({ name, company, email, phone, properties, message })

  if (dbError) {
    return NextResponse.json({ error: 'Failed to save enquiry' }, { status: 500 })
  }

  const resend = new Resend('re_jNGLrMr3_2L6dQUduYXEVE5ykkFZzVP7R')
  const { error: emailError } = await resend.emails.send({
    from: 'SnagIT <noreply@family.kaplan.co.za>',
    to: 'warren@kaplan.co.za',
    subject: `New SnagIT Enterprise Enquiry — ${name}`,
    html: `
      <h2>New Enterprise Enquiry</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%;max-width:500px">
        <tr><td><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td><strong>Company</strong></td><td>${company || '—'}</td></tr>
        <tr><td><strong>Email</strong></td><td>${email}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
        <tr><td><strong>Properties</strong></td><td>${properties || '—'}</td></tr>
        <tr><td><strong>Message</strong></td><td>${message || '—'}</td></tr>
      </table>
    `,
  })

  if (emailError) {
    console.error('Resend error:', JSON.stringify(emailError))
    return NextResponse.json({ error: `Email failed: ${JSON.stringify(emailError)}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
