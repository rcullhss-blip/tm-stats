'use client'

import { useState } from 'react'

interface Props {
  handicap: number | null
  avgScore: number | null
  roundCount: number
  weakestCategoryLabel: string | null
  isPro: boolean
}

export default function PreRoundPlanWidget({ handicap, avgScore, roundCount, weakestCategoryLabel, isPro }: Props) {
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getPlan() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pre_round',
          stats: { handicap, avgScore, roundCount, weakestCategoryLabel },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setPlan(data.feedback)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get plan')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro) return null

  return (
    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
        Pre-Round Plan
      </p>

      {!plan && !loading && !error && (
        <button
          type="button"
          onClick={getPlan}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
        >
          Build my pre-round plan →
        </button>
      )}

      {loading && (
        <div className="text-center py-3">
          <div
            className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>Building your plan…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-2">
          <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>
          <button
            type="button"
            onClick={getPlan}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
          >
            Try again
          </button>
        </div>
      )}

      {plan && (
        <div>
          {plan.split('\n').filter(l => l.trim()).map((line, i) => (
            <div key={i} className="flex gap-3 mb-3 last:mb-0">
              <span
                className="text-sm font-bold flex-shrink-0 mt-0.5"
                style={{ color: '#CC2222', fontFamily: 'var(--font-dm-mono)', minWidth: '16px' }}
              >
                {i + 1}.
              </span>
              <p className="text-sm leading-relaxed" style={{ color: '#F0F0F0' }}>
                {line.replace(/^\d+\.\s*/, '')}
              </p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setPlan(null); setError(null) }}
            className="mt-3 text-xs"
            style={{ color: '#4A4D60' }}
          >
            ← New plan
          </button>
        </div>
      )}
    </div>
  )
}
