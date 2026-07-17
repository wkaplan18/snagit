import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import ScrollToTop from '@/components/ui/ScrollToTop'
import RegisterSW from '@/components/ui/RegisterSW'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  metadataBase: new URL('https://snagitapp.co.za'),
  title: 'SnagIT — Log it. Assign it. Fixed.',
  description: 'The fault-logging platform for construction sites, hotel teams, and property managers. Snag a fault in 30 seconds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SnagIT',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1A56DB',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-sf-base text-sf-text antialiased">
        <NextTopLoader color="#1A56DB" showSpinner={false} height={3} />
        <ScrollToTop />
        <RegisterSW />
        {children}
      </body>
    </html>
  )
}
