import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushToOrgAdmins(orgId: string, payload: PushPayload, excludeUserId?: string) {
  const admin = createAdminClient()

  const { data: admins } = await admin
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .in('role', ['owner', 'admin'])

  if (!admins?.length) return

  const userIds = admins.map(a => a.user_id).filter(id => id !== excludeUserId)
  if (!userIds.length) return

  const [{ data: subs }, { count: badgeCount }] = await Promise.all([
    admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .in('user_id', userIds),
    admin
      .from('snags')
      .select('id, project:projects!inner(org_id)', { count: 'exact', head: true })
      .eq('project.org_id', orgId)
      .in('status', ['open', 'fixed']),
  ])

  if (!subs?.length) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const body = JSON.stringify({ ...payload, badgeCount: badgeCount ?? 0 })

  await Promise.all(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          body,
          { TTL: 3600 }
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )
}
