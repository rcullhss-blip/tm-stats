import { ImageResponse } from 'next/og'
import QRCode from 'qrcode'

// Demo of the Pro share card with example data — lets Rob (and marketing pages)
// preview the story-format snapshot without logging a round.
// GET /api/share-demo
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const qrDataUrl = await QRCode.toDataURL('https://tmstatsgolf.com/signup', {
    width: 160,
    margin: 1,
    color: { dark: '#0F1117', light: '#F0F0F0' },
  })

  const stats = [
    { label: 'FAIRWAYS', value: '64%' },
    { label: 'GREENS', value: '56%' },
    { label: 'PUTTS', value: '29' },
    { label: 'BIRDIES+', value: '3' },
  ]
  const sg = [
    { label: 'Tee', value: '+0.8', color: '#22C55E' },
    { label: 'App', value: '+1.6', color: '#22C55E' },
    { label: 'A/G', value: '-0.4', color: '#EF4444' },
    { label: 'Putt', value: '+1.2', color: '#22C55E' },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: '#0F1117',
          paddingTop: '60px',
        }}
      >
        <div style={{ display: 'flex', width: '100%', height: '12px', backgroundColor: '#CC2222', position: 'absolute', top: 0 }} />
        <div style={{ display: 'flex', color: '#CC2222', fontSize: '58px', fontWeight: 700, letterSpacing: '10px', marginTop: '40px' }}>TM STATS</div>
        <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '30px', letterSpacing: '6px', marginTop: '8px' }}>TRACK TO IMPROVE</div>

        <div style={{ display: 'flex', color: '#F0F0F0', fontSize: '52px', fontWeight: 700, marginTop: '70px' }}>Bromborough Golf Club</div>
        <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '34px', marginTop: '10px' }}>11 June 2026 · 18 holes</div>

        <div style={{ display: 'flex', color: '#F0F0F0', fontSize: '250px', fontWeight: 700, marginTop: '20px', lineHeight: 1 }}>74</div>
        <div style={{ display: 'flex', color: '#F0F0F0', fontSize: '80px', fontWeight: 700 }}>+2</div>
        <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '34px', marginTop: '6px' }}>Par 72</div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '22px', marginTop: '50px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#1A1D27', borderRadius: '22px', width: '210px', height: '160px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', color: '#F0F0F0', fontSize: '56px', fontWeight: 700 }}>{s.value}</div>
              <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '24px', marginTop: '8px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* SG block */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1A1D27', borderRadius: '22px', width: '920px', marginTop: '34px', padding: '36px 44px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '28px', fontWeight: 700, letterSpacing: '2px' }}>STROKES GAINED</div>
            <div style={{ display: 'flex', color: '#22C55E', fontSize: '50px', fontWeight: 700 }}>+3.2</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '26px' }}>
            {sg.map(c => (
              <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
                <div style={{ display: 'flex', color: c.color, fontSize: '44px', fontWeight: 700 }}>{c.value}</div>
                <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '26px', marginTop: '6px' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div style={{ display: 'flex', backgroundColor: '#1A1D27', borderRadius: '22px', width: '920px', marginTop: '30px', padding: '30px 44px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '28px', fontWeight: 700, letterSpacing: '2px' }}>MENTAL PROCESS</div>
          <div style={{ display: 'flex', color: '#22C55E', fontSize: '50px', fontWeight: 700 }}>82%</div>
        </div>

        {/* Bottom band */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '46px', gap: '34px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR" width={120} height={120} style={{ borderRadius: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: '#F0F0F0', fontSize: '38px', fontWeight: 700 }}>tmstatsgolf.com</div>
            <div style={{ display: 'flex', color: '#9A9DB0', fontSize: '28px', marginTop: '6px' }}>Scan to analyse your game free</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/logo-white.png`} alt="TM Stats" width={220} style={{ marginLeft: '30px' }} />
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  )
}
