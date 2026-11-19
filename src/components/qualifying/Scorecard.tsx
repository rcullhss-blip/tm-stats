'use client'

import { fmtToPar } from '@/lib/qualifying'

/** A player's whole card, out and in, so the group can check every hole. Tap a hole to fix it. */
export default function Scorecard({ name, pars, scores, onHole, current }: {
  name: string
  pars: number[]
  scores: (number | null)[]
  onHole?: (hole: number) => void
  current?: number
}) {
  const halves = pars.length === 18 ? [[0, 9], [9, 18]] : [[0, pars.length]]
  const total = scores.reduce<number>((s, v) => s + (v ?? 0), 0)
  const played = scores.filter(v => v !== null).length
  const toPar = scores.reduce<number>((s, v, i) => s + (v === null ? 0 : v - pars[i]), 0)
  const cell = { width: '10%', textAlign: 'center' as const }
  const colour = (v: number | null, p: number) => v === null ? '#F59E0B' : v < p ? '#22C55E' : v === p ? '#F0F0F0' : v - p >= 2 ? '#EF4444' : '#9A9DB0'

  return (
    <div className="py-3" style={{ borderTop: '1px solid #22263A' }}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold truncate pr-2" style={{ color: '#F0F0F0' }}>{name}</p>
        <p className="text-sm flex-shrink-0" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
          {played > 0 ? total : '–'} <span className="text-xs" style={{ color: '#9A9DB0' }}>{played > 0 ? fmtToPar(toPar) : ''}</span>
        </p>
      </div>
      {halves.map(([a, b]) => {
        const sub = scores.slice(a, b).reduce<number>((s, v) => s + (v ?? 0), 0)
        return (
          <div key={a} className="mb-1.5" style={{ fontFamily: 'var(--font-dm-mono)' }}>
            <div className="flex text-[10px]" style={{ color: '#4A4D60' }}>
              {pars.slice(a, b).map((p, i) => <span key={i} style={cell}>{a + i + 1}</span>)}
              <span style={cell}>{pars.length === 18 ? (a === 0 ? 'Out' : 'In') : 'Tot'}</span>
            </div>
            <div className="flex">
              {scores.slice(a, b).map((v, i) => {
                const n = a + i + 1
                return (
                  <button key={n} type="button" onClick={() => onHole?.(n)} aria-label={`Hole ${n}: ${v ?? 'no score'}. Tap to change`}
                    className="text-sm font-medium rounded" style={{ ...cell, minHeight: '36px', color: colour(v, pars[n - 1]), backgroundColor: n === current ? '#CC222230' : v === null ? '#F59E0B15' : '#0F1117', margin: '0 1px' }}>
                    {v ?? '·'}
                  </button>
                )
              })}
              <span className="text-sm flex items-center justify-center" style={{ ...cell, color: '#9A9DB0' }}>{sub || '–'}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
