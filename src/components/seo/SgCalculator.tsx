'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calculateHoleSG, SKILL_LEVEL_LABELS, type SkillLevel, type SGCategory } from '@/lib/sg-engine'
import type { LieType, LieQuality, ShotEntry } from '@/lib/types'

// Public Strokes Gained calculator. The entry flow is the same as the app's
// full tracking mode (see components/rounds/FullTrackingEntry.tsx) and the
// maths is the same engine, so a hole entered here matches a hole in the app.

const LIE_OPTIONS: { value: LieType; label: string }[] = [
  { value: 'tee', label: 'Tee' },
  { value: 'fairway', label: 'Fairway' },
  { value: 'rough', label: 'Rough' },
  { value: 'bunker', label: 'Bunker' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'green', label: 'Green' },
  { value: 'penalty', label: 'Penalty' },
]
const QUALITY_OPTIONS: { value: LieQuality; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: '#22C55E' },
  { value: 'awkward', label: 'Awkward', color: '#F59E0B' },
  { value: 'severe', label: 'Severe', color: '#EF4444' },
]
const LIES_WITH_QUALITY: LieType[] = ['fairway', 'rough', 'bunker', 'fringe']
const LEVELS = (Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).filter(l => l !== 'tour')
const CATEGORY_LABEL: Record<SGCategory, string> = { offTee: 'Off the tee', approach: 'Approach', aroundGreen: 'Around the green', putting: 'Putting' }

const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' } as const
const mono = { fontFamily: 'var(--font-dm-mono)' } as const
const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
const col = (n: number) => (n > 0.005 ? '#22C55E' : n < -0.005 ? '#EF4444' : '#9A9DB0')
const feetToYards = (ft: number) => ft / 3
const yardsToFeet = (y: number) => Math.round(y * 3)
function displayDist(distYards: number, lie: LieType) {
  if (lie === 'green') return `${yardsToFeet(distYards)}ft`
  return `${Math.round(distYards)}y`
}
function nextLieSuggestion(shots: ShotEntry[], par: 3 | 4 | 5): LieType {
  if (shots.length === 0) return 'tee'
  const prev = shots[shots.length - 1].lieType
  if (prev === 'penalty') {
    const lastReal = [...shots].reverse().find(s => s.lieType !== 'penalty')
    return lastReal?.lieType === 'tee' ? 'tee' : 'fairway'
  }
  if (par === 3 && shots.length === 1) return 'green'
  if (prev === 'tee') return 'fairway'
  if (prev === 'fairway' || prev === 'rough' || prev === 'bunker' || prev === 'fringe') return 'green'
  if (prev === 'green') return 'green'
  return 'fairway'
}
const lieColor = (lie: LieType, selected: boolean) => {
  const map: Record<LieType, string> = { tee: '#22C55E', fairway: '#22C55E', rough: '#4ade80', bunker: '#F59E0B', fringe: '#86efac', green: '#22C55E', penalty: '#EF4444' }
  const c = map[lie]
  return { bg: selected ? `${c}20` : '#1A1D27', text: selected ? c : '#9A9DB0', border: selected ? `${c}60` : '#2E3247' }
}

