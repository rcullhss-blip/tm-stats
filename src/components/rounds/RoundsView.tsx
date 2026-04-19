'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { RoundRow } from '@/lib/types'

function formatDate(dateStr: string, style: 'short' | 'long' = 'short'): string {
  const d = new Date(dateStr)
  if (style === 'long') return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scoreToPar(score: number | null, par: number | null): string {
  if (!score || !par) return '—'
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreColor(score: number | null, par: number | null): string {
  if (!score || !par) return '#9A9DB0'
  const diff = score - par
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 3) return '#9A9DB0'
  return '#EF4444'
}

function roundTypeLabel(type: string) {
  if (type === 'competition') return { label: 'Comp', color: '#CC2222' }
  if (type === 'tournament') return { label: 'Tourn', color: '#F59E0B' }
  return { label: 'Practice', color: '#9A9DB0' }
}

interface Props {
  rounds: RoundRow[]
}

export default function RoundsView({ rounds }: Props) {
  const [view, setView] = useState<'list' | 'journal'>('list')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return rounds
    const q = search.toLowerCase()
    return rounds.filter(r =>
      r.course_name.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    )
  }, [rounds, search])

  // Group by month/year for journal view
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; rounds: RoundRow[] }[] = []
    for (const r of filtered) {
      const d = new Date(r.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      const existing = groups.find(g => g.key === key)
      if (existing) existing.rounds.push(r)
      else groups.push({ key, label, rounds: [r] })
    }
    return groups
  }, [filtered])

  const inputStyle = {
    backgroundColor: '#1A1D27',
    border: '1px solid #2E3247',
    color: '#F0F0F0',
    borderRadius: '12px',
    padding: '10px 14px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        {(['list', 'journal'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className="flex-1 py-2 rounded-lg text-sm font-medium capitalize"
            style={{
              backgroundColor: view === v ? '#CC222220' : '#1A1D27',
              color: view === v ? '#CC2222' : '#9A9DB0',
              border: `1px solid ${view === v ? '#CC222240' : '#2E3247'}`,
            }}
          >
            {v === 'list' ? 'All rounds' : 'Journal'}
          </button>
        ))}
      </div>

      {/* Search (journal only) */}
      {view === 'journal' && (
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search course or notes…"
            style={inputStyle}
          />
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: '#9A9DB0' }}>
          {search ? 'No rounds match your search.' : 'No rounds yet.'}
        </p>
      )}

      {/* ── List view ───────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="space-y-3">
          {rounds.map((round: RoundRow) => {
            const { label, color } = roundTypeLabel(round.round_type)
            return (
              <Link
                key={round.id}
                href={`/rounds/${round.id}`}
                className="block p-4 rounded-xl active:opacity-80"
                style={{ backgroundColor: '#1A1D27' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>{round.course_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{formatDate(round.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(round.score_total, round.par_total) }}>
                      {round.score_total ?? '—'}
                    </p>
                    <p className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(round.score_total, round.par_total) }}>
                      {scoreToPar(round.score_total, round.par_total)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                    {round.holes} holes
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color }}>
                    {label}
                  </span>
                  {round.input_mode === 'full' && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#22C55E' }}>
                      SG
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Journal view ─────────────────────────────────────────────────────── */}
      {view === 'journal' && (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.key}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
                {group.label}
              </p>
              <div className="space-y-3">
                {group.rounds.map(round => {
                  const { label, color } = roundTypeLabel(round.round_type)
                  const hasTags = round.mood || round.conditions || round.energy_level
                  return (
                    <Link
                      key={round.id}
                      href={`/rounds/${round.id}`}
                      className="block p-4 rounded-xl active:opacity-80"
                      style={{ backgroundColor: '#1A1D27', borderLeft: `3px solid ${scoreColor(round.score_total, round.par_total)}` }}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>{round.course_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                            {formatDate(round.date, 'long')}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(round.score_total, round.par_total) }}>
                            {scoreToPar(round.score_total, round.par_total)}
                          </p>
                          <p className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                            {round.score_total ?? '—'}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color }}>
                          {label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                          {round.holes}H
                        </span>
                        {round.input_mode === 'full' && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#22C55E' }}>
                            SG
                          </span>
                        )}
                        {hasTags && (
                          <>
                            {round.mood && (
                              <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                                {round.mood}
                              </span>
                            )}
                            {round.conditions && round.conditions.split(',').slice(0, 2).map(c => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                                {c.trim()}
                              </span>
                            ))}
                            {round.energy_level && (
                              <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                                {round.energy_level}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Notes */}
                      {round.notes ? (
                        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#9A9DB0' }}>
                          &ldquo;{round.notes}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: '#4A4D60' }}>No notes</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
