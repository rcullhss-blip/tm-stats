'use client'

import { useState } from 'react'

interface RoundSummary {
  date: string
  scoreToPar: number
  roundType: string
}

interface Props {
  rounds: RoundSummary[]
  isPro: boolean
}

export default function PatternFinderWidget({ rounds, isPro }: Props) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getInsight() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'patterns', rounds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setInsight(data.feedback)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to find pattern')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro || rounds.length < 3) return null

  return (
    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
        Pattern Finder
      </p>

      {!insight && !loading && !error && (
        <button
          type="button"
          onClick={getInsight}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
        >
          Find a pattern in my game →
        </button>
      )}

      {loading && (
        <div className="text-center py-3">
          <div
            className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>Analysing your rounds…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-2">
          <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>
          <button
            type="button"
            onClick={getInsight}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
          >
            Try again
          </button>
        </div>
      )}

      {insight && (
        <div>
          <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>{insight}</p>
          <button
            type="button"
            onClick={() => { setInsight(null); setError(null) }}
            className="mt-3 text-xs"
            style={{ color: '#4A4D60' }}
          >
            ← Find another
          </button>
        </div>
      )}
    </div>
  )
}
