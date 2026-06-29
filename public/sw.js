const CACHE = 'snagit-v2'
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
