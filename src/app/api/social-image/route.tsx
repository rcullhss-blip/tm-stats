import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Branded 1080×1080 Instagram post image.
// 5 colour themes (by content style) × 5 layouts (by week) — the layout
// rotates weekly (1→5 then recycles) so the feed never looks repetitive.
// Usage: /api/social-image?h=Headline&s=Sub&k=KICKER&theme=red&layout=2

interface Theme {
  bg: string
  surface: string    // panel colour for the card layout
  bar: string        // accent
  brand: string
  tagline: string
  kicker: string
  kickerBg: string
  headline: string
  sub: string
  footer: string
  footerSub: string
}

const THEMES: Record<string, Theme> = {
  dark: {
    bg: '#0F1117', surface: '#1A1D27', bar: '#CC2222', brand: '#CC2222', tagline: '#9A9DB0',
    kicker: '#CC2222', kickerBg: '#CC222220', headline: '#F0F0F0', sub: '#9A9DB0',
    footer: '#F0F0F0', footerSub: '#9A9DB0',
  },
  red: {
    bg: '#B81F1F', surface: '#A11A1A', bar: '#14161D', brand: '#FFFFFF', tagline: '#FFD9D9',
    kicker: '#FFFFFF', kickerBg: '#00000028', headline: '#FFFFFF', sub: '#FFE2E2',
    footer: '#FFFFFF', footerSub: '#FFD9D9',
  },
  light: {
    bg: '#F4F3EF', surface: '#FFFFFF', bar: '#CC2222', brand: '#CC2222', tagline: '#6B6E80',
    kicker: '#CC2222', kickerBg: '#CC222214', headline: '#14161D', sub: '#4A4D60',
    footer: '#14161D', footerSub: '#6B6E80',
  },
  green: {
    bg: '#0C2E22', surface: '#11402F', bar: '#D8C58A', brand: '#D8C58A', tagline: '#9DBCAE',
    kicker: '#D8C58A', kickerBg: '#D8C58A22', headline: '#F4F1E6', sub: '#B8CFC3',
    footer: '#F4F1E6', footerSub: '#9DBCAE',
  },
  slate: {
    bg: '#1B2436', surface: '#243049', bar: '#7FA8D9', brand: '#7FA8D9', tagline: '#8E9AB3',
    kicker: '#7FA8D9', kickerBg: '#7FA8D922', headline: '#EFF3FA', sub: '#AAB6CC',
    footer: '#EFF3FA', footerSub: '#8E9AB3',
  },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const headline = searchParams.get('h') ?? 'Know where you lose shots'
  const sub = searchParams.get('s') ?? 'Strokes Gained analytics for serious amateur golfers'
  const kicker = searchParams.get('k') ?? ''
  const t = THEMES[searchParams.get('theme') ?? 'dark'] ?? THEMES.dark
  const layout = Math.min(5, Math.max(1, parseInt(searchParams.get('layout') ?? '1') || 1))

  const brandRow = (justify: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: justify, width: '100%' }}>
      <div style={{ display: 'flex', color: t.brand, fontSize: '38px', fontWeight: 700, letterSpacing: '8px' }}>TM STATS</div>
      {justify === 'space-between' && (
        <div style={{ display: 'flex', color: t.tagline, fontSize: '22px', letterSpacing: '4px' }}>TRACK TO IMPROVE</div>
      )}
    </div>
  )

  const kickerBadge = kicker ? (
    <div style={{ display: 'flex', alignSelf: 'flex-start', backgroundColor: t.kickerBg, color: t.kicker, fontSize: '26px', fontWeight: 700, letterSpacing: '4px', padding: '12px 24px', borderRadius: '10px' }}>
      {kicker}
    </div>
  ) : null

  const footerRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', color: t.footer, fontSize: '32px', fontWeight: 700 }}>tmstatsgolf.com</div>
      <div style={{ display: 'flex', color: t.footerSub, fontSize: '25px' }}>Strokes Gained for amateur golfers</div>
    </div>
  )

  let body: React.ReactElement

  if (layout === 2) {
    // ── Layout 2: centred poster ──────────────────────────────────────────
    body = (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: t.bg, padding: '80px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: t.brand, fontSize: '36px', fontWeight: 700, letterSpacing: '10px' }}>TM STATS</div>
          <div style={{ display: 'flex', color: t.tagline, fontSize: '20px', letterSpacing: '6px', marginTop: '10px' }}>TRACK TO IMPROVE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {kicker ? <div style={{ display: 'flex', color: t.kicker, fontSize: '28px', fontWeight: 700, letterSpacing: '6px', marginBottom: '30px' }}>{kicker}</div> : null}
          <div style={{ display: 'flex', width: '140px', height: '8px', backgroundColor: t.bar, borderRadius: '4px', marginBottom: '42px' }} />
          <div style={{ display: 'flex', color: t.headline, fontSize: '72px', fontWeight: 700, lineHeight: 1.18, textAlign: 'center', maxWidth: '900px', justifyContent: 'center' }}>{headline}</div>
          <div style={{ display: 'flex', color: t.sub, fontSize: '34px', lineHeight: 1.45, marginTop: '34px', textAlign: 'center', maxWidth: '820px', justifyContent: 'center' }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', color: t.footer, fontSize: '30px', fontWeight: 700 }}>tmstatsgolf.com</div>
      </div>
    )
  } else if (layout === 3) {
    // ── Layout 3: bottom accent band ──────────────────────────────────────
    body = (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: t.bg }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '80px', justifyContent: 'space-between' }}>
          {brandRow('space-between')}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {kickerBadge}
            <div style={{ display: 'flex', color: t.headline, fontSize: '80px', fontWeight: 700, lineHeight: 1.12, maxWidth: '920px', marginTop: kicker ? '38px' : '0px' }}>{headline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', backgroundColor: t.bar, padding: '44px 80px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', color: t.bg, fontSize: '34px', fontWeight: 600, lineHeight: 1.35, maxWidth: '700px' }}>{sub}</div>
          <div style={{ display: 'flex', color: t.bg, fontSize: '28px', fontWeight: 700 }}>tmstatsgolf.com</div>
        </div>
      </div>
    )
  } else if (layout === 4) {
    // ── Layout 4: floating card ───────────────────────────────────────────
    body = (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: t.bg, padding: '64px', justifyContent: 'space-between' }}>
        {brandRow('space-between')}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: t.surface, borderRadius: '28px', padding: '70px 64px', border: `2px solid ${t.bar}40` }}>
          {kickerBadge}
          <div style={{ display: 'flex', color: t.headline, fontSize: '66px', fontWeight: 700, lineHeight: 1.18, marginTop: kicker ? '34px' : '0px' }}>{headline}</div>
          <div style={{ display: 'flex', color: t.sub, fontSize: '33px', lineHeight: 1.45, marginTop: '30px' }}>{sub}</div>
        </div>
        {footerRow}
      </div>
    )
  } else if (layout === 5) {
    // ── Layout 5: side rail, headline-first ───────────────────────────────
    body = (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: t.bg }}>
        <div style={{ display: 'flex', width: '26px', backgroundColor: t.bar }} />
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '76px 70px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {kicker ? <div style={{ display: 'flex', color: t.kicker, fontSize: '27px', fontWeight: 700, letterSpacing: '5px', marginBottom: '40px' }}>{kicker}</div> : null}
            <div style={{ display: 'flex', color: t.headline, fontSize: '84px', fontWeight: 700, lineHeight: 1.1, maxWidth: '900px' }}>{headline}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: t.sub, fontSize: '35px', lineHeight: 1.45, maxWidth: '840px', marginBottom: '56px' }}>{sub}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', color: t.brand, fontSize: '34px', fontWeight: 700, letterSpacing: '6px' }}>TM STATS</div>
              <div style={{ display: 'flex', color: t.footerSub, fontSize: '27px' }}>tmstatsgolf.com</div>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    // ── Layout 1: classic left (original) ─────────────────────────────────
    body = (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: t.bg, padding: '80px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', width: '120px', height: '10px', backgroundColor: t.bar, borderRadius: '5px', marginBottom: '40px' }} />
          {brandRow('space-between')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kickerBadge}
          <div style={{ display: 'flex', color: t.headline, fontSize: '74px', fontWeight: 700, lineHeight: 1.15, maxWidth: '920px', marginTop: kicker ? '38px' : '0px' }}>{headline}</div>
          <div style={{ display: 'flex', color: t.sub, fontSize: '36px', lineHeight: 1.4, marginTop: '34px', maxWidth: '880px' }}>{sub}</div>
        </div>
        {footerRow}
      </div>
    )
  }

  return new ImageResponse(body, { width: 1080, height: 1080 })
}
