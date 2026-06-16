'use client'

import { useState, useRef } from 'react'
import type { Floorplan, Snag } from '@/types'
import { PRIORITY_CONFIG } from '@/types'

interface Props {
  floorplan: Floorplan
  snags: Snag[]
  onPinClick: (snag: Snag) => void
  onMapClick?: (x: number, y: number) => void
  addMode?: boolean
}

export default function FloorplanViewer({ floorplan, snags, onPinClick, onMapClick, addMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredSnag, setHoveredSnag] = useState<Snag | null>(null)

  const pinSnags = snags.filter(s => s.floor_plan_id === floorplan.id && s.pin_x != null && s.pin_y != null)

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addMode || !onMapClick) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onMapClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200">
      <div
        ref={containerRef}
        className={`relative ${addMode ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleContainerClick}
      >
        <img
          src={floorplan.public_url}
          alt={floorplan.name}
          className="w-full object-contain"
          draggable={false}
        />

        {/* Snag pins */}
        {pinSnags.map(snag => {
          const cfg = PRIORITY_CONFIG[snag.priority]
          const isHovered = hoveredSnag?.id === snag.id
          const pinColor =
            snag.status === 'closed' || snag.status === 'approved' ? '#16A34A' :
            snag.priority === 'critical' ? '#DC2626' :
            snag.priority === 'high' ? '#EA580C' :
            snag.priority === 'medium' ? '#D97706' :
            '#64748B'

          return (
            <button
              key={snag.id}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${snag.pin_x}%`, top: `${snag.pin_y}%` }}
              onClick={e => { e.stopPropagation(); onPinClick(snag) }}
              onMouseEnter={() => setHoveredSnag(snag)}
              onMouseLeave={() => setHoveredSnag(null)}
            >
              {/* Pin */}
              <div className="relative flex flex-col items-center">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white text-xs font-bold"
                  style={{
                    backgroundColor: pinColor,
                    boxShadow: `0 2px 8px ${pinColor}50`,
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {snag.snag_number}
                </div>
                <div
                  className="h-2 w-0.5"
                  style={{ backgroundColor: pinColor }}
                />
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                    #{snag.snag_number} {snag.title}
                  </div>
                </div>
              )}
            </button>
          )
        })}

        {/* Add mode overlay */}
        {addMode && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-slate-900/80 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              Tap to place snag pin
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-slate-200 bg-white">
        {[
          { color: '#DC2626', label: 'Critical' },
          { color: '#EA580C', label: 'High' },
          { color: '#D97706', label: 'Medium' },
          { color: '#16A34A', label: 'Closed' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-slate-400">{pinSnags.length} pins</span>
      </div>
    </div>
  )
}
