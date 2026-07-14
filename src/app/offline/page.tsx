'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sf-base px-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A56DB]">
        <svg viewBox="0 0 32 32" fill="none" className="h-9 w-9">
          <circle cx="16" cy="16" r="8.5" stroke="white" strokeWidth="2" opacity="0.9" />
          <circle cx="16" cy="16" r="2.5" fill="white" />
          <line x1="16" y1="4" x2="16" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="16" x2="9" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900">You&apos;re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-slate-500">
        No connection right now. Anything you were working on will save automatically once you&apos;re back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="sf-btn-primary mt-6 px-6 py-3"
      >
        Try again
      </button>
    </div>
  )
}
