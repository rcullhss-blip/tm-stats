import type { Metadata, Viewport } from 'next'
import { DM_Sans, Inter, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TM Stats — Track to Improve',
  description: "Strokes Gained golf analytics for serious amateur golfers. Know exactly where you're losing shots and what to practice.",
  icons: {
    icon: '/icon-only-logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${dmMono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
