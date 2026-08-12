'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

type CampaignStat = {
  campaign: string
  queued: number
  sent: number
  delivered: number
  opened: number
  replied: number
  bounced: number
  sentToday: number
  sentMonth: number
}

type CampaignContact = {
  email: string
  organisation: string | null
  status: string
  contacted_at: string | null
  delivered: boolean | null
  opened: boolean | null
}

type Contact = {
  name: string
  email: string
  organisation: string
  type: string
  region?: string
}

type SearchContact = {
  email: string
  organisation: string | null
  status: string
  campaign: string | null
}

type CampaignStatus = 'idle' | 'uploading' | 'ready' | 'sending' | 'complete'

const CONTACT_TYPES = [
  { value: 'GOLF_CLUB', label: 'Golf Club', color: '#22c55e' },
  { value: 'NCAA_D1', label: 'NCAA D1', color: '#3b82f6' },
  { value: 'NCAA_D2', label: 'NCAA D2', color: '#6366f1' },
  { value: 'NCAA_D3', label: 'NCAA D3', color: '#8b5cf6' },
  { value: 'NAIA', label: 'NAIA', color: '#a78bfa' },
  { value: 'UK_COLLEGE', label: 'UK College', color: '#f59e0b' },
  { value: 'PGA_PRO', label: 'PGA Pro', color: '#C22431' },
]

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi

// CSV parser that handles quoted fields, escaped quotes and commas/newlines
// inside quotes. Returns rows of cell strings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); field = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim() !== '')) rows.push(row)
  return rows
}

