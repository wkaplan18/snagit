import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SnagDetailClient from './SnagDetailClient'

export default async function SnagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: snag }, { data: contractors }] = await Promise.all([
    supabase.from('snags').select(`
      *,
      attachments(*),
      contractor:contractors(id, name, company, whatsapp, trade, access_token),
      room:rooms(id, name),
      unit:units(id, name),
      project:projects(id, name)
    `).eq('id', id).maybeSingle(),
    supabase.from('contractors').select('*').eq('is_active', true).order('name'),
  ])

  if (!snag) notFound()

  // Supabase types FK joins as arrays — flatten each to a single object
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const flat = {
    ...snag,
    contractor: one(snag.contractor),
    room: one(snag.room),
    unit: one(snag.unit),
    project: one(snag.project),
  }

  return <SnagDetailClient snag={flat} contractors={contractors ?? []} />
}
