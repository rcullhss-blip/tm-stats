'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { calculateHoleSG, SKILL_LEVEL_LABELS, type SkillLevel, type SGCategory } from '@/lib/sg-engine'
import type { LieType, ShotEntry } from '@/lib/types'

// Full-hole Strokes Gained calculator. Same engine, same categories and the
// same shot model as the app: each entry is where a shot was played from, and
// the hole ends when the last shot is holed.

type Pos = { lie: LieType; dist: number } // dist in yards, or feet when lie is green

const LIES: { value: LieType; label: string }[] = [
  { value: 'fairway', label: 'Fairway' },
  { value: 'rough', label: 'Rough' },
  { value: 'bunker', label: 'Bunker' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'green', label: 'Green' },
]

const LEVELS = (Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).filter(l => l !== 'tour')
const CATEGORY_LABEL: Record<SGCategory, string> = { offTee: 'Off the tee', approach: 'Approach', aroundGreen: 'Around the green', putting: 'Putting' }

const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' } as const
const input = { backgroundColor: '#0F1117', border: '1px solid #2E3247', color: '#F0F0F0' } as const
const mono = { fontFamily: 'var(--font-dm-mono)' } as const

const toYards = (p: Pos) => (p.lie === 'green' ? p.dist / 3 : p.dist)
const unit = (lie: LieType) => (lie === 'green' ? 'ft' : 'yds')
const where = (p: Pos) => `${p.dist} ${unit(p.lie)} ${p.lie === 'tee' ? 'from the tee' : p.lie === 'green' ? 'on the green' : `in the ${p.lie}`}`
const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
const col = (n: number) => (n > 0.005 ? '#22C55E' : n < -0.005 ? '#EF4444' : '#9A9DB0')

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
  const [par, setPar] = useState<3 | 4 | 5>(4)
  const [length, setLength] = useState(400)
  // Positions after the tee shot. The tee shot itself is always from `length`.
  const [positions, setPositions] = useState<Pos[]>([
    { lie: 'fairway', dist: 150 },
    { lie: 'green', dist: 25 },
    { lie: 'green', dist: 3 },
  ])
  const [holed, setHoled] = useState(true)
  const [draft, setDraft] = useState<Pos>({ lie: 'green', dist: 15 })

  const shots: ShotEntry[] = useMemo(() => {
    const all: Pos[] = [{ lie: 'tee', dist: length }, ...positions]
    return all.map((p, i) => ({ shotNumber: i + 1, distanceToPin: toYards(p), lieType: p.lie }))
  }, [length, positions])

  const result = holed ? calculateHoleSG(1, par, shots, level) : null
  const score = shots.length
  const vsPar = score - par

  const addPosition = () => {
    setPositions(ps => [...ps, { ...draft, dist: Math.max(1, draft.dist) }])
    setDraft(d => (d.lie === 'green' ? { lie: 'green', dist: Math.max(1, Math.round(d.dist / 3)) } : { lie: 'green', dist: 20 }))
  }
  const removeLast = () => setPositions(ps => ps.slice(0, -1))
  const reset = () => { setPositions([]); setHoled(false) }

  const worst = result ? ([...result.shots].sort((a, b) => a.sg - b.sg)[0] ?? null) : null
  const cats: { key: SGCategory; value: number }[] = result
    ? [
        { key: 'offTee', value: result.sgOffTee },
        { key: 'approach', value: result.sgApproach },
        { key: 'aroundGreen', value: result.sgAroundGreen },
        { key: 'putting', value: result.sgPutt },
      ]
    : []
  const worstCat = cats.length ? [...cats].sort((a, b) => a.value - b.value)[0] : null

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl" style={card}>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <Field label="Your level (the baseline)">
              <select value={level} onChange={e => setLevel(e.target.value as SkillLevel)} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
                {LEVELS.map(l => <option key={l} value={l}>{SKILL_LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Par">
            <select value={par} onChange={e => setPar(Number(e.target.value) as 3 | 4 | 5)} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
              <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Hole length (yards)">
              <input type="number" inputMode="numeric" min={60} max={700} value={length} onChange={e => setLength(Math.max(1, Number(e.target.value) || 0))} className="w-full px-3 py-3 rounded-xl text-sm" style={input} />
            </Field>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={card}>
        <p className="text-sm font-bold mb-3" style={{ color: '#F0F0F0' }}>Shots on the hole</p>
        <ol className="space-y-2 mb-4">
          <li className="flex items-center justify-between text-sm" style={{ color: '#F0F0F0' }}>
            <span><span style={{ color: '#9A9DB0' }}>1.</span> Tee shot from {length} yds</span>
            {result && <span style={{ ...mono, color: col(result.shots[0].sg) }}>{fmt(result.shots[0].sg)}</span>}
          </li>
          {positions.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-sm" style={{ color: '#F0F0F0' }}>
              <span><span style={{ color: '#9A9DB0' }}>{i + 2}.</span> {p.lie === 'green' ? 'Putt' : 'Shot'} from {where(p)}</span>
              {result && result.shots[i + 1] && <span style={{ ...mono, color: col(result.shots[i + 1].sg) }}>{fmt(result.shots[i + 1].sg)}</span>}
            </li>
          ))}
          {holed && <li className="text-sm" style={{ color: '#22C55E' }}>Holed. Score {score}, {vsPar === 0 ? 'par' : vsPar > 0 ? `${vsPar} over` : `${-vsPar} under`}.</li>}
        </ol>

        {!holed && (
          <div className="pt-4" style={{ borderTop: '1px solid #2E3247' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Where did shot {shots.length} finish?</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={draft.lie} onChange={e => setDraft(d => ({ lie: e.target.value as LieType, dist: e.target.value === 'green' ? Math.min(d.dist, 60) : d.dist }))} className="w-full px-3 py-3 rounded-xl text-sm" style={input}>
                {LIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="numeric" min={1} value={draft.dist} onChange={e => setDraft(d => ({ ...d, dist: Math.max(1, Number(e.target.value) || 0) }))} className="w-full px-3 py-3 rounded-xl text-sm" style={input} />
                <span className="text-xs" style={{ color: '#9A9DB0' }}>{draft.lie === 'green' ? 'feet' : 'yards'} to pin</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addPosition} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247' }}>Add shot</button>
              <button type="button" onClick={() => setHoled(true)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Holed it</button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4 text-xs" style={{ color: '#9A9DB0' }}>
          {holed && <button type="button" onClick={() => setHoled(false)} style={{ textDecoration: 'underline' }}>Edit shots</button>}
          {positions.length > 0 && !holed && <button type="button" onClick={removeLast} style={{ textDecoration: 'underline' }}>Remove last</button>}
          <button type="button" onClick={reset} style={{ textDecoration: 'underline' }}>Start again</button>
        </div>
      </div>

      {result && (
        <>
          <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: `1px solid ${result.sgTotal >= 0 ? '#22C55E' : '#EF4444'}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Strokes Gained on the hole</p>
            <p className="text-5xl font-bold mb-2" style={{ ...mono, color: col(result.sgTotal) }}>{fmt(result.sgTotal)}</p>
            <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
              A {SKILL_LEVEL_LABELS[level].toLowerCase()} golfer expects about {result.shots[0].expectedBefore.toFixed(2)} strokes on this hole. You took {score}, so {result.sgTotal >= 0 ? 'you beat your level by' : 'you fell short of your level by'} {Math.abs(result.sgTotal).toFixed(2)}.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={card}>
            <p className="text-xs font-semibold uppercase tracking-widest px-5 pt-4 pb-2" style={{ color: '#9A9DB0' }}>By category</p>
            {cats.map((c, i) => (
              <div key={c.key} className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #2E3247' }}>
                <span className="text-sm" style={{ color: '#F0F0F0' }}>{CATEGORY_LABEL[c.key]}</span>
                <span className="text-sm font-bold" style={{ ...mono, color: col(c.value) }}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={card}>
            <p className="text-xs font-semibold uppercase tracking-widest px-5 pt-4 pb-2" style={{ color: '#9A9DB0' }}>Shot by shot</p>
            <div className="grid grid-cols-12 px-5 py-2 text-xs" style={{ color: '#4A4D60', borderTop: '1px solid #2E3247' }}>
              <span className="col-span-6">Shot</span><span className="col-span-2 text-right">Before</span><span className="col-span-2 text-right">After</span><span className="col-span-2 text-right">SG</span>
            </div>
            {result.shots.map((s, i) => {
              const from: Pos = i === 0 ? { lie: 'tee', dist: length } : positions[i - 1]
              return (
                <div key={i} className="grid grid-cols-12 px-5 py-2.5 text-sm" style={{ borderTop: '1px solid #2E3247' }}>
                  <span className="col-span-6 truncate" style={{ color: '#F0F0F0' }}>{i + 1}. {where(from)}<span className="text-xs ml-1" style={{ color: '#4A4D60' }}>{CATEGORY_LABEL[s.category]}</span></span>
                  <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{s.expectedBefore.toFixed(2)}</span>
                  <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{s.expectedAfter.toFixed(2)}</span>
                  <span className="col-span-2 text-right font-bold" style={{ ...mono, color: col(s.sg) }}>{fmt(s.sg)}</span>
                </div>
              )
            })}
          </div>

          {worst && worstCat && (
            <div className="p-5 rounded-2xl" style={card}>
              <p className="text-sm font-bold mb-2" style={{ color: '#F0F0F0' }}>What it says</p>
              <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
                {worstCat.value < -0.05
                  ? `${CATEGORY_LABEL[worstCat.key]} cost you the most on this hole (${fmt(worstCat.value)}). The single most expensive shot was shot ${worst.shotNumber}, ${where(worst.shotNumber === 1 ? { lie: 'tee', dist: length } : positions[worst.shotNumber - 2])}, at ${fmt(worst.sg)}.`
                  : `Nothing on this hole cost you against your level. Your best category was ${CATEGORY_LABEL[[...cats].sort((a, b) => b.value - a.value)[0].key].toLowerCase()}.`}
                {' '}One hole is a story. Ten rounds is a pattern, which is what the app is for.
              </p>
            </div>
          )}
        </>
      )}

      <div className="p-5 rounded-2xl text-center" style={card}>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Want this for every hole, every round?</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>TM Stats does exactly this sum as you play, then adds it up across rounds and tells you what to practise. Five rounds free.</p>
        <Link href="/signup" className="inline-block px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Start free</Link>
      </div>
    </div>
  )
}
