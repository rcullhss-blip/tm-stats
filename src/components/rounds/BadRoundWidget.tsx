'use client'

import { useState } from 'react'

interface Props {
  scoreToPar: number
  handicap: number | null
  doubles: number
  weakestStat: string
}

export default function BadRoundWidget({ scoreToPar, handicap, doubles, weakestStat }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getRecovery() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'recovery', scoreToPar, handicap, doubles, weakestStat }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setFeedback(data.feedback)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>
        Tough round
      </p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
        Not your best day. Let&apos;s put it in perspective.
      </p>

      {!feedback && !loading && !error && (
        <button
          type="button"
          onClick={getRecovery}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
        >
          Get perspective →
        </button>
      )}

      {loading && (
        <div className="text-center py-3">
          <div
            className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>One moment…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-2">
          <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>
          <button
            type="button"
            onClick={getRecovery}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
          >
            Try again
          </button>
        </div>
      )}

      {feedback && (
        <div className="space-y-2">
          {feedback.split('\n').filter(l => l.trim()).map((line, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: i === 0 ? '#F0F0F0' : '#9A9DB0' }}>
              {line}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="mt-1 text-xs"
            style={{ color: '#4A4D60' }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
