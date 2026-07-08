'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { urlBase64ToUint8Array } from '@/lib/push/urlBase64ToUint8Array'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

type Status = 'checking' | 'unsupported' | 'off' | 'on' | 'denied'

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'on' : 'off'))
      .catch(() => setStatus('off'))
  }, [])

  async function enable() {
    setBusy(true)
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      const json = subscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!res.ok) throw new Error('Could not save subscription')

      setStatus('on')
    } catch {
      setError('Could not enable notifications')
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setStatus('off')
    } catch {
      setError('Could not disable notifications')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'unsupported') return null

  return (
    <div className="sf-card mb-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF]">
          {status === 'on' ? (
            <Bell className="h-5 w-5 text-[#1A56DB]" />
          ) : (
            <BellOff className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Push notifications</p>
          <p className="text-xs text-slate-500">
            {status === 'denied'
              ? 'Blocked in browser settings — re-enable it there to turn this on.'
              : 'Get notified when a snag needs review or a new one is logged.'}
          </p>
        </div>
        {status !== 'denied' && (
          <button
            type="button"
            onClick={status === 'on' ? disable : enable}
            disabled={busy || status === 'checking'}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              status === 'on'
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-[#1A56DB] text-white hover:opacity-90'
            }`}
          >
            {busy ? '…' : status === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-[10px] text-slate-400">
        On iPhone/iPad, add SnagIT to your Home Screen first — notifications don&apos;t work in a regular Safari tab.
      </p>
    </div>
  )
}
