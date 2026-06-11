'use client'

import { useState } from 'react'
import Link from 'next/link'

type ScraperSource = {
  id: string
  name: string
  description: string
  type: string
  color: string
  url: string
  estimatedContacts: string
}

const SOURCES: ScraperSource[] = [
  {
    id: 'england_golf',
    name: 'England Golf',
    description: 'All affiliated golf clubs in England with publicly listed contacts',
    type: 'GOLF_CLUB',
    color: '#22c55e',
    url: 'https://www.englandgolf.org/find-a-golf-club/',
    estimatedContacts: '~1,800 clubs',
  },
  {
    id: 'ncaa_d1',
    name: 'NCAA Division I',
    description: 'D1 athletic department pages — golf program contacts',
    type: 'NCAA_D1',
    color: '#3b82f6',
    url: 'https://www.ncaa.org/schools',
    estimatedContacts: '~350 programs',
  },
  {
    id: 'ncaa_d2',
    name: 'NCAA Division II',
    description: 'D2 golf program coach contacts',
    type: 'NCAA_D2',
    color: '#6366f1',
    url: 'https://www.ncaa.org/schools',
    estimatedContacts: '~250 programs',
  },
  {
    id: 'ncaa_d3',
    name: 'NCAA Division III',
    description: 'D3 golf program coach contacts',
    type: 'NCAA_D3',
    color: '#8b5cf6',
    url: 'https://www.ncaa.org/schools',
    estimatedContacts: '~400 programs',
  },
  {
    id: 'naia',
    name: 'NAIA',
    description: 'NAIA member school golf program contacts',
    type: 'NAIA',
    color: '#a78bfa',
    url: 'https://www.naia.org/schools',
    estimatedContacts: '~200 programs',
  },
  {
    id: 'uk_university',
    name: 'UK University Golf',
    description: 'BUCS member university golf club contacts',
    type: 'UK_COLLEGE',
    color: '#f59e0b',
    url: 'https://www.bucs.org.uk',
    estimatedContacts: '~150 programs',
  },
]

type ScraperContact = { name: string; email: string; organisation: string; type: string }

export default function ScraperPage() {
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { count: number; status: string; contacts?: ScraperContact[] }>>({})

  const totalContacts = Object.values(results).reduce((sum, r) => sum + (r.contacts?.length || 0), 0)

  async function runScraper(source: ScraperSource) {
    setRunning(source.id)
    try {
      const res = await fetch('/api/marketing/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, sourceUrl: source.url, type: source.type }),
      })
      const data = await res.json()
      setResults(prev => ({
        ...prev,
        [source.id]: { count: data.count || 0, status: data.error ? 'failed' : 'complete', contacts: data.contacts || [] },
      }))
    } catch {
      setResults(prev => ({ ...prev, [source.id]: { count: 0, status: 'failed' } }))
    }
    setRunning(null)
  }

  function exportCSV() {
    const allContacts: ScraperContact[] = Object.values(results).flatMap(r => r.contacts || [])
    if (allContacts.length === 0) return

    const headers = ['name', 'email', 'organisation', 'type']
    const rows = allContacts.map(c => headers.map(h => `"${(c[h as keyof ScraperContact] || '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraped-contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        Automatically finds publicly listed contact emails from golf directories and athletic departments.
      </p>
      <div className="rounded-lg px-4 py-3 mb-8 text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
        ⚠ Scraper only collects publicly listed contact information. Respects robots.txt. Legal for outreach purposes.
      </div>

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {SOURCES.map(source => (
          <div
            key={source.id}
            className="rounded-xl p-5 transition-all"
            style={{
              background: '#1A1D27',
              border: `1px solid ${results[source.id]?.status === 'complete' ? source.color + '40' : '#2E3247'}`,
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold mb-0.5" style={{ color: '#F0F0F0' }}>{source.name}</h3>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{source.description}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded ml-2 shrink-0" style={{ background: `${source.color}18`, color: source.color, fontFamily: 'var(--font-mono)' }}>{source.type}</span>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
                {results[source.id]
                  ? results[source.id].status === 'complete'
                    ? `✓ ${results[source.id].count} found`
                    : '✗ failed'
                  : source.estimatedContacts}
              </span>
              <button
                onClick={() => runScraper(source)}
                disabled={running === source.id}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: running === source.id ? '#22263A' : source.color, color: 'white', minHeight: 'auto', fontFamily: 'var(--font-mono)' }}
              >
                {running === source.id ? 'RUNNING...' : 'RUN'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5 flex justify-between items-center" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Export all scraped contacts</p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>
            {totalContacts > 0 ? `${totalContacts} contacts ready to download` : 'Run scrapers above to collect contacts first'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={totalContacts === 0}
          className="px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: totalContacts > 0 ? '#22c55e' : '#22263A', color: totalContacts > 0 ? 'white' : '#9A9DB0', minHeight: 'auto' }}
        >
          EXPORT CSV
        </button>
      </div>
    </div>
  )
}
