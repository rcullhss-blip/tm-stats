import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { allSeoPages, findSeoPage, BANDS } from '@/lib/seo-stats'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return allSeoPages().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = findSeoPage(slug)
  if (!page) return {}
  const title = page.stat.question(page.band)
  return {
    title: `${title} | TM Stats`,
    description: page.stat.answer(page.band).slice(0, 158),
    openGraph: { title, description: page.stat.answer(page.band).slice(0, 158), type: 'article' },
  }
}

export default async function GolfStatPage({ params }: Props) {
  const { slug } = await params
  const page = findSeoPage(slug)
  if (!page) notFound()

  const { band, stat } = page

  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Golf stats benchmarks
      </p>
      <h1 className="text-3xl font-bold mb-5 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        {stat.question(band)}
      </h1>

      {/* Direct answer */}
      <div className="p-5 rounded-2xl mb-8" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222240' }}>
        <p className="text-5xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
          {stat.value(band)}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{stat.answer(band)}</p>
      </div>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        What this stat means
      </h2>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>{stat.explainer}</p>

      {/* Benchmark table across all bands */}
      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        {stat.name} by handicap
      </h2>
      <div className="rounded-xl overflow-hidden mb-8" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        {BANDS.map((b, i) => (
          <div
            key={b.slug}
            className="flex items-center justify-between py-3 px-4"
            style={{
              borderBottom: i < BANDS.length - 1 ? '1px solid #2E3247' : 'none',
              backgroundColor: b.slug === band.slug ? '#CC222215' : 'transparent',
            }}
          >
            <span className="text-sm" style={{ color: b.slug === band.slug ? '#F0F0F0' : '#9A9DB0' }}>
              {b.label}
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: b.slug === band.slug ? '#22C55E' : '#F0F0F0' }}>
              {stat.tableValue(b)}
            </span>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        How to improve it
      </h2>
      <p className="text-sm leading-relaxed mb-10" style={{ color: '#9A9DB0' }}>{stat.improve}</p>

      {/* CTA */}
      <div className="p-5 rounded-2xl text-center mb-8" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Where do <span style={{ color: '#CC2222' }}>you</span> stand?
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          TM Stats tracks every one of these numbers automatically — plus Strokes Gained, the tour-level stat that shows exactly where your shots go. Free to start, no card needed.
        </p>
        <Link
          href="/signup"
          className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          Track your stats free
        </Link>
      </div>

      {/* Related pages */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
        More benchmarks
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {allSeoPages()
          .filter(p => p.slug !== slug && (p.band.slug === band.slug || p.stat.slug === stat.slug))
          .slice(0, 8)
          .map(p => (
            <Link
              key={p.slug}
              href={`/golf-stats/${p.slug}`}
              className="px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
            >
              {p.stat.name} — {p.band.range}
            </Link>
          ))}
      </div>
    </main>
  )
}
