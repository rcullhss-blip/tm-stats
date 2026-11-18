import Link from 'next/link'

interface Props {
  roundId: string
  title: string            // event or course name
  subtitle?: string
  score?: number | null
  compact?: boolean
}

/** A round whose pars and scores are already in and is waiting for the golfer's stats. */
export default function StatsPendingCard({ roundId, title, subtitle, score, compact = false }: Props) {
  return (
    <Link
      href={`/rounds/${roundId}/finish`}
      className="flex items-center justify-between p-4 rounded-xl mb-3"
      style={{ backgroundColor: '#1A1D27', border: '1px solid #CC2222', minHeight: '64px' }}
    >
      <div className="min-w-0 pr-3">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>Scores are in · add your stats</p>
        <p className="text-sm font-semibold truncate" style={{ color: '#F0F0F0' }}>{title}</p>
        {!compact && (
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
            {subtitle ? `${subtitle}. ` : ''}Every hole has its par and score. Two minutes for quick stats.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {score != null && <span className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{score}</span>}
        <span className="text-lg" style={{ color: '#CC2222' }}>→</span>
      </div>
    </Link>
  )
}
