'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { rankSquad, standingsCsv, type SelectionFilters, type SelectionRound, type SelectionSaved } from '@/lib/selection'

interface Props {
  teamName: string
  players: { id: string; name: string }[]
  rounds: SelectionRound[]
  events: { id: string; name: string; kind: string; date: string }[]
  saved: SelectionSaved
  canSave: boolean
}

const card = { backgroundColor: '#1A1D27' } as const
const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '44px' } as const
const mono = { fontFamily: 'var(--font-dm-mono)' } as const

function toPar(n: number | null, dp = 1): string {
  if (n === null) return '–'
  if (n === 0) return 'E'
  return n > 0 ? `+${n.toFixed(dp)}` : n.toFixed(dp)
}
function toParInt(n: number): string {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`
}
function day(d: string): string {
  return d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''
}

const RULES: { label: string; value: SelectionFilters['bestOf'] }[] = [
  { label: 'Every round', value: null },
  { label: 'Best 4 of last 6', value: { best: 4, of: 6 } },
  { label: 'Best 3 of last 4', value: { best: 3, of: 4 } },
  { label: 'Best 2 of last 3', value: { best: 2, of: 3 } },
  { label: 'Last 3 rounds', value: { best: 3, of: 3 } },
]

/** Coach: rank the squad on chosen rounds and pick the travel team. */
export default function SelectionClient({ teamName, players, rounds, events, saved, canSave }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kind, setKind] = useState<SelectionFilters['kind']>('all')
  const [eventIds, setEventIds] = useState<string[] | null>(null)
  const [rule, setRule] = useState(0)
  const [excluded, setExcluded] = useState<Set<string>>(new Set(saved.excluded))
  const [squad, setSquad] = useState<Set<string>>(new Set(saved.squad))
  const [notes, setNotes] = useState<Record<string, string>>(saved.notes)
  const [open, setOpen] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)
  const [dirty, setDirty] = useState(false)

  const filters: SelectionFilters = { from: from || null, to: to || null, kind, events: eventIds, bestOf: RULES[rule].value }
  const standings = useMemo(() => rankSquad(players, rounds, filters, excluded),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, rounds, from, to, kind, eventIds, rule, excluded])

  function change<T>(fn: (v: T) => void) {
    return (v: T) => { fn(v); setDirty(true); setStatus(null) }
  }
  const toggleExcluded = change((key: string) => setExcluded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n }))
  const toggleSquad = change((id: string) => setSquad(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }))
  const setNote = change(([id, text]: [string, string]) => setNotes(prev => ({ ...prev, [id]: text })))

  async function save() {
    setSaving(true); setStatus(null)
    try {
      const res = await fetch('/api/coach/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded: [...excluded], squad: [...squad], notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      setDirty(false)
      setStatus({ text: 'Saved', ok: true })
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : 'Could not save', ok: false })
    } finally {
      setSaving(false)
    }
  }

  function download() {
    const csv = standingsCsv(standings, squad, notes)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${teamName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-selection.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  // Events played over more than one round show the round number
  const multiRound = useMemo(() => new Set(rounds.filter(r => r.roundNo > 1).map(r => r.qualifierId)), [rounds])
  const filtersOn = !!from || !!to || kind !== 'all' || eventIds !== null || rule !== 0
  const ranked = standings.filter(s => s.avgToPar !== null)
  const squadList = standings.filter(s => squad.has(s.userId))

  if (rounds.length === 0) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <Link href="/coach" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Coach</Link>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Selection</h1>
        <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>{teamName}</p>
        <div className="p-5 rounded-xl" style={card}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>No qualifying rounds yet</p>
          <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>Every complete qualifying and tournament card lands here, so you can rank the squad on the rounds you choose and pick your travel team.</p>
          <Link href="/qualifying/new" className="inline-flex items-center px-4 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}>Set up qualifying</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/coach" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Coach</Link>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Selection</h1>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>{teamName} · {rounds.length} qualifying and tournament rounds</p>

      {/* Counting rule */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>What counts</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        {RULES.map((r, i) => (
          <button key={r.label} type="button" onClick={() => setRule(i)} className="px-3 rounded-lg text-sm whitespace-nowrap flex-shrink-0" style={{ backgroundColor: rule === i ? '#CC2222' : '#1A1D27', color: rule === i ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${rule === i ? '#CC2222' : '#2E3247'}`, minHeight: '44px' }}>
            {r.label}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setShowFilters(v => !v)} className="text-sm mb-3" style={{ color: filtersOn ? '#CC2222' : '#9A9DB0', minHeight: '44px' }}>
        {showFilters ? 'Hide filters' : filtersOn ? 'Filters on · change' : 'Filter by date or event'}
      </button>
      {showFilters && (
        <div className="p-4 rounded-xl mb-4 space-y-3" style={card}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: '#9A9DB0' }}>From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 rounded-lg text-sm" style={field} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: '#9A9DB0' }}>To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 rounded-lg text-sm" style={field} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'qualifying', 'tournament'] as const).map(k => (
              <button key={k} type="button" onClick={() => setKind(k)} className="rounded-lg text-sm" style={{ backgroundColor: kind === k ? '#CC222220' : '#22263A', color: kind === k ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${kind === k ? '#CC222260' : '#2E3247'}`, minHeight: '44px' }}>
                {k === 'all' ? 'Both' : k === 'qualifying' ? 'Qualifying' : 'Tournaments'}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Events</p>
            {events.map(e => {
              const on = eventIds === null || eventIds.includes(e.id)
              return (
                <label key={e.id} className="flex items-center gap-3" style={{ minHeight: '40px' }}>
                  <input type="checkbox" checked={on} onChange={() => setEventIds(prev => {
                    const all = events.map(x => x.id)
                    const cur = prev ?? all
                    const next = cur.includes(e.id) ? cur.filter(x => x !== e.id) : [...cur, e.id]
                    return next.length === all.length ? null : next
                  })} style={{ width: '20px', height: '20px', accentColor: '#CC2222' }} />
                  <span className="text-sm" style={{ color: '#F0F0F0' }}>{e.name} <span style={{ color: '#9A9DB0' }}>· {e.kind === 'tournament' ? 'tournament' : 'qualifying'}{e.date ? ` · ${day(e.date)}` : ''}</span></span>
                </label>
              )
            })}
          </div>
          {filtersOn && (
            <button type="button" onClick={() => { setFrom(''); setTo(''); setKind('all'); setEventIds(null); setRule(0) }} className="text-xs" style={{ color: '#9A9DB0', minHeight: '32px' }}>Clear filters</button>
          )}
        </div>
      )}

      {/* Ranking */}
      <div className="flex items-center px-4 py-2 text-xs" style={{ color: '#4A4D60' }}>
        <span className="w-9">Pos</span>
        <span className="flex-1">Player · tap to see rounds</span>
        <span className="w-14 text-right">Avg</span>
        <span className="w-16 text-right">Squad</span>
      </div>
      <div className="rounded-xl overflow-hidden mb-2" style={card}>
        {standings.map((s, i) => {
          const isOpen = open === s.userId
          const inSquad = squad.has(s.userId)
          const allMine = rounds.filter(r => r.userId === s.userId).sort((a, b) => b.date.localeCompare(a.date) || b.roundNo - a.roundNo)
          const countedKeys = new Set(s.counted.map(r => r.key))
          return (
            <div key={s.userId} style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none', backgroundColor: inSquad ? '#22C55E0D' : 'transparent' }}>
              <div className="flex items-center px-4" style={{ minHeight: '56px' }}>
                <span className="w-9 text-sm" style={{ ...mono, color: '#9A9DB0' }}>{s.position ?? '–'}</span>
                <button type="button" onClick={() => setOpen(isOpen ? null : s.userId)} className="flex-1 text-left min-w-0 pr-2" style={{ minHeight: '48px' }}>
                  <span className="text-sm block truncate" style={{ color: '#F0F0F0' }}>{s.name}</span>
                  <span className="text-xs" style={{ color: '#4A4D60' }}>
                    {s.counted.length > 0 ? `${s.counted.length} round${s.counted.length !== 1 ? 's' : ''} · best ${toParInt(s.best!)} · worst ${toParInt(s.worst!)}` : 'No rounds in this view'}
                    {s.sgAvg !== null ? ` · SG ${s.sgAvg > 0 ? '+' : ''}${s.sgAvg}` : ''}
                  </span>
                </button>
                <span className="w-14 text-right text-base font-medium" style={{ ...mono, color: s.avgToPar !== null && s.avgToPar < 0 ? '#22C55E' : '#F0F0F0' }}>{toPar(s.avgToPar)}</span>
                <span className="w-16 flex justify-end">
                  <button type="button" onClick={() => toggleSquad(s.userId)} aria-label={`${inSquad ? 'Remove' : 'Add'} ${s.name} ${inSquad ? 'from' : 'to'} the travel squad`} className="rounded-lg text-xs font-semibold px-2" style={{ backgroundColor: inSquad ? '#22C55E20' : '#22263A', color: inSquad ? '#22C55E' : '#9A9DB0', border: `1px solid ${inSquad ? '#22C55E60' : '#2E3247'}`, minHeight: '40px', minWidth: '56px' }}>
                    {inSquad ? '✓ In' : 'Pick'}
                  </button>
                </span>
              </div>
              {isOpen && (
                <div className="px-4 pb-4">
                  {allMine.length === 0 && <p className="text-xs" style={{ color: '#9A9DB0' }}>No complete qualifying or tournament cards yet.</p>}
                  {allMine.map(r => {
                    const out = excluded.has(r.key)
                    const counts = countedKeys.has(r.key)
                    return (
                      <div key={r.key} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid #22263A' }}>
                        <div className="min-w-0 pr-2">
                          <p className="text-sm truncate" style={{ color: out ? '#4A4D60' : '#F0F0F0', textDecoration: out ? 'line-through' : 'none' }}>
                            {r.event}{multiRound.has(r.qualifierId) ? ` · R${r.roundNo}` : ''}
                          </p>
                          <p className="text-xs" style={{ color: '#9A9DB0' }}>
                            {day(r.date)} · {r.kind === 'tournament' ? 'Tournament' : 'Qualifying'}
                            {!out && !counts ? ' · not counted' : ''}
                            {r.sg !== null ? ` · SG ${r.sg > 0 ? '+' : ''}${r.sg}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm" style={{ ...mono, color: out ? '#4A4D60' : '#F0F0F0' }}>{r.score} <span className="text-xs" style={{ color: '#9A9DB0' }}>{toParInt(r.toPar)}</span></span>
                          <button type="button" onClick={() => toggleExcluded(r.key)} className="text-xs px-2 rounded-lg" style={{ backgroundColor: '#22263A', color: out ? '#CC2222' : '#9A9DB0', border: '1px solid #2E3247', minHeight: '36px' }}>
                            {out ? 'Count it' : 'Leave out'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <label className="text-xs block mt-3 mb-1" style={{ color: '#9A9DB0' }}>Note (only you see this)</label>
                  <input value={notes[s.userId] ?? ''} onChange={e => setNote([s.userId, e.target.value.slice(0, 300)])} placeholder="e.g. back from injury, strong in wind" className="w-full px-3 rounded-lg text-sm" style={field} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs mb-6" style={{ color: '#4A4D60' }}>
        Average is score to par over the rounds that count. Only complete cards from team qualifying and uploaded results are used. SG is Strokes Gained against a scratch golfer, shown where the player added full stats.
      </p>

      {/* Travel squad */}
      <div className="p-4 rounded-xl mb-4" style={{ ...card, border: '1px solid #22C55E40' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: '#F0F0F0' }}>Travel squad ({squadList.length})</p>
        {squadList.length === 0 ? (
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Tap Pick next to a player to add them.</p>
        ) : (
          squadList.map(s => (
            <p key={s.userId} className="text-sm py-1" style={{ color: '#F0F0F0' }}>
              {s.position ?? '–'}. {s.name} <span style={{ ...mono, color: '#9A9DB0' }}>{toPar(s.avgToPar)}</span>
              {notes[s.userId] ? <span className="text-xs" style={{ color: '#9A9DB0' }}> · {notes[s.userId]}</span> : null}
            </p>
          ))
        )}
        {ranked.length > 0 && squadList.length === 0 && (
          <button type="button" onClick={() => { setSquad(new Set(ranked.slice(0, 5).map(s => s.userId))); setDirty(true); setStatus(null) }} className="text-sm mt-2" style={{ color: '#22C55E', minHeight: '44px' }}>
            Pick the top {Math.min(5, ranked.length)}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <button type="button" onClick={save} disabled={saving || !canSave || !dirty} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: dirty && canSave ? '#CC2222' : '#22263A', color: '#F0F0F0', minHeight: '52px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : dirty ? 'Save picks' : 'Saved'}
        </button>
        <button type="button" onClick={download} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '52px' }}>
          Download spreadsheet
        </button>
      </div>
      {!canSave && <p className="text-xs" style={{ color: '#F59E0B' }}>Saving picks is not switched on yet. You can still rank and download.</p>}
      {status && <p className="text-xs" style={{ color: status.ok ? '#22C55E' : '#EF4444' }}>{status.text}</p>}
      <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Saved picks are rounds left out, the travel squad and your notes. Filters are for looking and are not saved.</p>
    </div>
  )
}
