'use client'

import { useState } from 'react'

const PROMPTS = [
  "I keep losing confidence after a bad hole",
  "I play well in practice but fall apart in competition",
  "I can't stop thinking about my swing on the course",
  "I get nervous on the first tee",
]

interface Props {
  isPro: boolean
}

export default function MentalGameClient({ isPro }: Props) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(text?: string) {
    const msg = text ?? message
    if (!msg.trim()) return
    setLoading(true); setError(null); setResponse(null)
    try {
      const res = await fetch('/api/mental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setResponse(data.response)
      setMessage('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">🧠</span>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Mental Game — Pro feature</p>
            <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
              Talk through the mental side of your game with an experienced golf mentor.
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
    <div>
      {/* Quick prompts */}
      {!response && !loading && (
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#4A4D60' }}>Common topics</p>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setMessage(p); }}
                className="px-3 py-2 rounded-lg text-xs text-left"
                style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!response && (
        <div className="mb-4">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What's on your mind about your golf?"
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{
              backgroundColor: '#1A1D27',
              color: '#F0F0F0',
              border: '1px solid #2E3247',
              outline: 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!message.trim() || loading}
            className="w-full mt-2 py-3 rounded-xl font-semibold text-sm"
            style={{
              backgroundColor: message.trim() ? '#CC2222' : '#22263A',
              color: '#F0F0F0',
              minHeight: '48px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            Talk it through →
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div
            className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Thinking…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27', border: '1px solid #EF444430' }}>
          <p className="text-sm mb-3" style={{ color: '#EF4444' }}>{error}</p>
          <button
            type="button"
            onClick={() => { setError(null) }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
            From your mentor
          </p>
          {response.split('\n').filter(l => l.trim()).map((line, i) => (
            <p key={i} className="text-sm leading-relaxed mb-3 last:mb-0" style={{ color: '#F0F0F0' }}>
              {line}
            </p>
          ))}
          <button
            type="button"
            onClick={() => { setResponse(null); setError(null) }}
            className="mt-4 text-xs"
            style={{ color: '#4A4D60' }}
          >
            ← Ask something else
          </button>
        </div>
      )}

      <p className="text-xs mt-6 leading-relaxed" style={{ color: '#4A4D60' }}>
        TM Stats Mental Game is a golf-specific thinking tool, not a substitute for professional mental health support.
      </p>
    </div>
  )
}
