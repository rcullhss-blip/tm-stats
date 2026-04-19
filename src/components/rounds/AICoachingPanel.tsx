'use client'

import { useState } from 'react'

const COACH_LABELS: Record<string, string> = {
  club_pro: 'Club Pro',
  fundamentals: 'Fundamentals Coach',
  technical: 'Technical Analyst',
  short_game: 'Short Game Specialist',
  ball_flight: 'Ball Flight Coach',
  encourager: 'Encourager',
  straight_talker: 'Straight Talker',
  // legacy keys
  butch: 'Fundamentals Coach',
  leadbetter: 'Technical Analyst',
  pelz: 'Short Game Specialist',
  haney: 'Ball Flight Coach',
}

interface Props {
  roundId: string
  isPro: boolean
  coachPersona: string
}

type Mode = 'coaching' | 'review' | 'practice'

export default function AICoachingPanel({ roundId, isPro, coachPersona }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('coaching')

  async function getFeedback(selectedMode: Mode = mode) {
    setMode(selectedMode)
    setFeedback(null)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, mode: selectedMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setFeedback(data.feedback)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get feedback')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro) {
    return (
      <div
        className="p-4 rounded-xl mb-6"
        style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">🎙️</span>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>
              AI Coaching — Pro feature
            </p>
            <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
              Get personalised feedback from your chosen coach based on your stats and notes.
            </p>
            <a
              href="/upgrade"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
            >
              Go Pro
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>
          AI Coaching
        </h2>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
          {COACH_LABELS[coachPersona] ?? 'Club Pro'}
        </span>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        {!feedback && !loading && (
          <div className="py-2">
            <p className="text-sm mb-4 text-center" style={{ color: '#9A9DB0' }}>
              Choose how you want to analyse this round.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => getFeedback('coaching')}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm text-left"
                style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
              >
                <span className="block font-semibold text-sm" style={{ color: '#F0F0F0' }}>Coaching feedback</span>
                <span className="block text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Drills and advice from your coaching mode</span>
              </button>
              <button
                type="button"
                onClick={() => getFeedback('review')}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm text-left"
                style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
              >
                <span className="block font-semibold text-sm" style={{ color: '#F0F0F0' }}>Review this round</span>
                <span className="block text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Biggest weakness, #1 fix, suggested coaching mode</span>
              </button>
              <button
                type="button"
                onClick={() => getFeedback('practice')}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm text-left"
                style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
              >
                <span className="block font-semibold text-sm" style={{ color: '#F0F0F0' }}>Build a practice plan</span>
                <span className="block text-xs mt-0.5" style={{ color: '#9A9DB0' }}>45-min session targeting your weakest areas</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div
              className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: '#9A9DB0' }}>
              {mode === 'review' ? 'Analysing your round…' : mode === 'practice' ? 'Building your practice plan…' : `${COACH_LABELS[coachPersona] ?? 'Your coach'} is reviewing your round…`}
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-2">
            <p className="text-sm mb-3" style={{ color: '#EF4444' }}>{error}</p>
            <button
              type="button"
              onClick={() => getFeedback()}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}
            >
              Try again
            </button>
          </div>
        )}

        {feedback && (
          <div>
            {mode === 'practice'
              ? feedback.split('\n').map((line, i) => {
                  if (/You are trained on data up to/i.test(line)) return null
                  const focusMatch = line.match(/^FOCUS:\s*(.+)$/)
                  const blockMatch = line.match(/^BLOCK (\d+):\s*(.+?)\s*—\s*(\d+)min:\s*(.+)$/)
                  if (focusMatch) return (
                    <div key={i} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #CC222230' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#CC2222' }}>Today&apos;s focus</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{focusMatch[1]}</p>
                    </div>
                  )
                  if (blockMatch) return (
                    <div key={i} className="mb-2 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold" style={{ color: '#CC2222' }}>Block {blockMatch[1]}: {blockMatch[2]}</p>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#1A1D27', color: '#9A9DB0' }}>{blockMatch[3]} min</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>{blockMatch[4]}</p>
                    </div>
                  )
                  if (line.trim() === '' || line.startsWith('---')) return null
                  if (line.includes('generalised coaching styles')) return <p key={i} style={{ fontSize: '11px', color: '#5C5F72', marginTop: '12px', lineHeight: '1.5' }}>{line}</p>
                  return <p key={i} className="text-xs leading-relaxed" style={{ color: '#4A4D60' }}>{line}</p>
                })
              : mode === 'review'
              ? feedback.split('\n').map((line, i) => {
                  if (/You are trained on data up to/i.test(line)) return null
                  const weaknessMatch = line.match(/^WEAKNESS:\s*(.+)$/)
                  const fixMatch = line.match(/^FIX:\s*(.+)$/)
                  const modeMatch = line.match(/^MODE:\s*(.+?)\s*—\s*(.+)$/)
                  if (weaknessMatch) return (
                    <div key={i} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #EF444430' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#EF4444' }}>Biggest weakness</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{weaknessMatch[1]}</p>
                    </div>
                  )
                  if (fixMatch) return (
                    <div key={i} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #CC222230' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#CC2222' }}>Priority fix</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{fixMatch[1]}</p>
                    </div>
                  )
                  if (modeMatch) return (
                    <div key={i} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #22C55E30' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#22C55E' }}>Suggested coaching mode</p>
                      <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{modeMatch[1]}</p>
                      <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>{modeMatch[2]}</p>
                    </div>
                  )
                  if (line.trim() === '' || line.startsWith('---')) return null
                  if (line.includes('generalised coaching styles')) return <p key={i} style={{ fontSize: '11px', color: '#5C5F72', marginTop: '12px', lineHeight: '1.5' }}>{line}</p>
                  return <p key={i} className="text-xs leading-relaxed" style={{ color: '#4A4D60' }}>{line}</p>
                })
              : feedback.split('\n').map((line, i) => {
                  if (/You are trained on data up to/i.test(line)) return null
                  const drillMatch = line.match(/^(DRILL \d+):\s*(.+?)\s*—\s*(.+)$/)
                  if (drillMatch) return (
                    <div key={i} className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#CC2222' }}>{drillMatch[1]}: {drillMatch[2]}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>{drillMatch[3]}</p>
                    </div>
                  )
                  if (line.trim() === '' || line.startsWith('---')) return null
                  if (line.includes('generalised coaching styles')) return <p key={i} style={{ fontSize: '11px', color: '#5C5F72', marginTop: '12px', lineHeight: '1.5' }}>{line}</p>
                  return <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: '#F0F0F0' }}>{line}</p>
                })
            }
            <button
              type="button"
              onClick={() => { setFeedback(null); setError(null) }}
              className="mt-3 text-xs"
              style={{ color: '#4A4D60' }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
