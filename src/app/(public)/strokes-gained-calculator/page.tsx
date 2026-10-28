import Link from 'next/link'
import type { Metadata } from 'next'
import SgCalculator from '@/components/seo/SgCalculator'

export const metadata: Metadata = {
  title: 'Strokes Gained Calculator: Work Out Any Shot in Seconds | TM Stats',
  description:
    'Free Strokes Gained calculator. Pick your handicap level, enter where a shot started and where it finished, and see how many strokes it gained or lost against golfers at your level. No sign-up.',
  alternates: { canonical: '/strokes-gained-calculator' },
}

const faqs = [
  { q: 'How does the Strokes Gained calculator work?', a: 'Every spot on the course has an expected number of strokes to hole out for a golfer at a given level. The calculator takes the expected strokes from where your shot started, subtracts the expected strokes from where it finished, and subtracts one for the shot itself. A positive number means the shot was better than average for your level.' },
  { q: 'Where do the expected strokes numbers come from?', a: 'They are baselines built on the research behind Strokes Gained, adjusted for handicap bands so a 15 handicap is compared with other 15 handicaps rather than with tour players. They are the same baselines TM Stats uses to score full rounds.' },
  { q: 'What counts as a good Strokes Gained number for one shot?', a: 'Most shots sit between minus 0.3 and plus 0.3. A tee shot into the trees or a chunked wedge can cost more than a full stroke. A holed putt from 20 feet gains roughly half a stroke. Over a round, the useful figure is the total by category, which is what the app gives you.' },
  { q: 'Is this calculator free?', a: 'Yes, and it needs no sign-up. If you want Strokes Gained for every shot across a whole round, and split into the four categories, TM Stats does that from your phone and the first five rounds are free.' },
]

export default function CalculatorPage() {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Strokes Gained Calculator', url: 'https://www.tmstatsgolf.com/strokes-gained-calculator', applicationCategory: 'SportsApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' }, author: { '@type': 'Organization', name: 'TM Stats' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tmstatsgolf.com' },
      { '@type': 'ListItem', position: 2, name: 'Strokes Gained', item: 'https://www.tmstatsgolf.com/strokes-gained' },
      { '@type': 'ListItem', position: 3, name: 'Calculator', item: 'https://www.tmstatsgolf.com/strokes-gained-calculator' },
    ] },
  ]
  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Free tool</p>
      <h1 className="text-3xl font-bold mb-3 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Strokes Gained calculator
      </h1>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#9A9DB0' }}>
        Pick your level, say where a shot started and where it finished, and see what it was worth against golfers like you. No sign-up. If you have never seen the method before, the <Link href="/strokes-gained" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Strokes Gained explainer</Link> is two minutes.
      </p>

      <SgCalculator />

      <h2 className="text-lg font-bold mb-3 mt-10" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Try these</h2>
      <ul className="text-sm space-y-2 mb-8" style={{ color: '#9A9DB0' }}>
        <li>A 10 handicap hits a 150 yard approach from the fairway to 25 feet. Roughly plus 0.2. A good shot, not a great one.</li>
        <li>The same golfer puts it in a greenside bunker. Roughly minus 0.4. That is where a bogey comes from.</li>
        <li>Holing a 15 foot putt. About plus 0.5, which is why a run of made putts feels like free shots.</li>
        <li>A drive from 400 yards that ends 220 yards out in the rough. Barely negative. Tee shots cost less than most golfers think unless they go out of play.</li>
      </ul>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Common questions</h2>
      {faqs.map(f => (
        <div key={f.q} className="mb-5">
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>{f.q}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{f.a}</p>
        </div>
      ))}
      <p className="text-xs mt-6" style={{ color: '#4A4D60' }}>
        More free tools: <Link href="/golf-stats" style={{ textDecoration: 'underline' }}>golf stats benchmarks by handicap</Link> and <Link href="/compare" style={{ textDecoration: 'underline' }}>app comparisons</Link>.
      </p>
    </main>
  )
}
