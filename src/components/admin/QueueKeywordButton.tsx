'use client'

import { useState } from 'react'

export default function QueueKeywordButton({ keyword }: { keyword: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  async function add() {
    setState('saving')
    try {
      const res = await fetch('/api/marketing/blog/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') return <span className="text-xs" style={{ color: '#22C55E' }}>Queued</span>
  return (
    <button
      onClick={add}
      disabled={state === 'saving'}
      className="text-xs font-semibold px-3 rounded-lg"
      style={{ minHeight: 44, backgroundColor: '#22263A', color: state === 'error' ? '#EF4444' : '#F0F0F0', border: '1px solid #2E3247' }}
    >
      {state === 'saving' ? 'Adding…' : state === 'error' ? 'Try again' : 'Queue post'}
    </button>
  )
}
