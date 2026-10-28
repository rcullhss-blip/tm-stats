'use client'

import { useState } from 'react'
import Link from 'next/link'
import { expectedStrokes, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import type { LieType } from '@/lib/types'

const LIES: { value: LieType; label: string }[] = [
  { value: 'tee', label: 'Tee' },
  { value: 'fairway', label: 'Fairway' },
  { value: 'rough', label: 'Rough' },
  { value: 'bunker', label: 'Bunker' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'green', label: 'Green' },
]

const LEVELS = (Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).filter(l => l !== 'tour')

const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' } as const
const input = { backgroundColor: '#0F1117', border: '1px solid #2E3247', color: '#F0F0F0' } as const

function toYards(lie: LieType, value: number) {
  return lie === 'green' ? value / 3 : value
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0' }}>{label}</span>
      {children}
    </label>
  )
}

export default function SgCalculator() {
  const [level, setLevel] = useState<SkillLevel>('h10_14')
  const [startLie, setStartLie] = useState<LieType>('fairway')
  const [startDist, setStartDist] = useState(150)
  const [holed, setHoled] = useState(false)
  const [endLie, setEndLie] = useState<LieType>('green')
  const [endDist, setEndDist] = useState(25)

  const before = expectedStrokes(toYards(startLie, startDist), startLie, level)
  const after = holed ? 0 : expectedStrokes(toYards(endLie, endDist), endLie, level)
  const sg = before - after - 1
  const unit = (lie: LieType) => (lie === 'green' ? 'feet' : 'yards')
  const describe = (lie: LieType, d: number) => `${d} ${unit(lie)} ${lie === 'tee' ? 'from the tee' : lie === 'green' ? 'on the green' : `in the ${lie}`}`

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl" style={card}>
        <Field label="Your level (the baseline)">
          <select value={level} onChange={e => setLevel(e.target.value as SkillLevel)} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
            {LEVELS.map(l => <option key={l} value={l}>{SKILL_LEVEL_LABELS[l]}</option>)}
          </select>
        </Field>
      </div>

      <div className="p-5 rounded-2xl" style={card}>
        <p className="text-sm font-bold mb-3" style={{ color: '#F0F0F0' }}>Where the shot started</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lie">
            <select value={startLie} onChange={e => setStartLie(e.target.value as LieType)} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
              {LIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          <Field label={`Distance (${unit(startLie)})`}>
            <input type="number" inputMode="numeric" min={1} max={startLie === 'green' ? 150 : 600} value={startDist} onChange={e => setStartDist(Math.max(1, Number(e.target.value) || 0))} className="w-full px-3 py-3 rounded-xl text-sm" style={input} />
          </Field>
        </div>
        <p className="text-xs mt-3" style={{ color: '#9A9DB0' }}>Expected strokes to hole out from here: <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{before.toFixed(2)}</span></p>
      </div>

      <div className="p-5 rounded-2xl" style={card}>
        <p className="text-sm font-bold mb-3" style={{ color: '#F0F0F0' }}>Where it finished</p>
        <label className="flex items-center gap-2 mb-3 text-sm" style={{ color: '#F0F0F0' }}>
          <input type="checkbox" checked={holed} onChange={e => setHoled(e.target.checked)} />
          Holed it
        </label>
        {!holed && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lie">
              <select value={endLie} onChange={e => setEndLie(e.target.value as LieType)} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
                {LIES.filter(l => l.value !== 'tee').map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label={`Distance (${unit(endLie)})`}>
              <input type="number" inputMode="numeric" min={1} max={endLie === 'green' ? 150 : 600} value={endDist} onChange={e => setEndDist(Math.max(1, Number(e.target.value) || 0))} className="w-full px-3 py-3 rounded-xl text-sm" style={input} />
            </Field>
          </div>
        )}
        {!holed && <p className="text-xs mt-3" style={{ color: '#9A9DB0' }}>Expected strokes from there: <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{after.toFixed(2)}</span></p>}
      </div>

      <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: `1px solid ${sg >= 0 ? '#22C55E' : '#EF4444'}` }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Strokes Gained on this shot</p>
        <p className="text-5xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-mono)', color: sg >= 0 ? '#22C55E' : '#EF4444' }}>{sg >= 0 ? '+' : ''}{sg.toFixed(2)}</p>
        <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
          From {describe(startLie, startDist)} a {SKILL_LEVEL_LABELS[level].toLowerCase()} golfer expects {before.toFixed(2)} strokes to finish the hole.
          {holed ? ' You holed it, so one shot did the lot.' : ` You used one and left ${after.toFixed(2)} from ${describe(endLie, endDist)}.`}
          {' '}{sg >= 0 ? 'That shot gained you' : 'That shot cost you'} {Math.abs(sg).toFixed(2)} {Math.abs(sg) === 1 ? 'stroke' : 'strokes'} against your level.
        </p>
        <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>Formula: expected before minus expected after, minus one for the shot.</p>
      </div>

      <div className="p-5 rounded-2xl text-center" style={card}>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Want this for every shot you hit?</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>TM Stats does this sum for the whole round and splits it into off the tee, approach, around the green and putting. Five rounds free.</p>
        <Link href="/signup" className="inline-block px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Start free</Link>
      </div>
    </div>
  )
}
