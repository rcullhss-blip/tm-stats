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
  metadataBase: new URL('https://www.tmstatsgolf.com'),
  title: 'Golf Stats Tracker with Strokes Gained | TM Stats',
  description:
    'TM Stats is a golf stats tracker for serious amateur golfers. Log rounds on your phone, see Strokes Gained off the tee, on approach, around the green and putting, and know exactly what to practise. Free to start.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'TM Stats',
    title: 'Golf Stats Tracker with Strokes Gained | TM Stats',
    description:
      'Track every round, see Strokes Gained by category and find out where you really lose shots. Free to start, no hardware needed.',
    url: 'https://www.tmstatsgolf.com',
  },
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
      <body className="min-h-full flex flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'TM Stats',
                url: 'https://www.tmstatsgolf.com',
                logo: 'https://www.tmstatsgolf.com/icon-only-logo.png',
                founder: { '@type': 'Person', name: 'Rob Cull' },
                sameAs: ['https://www.instagram.com/tmstatsgolf'],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'TM Stats',
                url: 'https://www.tmstatsgolf.com',
              },
            ]),
          }}
        />
      </body>
    </html>
  )
}
