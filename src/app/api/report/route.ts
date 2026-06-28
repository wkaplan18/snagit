import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()

  const formData = await req.formData()
  const projectId = formData.get('project_id') as string
  const unitName = (formData.get('unit_name') as string | null)?.trim() || 'General'
  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const reporterName = (formData.get('reporter_name') as string | null)?.trim() || null
  const reporterPhone = (formData.get('reporter_phone') as string | null)?.trim() || null
  const photo = formData.get('photo') as File | null

  if (!projectId || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify project exists and belongs to an eligible org type
  const { data: project } = await admin
    .from('projects')
    .select('id, org_id, organizations!inner(org_type)')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const raw = project.organizations
  const orgType = (Array.isArray(raw) ? raw[0] : raw as { org_type?: string } | null)?.org_type
  if (orgType !== 'property_manager' && orgType !== 'body_corporate') {
    return NextResponse.json({ error: 'Not eligible for tenant reporting' }, { status: 403 })
  }

  // Find or create unit by name
  let { data: unit } = await admin
    .from('units')
    .select('id')
    .eq('project_id', projectId)
    .ilike('name', unitName)
    .maybeSingle()

  if (!unit) {
    const newUnitId = crypto.randomUUID()
    await admin.from('units').insert({
      id: newUnitId,
      project_id: projectId,
      name: unitName,
      unit_type: 'other',
    })
    unit = { id: newUnitId }
  }

  // Build description with reporter info appended
  const fullDescription = [
    description,
    reporterName ? `Reported by: ${reporterName}` : null,
    reporterPhone ? `Contact: ${reporterPhone}` : null,
  ].filter(Boolean).join('\n\n') || null

  // Create the snag
  const snagId = crypto.randomUUID()
  const { data: snag, error: snagError } = await admin
    .from('snags')
    .insert({
      id: snagId,
      project_id: projectId,
      unit_id: unit.id,
      title,
      description: fullDescription,
      category: 'other',
      status: 'open',
      priority: 'medium',
      created_by: null,
    })
    .select('id, snag_number')
    .single()

  if (snagError || !snag) {
    return NextResponse.json({ error: snagError?.message ?? 'Could not create report' }, { status: 500 })
  }

  // Upload photo if provided
  if (photo && photo.size > 0) {
    const buffer = await photo.arrayBuffer()
    const ext = photo.type.includes('png') ? 'png' : 'jpg'
    const path = `snags/${snagId}/report-${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('snag-photos')
      .upload(path, buffer, { contentType: photo.type, upsert: false })

    if (!uploadError) {
      const { data: urlData } = admin.storage.from('snag-photos').getPublicUrl(path)
      await admin.from('attachments').insert({
        snag_id: snagId,
        storage_path: path,
        public_url: urlData.publicUrl,
        file_name: photo.name,
        file_size: photo.size,
        mime_type: photo.type,
        uploaded_by: null,
        uploaded_by_contractor: false,
      })
    }
  }

  return NextResponse.json({ id: snag.id, snag_number: snag.snag_number }, { status: 201 })
}
