'use client'

import { Printer } from 'lucide-react'
import Link from 'next/link'

export default function InspectionReportClient({ backHref }: { backHref: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
      <p className="text-sm text-slate-500">
        Use <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">⌘P</kbd> or click to save as PDF
      </p>
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Back
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-[#1239A4] active:scale-[0.97]"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}
