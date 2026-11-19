'use client'

import { useState } from 'react'

const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const

/** A coach sets up their team themselves. */
export default function BecomeCoach() {
  const [teamName, setTeamName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [kind, setKind] = useState('College')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/coach/become', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamName, organisation, kind, confirm }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not set up your team')
      window.location.href = '/coach'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set up your team')
      setBusy(false)
    }
  }

  return (
    <div className="text-left p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Team name</label>
      <input value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={80} placeholder="e.g. Lipscomb Women's Golf" className="w-full px-3 rounded-lg text-sm mb-3" style={field} />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Type</label>
          <select value={kind} onChange={e => setKind(e.target.value)} className="w-full px-3 rounded-lg text-sm" style={field}>
            {['College', 'High school', 'Club', 'Academy', 'Other'].map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>School or club</label>
          <input value={organisation} onChange={e => setOrganisation(e.target.value)} maxLength={120} placeholder="Optional" className="w-full px-3 rounded-lg text-sm" style={field} />
        </div>
      </div>
      <label className="flex items-start gap-3 mb-4" style={{ minHeight: '44px' }}>
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#CC2222', marginTop: '2px', flexShrink: 0 }} />
        <span className="text-sm" style={{ color: '#F0F0F0' }}>I coach or run this team. <span style={{ color: '#9A9DB0' }}>We check it, then this account becomes a coach account.</span></span>
      </label>
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
      <button type="button" onClick={go} disabled={busy || teamName.trim().length < 2 || !confirm} className="w-full rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '52px', opacity: busy || teamName.trim().length < 2 || !confirm ? 0.5 : 1 }}>
        {busy ? 'Setting up…' : 'Set up my team'}
      </button>
    </div>
  )
}
