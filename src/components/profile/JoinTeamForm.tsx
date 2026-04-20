'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  teamNames: string[]
}

export default function JoinTeamForm({ teamNames }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState<string | null>(null)
  const router = useRouter()

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coach/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setNewTeam(data.teamName)
      setCode('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  const allTeams = newTeam && !teamNames.includes(newTeam) ? [...teamNames, newTeam] : teamNames

  return (
    <div>
      {allTeams.length > 0 && (
        <div className="mb-3 space-y-2">
          {allTeams.map(name => (
            <div key={name} className="p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
              <span className="text-xs" style={{ color: '#22C55E' }}>✓</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9A9DB0' }}>Team</p>
                <p className="text-sm font-bold" style={{ color: '#F0F0F0' }}>{name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {newTeam && (
        <p className="text-xs mb-3" style={{ color: '#22C55E' }}>Joined {newTeam} — your coach can now view your stats.</p>
      )}

      <form onSubmit={join}>
        <label className="text-xs mb-2 block" style={{ color: '#9A9DB0' }}>
          {allTeams.length > 0 ? 'Join another team' : "Join a coach's team"}
        </label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter join code"
            maxLength={8}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: '#22263A',
              color: '#F0F0F0',
              border: `1px solid ${error ? '#EF444450' : '#2E3247'}`,
              outline: 'none',
              fontFamily: 'var(--font-dm-mono)',
              letterSpacing: '0.1em',
            }}
          />
          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: '#22263A',
              color: code.trim() ? '#F0F0F0' : '#4A4D60',
              border: '1px solid #2E3247',
              minHeight: '44px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '…' : 'Join'}
          </button>
        </div>
        {error && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
      </form>
    </div>
  )
}
