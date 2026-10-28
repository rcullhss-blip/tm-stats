import Link from 'next/link'
import type { Metadata } from 'next'
import { BANDS, STATS } from '@/lib/seo-stats'

export const metadata: Metadata = {
  title: 'Golf Stats: What to Track, What Is Good and Where You Lose Shots | TM Stats',
  description:
    'A plain guide to golf stats. Which numbers matter, what a good GIR%, fairways hit, putts and scrambling rate looks like for your handicap, and why Strokes Gained tells you more than any of them.',
  alternates: { canonical: '/golf-stats' },
}

export default function GolfStatsIndexPage() {
  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Golf stats guide
      </p>
      <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Golf stats: what to track, what&apos;s good, and where you <span style={{ color: '#CC2222' }}>really</span> lose shots
      </h1>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#9A9DB0' }}>
        I played college golf in the States and county golf for Cheshire, and for most of that time I tracked my stats the way everyone does: fairways, greens, putts, scribbled on the card. It told me almost nothing. A missed green from 90 yards and a missed green from 210 yards both went down as a miss, and a 40-foot two-putt looked the same as a four-footer I&apos;d missed.
      </p>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        This page is the guide I wish I&apos;d had. Which golf stats are worth tracking, what a good number looks like for your handicap, and why Strokes Gained is the one measure that tells you what to practise.
      </p>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        The golf stats worth tracking
      </h2>
      <p className="text-sm leading-relaxed mb-3" style={{ color: '#9A9DB0' }}>
        Five traditional stats cover most of the game: fairways hit, greens in regulation, putts per round, scrambling (getting up and down when you miss the green) and sand saves. They are quick to record and they are what the benchmarks below are built on.
      </p>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        The catch is that none of them measures quality. A green in regulation to 50 feet counts the same as one to 5 feet. That is why the better golfers you know have moved to Strokes Gained, which compares every shot with what a player at your level would normally do from that distance and lie. It turns &quot;I putted badly&quot; into &quot;I lost 1.8 strokes on the greens, mostly from 6 to 10 feet&quot;.
      </p>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        What&apos;s a good number for your handicap?
      </h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#9A9DB0' }}>
        Comparing yourself with tour players tells you nothing useful. These benchmarks show what golfers at each handicap level actually record, so you can see which parts of your game are ahead of your handicap and which are holding it up. Pick a stat and your band.
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

      <h2 className="text-lg font-bold mb-3 mt-4" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        How to track your golf stats
      </h2>
      <p className="text-sm leading-relaxed mb-3" style={{ color: '#9A9DB0' }}>
        You have three options. A notebook or spreadsheet is free and fine for the five basics, but you will never get Strokes Gained out of it. Sensor systems that clip to your clubs are accurate but cost a few hundred pounds and tend to get left in the bag. The third option is a golf stats tracker app on your phone, where you enter each shot as you go. That is what I built TM Stats to be: hole by hole entry in under a minute, Strokes Gained worked out for you, and a clear read on what to practise.
      </p>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        Whichever you pick, the rule is the same. Track every round, not just the good ones, and give it ten rounds before you draw any conclusions. The <Link href="/blog" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>blog</Link> covers the detail: what Strokes Gained is, how to break 80 and 90, and what the numbers say about practice.
      </p>

      <div className="p-5 rounded-2xl text-center mt-10" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Stop guessing. Measure it.
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          TM Stats tracks all of these automatically, plus Strokes Gained. Free to start, no card needed.
        </p>
        <Link href="/signup" className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          Start free
        </Link>
      </div>
    </main>
  )
}
