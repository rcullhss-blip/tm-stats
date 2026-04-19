'use client'

import { useState } from 'react'

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open billing portal')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27', border: '1px solid #22C55E30' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>TM Stats Pro</p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>Active subscription</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}>
          Active
        </span>
      </div>
      {error && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>}
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-medium"
        style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}
      >
        {loading ? 'Loading…' : 'Manage billing & subscription'}
      </button>
    </div>
  )
}
