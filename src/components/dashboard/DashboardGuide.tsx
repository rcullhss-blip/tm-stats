'use client'

import { useState } from 'react'

export default function DashboardGuide() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'sg' | 'quick'>('sg')

  return (
    <>
      {/* Floating tab button on the right edge */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed flex flex-col items-center justify-center gap-1 z-40"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#CC2222',
          color: '#F0F0F0',
          borderRadius: '8px 0 0 8px',
          width: '32px',
          height: '64px',
          border: 'none',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.4)',
        }}
        aria-label="How to use TM Stats"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#F0F0F0" strokeWidth="2" />
          <path d="M12 8v1M12 11v5" stroke="#F0F0F0" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', lineHeight: 1 }}>
          GUIDE
        </span>
      </button>

      {/* Modal overlay — z-[200] to sit above BottomNav (z-50) */}
      {open && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl"
            style={{
              backgroundColor: '#1A1D27',
              height: '85dvh',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2E3247' }}>
              <div>
                <p className="text-base font-bold" style={{ color: '#F0F0F0' }}>How to use TM Stats</p>
                <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Choose the right tracking mode for your game</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1 rounded-lg"
                style={{ color: '#9A9DB0', backgroundColor: '#22263A' }}
              >
                Close
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex px-5 pt-4 gap-2">
              {([
                { key: 'sg', label: 'Full Tracking (SG)' },
                { key: 'quick', label: 'Quick Stats' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    backgroundColor: tab === key ? '#CC2222' : '#22263A',
                    color: tab === key ? '#F0F0F0' : '#9A9DB0',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ flex: '1 1 0', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
              {tab === 'sg' ? (
                <>
                  {/* What is SG */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #CC222230' }}>
                    <p className="text-sm font-bold mb-2" style={{ color: '#CC2222' }}>What is Strokes Gained?</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
                      Strokes Gained (SG) is the stat used by the PGA Tour to measure exactly where a player gains or loses shots versus a benchmark. A positive number means you outperformed average. Negative means you gave shots away.
                    </p>
                    <p className="text-sm leading-relaxed mt-2" style={{ color: '#9A9DB0' }}>
                      It splits your game into 4 areas: <span style={{ color: '#F0F0F0' }}>Off the Tee, Approach, Around the Green, and Putting</span> — so you can see exactly where your handicap is coming from.
                    </p>
                  </div>

                  <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>How to record a hole (Full Tracking)</p>
                  <p className="text-xs" style={{ color: '#9A9DB0' }}>For every shot, enter two things: where the ball IS, and how far from the pin.</p>

                  {[
                    {
                      step: '1',
                      title: 'Set the par',
                      body: 'Tap 3, 4, or 5 to set the par for that hole.',
                      color: '#CC2222',
                    },
                    {
                      step: '2',
                      title: 'Select the lie',
                      body: 'Where is the ball sitting? Tee → Fairway → Rough → Green, etc. The app suggests the next lie automatically — just check it\'s right.',
                      color: '#CC2222',
                    },
                    {
                      step: '3',
                      title: 'Enter the distance to the pin',
                      body: 'Tee shots and fairway shots: enter in YARDS. Putts on the green: enter in FEET.',
                      color: '#CC2222',
                    },
                    {
                      step: '4',
                      title: 'Tap + Add shot',
                      body: 'Repeat for every shot until you hole out.',
                      color: '#CC2222',
                    },
                    {
                      step: '5',
                      title: 'Tap ✓ Next hole when done',
                      body: 'This button appears once you\'ve entered at least one putt. Tap it when you\'ve holed out.',
                      color: '#CC2222',
                    },
                  ].map(({ step, title, body, color }) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                        style={{ width: '26px', height: '26px', backgroundColor: `${color}20`, color }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Example */}
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#F0F0F0' }}>Example — Par 4 played in 5 with a penalty</p>
                    {[
                      { n: 1, lie: 'Tee', dist: '380y', note: '' },
                      { n: 2, lie: 'Penalty', dist: '—', note: 'ball in water, counts 1 stroke' },
                      { n: 3, lie: 'Tee', dist: '380y', note: 're-tee after penalty' },
                      { n: 4, lie: 'Green', dist: '22ft', note: '' },
                      { n: 5, lie: 'Green', dist: '4ft', note: '← tap ✓ Next hole here' },
                    ].map(({ n, lie, dist, note }) => (
                      <div key={n} className="flex items-center gap-2 py-1.5" style={{ borderBottom: n < 5 ? '1px solid #2E3247' : 'none' }}>
                        <span className="text-xs w-4" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>{n}</span>
                        <span className="text-xs w-16" style={{ color: lie === 'Penalty' ? '#EF4444' : '#9A9DB0' }}>{lie}</span>
                        <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{dist}</span>
                        {note && <span className="text-xs ml-1" style={{ color: '#4A4D60' }}>{note}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#F0F0F0' }}>Tips</p>
                    <ul className="space-y-1.5">
                      {[
                        'If you hit it out of bounds or in a hazard — tap Penalty. No distance needed, it just counts as one shot.',
                        'You can undo the last shot at any time if you made a mistake.',
                        'Chip-in from off the green? Enter the chip shot, then tap ⛳ Hole Out (chip-in).',
                      ].map((tip, i) => (
                        <li key={i} className="text-xs flex gap-2" style={{ color: '#9A9DB0' }}>
                          <span style={{ color: '#22C55E', flexShrink: 0 }}>•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                    <p className="text-sm font-bold mb-2" style={{ color: '#F0F0F0' }}>Quick Stats mode</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
                      Quick mode logs your scorecard stats hole by hole. Faster to fill in — ideal when you don&apos;t want to track every shot. No Strokes Gained, but you still get FIR, GIR, putts, and scoring trends.
                    </p>
                  </div>

                  {[
                    { step: '1', title: 'Par', body: 'Set the par for each hole (3, 4 or 5).' },
                    { step: '2', title: 'Score', body: 'Your total strokes on that hole.' },
                    { step: '3', title: 'FIR — Fairway in Regulation', body: 'Par 4s and 5s only. Did your tee shot land in the fairway? Tap Yes or No.' },
                    { step: '4', title: 'GIR — Green in Regulation', body: 'Did you hit the green in regulation? Par 3 = on in 1, Par 4 = on in 2, Par 5 = on in 3.' },
                    { step: '5', title: 'Putts', body: 'How many putts from the putting surface? If you chipped in, enter 0.' },
                    { step: '6', title: 'Up & Down (optional)', body: 'Only shown when GIR = No. Did you hole out in 2 shots from off the green (1 chip + 1 putt)?' },
                    { step: '7', title: 'Sand Save (optional)', body: 'Were you in a greenside bunker, and did you get up and down?' },
                  ].map(({ step, title, body }) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                        style={{ width: '26px', height: '26px', backgroundColor: '#9A9DB020', color: '#9A9DB0' }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#F0F0F0' }}>Want Strokes Gained?</p>
                    <p className="text-xs" style={{ color: '#9A9DB0' }}>Switch to Full Tracking mode when you start a new round. It takes 30 seconds longer per hole but gives you the most accurate picture of your game.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
