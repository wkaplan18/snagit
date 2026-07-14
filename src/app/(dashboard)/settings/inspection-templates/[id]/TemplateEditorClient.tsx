'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical } from 'lucide-react'
import { DEFAULT_ROOMS, type InspectionTemplate } from '@/types'

interface EditorItem { label: string }
interface EditorRoom { name: string; items: EditorItem[] }

function toEditorRooms(template: InspectionTemplate): EditorRoom[] {
  return (template.rooms ?? [])
    .slice()
    .sort((a, b) => a.room_order - b.room_order)
    .map(r => ({
      name: r.name,
      items: (r.items ?? []).slice().sort((a, b) => a.item_order - b.item_order).map(i => ({ label: i.label })),
    }))
}

export default function TemplateEditorClient({ template }: { template: InspectionTemplate }) {
  const router = useRouter()
  const [name, setName] = useState(template.name)
  const [rooms, setRooms] = useState<EditorRoom[]>(toEditorRooms(template))
  const [newItemDraft, setNewItemDraft] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  function addRoom() {
    setRooms(r => [...r, { name: '', items: [] }])
  }

  function useDefaultRooms() {
    setRooms(DEFAULT_ROOMS.map(name => ({ name, items: [] })))
  }

  function removeRoom(index: number) {
    setRooms(r => r.filter((_, i) => i !== index))
  }

  function renameRoom(index: number, value: string) {
    setRooms(r => r.map((room, i) => i === index ? { ...room, name: value } : room))
  }

  function addItem(roomIndex: number) {
    const label = (newItemDraft[roomIndex] ?? '').trim()
    if (!label) return
    setRooms(r => r.map((room, i) => i === roomIndex ? { ...room, items: [...room.items, { label }] } : room))
    setNewItemDraft(d => ({ ...d, [roomIndex]: '' }))
  }

  function removeItem(roomIndex: number, itemIndex: number) {
    setRooms(r => r.map((room, i) => i === roomIndex ? { ...room, items: room.items.filter((_, j) => j !== itemIndex) } : room))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inspection-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          unit_type: template.unit_type,
          rooms: rooms
            .filter(r => r.name.trim())
            .map((r, ri) => ({
              name: r.name.trim(),
              room_order: ri,
              items: r.items.filter(i => i.label.trim()).map((i, ii) => ({ label: i.label.trim(), item_order: ii })),
            })),
        }),
      })
      if (res.ok) {
        router.push('/settings/inspection-templates')
        router.refresh()
      } else {
        alert('Could not save checklist. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/settings/inspection-templates')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Edit checklist</h1>
      </div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="sf-input mb-5"
      />

      {rooms.length === 0 && (
        <button
          onClick={useDefaultRooms}
          className="mb-5 w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors"
        >
          Start from default room list
        </button>
      )}

      <div className="space-y-4">
        {rooms.map((room, ri) => (
          <div key={ri} className="sf-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-300" />
              <input
                type="text"
                value={room.name}
                onChange={e => renameRoom(ri, e.target.value)}
                placeholder="Room name"
                className="sf-input flex-1 py-2 text-sm font-semibold"
              />
              <button onClick={() => removeRoom(ri)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 pl-6">
              {room.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.label}</span>
                  <button onClick={() => removeItem(ri, ii)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemDraft[ri] ?? ''}
                  onChange={e => setNewItemDraft(d => ({ ...d, [ri]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(ri) }}
                  placeholder="Add item (e.g. Walls, Ceiling)"
                  className="sf-input flex-1 py-2 text-sm"
                />
                <button onClick={() => addItem(ri)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRoom}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors"
      >
        <Plus className="h-4 w-4" /> Add room
      </button>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="sf-btn-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-40"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save checklist'}
          </button>
        </div>
      </div>
    </div>
  )
}
