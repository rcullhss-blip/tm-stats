import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Strokes Gained Explained: What It Is and How to Get Yours | TM Stats',
  description:
    'Strokes Gained explained in plain English by a county golfer. What it measures, the four categories, a worked example from a real round, and how to get your own numbers without buying hardware.',
  alternates: { canonical: '/strokes-gained' },
}

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold mb-3 mt-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-5" style={{ color: '#9A9DB0' }}>{children}</p>
)
const U = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} style={{ color: '#F0F0F0', textDecoration: 'underline' }}>{children}</Link>
)

const faqs = [
  {
    q: 'What is Strokes Gained in golf?',
    a: 'Strokes Gained compares every shot you hit with what a golfer at a chosen level would normally take from the same distance and lie. If you hit a shot that leaves you better placed than average, you gained strokes. If it leaves you worse placed, you lost them. Add it up by category and you can see exactly where a round was won or lost.',
  },
  {
    q: 'What are the four Strokes Gained categories?',
    a: 'Off the tee (tee shots on par 4s and 5s), approach (shots into the green from outside about 30 yards), around the green (shots from within about 30 yards that are not on the putting surface) and putting.',
  },
  {
    q: 'Do I need sensors or a watch to get Strokes Gained?',
    a: 'No. You need to know the distance and lie of each shot. Sensors and watches capture that automatically. An app like TM Stats lets you enter it on your phone in about a minute a hole, with no hardware to buy.',
  },
  {
    q: 'What is a good Strokes Gained number?',
    a: 'It depends on the baseline you are measured against. Against your own handicap level, zero means you played to your handicap in that category. Plus 1 in a category over a round is a very good day. Minus 2 is where the shots went. The useful part is not the total, it is which category is consistently negative over ten or more rounds.',
  },
]

export default function StrokesGainedPage() {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tmstatsgolf.com' },
        { '@type': 'ListItem', position: 2, name: 'Strokes Gained', item: 'https://www.tmstatsgolf.com/strokes-gained' },
      ],
    },
  ]

  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Strokes Gained</p>
      <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Strokes Gained explained, by someone who uses it <span style={{ color: '#CC2222' }}>every round</span>
      </h1>
      <P>
        For years I kept the usual stats. Fairways, greens, putts. I shot 74 one Saturday with 11 greens and 31 putts, and 74 the next Saturday with 7 greens and 27 putts. Same score, completely different rounds, and the stats told me nothing about which one I should be worried about. Strokes Gained did. This page is what I wish someone had explained to me at 19.
      </P>

      <H2>What Strokes Gained actually measures</H2>
      <P>
        Every spot on a golf course has an expected number of shots to hole out from there. From 150 yards in the fairway a scratch golfer averages about 2.9 shots to finish the hole. From 8 feet on the green it is about 1.5. Those numbers come from millions of recorded shots.
      </P>
      <P>
        Strokes Gained takes the expected number before your shot, subtracts the expected number after it, and takes one off for the shot you just hit. Hit that 150 yard approach to 8 feet and you went from 2.9 to 1.5 using one shot: you gained 0.4 of a stroke. Dump it in the bunker and you probably lost half a stroke. Do that for every shot in the round and you get a number for each part of your game.
      </P>

      <H2>The four categories</H2>
      <P>
        Off the tee covers tee shots on par 4s and 5s. Approach is any shot into the green from outside about 30 yards, including par 3 tee shots. Around the green is anything inside 30 yards that is not a putt: chips, pitches, bunker shots. Putting is putting. The split matters because a golfer who loses two shots a round around the green needs a completely different practice plan from one who loses two off the tee.
      </P>

      <H2>A worked example from my own round</H2>
      <P>
        Take that first 74. Measured against a scratch baseline it came out at plus 0.8 off the tee, minus 2.1 on approach, plus 0.3 around the green and minus 0.6 putting. Total minus 1.6, which is a 74 on a par 72 course playing roughly to its rating, so the maths holds.
      </P>
      <P>
        The 11 greens had looked fine on the card. The Strokes Gained said the approaches that did find the green were 35 and 40 feet away, and the four that missed were short in the bunkers. My wedges were the problem, not my putter. Three weeks of hitting 90 to 120 yard shots to a towel on the range and the approach number was positive by the end of the month. The traditional stats would have sent me to the putting green.
      </P>

      <H2>Why it beats fairways, greens and putts</H2>
      <P>
        Those three stats count outcomes without measuring quality. A green hit to 50 feet and a green hit to 5 feet are both a green in regulation. A three-putt from 60 feet is bad luck; a three-putt from 15 feet is a problem. Putts per round punishes you for hitting greens, because you then face long first putts, and rewards you for missing them and chipping close. Strokes Gained removes all of that. Every shot is judged against the same question: did it leave you better or worse off than it should have?
      </P>
      <P>
        If you want to see what the traditional numbers look like at your level anyway, the <U href="/golf-stats">golf stats benchmarks</U> cover greens, fairways, putts, scrambling and sand saves by handicap.
      </P>

      <H2>How to get your own Strokes Gained numbers</H2>
      <P>
        You need the distance and lie of every shot. Sensor systems and GPS watches capture that for you, and I have written honest <U href="/compare">comparisons of Arccos, Shot Scope and 18Birdies</U> if you are considering one. The other way is to enter the shots yourself on your phone as you go. It takes about a minute a hole, which is less time than most people spend looking for a tee peg, and it is what I built TM Stats to do. The app works out all four categories against a baseline for your handicap, and the coaching layer turns the numbers into something to do on Tuesday night.
      </P>
      <P>
        Whichever way you do it, two rules. Log every round, including the bad ones, because the bad ones are where the information is. And give it ten rounds before you decide anything. One round of Strokes Gained is a story. Ten rounds is a pattern.
      </P>

      <H2>Common questions</H2>
      {faqs.map(f => (
        <div key={f.q} className="mb-5">
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>{f.q}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{f.a}</p>
        </div>
      ))}

      <div className="p-5 rounded-2xl text-center mt-8 mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>See your own four numbers</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>Your first five rounds are free, with full Strokes Gained on one of them. No card, no hardware.</p>
        <Link href="/signup" className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Start free</Link>
      </div>
      <p className="text-xs" style={{ color: '#4A4D60' }}>More reading on the <U href="/blog">blog</U>: how to break 80 and 90, and what the numbers say about practice.</p>
    </main>
  )
}