export default function SgCalculator() {
  const [level, setLevel] = useState<SkillLevel>('h10_14')
  const [par, setPar] = useState<3 | 4 | 5>(4)
  const [shots, setShots] = useState<ShotEntry[]>([])
  const [finished, setFinished] = useState(false)
  const [pendingLie, setPendingLie] = useState<LieType>('tee')
  const [pendingQuality, setPendingQuality] = useState<LieQuality>('good')
  const [pendingDist, setPendingDist] = useState('')
  const [error, setError] = useState('')

  const isPenalty = pendingLie === 'penalty'
  const distUnit = pendingLie === 'green' ? 'feet' : 'yards'
  const distPlaceholder = pendingLie === 'tee' ? 'e.g. 400 (hole length)' : pendingLie === 'green' ? 'e.g. 12' : 'e.g. 145'

  function addShot() {
    let distYards: number
    if (isPenalty) {
      distYards = shots.length > 0 ? shots[shots.length - 1].distanceToPin : 0
    } else {
      const raw = parseInt(pendingDist)
      if (isNaN(raw) || raw <= 0) { setError(`Enter the distance in ${distUnit}`); return }
      distYards = pendingLie === 'green' ? feetToYards(raw) : raw
    }
    setError('')
    const newShots: ShotEntry[] = [...shots, {
      shotNumber: shots.length + 1,
      distanceToPin: distYards,
      lieType: pendingLie,
      ...(LIES_WITH_QUALITY.includes(pendingLie) && pendingQuality !== 'good' ? { lieQuality: pendingQuality } : {}),
    }]
    setShots(newShots)
    setPendingDist('')
    setPendingQuality('good')
    setPendingLie(nextLieSuggestion(newShots, par))
  }
  function removeLastShot() {
    if (shots.length === 0) return
    const prev = shots[shots.length - 1]
    setShots(shots.slice(0, -1))
    setFinished(false)
    setPendingLie(prev.lieType)
    setPendingQuality(prev.lieQuality ?? 'good')
    setPendingDist(prev.lieType === 'penalty' ? '' : prev.lieType === 'green' ? String(yardsToFeet(prev.distanceToPin)) : String(prev.distanceToPin))
  }
  function startAgain() { setShots([]); setFinished(false); setPendingLie('tee'); setPendingDist(''); setPendingQuality('good'); setError('') }

  const result = finished && shots.length > 0 ? calculateHoleSG(1, par, shots, level) : null
  const score = shots.length
  const vsPar = score - par
  const cats: { key: SGCategory; value: number }[] = result
    ? [{ key: 'offTee', value: result.sgOffTee }, { key: 'approach', value: result.sgApproach }, { key: 'aroundGreen', value: result.sgAroundGreen }, { key: 'putting', value: result.sgPutt }]
    : []
  const worstCat = cats.length ? [...cats].sort((a, b) => a.value - b.value)[0] : null
  const worstShot = result ? [...result.shots].sort((a, b) => a.sg - b.sg)[0] : null

  return (
    <div className="space-y-6">
      {/* Level */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Your level (the baseline you are measured against)</p>
        <select value={level} onChange={e => setLevel(e.target.value as SkillLevel)} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0' }}>
          {LEVELS.map(l => <option key={l} value={l}>{SKILL_LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      {/* Par */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Par</p>
        <div className="grid grid-cols-3 gap-2">
          {([3, 4, 5] as const).map(p => (
            <button key={p} type="button" onClick={() => { setPar(p); setFinished(false) }} className="py-3 rounded-xl font-bold text-lg"
              style={{ backgroundColor: par === p ? '#CC2222' : '#1A1D27', color: par === p ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${par === p ? '#CC2222' : '#2E3247'}`, minHeight: '52px', ...mono }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Shot history */}
      {shots.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Shots entered</p>
          <div className="rounded-xl overflow-hidden" style={card}>
            {shots.map((s, i) => {
              const { text } = lieColor(s.lieType, true)
              const sg = result?.shots.find(r => r.shotNumber === s.shotNumber)
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < shots.length - 1 ? '1px solid #2E3247' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ ...mono, color: '#9A9DB0', width: '20px' }}>{s.shotNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: `${text}20`, color: text }}>{s.lieType}</span>
                    {s.lieQuality && s.lieQuality !== 'good' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: s.lieQuality === 'severe' ? '#EF444420' : '#F59E0B20', color: s.lieQuality === 'severe' ? '#EF4444' : '#F59E0B' }}>{s.lieQuality}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ ...mono, color: '#9A9DB0' }}>{s.lieType === 'penalty' ? 'penalty' : displayDist(s.distanceToPin, s.lieType)}</span>
                    {sg && <span className="text-sm font-bold" style={{ ...mono, color: col(sg.sg), minWidth: '52px', textAlign: 'right' }}>{fmt(sg.sg)}</span>}
                  </div>
                </div>
              )
            })}
            {finished && (
              <div className="px-4 py-3 text-sm" style={{ borderTop: '1px solid #2E3247', color: '#22C55E' }}>
                Holed. Score {score}, {vsPar === 0 ? 'par' : vsPar > 0 ? `${vsPar} over` : `${-vsPar} under`}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add next shot */}
      {!finished && (
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Shot {shots.length + 1}, where is the ball?</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {LIE_OPTIONS.map(({ value, label }) => {
              const { bg, text, border } = lieColor(value, pendingLie === value)
              return (
                <button key={value} type="button" onClick={() => { setPendingLie(value); setPendingDist(''); setPendingQuality('good'); setError('') }}
                  className="px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: bg, color: text, border: `1px solid ${border}`, minHeight: '40px' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {LIES_WITH_QUALITY.includes(pendingLie) && (
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Lie quality</p>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map(({ value, label, color }) => {
                  const selected = pendingQuality === value
                  return (
                    <button key={value} type="button" onClick={() => setPendingQuality(value)} className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: selected ? `${color}20` : '#1A1D27', color: selected ? color : '#9A9DB0', border: `1px solid ${selected ? `${color}60` : '#2E3247'}`, minHeight: '40px' }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {isPenalty ? (
            <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444440' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#EF4444' }}>Penalty stroke</p>
              <p className="text-xs" style={{ color: '#9A9DB0' }}>Counts as 1 shot. No yardage needed, your next shot carries on from where you were.</p>
            </div>
          ) : (
            <div className="mb-3">
              <label className="block text-xs mb-2" style={{ color: '#9A9DB0' }}>Distance to pin ({distUnit})</label>
              <input type="number" inputMode="numeric" value={pendingDist} onChange={e => setPendingDist(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addShot() }} placeholder={distPlaceholder} min={0} max={pendingLie === 'green' ? 200 : 600}
                className="w-full px-4 py-3 rounded-xl text-lg outline-none" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0', ...mono }} />
            </div>
          )}

          {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}

          <button type="button" onClick={addShot} className="w-full py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}>
            {pendingLie === 'green' ? '+ Add putt' : '+ Add shot'}
          </button>

          {shots.length > 0 && !shots.some(s => s.lieType === 'green') && (
            <button type="button" onClick={() => setFinished(true)} className="w-full py-3 rounded-xl font-semibold text-sm mt-2" style={{ backgroundColor: '#22263A', color: '#F59E0B', border: '1px solid #F59E0B40', minHeight: '48px' }}>
              Hole Out (chip-in)
            </button>
          )}
          {shots.some(s => s.lieType === 'green') && (
            <button type="button" onClick={() => setFinished(true)} className="w-full py-3 rounded-xl font-semibold text-sm mt-2" style={{ backgroundColor: '#22263A', color: '#22C55E', border: '1px solid #22C55E40', minHeight: '48px' }}>
              ✓ Holed, show my Strokes Gained
            </button>
          )}
          <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>Enter each shot from where the ball lies, the same as in the app. Add the last putt, then press the green button.</p>
        </div>
      )}

      {shots.length > 0 && (
        <div className="flex gap-2">
          <button type="button" onClick={removeLastShot} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247' }}>↩ Undo last shot</button>
          <button type="button" onClick={startAgain} className="flex-1 py-2 rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247' }}>Start again</button>
        </div>
      )}

      {result && (
        <>
          <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: `1px solid ${result.sgTotal >= 0 ? '#22C55E' : '#EF4444'}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Strokes Gained on the hole</p>
            <p className="text-5xl font-bold mb-2" style={{ ...mono, color: col(result.sgTotal) }}>{fmt(result.sgTotal)}</p>
            <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
              A {SKILL_LEVEL_LABELS[level].toLowerCase()} golfer expects about {result.shots[0].expectedBefore.toFixed(2)} strokes from where you started. You took {score}, so {result.sgTotal >= 0 ? 'you beat your level by' : 'you fell short of your level by'} {Math.abs(result.sgTotal).toFixed(2)}.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={card}>
            <p className="text-xs font-semibold uppercase tracking-widest px-5 pt-4 pb-2" style={{ color: '#9A9DB0' }}>By category</p>
            {cats.map(c => (
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
            {result.shots.map(s => (
              <div key={s.shotNumber} className="grid grid-cols-12 px-5 py-2.5 text-sm" style={{ borderTop: '1px solid #2E3247' }}>
                <span className="col-span-6 truncate" style={{ color: '#F0F0F0' }}>{s.shotNumber}. {displayDist(s.distBefore, s.lie)} {s.lie}<span className="text-xs ml-1" style={{ color: '#4A4D60' }}>{CATEGORY_LABEL[s.category]}</span></span>
                <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{s.expectedBefore.toFixed(2)}</span>
                <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{s.expectedAfter.toFixed(2)}</span>
                <span className="col-span-2 text-right font-bold" style={{ ...mono, color: col(s.sg) }}>{fmt(s.sg)}</span>
              </div>
            ))}
          </div>

          {worstCat && worstShot && (
            <div className="p-5 rounded-2xl" style={card}>
              <p className="text-sm font-bold mb-2" style={{ color: '#F0F0F0' }}>What it says</p>
              <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
                {worstCat.value < -0.05
                  ? `${CATEGORY_LABEL[worstCat.key]} cost you the most on this hole (${fmt(worstCat.value)}). The single most expensive shot was shot ${worstShot.shotNumber}, ${displayDist(worstShot.distBefore, worstShot.lie)} ${worstShot.lie}, at ${fmt(worstShot.sg)}.`
                  : `Nothing on this hole cost you against your level. Your best category was ${CATEGORY_LABEL[[...cats].sort((a, b) => b.value - a.value)[0].key].toLowerCase()}.`}
                {' '}One hole is a story. Ten rounds is a pattern, which is what the app is for.
              </p>
            </div>
          )}
        </>
      )}

      <div className="p-5 rounded-2xl text-center" style={card}>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Want this for every hole, every round?</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>TM Stats does exactly this as you play, then adds it up across rounds and tells you what to practise. Five rounds free.</p>
        <Link href="/signup" className="inline-block px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Start free</Link>
      </div>
    </div>
  )
}
