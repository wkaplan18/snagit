'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, Check } from 'lucide-react'

interface Props {
  label: string
  signerName?: string
  onSave: (file: File) => void
}

type Point = { x: number; y: number }

const CANVAS_W = 600
const CANVAS_H = 220

export default function SignaturePad({ label, signerName, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Point[][]>([])
  const drawingRef = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [saving, setSaving] = useState(false)

  function ctxOf() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  useEffect(() => {
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function redraw() {
    const canvas = canvasRef.current
    const ctx = ctxOf()
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }

  function toCanvasPoint(e: React.PointerEvent): Point | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handleDown(e: React.PointerEvent) {
    e.preventDefault()
    const p = toCanvasPoint(e)
    if (!p) return
    drawingRef.current = true
    strokesRef.current.push([p])
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function handleMove(e: React.PointerEvent) {
    if (!drawingRef.current) return
    const p = toCanvasPoint(e)
    if (!p) return
    strokesRef.current[strokesRef.current.length - 1].push(p)
    redraw()
  }

  function handleUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    setHasStrokes(strokesRef.current.length > 0)
  }

  function clear() {
    strokesRef.current = []
    setHasStrokes(false)
    redraw()
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    setSaving(true)
    const timeout = setTimeout(() => setSaving(false), 6000)
    canvas.toBlob(blob => {
      clearTimeout(timeout)
      setSaving(false)
      if (!blob) return
      onSave(new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }))
    }, 'image/png')
  }

  return (
    <div className="sf-card p-4">
      <p className="mb-1 text-sm font-semibold text-slate-900">{label}</p>
      {signerName && <p className="mb-3 text-xs text-slate-400">{signerName}</p>}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="w-full rounded-xl border border-slate-200 bg-white"
        style={{ touchAction: 'none', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={clear}
          disabled={!hasStrokes}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500 disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" /> Clear
        </button>
        <button
          onClick={save}
          disabled={!hasStrokes || saving}
          className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-[#1A56DB] py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Confirm signature'}
        </button>
      </div>
    </div>
  )
}
