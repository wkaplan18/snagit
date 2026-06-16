import BottomNav from '@/components/ui/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {children}
      <BottomNav />
    </div>
  )
}
