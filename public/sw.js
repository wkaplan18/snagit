const CACHE = 'snagit-v3'
const OFFLINE_URL = '/offline'

// Static assets to pre-cache
const PRECACHE = [
  '/',
  '/dashboard',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and Supabase API requests
  if (request.method !== 'GET') return
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL) || caches.match('/'))
    )
    return
  }

  // Network-first for everything else (Next.js handles _next/static cache-busting via content hashes)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

self.addEventListener('push', event => {
  if (!event.data) return

  const payload = event.data.json()
  const { title, body, url, tag, badgeCount } = payload

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        data: { url: url || '/dashboard' },
      })

      if ('setAppBadge' in self.navigator) {
        if (badgeCount > 0) {
          await self.navigator.setAppBadge(badgeCount).catch(() => {})
        } else {
          await self.navigator.clearAppBadge().catch(() => {})
        }
      }
    })()
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = clientsList.find(c => new URL(c.url).pathname === url)
      if (existing) {
        await existing.focus()
      } else {
        await self.clients.openWindow(url)
      }
    })()
  )
})
