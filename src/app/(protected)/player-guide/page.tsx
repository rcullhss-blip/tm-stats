import Link from 'next/link'

const sections = [
  {
    icon: '⛳',
    title: 'Log a Round',
    color: '#CC2222',
    content: `Every improvement starts with data. Log your round hole by hole using Quick Stats (fast, scorecard-style) or Full Tracking (shot by shot). Full Tracking takes about 30 seconds extra per hole but unlocks Strokes Gained — the most powerful stat in golf.`,
    bullets: [
      'Quick Stats: enter par, score, FIR, GIR, and putts per hole',
      'Full Tracking: enter each shot with lie type and distance to pin',
      'Both modes build your scoring history and trend charts',
    ],
  },
  {
    icon: '📊',
    title: 'Strokes Gained Explained',
    color: '#22C55E',
    content: `Strokes Gained (SG) is the exact same stat used on the PGA Tour. It measures how much better or worse you performed than a benchmark golfer at your handicap level — for every single shot.`,
    bullets: [
      'SG Off Tee: are your drives setting up easy approach shots?',
      'SG Approach: are you hitting greens from the right distances?',
      'SG Around the Green: chips, pitches, and bunker play',
      'SG Putting: are you saving shots on the green?',
      'Positive SG = you gained shots vs your benchmark. Negative = you gave them away.',
    ],
    callout: 'Most amateur golfers think they lose shots off the tee. SG often reveals the real culprit is putting or approach play. Now you can see the truth.',
  },
  {
    icon: '🤖',
    title: 'AI Coaching (Pro)',
    color: '#9A9DB0',
    content: `After every round, your AI coach analyses your exact numbers and gives specific, actionable feedback. Not generic golf tips — feedback based on your actual data from that round.`,
    bullets: [
      'Round coaching: drills targeting your biggest weakness from that round',
      'Round review: identifies WEAKNESS, FIX, and best coaching mode for your game',
      'Practice plan: a structured 45-minute practice session built from your data',
      'Overall stats coaching: big-picture trends across all your rounds',
      'Choose your coaching style: Club Pro, Technical, Short Game, Encourager, and more',
    ],
    callout: 'Set your coaching style and game context in Profile → Settings. The more context you give, the more specific the feedback.',
  },
  {
    icon: '📈',
    title: 'Stats Page (Pro)',
    color: '#CC2222',
    content: `Your full statistical picture across every round you have logged. Filter by time range, round type, or 9/18 holes. See where your handicap is really coming from.`,
    bullets: [
      'Scoring trends, ball striking, short game, and putting breakdowns',
      'SG trend charts across all 4 categories',
      'Benchmark layer: how you compare to your handicap band average',
      'Score impact simulator: see what fixing one area would do to your score',
      'Personal bests and scoring distribution',
      'Handicap trend chart',
    ],
  },
  {
    icon: '🧠',
    title: 'Mental Game (Pro)',
    color: '#9A9DB0',
    content: `Talk through the mental side of your game with an experienced golf mentor. Not a therapist — a trusted playing partner who has been around the game for years. Get a calm perspective on what is going on between the ears.`,
    bullets: [
      'Free-text conversation — say whatever is on your mind',
      'Your conversations are saved so you can continue them later',
      'Start a new chat any time with a fresh context',
      'Topics: confidence, competition nerves, bad hole recovery, swing thoughts, and more',
    ],
  },
  {
    icon: '🗓',
    title: 'Dashboard',
    color: '#CC2222',
    content: `Your home screen. See your recent form at a glance, get a pre-round plan before you play, and find out what your biggest opportunity area is right now.`,
    bullets: [
      'Training Focus: your weakest SG category across recent rounds',
      'One Shot Fix: the single most impactful thing to work on',
      'Pre-Round Plan: 3 course management tips tailored to your game',
      'Pattern Finder: AI spots patterns in your scoring across rounds',
      'Recent rounds list: quick access to every round you have logged',
    ],
  },
  {
    icon: '👤',
    title: 'Profile & Settings',
    color: '#9A9DB0',
    content: `Set up your profile to get the most out of TM Stats. The more context you give, the better the coaching.`,
    bullets: [
      'Handicap: used to calibrate your Strokes Gained benchmarks',
      'SG Baseline: override the auto-calculated skill level if needed',
      'Coach persona: choose your preferred coaching style',
      'Feedback level: Simple, Intermediate, or Advanced coaching depth',
      'Game context: tell your coach what you are working on, your tendencies, your goals — this is the most important setting for personalised AI feedback',
    ],
  },
  {
    icon: '🔓',
    title: 'Getting the Most Out of TM Stats',
    color: '#22C55E',
    content: `The more data you log, the more accurate and useful every feature becomes. Here is how to build a game you can actually track.`,
    bullets: [
      'Log at least 5 full-tracking rounds before drawing conclusions from SG data',
      'Fill in your Game Context in Profile — it makes AI feedback 10x more specific',
      'Use the Mental Game chat before and after rounds where your head isn\'t in it',
      'Check your Stats page weekly, not just after bad rounds',
      'Review the AI coaching after every round — even good ones have lessons',
    ],
    callout: 'TM Stats is built by a golfer who played county and NCAA Division 2 golf. Every feature exists because it actually helps you improve. Track to improve.',
  },
]

export default function PlayerGuidePage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <Link href="/dashboard" className="flex items-center gap-1 text-sm mb-6" style={{ color: '#9A9DB0' }}>
        ← Back
      </Link>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>
          Player Guide
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          How TM Stats improves your game
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
          Everything you need to know to track smarter, practise better, and shoot lower scores.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #2E3247' }}>
              <span className="text-2xl">{s.icon}</span>
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
                {s.title}
              </h2>
            </div>

            {/* Content */}
            <div className="px-4 pt-3 pb-4">
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#9A9DB0' }}>
                {s.content}
              </p>

              <ul className="space-y-2 mb-3">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex-shrink-0 mt-0.5" style={{ color: s.color }}>•</span>
                    <span className="text-sm" style={{ color: '#9A9DB0' }}>{b}</span>
                  </li>
                ))}
              </ul>

              {s.callout && (
                <div
                  className="mt-3 p-3 rounded-xl"
                  style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: '#F0F0F0' }}>
                    {s.callout}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA at bottom */}
      <div className="mt-8 p-5 rounded-xl text-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}>
        <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Ready to improve?
        </p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
          Log your first full-tracking round and let your data do the talking.
        </p>
        <Link
          href="/rounds/new"
          className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          Log a round →
        </Link>
      </div>
    </div>
  )
}
