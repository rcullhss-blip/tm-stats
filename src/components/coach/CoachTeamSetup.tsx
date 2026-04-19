'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachTeamSetup() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coach/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create team')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={create} className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F0' }}>Create your team</p>
      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Team name</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g. Rob's Squad"
        className="w-full px-3 py-2.5 rounded-lg text-sm mb-4"
        style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' }}
      />
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', opacity: loading ? 0.7 : 1, minHeight: '48px' }}
      >
        {loading ? 'Creating…' : 'Create team →'}
      </button>
    </form>
  )
}
