'use client'

import { useEffect, useRef, useState } from 'react'
import { Undo2, Trash2, Check } from 'lucide-react'

interface Props {
  imageUrl: string
  onDone: (file: File) => void
  onSkip: () => void
}

type Point = { x: number; y: number }

const MAX_EDGE = 1600 // cap canvas size so exports stay light

export default function PhotoAnnotator({ imageUrl, onDone, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const strokesRef = useRef<Point[][]>([])
  const drawingRef = useRef(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      imgRef.current = img
      setReady(true)
      redraw()
    }
    img.src = imageUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  function redraw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = Math.max(4, canvas.width * 0.008)
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
    // a bare tap becomes a small circle so "pointing" at a spot works too
    const last = strokesRef.current[strokesRef.current.length - 1]
    if (last && last.length < 3) {
      const c = last[0]
      const canvas = canvasRef.current
      const r = canvas ? Math.max(18, canvas.width * 0.035) : 24
      const circle: Point[] = []
      for (let a = 0; a <= Math.PI * 2 + 0.2; a += 0.25) {
        circle.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r })
      }
      strokesRef.current[strokesRef.current.length - 1] = circle
      redraw()
    }
    setStrokeCount(strokesRef.current.length)
  }

  function undo() {
    strokesRef.current.pop()
    setStrokeCount(strokesRef.current.length)
    redraw()
  }

  function clear() {
    strokesRef.current = []
    setStrokeCount(0)
    redraw()
  }

  function done() {
    const canvas = canvasRef.current
    if (!canvas || !ready) return onSkip()
    // Guard against toBlob never firing (happens on some mobile WebViews)
    const timeout = setTimeout(() => onSkip(), 6000)
    canvas.toBlob(blob => {
      clearTimeout(timeout)
      if (!blob) return onSkip()
      onDone(new File([blob], `snag-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 pt-3 text-center">
        <p className="text-sm font-semibold text-slate-900">Mark the problem</p>
        <p className="text-xs text-slate-400">Circle it with your finger, or just tap the spot</p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className="max-h-full max-w-full rounded-2xl border border-slate-200 shadow-sm"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="border-t border-slate-100 px-4 pt-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mb-3 flex justify-center gap-2">
          <button onClick={undo} disabled={!strokeCount} className="sf-btn-secondary px-4 py-2 text-xs disabled:opacity-40">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button onClick={clear} disabled={!strokeCount} className="sf-btn-secondary px-4 py-2 text-xs disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
        <button onClick={done} disabled={!ready} className="sf-btn-primary w-full py-3.5 disabled:opacity-60">
          <Check className="h-5 w-5" /> {strokeCount ? 'Save markup & continue' : 'Continue without markup'}
        </button>
      </div>
    </div>
  )
}
