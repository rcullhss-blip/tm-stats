import type { Metadata, Viewport } from 'next'
import { DM_Sans, Inter, DM_Mono } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorker from '@/components/layout/ServiceWorker'

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
    'Golf stats tracker for serious amateur golfers. Log rounds on your phone, see Strokes Gained by category and know exactly what to practise. Free to start.',
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
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'TM Stats', statusBarStyle: 'black-translucent' },
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
      <head>
        {/* In-app mode. The Android and iPhone apps open the site with ?app=android
            or ?app=ios (or identify themselves in the user agent). Store rules do not
            allow an app to send people elsewhere to pay, so in the apps every upgrade
            link is hidden (see globals.css) and the upgrade page explains plans
            neutrally. Set before the page paints, remembered on the device. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var q=new URLSearchParams(location.search).get('app');var u=/TMStatsApp\/(android|ios)/i.exec(navigator.userAgent||'');var m=(q==='android'||q==='ios')?q:(u?u[1].toLowerCase():localStorage.getItem('tm_app'));if(m==='android'||m==='ios'){localStorage.setItem('tm_app',m);document.documentElement.setAttribute('data-app',m);if(m==='ios'&&${JSON.stringify(!!process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY)})document.documentElement.setAttribute('data-iap','1')}}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <ServiceWorker />
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
