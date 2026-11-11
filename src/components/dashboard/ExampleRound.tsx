import Link from 'next/link'

/**
 * Shown on the dashboard before a golfer has logged anything, so the first
 * screen is never empty: this is what a round looks like once it is in.
 * The numbers are a made-up round, clearly labelled as an example.
 */

const EXAMPLE = {
  score: 80,
  toPar: '+8',
  par: 72,
  handicap: 6,
  playedLike: '5',
  sgTotal: 1.6,
  categories: [
    { label: 'Off the tee', value: 1.4 },
    { label: 'Approach', value: -1.9 },
    { label: 'Around the green', value: 0.6 },
    { label: 'Putting', value: 1.5 },
  ],
}

const MAX_BAR = 2 // strokes that fill half the bar track

function fmt(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

interface Props {
  ctaHref?: string
  ctaLabel?: string
  note?: string
}

export default function ExampleRound({
  ctaHref = '/rounds/new',
  ctaLabel = 'Log your first round',
  note = 'Choose Full tracking to get your own Strokes Gained. Your first one is free.',
}: Props) {
  return (
    <div className="mb-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px dashed #3A3F58' }}>
      <div className="px-4 py-2 flex items-center justify-between text-left" style={{ backgroundColor: '#22263A' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#F59E0B' }}>
          Example round
        </p>
        <p className="text-xs" style={{ color: '#9A9DB0' }}>Not your data</p>
      </div>

      <div className="p-4 text-left">
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          This is what you get back after one round. A {EXAMPLE.handicap} handicapper shoots {EXAMPLE.score} and wants to know why.
        </p>

        {/* Score + played like */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="leading-none font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0', fontSize: '44px' }}>
              {EXAMPLE.score}
            </p>
            <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>
              <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{EXAMPLE.toPar}</span> · par {EXAMPLE.par}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide" style={{ color: '#9A9DB0' }}>Played like a</p>
            <p className="leading-none font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E', fontSize: '32px' }}>
              {EXAMPLE.playedLike}
            </p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>handicap</p>
          </div>
        </div>

        {/* SG bars */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>
          Strokes Gained vs a {EXAMPLE.handicap} handicap
        </p>
        <div className="space-y-2 mb-4">
          {EXAMPLE.categories.map(c => {
            const pct = Math.min(Math.abs(c.value) / MAX_BAR, 1) * 50
            const positive = c.value >= 0
            return (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: '#F0F0F0' }}>{c.label}</span>
                  <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: positive ? '#22C55E' : '#EF4444' }}>
                    {fmt(c.value)}
                  </span>
                </div>
                <div className="relative rounded-full" style={{ height: '6px', backgroundColor: '#22263A' }}>
                  <div className="absolute" style={{ left: '50%', top: '-2px', width: '1px', height: '10px', backgroundColor: '#4A4D60' }} />
                  <div
                    className="absolute rounded-full"
                    style={{
                      height: '6px',
                      width: `${pct}%`,
                      left: positive ? '50%' : `${50 - pct}%`,
                      backgroundColor: positive ? '#22C55E' : '#EF4444',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* The answer */}
        <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#22263A' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>Where the shots went</p>
          <p className="text-sm" style={{ color: '#F0F0F0' }}>
            Approach play cost <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#EF4444' }}>1.9</span> shots. Driving, short game and putting were all better than a {EXAMPLE.handicap} handicap. One thing to practise, not four.
          </p>
        </div>

        <Link
          href={ctaHref}
          className="block w-full text-center py-4 rounded-xl font-semibold"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
        >
          {ctaLabel}
        </Link>
        <p className="text-xs text-center mt-2" style={{ color: '#9A9DB0' }}>
          {note}
        </p>
      </div>
    </div>
  )
}
