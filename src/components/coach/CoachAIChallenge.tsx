'use client'

import { useState } from 'react'

interface RoundSummary { id: string; courseName: string; date: string; scoreToPar: number }

interface Props {
  coachId: string
  playerId: string
  playerName: string
  rounds: RoundSummary[]
}

export default function CoachAIChallenge({ playerId, playerName, rounds }: Props) {
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [originalFeedback, setOriginalFeedback] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [revisedFeedback, setRevisedFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'feedback' | 'context' | 'revised'>('select')

  async function loadFeedback(roundId: string) {
    setSelectedRoundId(roundId)
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, mode: 'coaching', playerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load feedback')
      setOriginalFeedback(data.feedback)
      setStep('feedback')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function submitChallenge() {
    if (!context.trim() || !selectedRoundId || !originalFeedback) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coach/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: selectedRoundId,
          playerId,
          originalFeedback,
          coachContext: context,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setRevisedFeedback(data.revisedFeedback)
      setStep('revised')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('select'); setSelectedRoundId(null); setOriginalFeedback(null)
    setContext(''); setRevisedFeedback(null); setError(null)
  }

  if (rounds.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>AI Challenge</h2>
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
          Select a round, read the AI feedback, then add your coaching context for a revised recommendation.
        </p>

        {/* Step 1: Select round */}
        {step === 'select' && (
          <div className="space-y-2">
            {rounds.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => loadFeedback(r.id)}
                className="w-full p-3 rounded-xl text-left"
                style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{r.courseName}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                      {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: r.scoreToPar <= 0 ? '#22C55E' : '#9A9DB0' }}>
                    {r.scoreToPar === 0 ? 'E' : r.scoreToPar > 0 ? `+${r.scoreToPar}` : `${r.scoreToPar}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }} />
            <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>
              {step === 'select' ? 'Loading AI feedback…' : 'Generating revised feedback…'}
            </p>
          </div>
        )}

        {/* Step 2: Show original AI feedback */}
        {step === 'feedback' && !loading && originalFeedback && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>AI feedback for {playerName}</p>
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: '#22263A' }}>
              {originalFeedback.split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-xs leading-relaxed mb-1 last:mb-0" style={{ color: '#9A9DB0' }}>{line}</p>
              ))}
            </div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#F0F0F0' }}>Add your coaching context</p>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder={`What does the AI miss about ${playerName}? Add their tendencies, injury, technical work in progress, mental notes...`}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl text-xs resize-none mb-3"
              style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' }}
            />
            {error && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={reset} className="flex-1 py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                ← Back
              </button>
              <button
                type="button"
                onClick={submitChallenge}
                disabled={!context.trim()}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#CC2222', color: '#F0F0F0', opacity: context.trim() ? 1 : 0.4, minHeight: '44px' }}
              >
                Challenge →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Revised feedback */}
        {step === 'revised' && revisedFeedback && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#22C55E' }}>Revised recommendation</p>
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: '#22263A', border: '1px solid #22C55E20' }}>
              {revisedFeedback.split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: '#F0F0F0' }}>{line}</p>
              ))}
            </div>
            <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>
              This revised feedback has been saved and will appear for {playerName} when they next view this round.
            </p>
            <button type="button" onClick={reset} className="w-full py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
              ← Challenge another round
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
