'use client'

import { useState } from 'react'

export default function ApproveCoachClient({ u, s, approved, hasTeam }: { u: string; s: string; approved: boolean; hasTeam: boolean }) {
  const [done, setDone] = useState<string | null>(approved ? 'Approved. They have coach access.' : !hasTeam ? 'Declined, or the team was removed.' : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: 'approve' | 'decline') {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/coach/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, s, decision }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(decision === 'approve' ? 'Approved. They have coach access now and have been emailed.' : 'Declined. Their team request has been removed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (done) return <p className="text-sm text-center" style={{ color: '#22C55E' }}>{done}</p>
  return (
    <div>
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => decide('decline')} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '52px' }}>Decline</button>
        <button type="button" onClick={() => decide('approve')} disabled={busy} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#22C55E', color: '#0F1117', minHeight: '52px' }}>{busy ? 'Saving…' : 'Approve'}</button>
      </div>
    </div>
  )
}
