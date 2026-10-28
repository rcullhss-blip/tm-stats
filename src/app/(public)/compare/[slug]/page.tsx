import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { COMPETITORS, TM_STATS, findCompetitor } from '@/lib/compare'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return COMPETITORS.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = findCompetitor(slug)
  if (!c) return {}
  const title = `TM Stats vs ${c.name}: Which Golf Stats Tracker Is Right for You?`
  const description = `${c.name} compared with TM Stats on tracking, price, Strokes Gained and who each suits. Written by a county golfer who has used both.`
  return {
    title: `${title} | TM Stats`,
    description,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: { title, description, type: 'article' },
  }
}

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold mb-3 mt-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-6" style={{ color: '#9A9DB0' }}>{children}</p>
)

function Row({ label, them, us }: { label: string; them: string; us: string }) {
  return (
    <div className="mb-6">
      <H2>{label}</H2>
      <div className="grid grid-cols-1 gap-3">
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Them</p>
          <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{them}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222260' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>TM Stats</p>
          <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{us}</p>
        </div>
      </div>
    </div>
  )
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params
  const c = findCompetitor(slug)
  if (!c) notFound()

  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Golf stats tracker comparison
      </p>
      <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        TM Stats vs <span style={{ color: '#CC2222' }}>{c.name}</span>
      </h1>
      <P>{c.summary}</P>

      <Row label="How each one tracks your shots" them={c.howItTracks} us={TM_STATS.howItTracks} />
      <Row label="What it costs" them={c.whatItCosts} us={TM_STATS.whatItCosts} />
      <Row label="Strokes Gained" them={c.strokesGained} us={TM_STATS.strokesGained} />

      <H2>Where {c.name} wins</H2>
      <ul className="mb-6 space-y-2">
        {c.pros.map(p => (
          <li key={p} className="text-sm leading-relaxed flex gap-2" style={{ color: '#9A9DB0' }}>
            <span style={{ color: '#22C55E' }}>+</span><span>{p}</span>
          </li>
        ))}
      </ul>

      <H2>Where it falls short</H2>
      <ul className="mb-6 space-y-2">
        {c.cons.map(p => (
          <li key={p} className="text-sm leading-relaxed flex gap-2" style={{ color: '#9A9DB0' }}>
            <span style={{ color: '#EF4444' }}>&minus;</span><span>{p}</span>
          </li>
        ))}
      </ul>

      <H2>Who {c.name} is best for</H2>
      <P>{c.bestFor}</P>

      <H2>My verdict</H2>
      <P>{c.verdict}</P>

      <p className="text-xs mb-8" style={{ color: '#4A4D60' }}>
        Prices checked {c.pricesChecked} from the manufacturer&apos;s own site or UK retailers. They change, so confirm before you buy. I have no commercial link with {c.name}.
      </p>

      <div className="p-5 rounded-2xl text-center mb-8" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          See your own Strokes Gained this week
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          Nothing to buy. Log your next round on your phone and find out where the shots went.
        </p>
        <Link href="/signup" className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          Start free
        </Link>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>More comparisons</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {COMPETITORS.filter(o => o.slug !== c.slug).map(o => (
          <Link key={o.slug} href={`/compare/${o.slug}`} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}>
            TM Stats vs {o.name}
          </Link>
        ))}
        <Link href="/golf-stats" className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}>
          Golf stats guide
        </Link>
      </div>
    </main>
  )
}
