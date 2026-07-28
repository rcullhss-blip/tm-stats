'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Counts = Record<string, number>
type RecentContact = { email: string; organisation: string | null; type: string; region: string | null; status: string; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  found: '#9A9DB0', verified: '#22C55E', contacted: '#3B82F6',
  followed_up: '#8B5CF6', replied: '#F59E0B', bounced: '#EF4444',
}

export default function ScraperPage() {
  const [counts, setCounts] = useState<Counts>({})
  const [recent, setRecent] = useState<RecentContact[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [pasteUrls, setPasteUrls] = useState('')
  const [pasteType, setPasteType] = useState('GOLF_CLUB')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/marketing/scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    })
    const data = await res.json()
    if (data.ok) {
      setCounts(data.counts ?? {})
      setRecent(data.recent ?? [])
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function runBatch() {
    setBusy(true)
    setMessage('Crawling — this takes a minute or two…')
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crawl' }),
      })
      const data = await res.json()
      setMessage(data.ok
        ? `Batch done: ${data.processed ?? 0} pages processed, ${data.contactsFound ?? 0} new contacts, ${data.remainingInQueue ?? 0} pages still queued.`
        : `Failed: ${data.error ?? 'unknown error'}`)
    } catch {
      setMessage('Crawl failed — check the logs.')
    }
    setBusy(false)
    refresh()
  }

  async function exportCsv() {
    setMessage('Preparing export…')
    try {
      const res = await fetch('/api/marketing/scraper/run')
      if (!res.ok) { setMessage('Export failed — try again.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tmstats-contacts-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded — check your downloads folder.')
    } catch {
      setMessage('Export failed — try again.')
    }
  }

  async function markReplied(email: string) {
    await fetch('/api/marketing/scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', email, status: 'replied' }),
    })
    refresh()
  }

  async function addUrls() {
    const urls = pasteUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (urls.length === 0) return
    setBusy(true)
    const res = await fetch('/api/marketing/scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_urls', urls, type: pasteType }),
    })
    const data = await res.json()
    setMessage(data.ok ? `${data.added} URLs added to the crawl queue.` : 'Failed to add URLs.')
    setPasteUrls('')
    setBusy(false)
    refresh()
  }

  const stat = (label: string, key: string, color = '#F0F0F0') => (
    <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{label}</p>
      <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color }}>{counts[key] ?? 0}</p>
    </div>
  )

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/admin/marketing" className="text-sm" style={{ color: '#9A9DB0' }}>← Marketing</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Contact pipeline
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
        The crawler runs every night automatically (club directories → official sites → published contact emails, domain-verified). The outreach drip emails verified contacts on weekday mornings with an automatic warmup ramp.
      </p>

      {/* Pipeline status */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {stat('Queue: pending', 'queue_pending')}
        {stat('Queue: crawled', 'queue_done')}
        {stat('Queue: failed', 'queue_failed', '#EF4444')}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {stat('Verified (ready)', 'contacts_verified', '#22C55E')}
        {stat('Contacted', 'contacts_contacted', '#3B82F6')}
        {stat('Followed up', 'contacts_followed_up', '#8B5CF6')}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {stat('Sent this week', 'sent_this_week', '#F0F0F0')}
        {stat('Replied', 'contacts_replied', '#F59E0B')}
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Reply rate</p>
          <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F59E0B' }}>
            {(() => {
              const sent = (counts.contacts_contacted ?? 0) + (counts.contacts_followed_up ?? 0) + (counts.contacts_replied ?? 0)
              return sent > 0 ? `${Math.round(((counts.contacts_replied ?? 0) / sent) * 100)}%` : '—'
            })()}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={runBatch}
          disabled={busy}
          className="px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          {busy ? 'Working…' : 'Run a crawl batch now'}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="px-5 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="px-5 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
        >
          Export CSV
        </button>
      </div>

      {message && <p className="text-sm mb-6" style={{ color: '#22C55E' }}>{message}</p>}

      {/* Paste URLs */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Add sites by hand</p>
        <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
          Paste club / athletics-staff-directory / coach website URLs (one per line). The crawler visits each one and pulls the published contact email.
        </p>
        <textarea
          value={pasteUrls}
          onChange={e => setPasteUrls(e.target.value)}
          rows={4}
          placeholder={'https://www.examplegolfclub.co.uk\nhttps://athletics.example.edu/staff-directory'}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none mb-3"
          style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', fontFamily: 'var(--font-dm-mono)' }}
        />
        <div className="flex gap-2">
          <select
            value={pasteType}
            onChange={e => setPasteType(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}
          >
            <option value="GOLF_CLUB">Golf club</option>
            <option value="NCAA_D1">NCAA D1</option>
            <option value="NCAA_D2">NCAA D2</option>
            <option value="NCAA_D3">NCAA D3</option>
            <option value="UK_COLLEGE">UK university</option>
            <option value="CREATOR">Creator / coach</option>
          </select>
          <button
            type="button"
            onClick={addUrls}
            disabled={busy || !pasteUrls.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            Add to queue
          </button>
        </div>
      </div>

      {/* Recent contacts */}
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Latest contacts</p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
        When someone replies to your outreach, tap Replied — it stops their follow-up and feeds the reply rate above.
      </p>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        {recent.length === 0 && (
          <p className="text-sm p-4" style={{ color: '#9A9DB0' }}>
            None yet — run a crawl batch, or wait for tonight&apos;s automatic run.
          </p>
        )}
        {recent.map((c, i) => (
          <div
            key={c.email}
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: i < recent.length - 1 ? '1px solid #2E3247' : 'none' }}
          >
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: '#F0F0F0' }}>{c.organisation ?? c.email}</p>
              <p className="text-xs truncate" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{c.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs px-2 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${STATUS_COLORS[c.status] ?? '#9A9DB0'}20`, color: STATUS_COLORS[c.status] ?? '#9A9DB0' }}
              >
                {c.status.replace('_', ' ')}
              </span>
              {(c.status === 'contacted' || c.status === 'followed_up') && (
                <button
                  type="button"
                  onClick={() => markReplied(c.email)}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ backgroundColor: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B40' }}
                >
                  Replied
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
