import type { MetadataRoute } from 'next'

// Lets a golfer add TM Stats to their phone's home screen and open it full
// screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TM Stats',
    short_name: 'TM Stats',
    description: 'Golf stats tracker with Strokes Gained. Track to Improve.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    icons: [
      { src: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
