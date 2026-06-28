'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const WA_SVG = (
  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

export default function ShareButton({
  projectId,
  projectName,
  shareToken,
  savedClientName,
}: {
  projectId: string
  projectName: string
  shareToken: string | null
  savedClientName: string | null
}) {
  const [showModal, setShowModal] = useState(false)
  const [clientName, setClientName] = useState(savedClientName ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSend() {
    setBusy(true)
    try {
      let token = shareToken
      const res = await fetch('/api/project/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, client_name: clientName.trim(), client_whatsapp: '' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      token = json.share_token as string

      const shareUrl = `https://snagitapp.co.za/share/${token}`
      const greeting = clientName.trim() ? `Hi ${clientName.trim()}, ` : ''
      const message = `${greeting}here's your live snagging progress for *${projectName}*:\n\n${shareUrl}\n\nView all snags, status and photos in real time.`
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
      setShowModal(false)
    } catch {
      alert('Could not generate share link — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-[transform,opacity] hover:opacity-90"
        style={{ backgroundColor: '#25D366' }}
      >
        {WA_SVG}
        Send progress to client
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Send to client</h3>
                <p className="text-xs text-slate-500 mt-0.5">{projectName}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Client name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="e.g. John Smith"
                className="sf-input"
                autoFocus
              />
            </div>
            <button
              onClick={handleSend}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#25D366' }}
            >
              {WA_SVG}
              {busy ? 'Opening…' : 'Open WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
