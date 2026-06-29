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

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: 'SnagIT <hello@snagitapp.co.za>',
    to: 'wkaplan@gmail.com',
    subject: `SnagIT: New enquiry from ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A">New enterprise enquiry</h2>
        <div style="border-left:3px solid #1A56DB;padding-left:16px;margin-bottom:16px">
          <p style="margin:6px 0;color:#334155"><strong>Name:</strong> ${name}</p>
          <p style="margin:6px 0;color:#334155"><strong>Company:</strong> ${company || '—'}</p>
          <p style="margin:6px 0;color:#334155"><strong>Email:</strong> ${email}</p>
          <p style="margin:6px 0;color:#334155"><strong>Phone:</strong> ${phone || '—'}</p>
          <p style="margin:6px 0;color:#334155"><strong>Properties:</strong> ${properties || '—'}</p>
          <p style="margin:6px 0;color:#334155"><strong>Message:</strong> ${message || '—'}</p>
        </div>
        <p style="font-size:12px;color:#94A3B8">Sent from snagitapp.co.za</p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Resend error:', JSON.stringify(emailError))
    return NextResponse.json({ error: `Email failed: ${JSON.stringify(emailError)}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
