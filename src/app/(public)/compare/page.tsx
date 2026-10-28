import Link from 'next/link'
import type { Metadata } from 'next'
import { COMPETITORS } from '@/lib/compare'

export const metadata: Metadata = {
  title: 'TM Stats vs Arccos, Shot Scope and 18Birdies | Golf Stats Tracker Comparison',
  description:
    'Honest comparisons of TM Stats with Arccos Caddie, Shot Scope and 18Birdies: how each one tracks shots, what it costs, whether you get Strokes Gained, and who each is right for.',
  alternates: { canonical: '/compare' },
}

export default function ComparePage() {
  return (
    <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Compare golf stats trackers
      </p>
      <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        TM Stats against the trackers you have heard of
      </h1>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#9A9DB0' }}>
        I get asked this a lot at the club: why would I use TM Stats over Arccos, or a Shot Scope watch, or the free app everyone already has? Fair question. I have used all three and they are good products. These pages say where each one wins and where it does not.
      </p>
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#9A9DB0' }}>
        The short version: the hardware options track automatically but cost a couple of hundred pounds and, in Arccos&apos;s case, a yearly fee. TM Stats asks you for a minute a hole on your phone and gives you shot by shot Strokes Gained for £4.99 a month, with coaching on top.
      </p>

      <div className="space-y-3 mb-10">
        {COMPETITORS.map(c => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="block p-5 rounded-2xl"
            style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
          >
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
              TM Stats vs {c.name}
            </p>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>{c.tagline}</p>
          </Link>
        ))}
      </div>

      <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Try the no-hardware option first
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          Five rounds free, one with full Strokes Gained. If it is not for you, you have lost nothing.
        </p>
        <Link href="/signup" className="inline-block px-6 py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          Start free
        </Link>
      </div>
    </main>
  )
}
