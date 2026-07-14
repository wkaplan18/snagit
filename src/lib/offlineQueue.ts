// Resilience against flaky signal on the inspection flow: if a mutating request fails
// due to a network error (not a server rejection), it's queued in IndexedDB and retried
// automatically once back online. This is NOT full offline-first — the inspection page
// itself must load online; only in-flight writes during the walkthrough are protected.

const DB_NAME = 'snagit-offline'
const STORE = 'pending_requests'

interface QueuedEntry {
  id: string
  url: string
  method: string
  headers?: Record<string, string>
  bodyKind: 'json' | 'formdata' | 'none'
  jsonBody?: string
  formEntries?: [string, string | Blob][]
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function addEntry(entry: QueuedEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function removeEntry(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getAllEntries(): Promise<QueuedEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as QueuedEntry[])
    req.onerror = () => reject(req.error)
  })
}

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

export async function getQueueCount(): Promise<number> {
  if (!hasIndexedDB()) return 0
  return (await getAllEntries()).length
}

function buildInit(entry: QueuedEntry): RequestInit {
  if (entry.bodyKind === 'json') {
    return { method: entry.method, headers: entry.headers, body: entry.jsonBody }
  }
  if (entry.bodyKind === 'formdata') {
    const fd = new FormData()
    for (const [k, v] of entry.formEntries ?? []) fd.append(k, v)
    return { method: entry.method, body: fd }
  }
  return { method: entry.method, headers: entry.headers }
}

type Listener = (count: number) => void
const listeners = new Set<Listener>()

export function onQueueChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

async function notifyQueueChange() {
  const count = await getQueueCount()
  listeners.forEach(cb => cb(count))
}

export interface ReliableFetchResult {
  ok: boolean
  queued: boolean
  status?: number
  data?: unknown
}

// Drop-in replacement for fetch() on mutating calls. Network failures (offline,
// dropped connection) are queued instead of thrown; HTTP error responses (4xx/5xx)
// are returned as-is since retrying a rejected request wouldn't help.
export async function reliableFetch(url: string, init: RequestInit): Promise<ReliableFetchResult> {
  try {
    const res = await fetch(url, init)
    let data: unknown = null
    try { data = await res.clone().json() } catch { /* response has no JSON body */ }
    return { ok: res.ok, queued: false, status: res.status, data }
  } catch (err) {
    if (!(err instanceof TypeError) || !hasIndexedDB()) throw err

    const entry: QueuedEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string> | undefined,
      bodyKind: init.body instanceof FormData ? 'formdata' : typeof init.body === 'string' ? 'json' : 'none',
      jsonBody: typeof init.body === 'string' ? init.body : undefined,
      formEntries: init.body instanceof FormData ? (Array.from(init.body.entries()) as [string, string | Blob][]) : undefined,
      createdAt: Date.now(),
    }
    await addEntry(entry)
    await notifyQueueChange()
    return { ok: false, queued: true }
  }
}

export async function flushQueue(): Promise<void> {
  if (!hasIndexedDB() || typeof navigator === 'undefined' || !navigator.onLine) return

  const entries = (await getAllEntries()).sort((a, b) => a.createdAt - b.createdAt)
  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, buildInit(entry))
      // Drop on success or on a client error retrying won't fix; keep on 5xx/network failure
      if (res.ok || res.status < 500) await removeEntry(entry.id)
    } catch {
      break // still offline — stop here, the next trigger will retry from where we left off
    }
  }
  await notifyQueueChange()
}

let started = false

export function startAutoFlush(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => { flushQueue() })
  setInterval(() => { if (navigator.onLine) flushQueue() }, 20000)
  flushQueue()
}
