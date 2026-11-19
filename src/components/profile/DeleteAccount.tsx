'use client'

import { useState } from 'react'

/** Delete my account: everything goes, any card subscription is cancelled. */
export default function DeleteAccount({ isCoach }: { isCoach: boolean }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: text }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not delete your account')
      window.location.href = '/?deleted=1'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete your account')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full text-sm mt-6" style={{ color: '#4A4D60', minHeight: '44px' }}>
        Delete my account
      </button>
    )
  }
  return (
    <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #EF444460' }}>
      <p className="text-sm font-semibold mb-2" style={{ color: '#F0F0F0' }}>Delete your account</p>
      <p className="text-sm mb-3" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
        This permanently deletes your account and everything in it: rounds, stats, notes, goals and your recruiting page. Any card subscription is cancelled straight away. It cannot be undone.
        {isCoach ? ' Your team, its qualifying and selection picks are deleted too. Your players keep their own accounts and rounds.' : ''}
      </p>
      <label className="text-xs block mb-1" style={{ color: '#9A9DB0' }}>Type DELETE to confirm</label>
      <input value={text} onChange={e => setText(e.target.value)} autoCapitalize="characters" className="w-full px-3 rounded-lg text-sm mb-3" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' }} />
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { setOpen(false); setText(''); setError(null) }} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Keep my account</button>
        <button type="button" onClick={remove} disabled={busy || text.trim().toUpperCase() !== 'DELETE'} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#EF4444', color: '#F0F0F0', minHeight: '48px', opacity: busy || text.trim().toUpperCase() !== 'DELETE' ? 0.5 : 1 }}>{busy ? 'Deleting…' : 'Delete everything'}</button>
      </div>
    </div>
  )
}
