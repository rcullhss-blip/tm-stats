'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPromoForm() {
  const [code, setCode] = useState('')
  const [months, setMonths] = useState('3')
  const [maxUses, setMaxUses] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
    setCode(result)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          duration_months: parseInt(months),
          max_uses: maxUses ? parseInt(maxUses) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setCode(''); setMonths('3'); setMaxUses('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Code</label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="PROMO123"
            maxLength={20}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', fontFamily: 'var(--font-dm-mono)' }}
          />
          <button
            type="button"
            onClick={generateCode}
            className="px-3 py-2.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}
          >
            Generate
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Duration (months)</label>
          <select
            value={months}
            onChange={e => setMonths(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' }}
          >
            {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m !== 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Max uses (blank = ∞)</label>
          <input
            type="number"
            value={maxUses}
            onChange={e => setMaxUses(e.target.value)}
            placeholder="∞"
            min={1}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' }}
          />
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
      <button
        type="submit"
        disabled={!code.trim() || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', opacity: loading ? 0.7 : 1, minHeight: '48px' }}
      >
        {loading ? 'Creating…' : 'Create code'}
      </button>
    </form>
  )
}
