import { createClient } from '@/lib/supabase/server'
import { isPlatformOwner } from '@/lib/isPlatformOwner'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ControlCenterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isPlatformOwner(user.email)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-slate-50 pt-safe">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-slate-800">SnagIT Control Center</h1>
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-600">
          Back to app
        </Link>
      </header>
      {children}
    </div>
  )
}
