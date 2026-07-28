'use client'

import { useState } from 'react'

export default function NewsletterSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="text-center text-xs py-2" style={{ color: '#22C55E' }}>
        You&apos;re in — golf insights land in your inbox fortnightly.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <p className="text-center text-xs mb-2" style={{ color: '#9A9DB0' }}>
        Free fortnightly email: one stat, one drill, one insight
      </p>
      <div className="flex gap-2 max-w-xs mx-auto">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none min-w-0"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0' }}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-60"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          {state === 'sending' ? '…' : 'Subscribe'}
        </button>
      </div>
      {state === 'error' && (
        <p className="text-center text-xs mt-2" style={{ color: '#EF4444' }}>Could not subscribe — try again.</p>
      )}
    </form>
  )
}
