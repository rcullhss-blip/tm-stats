'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type Contact = {
  name: string
  email: string
  organisation: string
  type: string
  region?: string
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

export default function OutreachPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [status, setStatus] = useState<CampaignStatus>('idle')
  const [campaignName, setCampaignName] = useState('')
  const [promoCode, setPromoCode] = useState('TMSTATS3FREE')
  const [dailyLimit, setDailyLimit] = useState(280)
  const [progress, setProgress] = useState({ sent: 0, total: 0, today: 0 })
  const [log, setLog] = useState<string[]>([])
  const [filterType, setFilterType] = useState('ALL')

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50))
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))

      const parsed: Contact[] = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = vals[idx] || '' })

        const email = row['email'] || row['email address'] || row['e-mail'] || ''
        const name = row['name'] || row['contact name'] || row['full name'] || ''
        const org = row['organisation'] || row['organization'] || row['club'] || row['school'] || row['team'] || ''
        const type = row['type'] || row['category'] || 'GOLF_CLUB'
        const region = row['region'] || row['state'] || row['county'] || ''

        if (email && email.includes('@')) {
          parsed.push({ email, name, organisation: org, type: type.toUpperCase().replace(' ', '_'), region })
        }
      }

      setContacts(parsed)
      setStatus('ready')
      addLog(`✓ Loaded ${parsed.length} contacts from ${file.name}`)
    }
    reader.readAsText(file)
  }, [])

  const filteredContacts = filterType === 'ALL'
    ? contacts
    : contacts.filter(c => c.type === filterType)

  async function startCampaign() {
    if (!campaignName || contacts.length === 0) return
    setStatus('sending')
    addLog(`▶ Campaign "${campaignName}" started — ${contacts.length} contacts, ${dailyLimit}/day limit`)

    try {
      const res = await fetch('/api/marketing/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName, contacts, promoCode, dailyLimit }),
      })

      const data = await res.json()
      if (data.error) {
        addLog(`✗ Error: ${data.error}`)
        setStatus('ready')
      } else {
        addLog(`✓ Queued ${data.queued} emails — sending ${data.sendingToday} today`)
        setProgress({ sent: data.sendingToday, total: contacts.length, today: data.sendingToday })
        setStatus('complete')
      }
    } catch {
      addLog(`✗ Failed to start campaign`)
      setStatus('ready')
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
                <p className="text-3xl mb-3">📋</p>
                <p className="font-bold mb-1" style={{ color: '#F0F0F0' }}>Drop your CSV here</p>
                <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
                  Columns: email, name, organisation, type, region (optional)
                </p>
                <label className="cursor-pointer text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: '#22263A', color: '#F0F0F0' }}>
                  Choose CSV file
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
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

              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Daily send limit</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={e => setDailyLimit(Number(e.target.value))}
                  max={280}
                  min={10}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
                />
                <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Max 280 (Brevo free: 300/day, 20 buffer)</p>
              </div>

              {contacts.length > 0 && (
                <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#22263A', border: '1px solid #2E3247', fontFamily: 'var(--font-mono)', color: '#9A9DB0' }}>
                  <div>Contacts: <strong style={{ color: '#F0F0F0' }}>{contacts.length}</strong></div>
                  <div>Days to complete: <strong style={{ color: '#F0F0F0' }}>{Math.ceil(contacts.length / dailyLimit)}</strong></div>
                  <div>Est. finish: <strong style={{ color: '#F0F0F0' }}>
                    {new Date(Date.now() + Math.ceil(contacts.length / dailyLimit) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </strong></div>
                </div>
              )}

              <button
                onClick={startCampaign}
                disabled={!contacts.length || !campaignName || status === 'sending'}
                className="w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-all"
                style={{
                  background: contacts.length && campaignName ? '#C22431' : '#22263A',
                  color: contacts.length && campaignName ? 'white' : '#9A9DB0',
                }}
              >
                {status === 'sending' ? 'STARTING...' : '▶  START CAMPAIGN'}
              </button>
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
    </div>
  )
}
