'use client'

import { useEffect, useState } from 'react'

interface Device { id: string; name: string; created_at: string; last_used_at: string | null }

/** Connect the TM Stats Apple Watch app with the code it shows, and see connected watches. */
export default function WatchSettings() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)
  const [devices, setDevices] = useState<Device[]>([])

  async function load() {
    try {
      const res = await fetch('/api/watch/devices', { cache: 'no-store' })
      if (res.ok) setDevices((await res.json()).devices ?? [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  async function connect() {
    setBusy(true); setNote(null)
    try {
      const res = await fetch('/api/watch/pair/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not connect')
      setNote({ text: 'Connected. Your watch will show your name in a few seconds.', ok: true })
      setCode('')
      load()
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'Could not connect', ok: false })
    } finally {
      setBusy(false)
    }
  }

  async function disconnect(id: string) {
    await fetch(`/api/watch/devices?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div id="watch">
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Apple Watch</p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>Score team qualifying from your wrist. Open TM Stats on your watch, then type the 6 numbers it shows.</p>
      <div className="flex gap-2 mb-2">
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" className="flex-1 px-3 rounded-lg text-lg tracking-widest" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px', fontFamily: 'var(--font-dm-mono)' }} />
        <button type="button" onClick={connect} disabled={busy || code.length !== 6} className="px-4 rounded-lg text-sm font-semibold" style={{ backgroundColor: code.length === 6 ? '#CC2222' : '#22263A', color: '#F0F0F0', minHeight: '48px', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      {note && <p className="text-xs mb-2" style={{ color: note.ok ? '#22C55E' : '#EF4444' }}>{note.text}</p>}
      {devices.map(d => (
        <div key={d.id} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid #22263A' }}>
          <span className="text-sm" style={{ color: '#F0F0F0' }}>{d.name} <span className="text-xs" style={{ color: '#9A9DB0' }}>· connected {day(d.created_at)}{d.last_used_at ? ` · last used ${day(d.last_used_at)}` : ''}</span></span>
          <button type="button" onClick={() => disconnect(d.id)} className="text-xs" style={{ color: '#9A9DB0', minHeight: '40px' }}>Disconnect</button>
        </div>
      ))}
    </div>
  )
}
