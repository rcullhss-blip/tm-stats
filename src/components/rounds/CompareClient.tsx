'use client'

import { useState } from 'react'
import { fmtSG, sgColor } from '@/lib/sg-engine'

export interface CompareRound {
  id: string
  date: string
  courseName: string
  holes: number
  roundType: string
  score: number
  toPar: number
  firPct: number | null
  girPct: number
  putts: number
  puttsPerHole: number
  udPct: number | null
  sgTotal: number | null
  sgOffTee: number | null
  sgApproach: number | null
  sgAroundGreen: number | null
  sgPutt: number | null
  processPct: number | null
}

interface Props {
  rounds: CompareRound[]
  isPro: boolean
}

function fmtToPar(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

// Which side is better: -1 = A, 1 = B, 0 = even/unknown
function better(a: number | null, b: number | null, lowerIsBetter: boolean): -1 | 0 | 1 {
  if (a === null || b === null || a === b) return 0
  const aWins = lowerIsBetter ? a < b : a > b
  return aWins ? -1 : 1
}

export default function CompareClient({ rounds, isPro }: Props) {
  const [aId, setAId] = useState(rounds[1]?.id ?? rounds[0].id)
  const [bId, setBId] = useState(rounds[0].id)

  const a = rounds.find(r => r.id === aId) ?? rounds[0]
  const b = rounds.find(r => r.id === bId) ?? rounds[0]

  const selectStyle: React.CSSProperties = {
    backgroundColor: '#1A1D27',
    border: '1px solid #2E3247',
    color: '#F0F0F0',
    fontSize: '13px',
  }

  const rows: { label: string; a: string; b: string; win: -1 | 0 | 1; color?: (v: number) => string; aVal?: number | null; bVal?: number | null }[] = [
    { label: 'Score', a: `${a.score}`, b: `${b.score}`, win: a.holes === b.holes ? better(a.score, b.score, true) : 0 },
    { label: 'vs par', a: fmtToPar(a.toPar), b: fmtToPar(b.toPar), win: better(a.toPar, b.toPar, true) },
    { label: 'Fairways', a: a.firPct !== null ? `${a.firPct}%` : '—', b: b.firPct !== null ? `${b.firPct}%` : '—', win: better(a.firPct, b.firPct, false) },
    { label: 'Greens (GIR)', a: `${a.girPct}%`, b: `${b.girPct}%`, win: better(a.girPct, b.girPct, false) },
    { label: 'Putts / hole', a: a.puttsPerHole.toFixed(2), b: b.puttsPerHole.toFixed(2), win: better(a.puttsPerHole, b.puttsPerHole, true) },
    { label: 'Up & down', a: a.udPct !== null ? `${a.udPct}%` : '—', b: b.udPct !== null ? `${b.udPct}%` : '—', win: better(a.udPct, b.udPct, false) },
  ]

  if (a.processPct !== null || b.processPct !== null) {
    rows.push({
      label: 'Process',
      a: a.processPct !== null ? `${a.processPct}%` : '—',
      b: b.processPct !== null ? `${b.processPct}%` : '—',
      win: better(a.processPct, b.processPct, false),
    })
  }

  const sgRows: { label: string; aVal: number | null; bVal: number | null }[] = isPro && (a.sgTotal !== null || b.sgTotal !== null)
    ? [
        { label: 'Total SG', aVal: a.sgTotal, bVal: b.sgTotal },
        { label: 'Off the tee', aVal: a.sgOffTee, bVal: b.sgOffTee },
        { label: 'Approach', aVal: a.sgApproach, bVal: b.sgApproach },
        { label: 'Around green', aVal: a.sgAroundGreen, bVal: b.sgAroundGreen },
        { label: 'Putting', aVal: a.sgPutt, bVal: b.sgPutt },
      ]
    : []

  return (
    <div>
      {/* Round pickers */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {([['A', aId, setAId], ['B', bId, setBId]] as const).map(([side, value, setter]) => (
          <div key={side}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9A9DB0' }}>Round {side}</label>
            <select
              value={value}
              onChange={e => setter(e.target.value)}
              className="w-full px-3 py-3 rounded-xl outline-none"
              style={selectStyle}
            >
              {rounds.map(r => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.date)} — {r.courseName} ({fmtToPar(r.toPar)})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Headers */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[a, b].map((r, i) => (
          <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
            <p className="text-xs font-medium mb-0.5 truncate" style={{ color: '#F0F0F0' }}>{r.courseName}</p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>{formatDate(r.date)} · {r.holes}H</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ fontFamily: 'var(--font-dm-mono)', color: r.toPar < 0 ? '#22C55E' : r.toPar <= 5 ? '#F0F0F0' : '#EF4444' }}
            >
              {r.score}
            </p>
            <p className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{fmtToPar(r.toPar)}</p>
          </div>
        ))}
      </div>

      {a.holes !== b.holes && (
        <p className="text-xs text-center mb-3" style={{ color: '#F59E0B' }}>
          Comparing a {a.holes}-hole and a {b.holes}-hole round — percentages compare fairly, totals don&apos;t.
        </p>
      )}

      {/* Stat rows */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="grid items-center py-3 px-3"
            style={{ gridTemplateColumns: '1fr auto 1fr', borderBottom: i < rows.length - 1 ? '1px solid #2E3247' : 'none' }}
          >
            <span
              className="text-base font-medium text-left"
              style={{ fontFamily: 'var(--font-dm-mono)', color: row.win === -1 ? '#22C55E' : '#F0F0F0' }}
            >
              {row.a}{row.win === -1 ? ' ●' : ''}
            </span>
            <span className="text-xs px-3 text-center" style={{ color: '#9A9DB0' }}>{row.label}</span>
            <span
              className="text-base font-medium text-right"
              style={{ fontFamily: 'var(--font-dm-mono)', color: row.win === 1 ? '#22C55E' : '#F0F0F0' }}
            >
              {row.win === 1 ? '● ' : ''}{row.b}
            </span>
          </div>
        ))}
      </div>

      {/* SG rows — Pro */}
      {sgRows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Strokes Gained</h2>
          <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
            {sgRows.map((row, i) => (
              <div
                key={row.label}
                className="grid items-center py-3 px-3"
                style={{ gridTemplateColumns: '1fr auto 1fr', borderBottom: i < sgRows.length - 1 ? '1px solid #2E3247' : 'none' }}
              >
                <span className="text-base font-medium text-left" style={{ fontFamily: 'var(--font-dm-mono)', color: row.aVal !== null ? sgColor(row.aVal) : '#4A4D60' }}>
                  {row.aVal !== null ? fmtSG(row.aVal) : '—'}
                </span>
                <span className="text-xs px-3 text-center" style={{ color: '#9A9DB0' }}>{row.label}</span>
                <span className="text-base font-medium text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: row.bVal !== null ? sgColor(row.bVal) : '#4A4D60' }}>
                  {row.bVal !== null ? fmtSG(row.bVal) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