export default function OutreachPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [status, setStatus] = useState<CampaignStatus>('idle')
  const [campaignName, setCampaignName] = useState('')
  const [promoCode, setPromoCode] = useState('TMSTATS3FREE')
  const [log, setLog] = useState<string[]>([])
  const [filterType, setFilterType] = useState('ALL')
  const [defaultType, setDefaultType] = useState('NCAA_D1')
  const [queued, setQueued] = useState(false)
  const [campaignStats, setCampaignStats] = useState<CampaignStat[]>([])
  const [openCampaign, setOpenCampaign] = useState<string | null>(null)
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [replySearch, setReplySearch] = useState('')
  const [replyResults, setReplyResults] = useState<SearchContact[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [markingEmail, setMarkingEmail] = useState<string | null>(null)

  async function searchContacts(e?: React.FormEvent) {
    e?.preventDefault()
    const query = replySearch.trim()
    if (query.length < 2) return
    setSearching(true)
    setSearched(true)
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_contacts', query }),
      })
      const data = await res.json()
      setReplyResults(data.ok ? (data.contacts ?? []) : [])
    } catch {
      setReplyResults([])
    }
    setSearching(false)
  }

  async function markReplied(email: string) {
    setMarkingEmail(email)
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', email, status: 'replied' }),
      })
      const data = await res.json()
      if (data.ok) {
        setReplyResults(prev => prev.map(c => c.email === email ? { ...c, status: 'replied' } : c))
        addLog(`✓ Marked ${email} as replied`)
        loadStats()
      } else {
        addLog(`✗ Could not mark ${email}: ${data.error ?? 'error'}`)
      }
    } catch {
      addLog(`✗ Could not mark ${email}`)
    }
    setMarkingEmail(null)
  }

  async function openCampaignDetail(campaign: string) {
    if (openCampaign === campaign) { setOpenCampaign(null); return }
    setOpenCampaign(campaign)
    setLoadingContacts(true)
    setCampaignContacts([])
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'campaign_contacts', campaign }),
      })
      const data = await res.json()
      if (data.ok) setCampaignContacts(data.contacts ?? [])
    } catch {
      // ignore
    }
    setLoadingContacts(false)
  }

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'campaign_stats' }),
      })
      const data = await res.json()
      if (data.ok) setCampaignStats(data.campaigns ?? [])
    } catch {
      // stats are best-effort; ignore transient errors
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50))
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    e.target.value = ''

    setStatus('uploading')
    setQueued(false)

    Promise.all(files.map(f => f.text().then(text => ({ name: f.name, text }))))
      .then(loaded => {
        const seen = new Set<string>()
        const parsed: Contact[] = []

        for (const { name: fileName, text } of loaded) {
          const rows = parseCsv(text)
          if (rows.length === 0) { addLog(`✗ ${fileName}: no rows found`); continue }

          // Locate the org / type / region columns from the header (best effort).
          const header = rows[0].map(h => h.trim().toLowerCase())
          const looksLikeHeader = header.some(h => /school|college|university|team|club|name|coach|email|program|institution|type|region|state/.test(h))
          const orgIdx = header.findIndex(h => /organis|organiz|institution|school|college|university|club|team|program|^name$/.test(h))
          const typeIdx = header.findIndex(h => /^type$|category|division/.test(h))
          const regionIdx = header.findIndex(h => /region|state|county/.test(h))
          const dataRows = looksLikeHeader ? rows.slice(1) : rows

          let fileCount = 0
          for (const cells of dataRows) {
            const org = orgIdx >= 0 && cells[orgIdx] ? cells[orgIdx].trim() : ''
            const rowType = typeIdx >= 0 && cells[typeIdx] ? cells[typeIdx].trim().toUpperCase().replace(/\s+/g, '_') : ''
            const region = regionIdx >= 0 && cells[regionIdx] ? cells[regionIdx].trim() : ''

            // Grab EVERY email in the row — men's-coach and women's-coach
            // columns (and any other) each become their own contact.
            for (const cell of cells) {
              const matches = (cell || '').match(EMAIL_RE)
              if (!matches) continue
              for (const raw of matches) {
                const email = raw.toLowerCase().trim()
                if (seen.has(email)) continue
                seen.add(email)
                parsed.push({ email, name: '', organisation: org, type: rowType || defaultType, region })
                fileCount++
              }
            }
          }
          addLog(`✓ ${fileCount} emails from ${fileName}`)
        }

        setContacts(parsed)
        setStatus(parsed.length ? 'ready' : 'idle')
        addLog(parsed.length
          ? `✓ ${parsed.length} unique contacts ready across ${files.length} file(s)`
          : `✗ No email addresses found — check the file has email columns`)
      })
      .catch(() => { addLog('✗ Failed to read file(s)'); setStatus('idle') })
  }, [defaultType])

  const filteredContacts = filterType === 'ALL'
    ? contacts
    : contacts.filter(c => c.type === filterType)

  // Add the uploaded list to the drip queue (as verified). The drip then sends
  // them at the ramped daily rate — reliable, paced, with automatic follow-ups
  // and de-duplication, rather than blasting them all in one timeout-prone request.
  async function startCampaign() {
    if (contacts.length === 0) return
    if (!campaignName.trim()) { addLog('✗ Give the campaign a name first (so you can track it below)'); return }
    setStatus('sending')
    addLog(`▶ Adding ${contacts.length} contacts to "${campaignName}"…`)

    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue_contacts', contacts, campaign: campaignName.trim() }),
      })
      const data = await res.json()
      if (!data.ok) {
        addLog(`✗ Error: ${data.error ?? 'could not queue contacts'}`)
        setStatus('ready')
        return
      }
      addLog(`✓ Queued ${data.imported} new contacts to "${campaignName}" (${data.skipped} already in the pipeline)`)
      setQueued(true)
      setStatus('complete')
      setContacts([])
      loadStats()
    } catch {
      addLog('✗ Failed to queue contacts')
      setStatus('ready')
    }
  }

  // Fire one batch now instead of waiting for the weekday cron. Respects the
  // same daily ramp (50 → 200/day) so it never over-sends.
  async function sendBatchNow() {
    addLog('▶ Sending today’s batch now…')
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_outreach' }),
      })
      const data = await res.json()
      if (data.ok) {
        addLog(`✓ Sent ${data.firstTouches ?? 0} new + ${data.followUps ?? 0} follow-ups (limit ${data.dailyLimit ?? '?'}/day, week ${data.warmupWeek ?? 0})`)
        loadStats()
      } else {
        addLog(`✗ Send failed: ${data.error ?? 'unknown error'}`)
      }
    } catch {
      addLog('✗ Send failed')
    }
  }

  const typeCounts = CONTACT_TYPES.map(t => ({
    ...t,
    count: contacts.filter(c => c.type === t.value).length
  })).filter(t => t.count > 0)

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
        <Link href="/admin/marketing" style={{ color: '#9A9DB0' }}>← marketing hub</Link>
        <span style={{ color: '#2E3247' }}>/</span>
        <span style={{ color: '#F0F0F0' }}>outreach engine</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0F0' }}>
        Outreach <span style={{ color: '#C22431' }}>Engine</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        Upload your contact list, configure the campaign, send personalised emails through Brevo at a controlled rate.
      </p>

      <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Left column */}
        <div>
          {/* Upload zone */}
          <div
            className="rounded-xl p-8 text-center mb-6 transition-all"
            style={{
              border: `2px dashed ${contacts.length ? '#C22431' : '#2E3247'}`,
              background: contacts.length ? 'rgba(194,36,49,0.04)' : '#1A1D27',
            }}
          >
            {contacts.length === 0 ? (
              <>
                <p className="font-bold mb-1" style={{ color: '#F0F0F0' }}>Upload your CSV list</p>
                <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
                  Any layout works — every email in each row is picked up, so a row with a men&apos;s-coach and a women&apos;s-coach email adds both. Select several files at once. Duplicates are removed automatically.
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-xs" style={{ color: '#9A9DB0' }}>These contacts are:</span>
                  <select
                    value={defaultType}
                    onChange={e => setDefaultType(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded-lg"
                    style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
                  >
                    {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <label className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: '#22263A', color: '#F0F0F0' }}>
                  Choose CSV file(s)
                  <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </>
            ) : (
              <div>
                <p className="text-3xl mb-2">✓</p>
                <p className="font-bold text-lg mb-3" style={{ color: '#F0F0F0' }}>{contacts.length} contacts loaded</p>
                <div className="flex gap-2 flex-wrap justify-center mb-3">
                  {typeCounts.map(t => (
                    <span key={t.value} className="text-xs px-2 py-1 rounded" style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}40`, fontFamily: 'var(--font-mono)' }}>
                      {t.label}: {t.count}
                    </span>
                  ))}
                </div>
                <button onClick={() => setContacts([])} className="text-xs underline" style={{ color: '#9A9DB0', background: 'none', minHeight: 'auto' }}>
                  Clear and upload different file
                </button>
              </div>
            )}
          </div>

          {/* Contact preview table */}
          {contacts.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => setFilterType('ALL')}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: filterType === 'ALL' ? '#C22431' : '#22263A', color: 'white', minHeight: 'auto', fontFamily: 'var(--font-mono)' }}
                >ALL ({contacts.length})</button>
                {typeCounts.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setFilterType(t.value)}
                    className="text-xs px-3 py-1 rounded"
                    style={{ background: filterType === t.value ? t.color : '#22263A', color: 'white', minHeight: 'auto', fontFamily: 'var(--font-mono)' }}
                  >{t.label} ({t.count})</button>
                ))}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2E3247', maxHeight: '320px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2E3247', background: '#22263A' }}>
                      {['Name', 'Email', 'Organisation', 'Type'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#9A9DB0', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.slice(0, 50).map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #2E3247', background: '#1A1D27' }}>
                        <td style={{ padding: '9px 14px', color: '#F0F0F0' }}>{c.name || '—'}</td>
                        <td style={{ padding: '9px 14px', color: '#9A9DB0', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.email}</td>
                        <td style={{ padding: '9px 14px', color: '#9A9DB0' }}>{c.organisation || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: '3px',
                            background: `${CONTACT_TYPES.find(t => t.value === c.type)?.color || '#666'}20`,
                            color: CONTACT_TYPES.find(t => t.value === c.type)?.color || '#666',
                          }}>{c.type}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredContacts.length > 50 && (
                      <tr><td colSpan={4} style={{ padding: '10px 14px', textAlign: 'center', color: '#9A9DB0', fontSize: '12px', background: '#1A1D27' }}>... and {filteredContacts.length - 50} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column — campaign config */}
        <div>
          <div className="rounded-xl p-6 sticky top-20" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
            <h2 className="text-sm font-bold mb-5" style={{ color: '#F0F0F0' }}>Campaign Settings</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Campaign name</label>
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. NCAA Coaches - June 2025"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Promo code</label>
                <input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="TMSTATS3FREE"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
                />
                <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Included in all emails for tracking</p>
              </div>

              <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#22263A', border: '1px solid #2E3247', color: '#9A9DB0' }}>
                Daily volume is handled automatically: the drip ramps 50 → 100 → 150 → 200/day and splits that limit evenly across your active campaigns. Max 280/day (Brevo free tier is 300).
              </div>

              {contacts.length > 0 && (
                <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#22263A', border: '1px solid #2E3247', fontFamily: 'var(--font-mono)', color: '#9A9DB0' }}>
                  <div>Ready to queue: <strong style={{ color: '#F0F0F0' }}>{contacts.length}</strong> contacts</div>
                </div>
              )}

              <button
                onClick={startCampaign}
                disabled={!contacts.length || status === 'sending'}
                className="w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-all"
                style={{
                  background: contacts.length ? '#C22431' : '#22263A',
                  color: contacts.length ? 'white' : '#9A9DB0',
                }}
              >
                {status === 'sending' ? 'QUEUEING...' : '▶  ADD TO SENDING QUEUE'}
              </button>

              {queued && (
                <button
                  onClick={sendBatchNow}
                  className="w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-all"
                  style={{ background: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247' }}
                >
                  ▶  SEND TODAY&apos;S BATCH NOW
                </button>
              )}

              <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>
                Queued contacts send automatically every weekday morning, ramping 50 → 100 → 150 → 200/day to protect your domain. Use “send now” to fire today&apos;s batch immediately.
              </p>
            </div>
          </div>

          {/* Activity log */}
          {log.length > 0 && (
            <div className="rounded-xl p-4 mt-4" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Activity log</p>
              <div className="flex flex-col gap-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {log.map((entry, i) => (
                  <p key={i} className="text-xs leading-relaxed" style={{
                    fontFamily: 'var(--font-mono)',
                    color: entry.includes('✗') ? '#EF4444' : entry.includes('✓') ? '#22c55e' : '#9A9DB0',
                  }}>{entry}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-campaign tracking */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: '#F0F0F0' }}>Campaigns</h2>
          <button
            onClick={loadStats}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247', fontFamily: 'var(--font-mono)' }}
          >Refresh</button>
        </div>

        {/* Log a reply — search any contact by name/email/college and mark them replied */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Log a reply</p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
            A coach wrote back? Search their email or college below and mark them as replied — this stops any follow-up emails going to them.
          </p>
          <form onSubmit={searchContacts} className="flex gap-2 mb-3">
            <input
              value={replySearch}
              onChange={e => setReplySearch(e.target.value)}
              placeholder="e.g. Fordham  or  gmurphy51@fordham.edu"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={searching || replySearch.trim().length < 2}
              className="px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: '#C22431', color: 'white', opacity: searching || replySearch.trim().length < 2 ? 0.5 : 1 }}
            >{searching ? 'Searching…' : 'Search'}</button>
          </form>

          {searched && !searching && replyResults.length === 0 && (
            <p className="text-xs" style={{ color: '#9A9DB0' }}>
              No contacts found for “{replySearch.trim()}”. They may not be in your outreach list — that&apos;s fine, there&apos;s nothing to mark.
            </p>
          )}

          {replyResults.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2E3247' }}>
              {replyResults.map((c, i) => (
                <div
                  key={c.email}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                  style={{ borderTop: i ? '1px solid #2E3247' : 'none', background: i % 2 ? '#161922' : '#1A1D27' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="truncate" style={{ color: '#F0F0F0', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.email}</p>
                    <p className="truncate text-xs" style={{ color: '#9A9DB0' }}>
                      {c.organisation || '—'}{c.campaign ? ` · ${c.campaign}` : ''}
                    </p>
                  </div>
                  {c.status === 'replied' ? (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>✓ replied</span>
                  ) : (
                    <button
                      onClick={() => markReplied(c.email)}
                      disabled={markingEmail === c.email}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                      style={{ background: '#22263A', color: '#F0F0F0', border: '1px solid #F59E0B60', opacity: markingEmail === c.email ? 0.5 : 1 }}
                    >{markingEmail === c.email ? 'Saving…' : 'Mark replied'}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {campaignStats.length === 0 ? (
          <p className="text-sm p-4 rounded-xl" style={{ color: '#9A9DB0', background: '#1A1D27', border: '1px solid #2E3247' }}>
            No campaigns yet. Name a campaign, upload a CSV, and add it to the queue — it will appear here with live stats.
          </p>
        ) : (
          <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #2E3247' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#22263A' }}>
                  {['Campaign', 'Queued', 'Sent', 'Delivered', 'Deliv %', 'Opened', 'Replied', 'Bounced', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Campaign' ? 'left' : 'right', color: '#9A9DB0', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaignStats.map((c, i) => {
                  const emailed = c.sent + c.bounced
                  const delivPct = emailed > 0 ? Math.round((c.delivered / emailed) * 100) : 0
                  const cell = { padding: '10px 14px', textAlign: 'right' as const, color: '#F0F0F0', fontFamily: 'var(--font-mono)' }
                  const isOpen = openCampaign === c.campaign
                  return (
                    <tr
                      key={c.campaign}
                      onClick={() => openCampaignDetail(c.campaign)}
                      style={{ borderTop: '1px solid #2E3247', background: isOpen ? '#22263A' : i % 2 ? '#161922' : '#1A1D27', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 14px', color: '#F0F0F0', fontWeight: 600 }}>{c.campaign}</td>
                      <td style={{ ...cell, color: '#22c55e' }}>{c.queued}</td>
                      <td style={cell}>{c.sent}</td>
                      <td style={cell}>{c.delivered}</td>
                      <td style={{ ...cell, color: emailed > 0 ? (delivPct >= 90 ? '#22c55e' : delivPct >= 70 ? '#F59E0B' : '#EF4444') : '#9A9DB0' }}>{emailed > 0 ? `${delivPct}%` : '—'}</td>
                      <td style={{ ...cell, color: '#3b82f6' }}>{c.opened}</td>
                      <td style={{ ...cell, color: '#F59E0B' }}>{c.replied}</td>
                      <td style={{ ...cell, color: c.bounced ? '#EF4444' : '#9A9DB0' }}>{c.bounced}</td>
                      <td style={{ ...cell, color: '#9A9DB0' }}>{isOpen ? '▲' : '▼'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Drill-down: contacts in the selected campaign */}
        {openCampaign && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid #2E3247' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: '#22263A' }}>
              <p className="text-sm font-bold" style={{ color: '#F0F0F0' }}>
                {openCampaign} — {loadingContacts ? 'loading…' : `${campaignContacts.length} contacts`}
              </p>
              <button onClick={() => setOpenCampaign(null)} className="text-xs" style={{ color: '#9A9DB0' }}>Close ✕</button>
            </div>
            {!loadingContacts && (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
                  <thead>
                    <tr style={{ background: '#1A1D27', position: 'sticky', top: 0 }}>
                      {['Email', 'Organisation', 'Sent', 'Delivered', 'Opened', 'Status'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: h === 'Email' || h === 'Organisation' ? 'left' : 'center', color: '#9A9DB0', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaignContacts.map((c, i) => {
                      const yn = (v: boolean | null, color: string) => v
                        ? <span style={{ color }}>✓</span>
                        : <span style={{ color: '#4b4f63' }}>—</span>
                      const sentYet = !!c.contacted_at
                      return (
                        <tr key={c.email} style={{ borderTop: '1px solid #2E3247', background: i % 2 ? '#161922' : '#1A1D27' }}>
                          <td style={{ padding: '9px 14px', color: '#F0F0F0', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.email}</td>
                          <td style={{ padding: '9px 14px', color: '#9A9DB0' }}>{c.organisation || '—'}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>{yn(sentYet, '#22c55e')}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>{c.status === 'bounced' ? <span style={{ color: '#EF4444' }}>✕</span> : yn(c.delivered, '#22c55e')}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>{yn(c.opened, '#3b82f6')}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                            <span className="capitalize" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: c.status === 'replied' ? '#F59E0B' : c.status === 'bounced' ? '#EF4444' : c.status === 'verified' ? '#9A9DB0' : '#F0F0F0' }}>
                              {c.status === 'verified' ? 'queued' : c.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {campaignContacts.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: '#9A9DB0' }}>No contacts.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>
          Click a campaign to see everyone in it. Delivered/Opened update live as Brevo reports back. Queued = waiting to send · Sent = email went out · Delivered = landed · mark replies on the Contact pipeline page.
        </p>
      </div>
    </div>
  )
}
