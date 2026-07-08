import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendPushToOrgAdmins } from '@/lib/notifications/push'

const CreateSnagSchema = z.object({
  project_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  room_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().optional().default('other'),
  status: z.string().optional().default('open'),
  priority: z.string().optional().default('medium'),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  pin_x: z.number().nullable().optional(),
  pin_y: z.number().nullable().optional(),
  floor_plan_id: z.string().uuid().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const unitId = searchParams.get('unit_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('snags')
    .select(`
      *,
      attachments(*),
      contractor:contractors(id, name, company, whatsapp, trade, access_token),
      room:rooms(id, name),
      unit:units(id, name),
      project:projects(id, name)
    `)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (unitId) query = query.eq('unit_id', unitId)
  if (status) {
    const statuses = status.split(',')
    query = statuses.length > 1 ? query.in('status', statuses) : query.eq('status', statuses[0])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateSnagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const insertData = {
    ...parsed.data,
    created_by: user.id,
    // Set status and assigned_at in the same INSERT — no second update needed
    ...(parsed.data.assigned_to
      ? { status: 'assigned', assigned_at: new Date().toISOString() }
      : {}),
  }

  const { data, error } = await supabase
    .from('snags')
    .insert(insertData)
    .select(`*, attachments(*), contractor:contractors(id, name, company), project:projects(id, name, org_id)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orgId = (data as unknown as { project?: { org_id?: string } }).project?.org_id
  if (orgId) {
    try {
      await sendPushToOrgAdmins(orgId, {
        title: 'New snag logged',
        body: data.title,
        url: `/snags/${data.id}`,
        tag: `snag-${data.id}`,
      })
    } catch (err) {
      console.error('[push] send failed', err)
    }
  }

  return NextResponse.json(data, { status: 201 })
}
