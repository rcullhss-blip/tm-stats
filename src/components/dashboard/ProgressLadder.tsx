import Link from 'next/link'

/**
 * First three rounds: shows what each one unlocks, so a new golfer always has
 * a reason to log the next. Hidden once all three are done.
 */

interface Props {
  roundCount: number
  isPro: boolean
}

export default function ProgressLadder({ roundCount, isPro }: Props) {
  if (roundCount >= 3) return null

  const steps = [
    { n: 1, title: 'Your round, broken down', detail: 'Strokes Gained on your first full tracking round, and a card to share it.' },
    { n: 2, title: 'Round against round', detail: 'Compare two rounds side by side and see your first trend lines.' },
    { n: 3, title: 'Your patterns', detail: isPro ? 'Personal bests, and Pattern Finder reads across your rounds.' : 'Personal bests, and enough rounds to see what keeps happening.' },
  ]
  const next = roundCount + 1

  return (
    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9A9DB0' }}>
          Your first 3 rounds
        </p>
        <p className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
          {roundCount}/3
        </p>
      </div>

      {/* Progress track */}
      <div className="flex gap-1.5 mb-4">
        {steps.map(s => (
          <div
            key={s.n}
            className="flex-1 rounded-full"
            style={{ height: '6px', backgroundColor: s.n <= roundCount ? '#22C55E' : '#22263A' }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {steps.map(s => {
          const done = s.n <= roundCount
          const isNext = s.n === next
          return (
            <div key={s.n} className="flex items-start gap-3">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 text-xs font-medium"
                style={{
                  width: '24px',
                  height: '24px',
                  fontFamily: 'var(--font-dm-mono)',
                  backgroundColor: done ? '#22C55E' : isNext ? '#CC2222' : '#22263A',
                  color: done ? '#0F1117' : isNext ? '#F0F0F0' : '#9A9DB0',
                }}
              >
                {done ? '✓' : s.n}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: done ? '#9A9DB0' : '#F0F0F0' }}>
                  {s.title}
                </p>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{s.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      {roundCount > 0 && (
        <Link
          href="/rounds/new"
          className="block w-full text-center py-3 rounded-xl font-semibold text-sm mt-4"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}
        >
          Log round {next}
        </Link>
      )}
    </div>
  )
}
