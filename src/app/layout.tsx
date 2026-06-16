import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import ScrollToTop from '@/components/ui/ScrollToTop'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'snagnmaintain — Property Maintenance, Sorted',
  description: 'Spot it. Assign it. Fixed. The maintenance platform for builders, hotels, homeowners and more.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'snagnmaintain',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F172A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-sf-base text-sf-text antialiased">
        <NextTopLoader color="#1A56DB" showSpinner={false} height={3} />
        <ScrollToTop />
        {children}
      </body>
    </html>
  )
}
