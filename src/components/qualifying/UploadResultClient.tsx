'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Par } from '@/lib/qualifying'
import { usableCard, type ParsedResult } from '@/lib/results-import'

interface Props { teamName: string }

const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const
const card = { backgroundColor: '#1A1D27' } as const
const today = () => new Date().toISOString().slice(0, 10)

export default function UploadResultClient({ teamName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'pick' | 'reading' | 'review' | 'saving' | 'done'>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([])
  const [matches, setMatches] = useState<(string | null)[]>([])
  const [name, setName] = useState('')
  const [courseName, setCourseName] = useState('')
  const [pars, setPars] = useState<Par[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [showOthers, setShowOthers] = useState(false)
  const [outcome, setOutcome] = useState<{ id: string; rounds: number; emailed: number; problems: string[] } | null>(null)

  async function read() {
    setError(null)
    if (!file && pasted.trim().length < 40) { setError('Choose a file, or paste the result.'); return }
    if (file && file.size > 4 * 1024 * 1024) { setError('That file is over 4 MB. Upload one round at a time, or paste the scores as text.'); return }
    setStep('reading')
    try {
      const form = new FormData()
      if (file) form.append('file', file); else form.append('text', pasted)
      const res = await fetch('/api/qualifying/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'The file could not be read')
      const p = data.parsed as ParsedResult
      setParsed(p)
      setRoster(data.roster)
      setMatches(data.matches)
      setName(p.event_name)
      setCourseName(p.course_name)
      setPars(p.pars.length === p.holes ? (p.pars as Par[]) : Array.from({ length: p.holes }, () => 4 as Par))
      setDates(Array.from({ length: p.round_count }, (_, i) => p.dates[i] || today()))
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The file could not be read')
      setStep('pick')
    }
  }

  async function save() {
    if (!parsed) return
    setError(null)
    const players = parsed.players
      .map((p, i) => ({ userId: matches[i], rounds: Array.from({ length: parsed.round_count }, (_, r) => p.rounds.find(x => x.round_no === r + 1)?.scores ?? null) }))
      .filter(p => p.userId)
    const ids = players.map(p => p.userId)
    if (new Set(ids).size !== ids.length) { setError('The same squad player is picked for two names. Each player can only be matched once.'); return }
    setStep('saving')
    try {
      const res = await fetch('/api/qualifying/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, courseName, holes: parsed.holes, pars, dates, players }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save the result')
      setOutcome({ id: data.id, rounds: data.rounds, emailed: data.emailed, problems: data.problems ?? [] })
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the result')
      setStep('review')
    }
  }

  const header = (
    <>
      <Link href="/qualifying" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Qualifying</Link>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Upload a result</h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>{teamName}</p>
    </>
  )

  if (step === 'pick' || step === 'reading') {
    const busy = step === 'reading'
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        {header}
        <div className="p-4 rounded-xl mb-4" style={card}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Tournament results, already filled in</p>
          <p className="text-sm" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
            Upload the results sheet from an event. We read each player&apos;s hole-by-hole scores, you check them, and every player on your squad gets the round in their account with pars and scores in. They only add their stats.
          </p>
        </div>

        <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Results file (PDF or a photo, up to 4 MB)</label>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }} className="w-full text-sm mb-4 p-3 rounded-xl" style={{ ...field, color: '#9A9DB0' }} />

        {!file && (
          <>
            <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Or paste the scores</label>
            <textarea value={pasted} onChange={e => setPasted(e.target.value)} disabled={busy} rows={5} placeholder="Copy the scorecards from the results page and paste them here." className="w-full px-3 py-3 rounded-xl text-sm mb-4" style={{ ...field, resize: 'vertical' }} />
          </>
        )}

        {error && <p className="text-sm mb-4" style={{ color: '#EF4444' }}>{error}</p>}
        <button type="button" onClick={read} disabled={busy} className="w-full rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Reading the result… this can take a minute' : 'Read the result →'}
        </button>
        <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>Nothing is saved or sent until you have checked it on the next screen. It needs hole-by-hole scores: a sheet with only round totals cannot be filled in.</p>
      </div>
    )
  }

  if (step === 'done' && outcome) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        {header}
        <div className="p-5 rounded-xl mb-4" style={{ ...card, border: '1px solid #22C55E40' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#22C55E' }}>Result saved</p>
          <p className="text-sm" style={{ color: '#F0F0F0', lineHeight: 1.6 }}>
            {outcome.rounds} round{outcome.rounds !== 1 ? 's' : ''} are now in your players&apos; accounts with pars and scores filled in.
            {outcome.emailed > 0 ? ` ${outcome.emailed} email${outcome.emailed !== 1 ? 's' : ''} sent with a link to add stats.` : ''}
          </p>
          {outcome.problems.length > 0 && <p className="text-sm mt-2" style={{ color: '#F59E0B' }}>Not brought in: {outcome.problems.join(', ')}.</p>}
        </div>
        <button type="button" onClick={() => router.push(`/qualifying/${outcome.id}`)} className="w-full rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}>See who has added their stats →</button>
      </div>
    )
  }

  if (!parsed) return null
  const busy = step === 'saving'
  const mine = parsed.players.map((p, i) => ({ p, i })).filter(x => matches[x.i])
  const others = parsed.players.map((p, i) => ({ p, i })).filter(x => !matches[x.i])
  const cardCount = (i: number) => parsed.players[i].rounds.filter(r => usableCard(r.scores, parsed.holes)).length
  const bringing = mine.filter(x => cardCount(x.i) > 0).length
  const parsUnknown = parsed.pars.length !== parsed.holes

  const row = ({ p, i }: { p: ParsedResult['players'][number]; i: number }) => {
    const usable = cardCount(i)
    return (
      <div key={i} className="p-3 rounded-xl" style={{ ...card, border: `1px solid ${matches[i] ? '#CC222260' : '#2E3247'}` }}>
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 pr-2">
            <p className="text-sm font-medium truncate" style={{ color: '#F0F0F0' }}>{p.name}</p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>{p.team || 'No team shown'}</p>
          </div>
          <p className="text-sm flex-shrink-0" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
            {Array.from({ length: parsed.round_count }, (_, r) => {
              const rd = p.rounds.find(x => x.round_no === r + 1)
              if (!rd) return '-'
              return usableCard(rd.scores, parsed.holes) ? String(rd.scores.reduce((s, n) => s + n, 0)) : rd.total ? `${rd.total}*` : '-'
            }).join(' ')}
          </p>
        </div>
        <select value={matches[i] ?? ''} disabled={busy} onChange={e => setMatches(prev => prev.map((m, idx) => (idx === i ? e.target.value || null : m)))} className="w-full px-3 rounded-lg text-sm" style={field}>
          <option value="">Not on my squad (leave out)</option>
          {roster.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {matches[i] && usable === 0 && <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>No hole-by-hole scores for this player, so nothing can be filled in.</p>}
        {matches[i] && usable > 0 && usable < parsed.round_count && <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>{usable} of {parsed.round_count} rounds have hole scores. Only those are brought in.</p>}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {header}
      <div className="p-4 rounded-xl mb-5" style={{ ...card, border: '1px solid #F59E0B40' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: '#F59E0B' }}>Check this before saving</p>
        <p className="text-sm" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
          These scores were read from your file by software, which can misread a number. Each player also checks their own card when they add stats.
        </p>
        {parsed.notes && <p className="text-sm mt-2" style={{ color: '#F0F0F0', lineHeight: 1.5 }}>{parsed.notes}</p>}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Event</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="w-full px-3 rounded-xl text-sm" style={field} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Course</label>
          <input value={courseName} onChange={e => setCourseName(e.target.value)} maxLength={120} placeholder="Course name" className="w-full px-3 rounded-xl text-sm" style={field} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>{dates.length > 1 ? 'Dates' : 'Date'}</label>
          <div className="space-y-2">
            {dates.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                {dates.length > 1 && <span className="text-xs w-16" style={{ color: '#9A9DB0' }}>Round {i + 1}</span>}
                <input type="date" value={d} onChange={e => setDates(prev => prev.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 px-3 rounded-xl text-sm" style={field} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Pars</label>
            <span className="text-xs" style={{ color: parsUnknown ? '#F59E0B' : '#9A9DB0' }}>
              {parsUnknown ? 'Not in the file. Tap each hole to set it.' : <>Tap a hole to change · par <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{pars.reduce((s, p) => s + p, 0)}</span></>}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {pars.map((p, i) => (
              <button key={i} type="button" disabled={busy} onClick={() => setPars(prev => prev.map((x, idx) => (idx === i ? ((x === 3 ? 4 : x === 4 ? 5 : 3) as Par) : x)))} className="rounded-xl flex flex-col items-center justify-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', minHeight: '56px' }}>
                <span className="leading-none mb-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '10px' }}>H{i + 1}</span>
                <span className="text-lg font-medium leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: p === 4 ? '#F0F0F0' : '#CC2222' }}>{p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-medium mb-1" style={{ color: '#F0F0F0' }}>Your players ({mine.length})</p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>Matched by name to your squad. Change any that are wrong. A total with a * has no hole-by-hole scores.</p>
      {mine.length === 0 && <p className="text-sm mb-3" style={{ color: '#F59E0B' }}>Nobody in this result matched your squad by name. Pick your players from the list below.</p>}
      <div className="space-y-2 mb-5">{mine.map(row)}</div>

      {others.length > 0 && (
        <>
          <button type="button" onClick={() => setShowOthers(v => !v)} className="text-sm mb-3" style={{ color: '#9A9DB0', minHeight: '44px' }}>
            {showOthers ? 'Hide' : 'Show'} the other {others.length} player{others.length !== 1 ? 's' : ''} in the result
          </button>
          {showOthers && <div className="space-y-2 mb-5">{others.map(row)}</div>}
        </>
      )}

      {error && <p className="text-sm mb-4" style={{ color: '#EF4444' }}>{error}</p>}
      <button type="button" onClick={save} disabled={busy || bringing === 0} className="w-full rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px', opacity: busy || bringing === 0 ? 0.6 : 1 }}>
        {busy ? 'Saving…' : `Save and send to ${bringing} player${bringing !== 1 ? 's' : ''} →`}
      </button>
      <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>Saving puts each round in the player&apos;s account and emails them a link to add their stats.</p>
    </div>
  )
}
