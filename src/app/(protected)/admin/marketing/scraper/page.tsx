'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type ScraperSource = {
  id: string
  name: string
  description: string
  type: string
  color: string
  estimatedContacts: string
}

const SOURCES: ScraperSource[] = [
  { id: 'england_golf', name: 'England Golf', description: 'All affiliated golf clubs with publicly listed contacts', type: 'GOLF_CLUB', color: '#22c55e', estimatedContacts: '~1,800 clubs' },
  { id: 'ncaa_d1', name: 'NCAA Division I', description: 'D1 golf program coach contacts', type: 'NCAA_D1', color: '#3b82f6', estimatedContacts: '~350 programs' },
  { id: 'ncaa_d2', name: 'NCAA Division II', description: 'D2 golf program coach contacts', type: 'NCAA_D2', color: '#6366f1', estimatedContacts: '~250 programs' },
  { id: 'ncaa_d3', name: 'NCAA Division III', description: 'D3 golf program coach contacts', type: 'NCAA_D3', color: '#8b5cf6', estimatedContacts: '~400 programs' },
  { id: 'naia', name: 'NAIA', description: 'NAIA member school golf program contacts', type: 'NAIA', color: '#a78bfa', estimatedContacts: '~200 programs' },
  { id: 'uk_university', name: 'UK University Golf', description: 'BUCS member university golf club contacts', type: 'UK_COLLEGE', color: '#f59e0b', estimatedContacts: '~150 programs' },
]

type Contact = { name: string; email: string; organisation: string; type: string; region: string }
type SourceResult = { count: number; status: 'running' | 'done' | 'failed'; contacts: Contact[]; message?: string }

export default function ScraperPage() {
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SourceResult>>({})
  const [importedContacts, setImportedContacts] = useState<Contact[]>([])

  const allContacts: Contact[] = [
    ...Object.values(results).flatMap(r => r.contacts || []),
    ...importedContacts,
  ]

  async function runScraper(source: ScraperSource) {
    setRunning(source.id)
    setResults(prev => ({ ...prev, [source.id]: { count: 0, status: 'running', contacts: [] } }))

    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, type: source.type }),
      })
      const data = await res.json()

      setResults(prev => ({
        ...prev,
        [source.id]: {
          count: data.count || 0,
          status: data.error ? 'failed' : 'done',
          contacts: data.contacts || [],
          message: data.message,
        },
      }))
    } catch {
      setResults(prev => ({ ...prev, [source.id]: { count: 0, status: 'failed', contacts: [] } }))
    }
    setRunning(null)
  }

  const handleCSVImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        const name = row['name'] || row['contact name'] || ''
        const org = row['organisation'] || row['organization'] || row['club'] || row['school'] || ''
        const type = (row['type'] || row['category'] || 'GOLF_CLUB').toUpperCase().replace(/\s/g, '_')
        const region = row['region'] || row['county'] || row['state'] || ''

        if (email && email.includes('@')) {
          parsed.push({ email, name, organisation: org, type, region })
        }
      }

      setImportedContacts(prev => [...prev, ...parsed])
      e.target.value = ''
    }
    reader.readAsText(file)
  }, [])

  function exportCSV() {
    if (allContacts.length === 0) return
    const headers = ['name', 'email', 'organisation', 'type', 'region']
    const rows = allContacts.map(c =>
      headers.map(h => `"${((c as Record<string,string>)[h] || '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function statusLabel(r: SourceResult | undefined, source: ScraperSource) {
    if (!r) return source.estimatedContacts
    if (r.status === 'running') return 'Scraping...'
    if (r.status === 'failed') return '✗ Failed'
    if (r.count > 0) return `✓ ${r.count} found`
    return r.message || '0 found — try CSV import'
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
        <Link href="/admin/marketing" style={{ color: '#9A9DB0' }}>← marketing hub</Link>
        <span style={{ color: '#2E3247' }}>/</span>
        <span style={{ color: '#F0F0F0' }}>contact scraper</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0F0' }}>
        Contact <span style={{ color: '#3b82f6' }}>Scraper</span>
      </h1>
      <p className="text-sm mb-3" style={{ color: '#9A9DB0' }}>
        Auto-find contacts or import your own CSV. All contacts pool together for export to the Outreach Engine.
      </p>
      <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
        ⚠ Only collects publicly listed contact information. Some sites block automated requests — use CSV import as backup.
      </div>

      {/* CSV Import */}
      <div className="rounded-xl p-5 mb-6" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Import your own CSV</h2>
        <p className="text-xs mb-4" style={{ color: '#9A9DB0' }}>
          Have a list already? Import it here. Columns: email, name, organisation, type, region.
          Your <strong style={{ color: '#F0F0F0' }}>nw_golf_clubs.csv</strong> file works directly.
        </p>
        <div className="flex items-center gap-3">
          <label
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer"
            style={{ background: '#CC2222', color: 'white', minHeight: 'auto' }}
          >
            Import CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          </label>
          {importedContacts.length > 0 && (
            <span className="text-sm" style={{ color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
              ✓ {importedContacts.length} imported
            </span>
          )}
        </div>
      </div>

      {/* Scraper sources */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {SOURCES.map(source => {
          const r = results[source.id]
          const isRunning = running === source.id
          return (
            <div
              key={source.id}
              className="rounded-xl p-5 transition-all"
              style={{
                background: '#1A1D27',
                border: `1px solid ${r?.status === 'done' && r.count > 0 ? source.color + '50' : '#2E3247'}`,
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-2">
                  <h3 className="text-sm font-bold mb-0.5" style={{ color: '#F0F0F0' }}>{source.name}</h3>
                  <p className="text-xs" style={{ color: '#9A9DB0' }}>{source.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: `${source.color}18`, color: source.color, fontFamily: 'var(--font-mono)' }}>{source.type}</span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-xs" style={{
                  color: r?.status === 'done' && r.count > 0 ? '#22c55e'
                    : r?.status === 'failed' ? '#EF4444'
                    : '#9A9DB0',
                  fontFamily: 'var(--font-mono)',
                  maxWidth: '140px',
                  lineHeight: '1.4',
                }}>
                  {statusLabel(r, source)}
                </span>
                <button
                  onClick={() => runScraper(source)}
                  disabled={!!running}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: isRunning ? '#22263A' : source.color,
                    color: 'white',
                    minHeight: 'auto',
                    fontFamily: 'var(--font-mono)',
                    opacity: running && !isRunning ? 0.5 : 1,
                  }}
                >
                  {isRunning ? 'RUNNING...' : 'RUN'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Export */}
      <div className="rounded-xl p-5 flex justify-between items-center" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>
            Export all contacts
            {allContacts.length > 0 && <span className="ml-2 text-xs font-normal" style={{ color: '#22c55e', fontFamily: 'var(--font-mono)' }}>({allContacts.length} ready)</span>}
          </p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>Download as CSV ready for the Outreach Engine</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={allContacts.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-bold"
          style={{
            background: allContacts.length > 0 ? '#22c55e' : '#22263A',
            color: allContacts.length > 0 ? 'white' : '#9A9DB0',
            minHeight: 'auto',
          }}
        >
          EXPORT CSV
        </button>
      </div>
    </div>
  )
}
