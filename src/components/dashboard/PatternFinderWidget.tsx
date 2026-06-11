'use client'

import { useState } from 'react'

interface Props {
  roundCount: number
  isPro: boolean
}

function parsePatterns(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const patterns: string[] = []
  for (const line of lines) {
    const match = line.match(/^PATTERN\s*\d+:\s*(.+)/i)
    if (match) patterns.push(match[1].trim())
  }
  return patterns.length >= 2 ? patterns : [text]
}

export default function PatternFinderWidget({ roundCount, isPro }: Props) {
  const [patterns, setPatterns] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getInsight() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'patterns' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setPatterns(parsePatterns(data.feedback))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to find pattern')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro || roundCount < 3) return null

  return (
    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
        Pattern Finder
      </p>

      {!patterns && !loading && !error && (
        <button
          type="button"
          onClick={getInsight}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}
        >
          Analyse my game →
        </button>
      )}

      {loading && (
        <div className="text-center py-3">
          <div
            className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>Analysing your stats…</p>
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

      {patterns && (
        <div>
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{
                    backgroundColor: i === patterns.length - 1 ? '#CC222220' : '#22263A',
                    color: i === patterns.length - 1 ? '#CC2222' : '#9A9DB0',
                    fontFamily: 'var(--font-dm-mono)',
                  }}
                >
                  {i + 1}
                </span>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: i === patterns.length - 1 ? '#F0F0F0' : '#C0C3D0' }}
                >
                  {p}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setPatterns(null); setError(null) }}
            className="mt-4 text-xs"
            style={{ color: '#4A4D60' }}
          >
            ← Analyse again
          </button>
        </div>
      )}
    </div>
  )
}
