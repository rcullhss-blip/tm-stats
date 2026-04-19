'use client'

import { useState } from 'react'

export default function HowToPlayGuide() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'quick' | 'full'>('quick')

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-full text-xs font-bold"
        style={{
          width: '32px', height: '32px',
          backgroundColor: '#22263A',
          color: '#9A9DB0',
          border: '1px solid #2E3247',
          minHeight: '32px',
          flexShrink: 0,
        }}
        aria-label="How to record a round"
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl"
            style={{ backgroundColor: '#1A1D27', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2E3247' }}>
              <p className="text-base font-semibold" style={{ color: '#F0F0F0' }}>How to record a round</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1 rounded-lg"
                style={{ color: '#9A9DB0', backgroundColor: '#22263A' }}
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-5 pt-4 gap-2">
              {(['quick', 'full'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    backgroundColor: tab === t ? '#CC2222' : '#22263A',
                    color: tab === t ? '#F0F0F0' : '#9A9DB0',
                  }}
                >
                  {t === 'quick' ? 'Quick entry' : 'Full tracking (SG)'}
                </button>
              ))}
            </div>

            {/* Content — min-height:0 is required for flex children to scroll within maxHeight */}
            <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ flex: '1 1 0', minHeight: 0 }}>
              {tab === 'quick' ? (
                <>
                  <p className="text-sm" style={{ color: '#9A9DB0' }}>
                    Quick entry logs your scorecard stats hole by hole. No Strokes Gained, but fast to fill in — perfect for casual rounds.
                  </p>
                  {[
                    { step: '1', title: 'Par', body: 'Set the par for each hole (3, 4 or 5).' },
                    { step: '2', title: 'Score', body: 'Your total strokes on that hole.' },
                    { step: '3', title: 'FIR — Fairway in Regulation', body: 'Par 4s and 5s only. Did your tee shot land in the fairway? Yes or No. Leave blank if not sure.' },
                    { step: '4', title: 'GIR — Green in Regulation', body: 'Did you hit the green in the correct number of shots? Par 3 = on in 1, Par 4 = on in 2, Par 5 = on in 3.' },
                    { step: '5', title: 'Putts', body: 'How many putts did you take once on the green? If you chipped in, enter 0.' },
                    { step: '6', title: 'Up & Down', body: 'Only shown when GIR is missed. Did you get up and down (chip/pitch + 1 putt to hole out)?' },
                    { step: '7', title: 'Sand Save', body: 'Were you in a greenside bunker, and did you get up and down?' },
                  ].map(({ step, title, body }) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                        style={{ width: '24px', height: '24px', backgroundColor: '#CC222220', color: '#CC2222' }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-sm" style={{ color: '#9A9DB0' }}>
                    Full tracking records every shot with distance and lie. This unlocks Strokes Gained — the most accurate measure of where you gain and lose shots.
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>For every shot, enter:</p>
                  {[
                    { step: '1', title: 'Where the ball IS (the lie)', body: 'Select the lie type — Tee, Fairway, Rough, Bunker, Fringe, or Green.' },
                    { step: '2', title: 'Distance to the pin', body: 'How far you are from the hole. Tee and fairway shots use yards. Putts use feet.' },
                    { step: '3', title: 'Press + Add shot / + Add putt', body: 'Repeat for every shot until you hole out.' },
                    { step: '4', title: 'Press ✓ Next hole when done', body: 'This button appears after you\'ve entered at least one putt on the green. Your last putt entered is the one you holed.' },
                  ].map(({ step, title, body }) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                        style={{ width: '24px', height: '24px', backgroundColor: '#22C55E20', color: '#22C55E' }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 rounded-xl mt-2" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#F0F0F0' }}>Example — Par 4, made in 4</p>
                    {[
                      { shot: 1, lie: 'Tee', dist: '360y' },
                      { shot: 2, lie: 'Fairway', dist: '145y' },
                      { shot: 3, lie: 'Green', dist: '18ft' },
                      { shot: 4, lie: 'Green', dist: '3ft' },
                    ].map(({ shot, lie, dist }) => (
                      <div key={shot} className="flex items-center gap-2 py-1" style={{ borderBottom: shot < 4 ? '1px solid #2E3247' : 'none' }}>
                        <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', width: '16px' }}>{shot}</span>
                        <span className="text-xs" style={{ color: '#9A9DB0', width: '60px' }}>{lie}</span>
                        <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{dist}</span>
                        {shot === 4 && <span className="text-xs ml-auto" style={{ color: '#22C55E' }}>← press ✓ Next hole</span>}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#F0F0F0' }}>Tips</p>
                    <ul className="space-y-1">
                      {[
                        'The system auto-suggests the next lie after each shot — just check it\'s right and change if needed.',
                        'If you chip in from off the green, enter the chip shot from Fringe or Rough, then press ✓ Next hole.',
                        'Putts are entered in feet, everything else in yards.',
                        'You can undo the last shot if you entered it wrong.',
                      ].map((tip, i) => (
                        <li key={i} className="text-xs flex gap-2" style={{ color: '#9A9DB0' }}>
                          <span style={{ color: '#CC2222', flexShrink: 0 }}>•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
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
