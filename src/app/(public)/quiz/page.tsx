import Link from 'next/link'
import type { Metadata } from 'next'
import ShotsQuiz from '@/components/seo/ShotsQuiz'

export const metadata: Metadata = {
  title: 'Where Are You Losing Shots? Free Golf Quiz | TM Stats',
  description:
    'Five quick questions about your fairways, greens, putts and short game. See which part of your golf costs you the most shots for your handicap. No sign-up.',
  alternates: { canonical: '/quiz' },
  openGraph: {
    title: 'Where are you losing shots? Free golf quiz',
    description: 'Five quick questions. See which part of your game costs you most for your handicap. No sign-up.',
    url: '/quiz',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const faqs = [
  { q: 'How does the quiz work out where I lose shots?', a: 'It takes your fairways, greens, putts and up and downs and compares each one with the benchmark for golfers at your handicap. Each gap is turned into rough shots per round, so the four areas can be put side by side.' },
  { q: 'How accurate is it?', a: 'It is a quick read from four numbers, good enough to show which area is furthest from your level. It cannot see distances, clubs or penalty shots. Strokes Gained measures every shot, and that is what TM Stats gives you for a round you log shot by shot.' },
  { q: 'Who am I being compared with?', a: 'Golfers in your own handicap band, from scratch through to 29 and over. They are the same bands as our golf stats benchmarks and our Strokes Gained baselines, so a 12 handicap is compared with 10 to 14 handicaps, not with tour players.' },
  { q: 'Do I need an account?', a: 'No. The quiz runs in your browser, takes about a minute, and nothing you enter is saved.' },
]

export default function QuizPage() {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Where are you losing shots? Golf quiz', url: 'https://www.tmstatsgolf.com/quiz', applicationCategory: 'SportsApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' }, author: { '@type': 'Organization', name: 'TM Stats' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tmstatsgolf.com' },
      { '@type': 'ListItem', position: 2, name: 'Where are you losing shots?', item: 'https://www.tmstatsgolf.com/quiz' },
    ] },
  ]
  return (
    <div className="px-6 py-10 max-w-lg mx-auto w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Free quiz, one minute</p>
      <h1 className="text-3xl font-bold mb-3 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Where are you losing shots?
      </h1>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#9A9DB0' }}>
        Five quick questions about a normal round. You get the part of your game that costs you most, measured against golfers at your own handicap. No sign-up.
      </p>

      <ShotsQuiz />

      <h2 className="text-lg font-bold mb-3 mt-10" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>What the quiz looks at</h2>
      <ul className="text-sm space-y-2 mb-8" style={{ color: '#9A9DB0' }}>
        <li><span style={{ color: '#F0F0F0' }}>Off the tee:</span> how many fairways you hit out of 14.</li>
        <li><span style={{ color: '#F0F0F0' }}>Approach play:</span> how many greens you hit in regulation out of 18.</li>
        <li><span style={{ color: '#F0F0F0' }}>Short game:</span> how often you get up and down when you miss a green.</li>
        <li><span style={{ color: '#F0F0F0' }}>Putting:</span> your putts per round, adjusted for how many greens you hit, because more greens means longer first putts.</li>
      </ul>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        Each one is compared with the <Link href="/golf-stats" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>golf stats benchmarks for your handicap</Link>. For the full picture, read how <Link href="/strokes-gained" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Strokes Gained</Link> works or try a hole in the <Link href="/strokes-gained-calculator" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Strokes Gained calculator</Link>.
      </p>

      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Common questions</h2>
      {faqs.map(f => (
        <div key={f.q} className="mb-5">
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>{f.q}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{f.a}</p>
        </div>
      ))}
    </div>
  )
}
