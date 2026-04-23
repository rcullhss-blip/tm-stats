export default function AboutPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        About TM Stats
      </p>
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Built by a golfer,<br />for golfers.
      </h1>

      <div className="space-y-6 text-base leading-relaxed" style={{ color: '#9A9DB0' }}>
        <p>
          TM Stats was built by Rob Cull — former county golfer (Cheshire) and NCAA Division 2 player at Newberry College, South Carolina. Like most serious amateurs, Rob spent years hunting for a stats tool that actually helped him improve, not just track numbers.
        </p>

        <p>
          The ones that existed were either built for tour pros with expensive hardware, or too basic to give any useful insight. Nothing hit the sweet spot: proper Strokes Gained analytics, at a price that made sense, on a phone you could use on the course.
        </p>

        <p style={{ color: '#F0F0F0' }}>
          So he built it.
        </p>

        <div className="p-5 rounded-2xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            The mission
          </h2>
          <p>
            Make Tour-level analytics accessible to every serious amateur. Track → Analyse → Improve. No guesswork. No expensive gadgets. Just the data that tells you exactly what to practice.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">📊</span>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: '#F0F0F0' }}>Strokes Gained — the only stat that matters</p>
              <p className="text-sm">The same methodology used on the PGA Tour, now available for club golfers. Know exactly which part of your game is costing you shots.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">🤖</span>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: '#F0F0F0' }}>AI coaching that actually knows your game</p>
              <p className="text-sm">Seven coaching modes, each with a different perspective. Feedback based on your stats, your tendencies, and what you tell it you&apos;re working on — not generic tips.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">📱</span>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: '#F0F0F0' }}>Built for the course, not the office</p>
              <p className="text-sm">Mobile-first, fast to enter, works in any conditions. Designed around how golfers actually play.</p>
            </div>
          </div>
        </div>

        <p className="text-sm pt-2" style={{ color: '#4A4D60' }}>
          Questions?{' '}
          <a href="/contact" style={{ color: '#9A9DB0' }}>
            Get in touch
          </a>
        </p>
      </div>
    </div>
  )
}
