'use client'

import { useEffect, useState } from 'react'

interface TeamRow { id: string; name: string; toSend: number; alreadySent: number }
interface Preview { subject: string; html: string; recipients: string[] }

// Players we set up from a coach's roster who have not opened their account yet.
// Nothing is emailed until "Send" is pressed and confirmed.
export default function AdminTeamInvites() {
  const [teams, setTeams] = useState<TeamRow[] | null>(null)
  const [preview, setPreview] = useState<{ teamId: string; data: Preview } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, string>>({})

  async function load() {
    const res = await fetch('/api/admin/team-invites')
    if (res.ok) setTeams((await res.json()).teams)
    else setTeams([])
  }
  useEffect(() => { load() }, [])

  async function call(teamId: string, action: 'preview' | 'send') {
    setBusy(`${teamId}:${action}`)
    const res = await fetch('/api/admin/team-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, action }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (action === 'preview' && res.ok) setPreview({ teamId, data })
    if (action === 'send') {
      setConfirming(null)
      setResult(r => ({
        ...r,
        [teamId]: res.ok
          ? `Sent to ${data.sent} player${data.sent === 1 ? '' : 's'}${data.failed?.length ? `, ${data.failed.length} failed` : ''}.`
          : (data.error ?? 'Could not send.'),
      }))
      load()
    }
  }

  if (!teams || teams.length === 0) return null

  const btn = { minHeight: 44, border: '1px solid #2E3247', color: '#F0F0F0', backgroundColor: '#22263A' }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Team players not signed in yet</h2>
      <div className="space-y-2">
        {teams.map(t => (
          <div key={t.id} className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
            <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{t.name}</p>
            <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>
              {t.toSend > 0
                ? `${t.toSend} player${t.toSend === 1 ? ' has' : 's have'} not been sent a sign-in link.`
                : 'Every waiting player has been sent their link.'}
              {t.alreadySent > 0 ? ` ${t.alreadySent} sent a link but not opened it yet.` : ''}
            </p>

            {t.toSend > 0 && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => call(t.id, 'preview')} disabled={busy !== null} className="flex-1 px-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={btn}>
                  {busy === `${t.id}:preview` ? 'Loading…' : 'Preview email'}
                </button>
                {confirming === t.id ? (
                  <button onClick={() => call(t.id, 'send')} disabled={busy !== null} className="flex-1 px-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ ...btn, backgroundColor: '#CC2222', border: '1px solid #CC2222' }}>
                    {busy === `${t.id}:send` ? 'Sending…' : `Yes, email ${t.toSend} now`}
                  </button>
                ) : (
                  <button onClick={() => setConfirming(t.id)} disabled={busy !== null} className="flex-1 px-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={btn}>
                    Send to {t.toSend}
                  </button>
                )}
              </div>
            )}
            {confirming === t.id && (
              <button onClick={() => setConfirming(null)} className="text-xs mt-2 underline" style={{ color: '#9A9DB0', minHeight: 44 }}>Cancel</button>
            )}
            {result[t.id] && <p className="text-xs mt-2" style={{ color: '#22C55E' }}>{result[t.id]}</p>}

            {preview?.teamId === t.id && (
              <div className="mt-3">
                <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Subject: <span style={{ color: '#F0F0F0' }}>{preview.data.subject}</span></p>
                <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Goes to: {preview.data.recipients.join(', ')}</p>
                <iframe title="Email preview" srcDoc={preview.data.html} className="w-full rounded-lg" style={{ height: 460, backgroundColor: '#FFFFFF', border: 0 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
