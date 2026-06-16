import { NextRequest, NextResponse } from 'next/server'
import { analyseDefectImage } from '@/lib/ai/analyseDefect'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageUrl } = await req.json()
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  try {
    const suggestion = await analyseDefectImage(imageUrl)
    return NextResponse.json(suggestion)
  } catch (err) {
    console.error('AI analyse error:', err)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}
