'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURE_SPOTLIGHTS = [
  'Strokes Gained breakdown — understanding your four pillars',
  'Post-round analysis — how to read your insights page',
  'Trend tracking — spotting improvement over 10+ rounds',
  'Approach play stats — the biggest scoring area for amateurs',
  'Putting stats — why distance control matters more than direction',
]

const STATS_OF_FORTNIGHT = [
  'The average amateur golfer loses 2.4 shots per round on approach play alone',
  'Tour pros gain 0.8 strokes per round on putting — amateurs lose 0.6',
  'Golfers who track stats consistently improve their handicap 2.1x faster',
  '68% of shots in a round of golf are played within 100 yards of the hole',
  'A 10% improvement in driving accuracy saves an average of 1.3 shots per round',
]

export default function NewsletterPage() {
  const [newsItems, setNewsItems] = useState(['', '', ''])
  const [feature, setFeature] = useState(FEATURE_SPOTLIGHTS[0])
  const [stat, setStat] = useState(STATS_OF_FORTNIGHT[0])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; content: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  function updateNews(i: number, val: string) {
    setNewsItems(prev => prev.map((n, idx) => idx === i ? val : n))
  }

  async function sendNewsletter() {
    if (!preview) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/marketing/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: preview.subject, content: preview.content }),
      })
      const data = await res.json()
      setSendResult(data.error ? `✗ ${data.error}` : '✓ Sent to your inbox for review')
    } catch {
      setSendResult('✗ Send failed')
    }
    setSending(false)
  }

  async function generateNewsletter() {
    const filledNews = newsItems.filter(n => n.trim())
    if (filledNews.length === 0) return alert('Add at least one golf news item')

    setGenerating(true)
    try {
      const res = await fetch('/api/marketing/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ golfNews: filledNews, featureSpotlight: feature, statOfFortnight: stat }),
      })
      const data = await res.json()
      if (!data.error) setPreview(data)
    } catch { /* handled by UI */ }
    setGenerating(false)
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
        <Link href="/admin/marketing" style={{ color: '#9A9DB0' }}>← marketing hub</Link>
        <span style={{ color: '#2E3247' }}>/</span>
        <span style={{ color: '#F0F0F0' }}>newsletter</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0F0' }}>
        Newsletter <span style={{ color: '#f59e0b' }}>Builder</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        Biweekly. Golf news + TM Stats tips. Genuine value. Sends via Brevo to your subscriber list.
      </p>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-5" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
            <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>GOLF NEWS THIS FORTNIGHT</h3>
            {newsItems.map((item, i) => (
              <div key={i} className="mb-3">
                <label className="block text-xs mb-1" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Story {i + 1}</label>
                <textarea
                  value={item}
                  onChange={e => updateNews(i, e.target.value)}
                  placeholder="Brief summary of a golf news story..."
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none', height: '72px', resize: 'vertical' }}
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl p-5" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>FEATURE SPOTLIGHT</label>
            <select
              value={feature}
              onChange={e => setFeature(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            >
              {FEATURE_SPOTLIGHTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="rounded-xl p-5" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>STAT OF THE FORTNIGHT</label>
            <select
              value={stat}
              onChange={e => setStat(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            >
              {STATS_OF_FORTNIGHT.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button
            onClick={generateNewsletter}
            disabled={generating}
            className="w-full py-3 rounded-lg font-bold text-sm tracking-widest"
            style={{
              background: generating ? '#22263A' : '#f59e0b',
              color: generating ? '#9A9DB0' : '#1a1a1a',
            }}
          >
            {generating ? 'GENERATING...' : '◎  GENERATE NEWSLETTER'}
          </button>
        </div>

        {/* Preview panel */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
          {preview ? (
            <>
              <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid #2E3247' }}>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>SUBJECT LINE</p>
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{preview.subject}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={sendNewsletter}
                    disabled={sending}
                    className="px-4 py-2 rounded-lg text-xs font-bold"
                    style={{ background: sending ? '#22263A' : '#22c55e', color: 'white', minHeight: 'auto' }}
                  >{sending ? 'SENDING...' : 'SEND TEST'}</button>
                  {sendResult && (
                    <p className="text-xs" style={{ color: sendResult.startsWith('✓') ? '#22c55e' : '#EF4444', fontFamily: 'var(--font-mono)' }}>{sendResult}</p>
                  )}
                </div>
              </div>
              <div style={{ height: '500px', overflow: 'auto' }}>
                <iframe
                  srcDoc={preview.content}
                  style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                  title="Newsletter preview"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-col gap-2 p-10 text-center" style={{ minHeight: '300px' }}>
              <span className="text-3xl">◎</span>
              <p className="text-sm" style={{ color: '#9A9DB0' }}>Preview will appear here after generation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
