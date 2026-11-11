import Link from 'next/link'
import { fmtHandicapLevel, type HandicapLevels } from '@/lib/handicap-level'

/**
 * Top of the Stats page (Pro): the handicap each part of the game plays like,
 * the Strokes Gained behind it, which way it is heading, and the distance
 * bands that gain and cost the most.
 */

export interface CategoryForm {
  key: 'offTee' | 'approach' | 'aroundGreen' | 'putting'
  label: string
  level: number | null
  sgPerRound: number
  // Change in SG per round, recent rounds against the ones before. Null when
  // there are not enough rounds to compare.
  trend: number | null
}

export interface BandRank {
  label: string
  sgPerRound: number
  shots: number
}

interface Props {
  isPro: boolean
  roundsUsed: number
  handicap: number | null
  overall: HandicapLevels['total']
  categories: CategoryForm[]
  best: BandRank[]
  worst: BandRank[]
  trendNote: string | null
}

function fmtSG(n: number): string {
  if (Math.abs(n) < 0.05) return '0.0'
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function trendText(t: number | null): { text: string; color: string } | null {
  if (t === null) return null
  const amount = `${Math.abs(t).toFixed(1)} a round`
  if (t >= 1.0) return { text: `Improving fast, up ${amount}`, color: '#22C55E' }
  if (t >= 0.3) return { text: `Improving, up ${amount}`, color: '#22C55E' }
  if (t <= -1.0) return { text: `Slipping fast, down ${amount}`, color: '#EF4444' }
  if (t <= -0.3) return { text: `Slipping, down ${amount}`, color: '#F59E0B' }
  return { text: 'Steady', color: '#9A9DB0' }
}

function levelColor(level: number, handicap: number | null): string {
  if (handicap === null) return '#F0F0F0'
  if (level <= handicap - 1.5) return '#22C55E'
  if (level >= handicap + 1.5) return '#EF4444'
  return '#F0F0F0'
}

export default function GameLevelCard({ isPro, roundsUsed, handicap, overall, categories, best, worst, trendNote }: Props) {
  if (!isPro) {
    return (
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222240' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Game level · Pro</p>
        <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>
          Which part of your game is holding your handicap back?
        </p>
        <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
          Pro turns Strokes Gained into the handicap each part of your game plays like: driving, approach, short game and putting, with the distances that cost you most.
        </p>
        <Link href="/upgrade" className="inline-block px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          See Pro
        </Link>
      </div>
    )
  }

  if (roundsUsed === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>Game level</h2>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
          last {roundsUsed} full tracking round{roundsUsed !== 1 ? 's' : ''}
        </span>
      </div>

      {overall !== null && (
        <div className="p-4 rounded-xl mb-3 flex items-end justify-between" style={{ backgroundColor: '#1A1D27' }}>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#9A9DB0' }}>You are playing like</p>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>
              {handicap !== null ? <>Your handicap is <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{handicap}</span></> : 'Add your handicap in Settings to compare'}
            </p>
          </div>
          <p className="leading-none font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: levelColor(overall, handicap), fontSize: '40px' }}>
            {fmtHandicapLevel(overall)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        {categories.map(c => {
          const t = trendText(c.trend)
          return (
            <div key={c.key} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#9A9DB0' }}>{c.label}</p>
              <p className="leading-none font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: c.level !== null ? levelColor(c.level, handicap) : '#9A9DB0', fontSize: '30px' }}>
                {c.level !== null ? fmtHandicapLevel(c.level) : '—'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>
                handicap level · <span style={{ fontFamily: 'var(--font-dm-mono)', color: c.sgPerRound >= 0 ? '#22C55E' : '#EF4444' }}>{fmtSG(c.sgPerRound)}</span> SG
              </p>
              {t && <p className="text-xs mt-1" style={{ color: t.color }}>{t.text}</p>}
            </div>
          )
        })}
      </div>

      {trendNote && <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>{trendNote}</p>}

      {(best.length > 0 || worst.length > 0) && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#22C55E' }}>Gaining most</p>
              {best.map(b => (
                <div key={b.label} className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: '#F0F0F0' }}>{b.label}</span>
                  <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: b.sgPerRound >= 0 ? '#22C55E' : '#EF4444' }}>{fmtSG(b.sgPerRound)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#EF4444' }}>Costing most</p>
              {worst.map(b => (
                <div key={b.label} className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: '#F0F0F0' }}>{b.label}</span>
                  <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: b.sgPerRound >= 0 ? '#22C55E' : '#EF4444' }}>{fmtSG(b.sgPerRound)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Strokes Gained per round, by distance.</p>
        </div>
      )}
    </div>
  )
}
