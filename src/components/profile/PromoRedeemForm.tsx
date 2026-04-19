'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PromoRedeemForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  async function redeem(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to redeem')
      setSuccess(data.message)
      setCode('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to redeem')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-3 rounded-xl" style={{ backgroundColor: '#22C55E10', border: '1px solid #22C55E30' }}>
        <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>Code applied</p>
        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{success}</p>
      </div>
    )
  }

  return (
    <form onSubmit={redeem}>
      <label className="text-xs mb-2 block" style={{ color: '#9A9DB0' }}>Have a promo code?</label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          maxLength={20}
          className="flex-1 px-3 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: '#22263A',
            color: '#F0F0F0',
            border: `1px solid ${error ? '#EF444450' : '#2E3247'}`,
            outline: 'none',
            fontFamily: 'var(--font-dm-mono)',
            letterSpacing: '0.05em',
          }}
        />
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: code.trim() ? '#CC2222' : '#22263A',
            color: '#F0F0F0',
            opacity: loading ? 0.7 : 1,
            minHeight: '44px',
          }}
        >
          {loading ? '…' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
    </form>
  )
}
