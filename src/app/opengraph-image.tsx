import { ImageResponse } from 'next/og'

export const alt = 'TM Stats, the golf stats tracker with Strokes Gained'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, backgroundColor: '#0F1117', color: '#F0F0F0', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#CC2222' }} />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>TM STATS</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
            The golf stats tracker that shows you where you lose shots.
          </div>
          <div style={{ fontSize: 34, color: '#9A9DB0' }}>Strokes Gained on your phone. No hardware. Free to start.</div>
        </div>
        <div style={{ fontSize: 30, color: '#CC2222', fontWeight: 700 }}>tmstatsgolf.com</div>
      </div>
    ),
    size,
  )
}
