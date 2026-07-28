import Link from 'next/link'
import type { Metadata } from 'next'
import { BANDS, STATS } from '@/lib/seo-stats'

export const metadata: Metadata = {
  title: 'Golf Stats Benchmarks by Handicap | TM Stats',
  description:
    'What is a good GIR%, fairways hit, putts per round, scrambling and sand save percentage for your handicap? Benchmark every stat against golfers at your level.',
}

export default function GolfStatsIndexPage() {
  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Golf stats benchmarks
      </p>
      <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        What&apos;s a good number — for <span style={{ color: '#CC2222' }}>your</span> handicap?
      </h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        Comparing yourself to tour players tells you nothing. These benchmarks show what golfers at each handicap level actually record — so you know which parts of your game are ahead, and which are costing you shots.
      </p>

      {STATS.map(stat => (
        <div key={stat.slug} className="mb-7">
          <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            {stat.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {BANDS.map(band => (
              <Link
                key={band.slug}
                href={`/golf-stats/${stat.slug}-${band.slug}`}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
              >
                {band.range} handicap
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="p-5 rounded-2xl text-center mt-10" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Stop guessing — measure it
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          TM Stats tracks all of these automatically, plus Strokes Gained. Free to start.
        </p>
        <Link href="/signup" className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          Start free
        </Link>
      </div>
    </main>
  )
}
