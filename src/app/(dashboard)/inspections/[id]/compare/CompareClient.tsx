'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { CONDITION_CONFIG, type Inspection, type InspectionItem, type Tenant, type Attachment } from '@/types'

type ItemWithPhotos = InspectionItem & { attachments?: Attachment[] }

interface MoveOutInspection extends Inspection {
  tenant: Tenant | null
  unit: { id: string; name: string } | null
  items: ItemWithPhotos[]
}

function itemKey(item: InspectionItem) {
  return item.template_item_id ?? `${item.room_name}::${item.item_label}`
}

function groupByRoom(items: ItemWithPhotos[]) {
  const order: string[] = []
  const groups: Record<string, ItemWithPhotos[]> = {}
  for (const item of items.slice().sort((a, b) => a.item_order - b.item_order)) {
    if (!groups[item.room_name]) { groups[item.room_name] = []; order.push(item.room_name) }
    groups[item.room_name].push(item)
  }
  return order.map(room => ({ room, items: groups[room] }))
}

export default function CompareClient({ moveOut, moveIn }: { moveOut: MoveOutInspection; moveIn: Inspection & { items: ItemWithPhotos[] } }) {
  const [items, setItems] = useState(moveOut.items)
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null)

  const moveInByKey = useMemo(() => {
    const map = new Map<string, ItemWithPhotos>()
    for (const mi of moveIn.items) map.set(itemKey(mi), mi)
    return map
  }, [moveIn.items])

  const grouped = useMemo(() => groupByRoom(items), [items])

  async function convertToSnag(itemId: string) {
    if (!confirm('Log this as a maintenance snag? A new issue will be created for this item.')) return
    setConvertingItemId(itemId)
    try {
      const res = await fetch(`/api/inspections/${moveOut.id}/items/${itemId}/convert-to-snag`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, converted_snag_id: data.converted_snag_id, attachments: data.attachments } : i))
      } else {
        alert(data.error ?? 'Could not convert to a snag.')
      }
    } finally {
      setConvertingItemId(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link
        href={`/inspections/${moveOut.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to move-out inspection
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Move-in vs move-out</h1>
        <p className="text-xs text-slate-400">{moveOut.unit?.name ?? '—'} · {moveOut.tenant?.full_name ?? '—'}</p>
      </div>

      <div className="space-y-5">
        {grouped.map(({ room, items: roomItems }) => (
          <div key={room}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{room}</p>
            <div className="sf-card divide-y divide-slate-100 overflow-hidden">
              {roomItems.map(outItem => {
                const inItem = moveInByKey.get(itemKey(outItem))
                const changed = inItem && inItem.condition !== outItem.condition
                const outCfg = CONDITION_CONFIG[outItem.condition]
                const inCfg = inItem ? CONDITION_CONFIG[inItem.condition] : null

                return (
                  <div key={outItem.id} className={`p-4 ${changed ? 'bg-rose-50/50' : ''}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{outItem.item_label}</p>
                      {changed && <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Move-in</p>
                        {inCfg ? (
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${inCfg.bg} ${inCfg.color}`}>{inCfg.label}</span>
                        ) : (
                          <span className="text-xs text-slate-400">No match</span>
                        )}
                        {inItem?.note && <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{inItem.note}&rdquo;</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(inItem?.attachments ?? []).map(a => (
                            <img key={a.id} src={a.public_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Move-out</p>
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${outCfg.bg} ${outCfg.color}`}>{outCfg.label}</span>
                        {outItem.note && <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{outItem.note}&rdquo;</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(outItem.attachments ?? []).map(a => (
                            <img key={a.id} src={a.public_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                          ))}
                        </div>
                      </div>
                    </div>

                    {(outItem.condition === 'damaged' || outItem.condition === 'missing') && (
                      outItem.converted_snag_id ? (
                        <Link
                          href={`/snags/${outItem.converted_snag_id}`}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56DB] hover:underline"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> View snag
                        </Link>
                      ) : (
                        <button
                          onClick={() => convertToSnag(outItem.id)}
                          disabled={convertingItemId === outItem.id}
                          className="mt-3 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {convertingItemId === outItem.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <AlertTriangle className="h-3.5 w-3.5" />}
                          Log as maintenance snag
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
