'use client'

import { useState } from 'react'
import type { HoleData } from '@/lib/types'
import type { LieType, LieQuality, ShotEntry, ShotMiss } from '@/lib/types'
import { deriveShotStats } from '@/lib/shot-stats'

interface Props {
  holeNumber: number
  par: 3 | 4 | 5
  initialShots?: ShotEntry[]   // Restore shots when navigating back
  onChangePar: (p: 3 | 4 | 5) => void
  onComplete: (data: Omit<HoleData, 'holeNumber'>) => void
  onShotsChange?: (shots: ShotEntry[]) => void  // Live updates so in-progress shots survive a reload
  trackProcess?: boolean  // Mental process tracking — Yes/No per shot
  advanced?: boolean      // Elite: ask where the last shot finished
}

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
  { value: 'good',    label: 'Good',    color: '#22C55E' },
  { value: 'awkward', label: 'Awkward', color: '#F59E0B' },
  { value: 'severe',  label: 'Severe',  color: '#EF4444' },
]

const LIES_WITH_QUALITY: LieType[] = ['fairway', 'rough', 'bunker', 'fringe']

// Distances stored internally in yards. Green shots entered in feet → convert on input/display.
function feetToYards(feet: number): number {
  return feet / 3
}
function yardsToFeet(yards: number): number {
  return Math.round(yards * 3)
}

function displayDist(distYards: number, lie: LieType): string {
  if (distYards === 0) return 'holed'
  if (lie === 'green') return `${yardsToFeet(distYards)}ft`
  return `${distYards}y`
}

// Elite advanced tracking: labels for where a shot finished
const MISS_GRID: { x: ShotMiss['x']; y: ShotMiss['y']; label: string }[] = [
  { x: -1, y: 1, label: 'Long left' },  { x: 0, y: 1, label: 'Long' },      { x: 1, y: 1, label: 'Long right' },
  { x: -1, y: 0, label: 'Left' },       { x: 0, y: 0, label: 'On target' }, { x: 1, y: 0, label: 'Right' },
  { x: -1, y: -1, label: 'Short left' }, { x: 0, y: -1, label: 'Short' },   { x: 1, y: -1, label: 'Short right' },
]
const MISS_ROW = MISS_GRID.filter(c => c.y === 0)

export function missLabel(m: ShotMiss): string {
  return MISS_GRID.find(c => c.x === m.x && c.y === m.y)?.label ?? ''
}

function nextLieSuggestion(shots: ShotEntry[], par: 3 | 4 | 5): LieType {
  if (shots.length === 0) return 'tee'
  const prev = shots[shots.length - 1].lieType
  if (prev === 'penalty') {
    const lastReal = [...shots].reverse().find(s => s.lieType !== 'penalty')
    return (lastReal?.lieType === 'tee') ? 'tee' : 'fairway'
  }
  if (par === 3 && shots.length === 1) return 'green'
  if (prev === 'tee') return 'fairway'
  if (prev === 'fairway' || prev === 'rough' || prev === 'bunker' || prev === 'fringe') return 'green'
  if (prev === 'green') return 'green'
  return 'fairway'
}

export default function FullTrackingEntry({ holeNumber, par, initialShots, onChangePar, onComplete, onShotsChange, trackProcess = false, advanced = false }: Props) {
  const [shots, setShots] = useState<ShotEntry[]>(initialShots ?? [])
  const [pendingLie, setPendingLie] = useState<LieType>(() => {
    if (initialShots && initialShots.length > 0) {
      return nextLieSuggestion(initialShots, par)
    }
    return 'tee'
  })
  const [pendingQuality, setPendingQuality] = useState<LieQuality>('good')
  const [pendingDist, setPendingDist] = useState('')
  const [pendingProcess, setPendingProcess] = useState<boolean | null>(null)
  const [pendingMiss, setPendingMiss] = useState<ShotMiss | null>(null)
  // Advanced tracking: index of an entered shot whose finish is being set or changed
  const [editMiss, setEditMiss] = useState<number | null>(null)
  const [error, setError] = useState('')
  // Voice entry: distances typed into shots that were heard without one
  const [gapInputs, setGapInputs] = useState<Record<number, string>>({})
  const hasGaps = shots.some(s => s.needsDistance)

  // Fill in the distance for a shot voice entry heard without one. Any penalty
  // straight after it sits at the same spot, so it takes the same distance.
  function fillGap(index: number) {
    const shot = shots[index]
    const raw = parseInt(gapInputs[index] ?? '')
    const max = shot.lieType === 'green' ? 200 : 600
    if (isNaN(raw) || raw <= 0 || raw > max) {
      setError(`Enter the distance for shot ${shot.shotNumber} in ${shot.lieType === 'green' ? 'feet' : 'yards'}`)
      return
    }
    const yards = shot.lieType === 'green' ? feetToYards(raw) : raw
    const updated = shots.map(s => ({ ...s }))
    delete updated[index].needsDistance
    updated[index].distanceToPin = yards
    for (let i = index + 1; i < updated.length && updated[i].lieType === 'penalty'; i++) {
      updated[i].distanceToPin = yards
    }
    setError('')
    setShots(updated)
    onShotsChange?.(updated)
  }

  const isPenalty = pendingLie === 'penalty'

  // Set, change or clear where the ball at row `index` finished (advanced tracking)
  function setRowMiss(index: number, miss: ShotMiss | null) {
    const updated = shots.map((s, i) => {
      if (i !== index) return s
      const { miss: _old, ...rest } = s
      void _old
      return miss ? { ...rest, miss } : rest
    })
    setShots(updated)
    onShotsChange?.(updated)
    setEditMiss(null)
  }
  // A row can carry a finish when a real shot was played to get the ball there
  const rowCanHaveMiss = (index: number) =>
    advanced && index > 0 && shots[index].lieType !== 'penalty' && shots.slice(0, index).some(s => s.lieType !== 'penalty')
  const rowShotWasDrive = (index: number) => {
    const before = [...shots.slice(0, index)].reverse().find(s => s.lieType !== 'penalty')
    return before?.lieType === 'tee' && par !== 3
  }

  // Advanced tracking asks how the shot just played finished. That shot is the
  // last real (non-penalty) row. A drive only has a side; everything aimed at
  // the pin can also be short or long.
  const lastReal = [...shots].reverse().find(s => s.lieType !== 'penalty') ?? null
  const askMiss = advanced && !isPenalty && lastReal !== null
  const lastWasDrive = lastReal?.lieType === 'tee' && par !== 3
  const lastWasPutt = lastReal?.lieType === 'green'
  const onGreen = pendingLie === 'green' || pendingLie === 'fringe'
  const distUnit = pendingLie === 'green' ? 'feet' : 'yards'
  const distPlaceholder = pendingLie === 'green' ? 'e.g. 12' : 'e.g. 145'
  const distMax = pendingLie === 'green' ? 200 : 600

  function addShot() {
    let distYards: number
    if (pendingLie === 'penalty') {
      // Penalty: no distance entered — inherit position from last real shot
      distYards = shots.length > 0 ? shots[shots.length - 1].distanceToPin : 0
    } else {
      const raw = parseInt(pendingDist)
      if (isNaN(raw) || raw <= 0) {
        setError(`Enter the distance in ${distUnit}`)
        return
      }
      distYards = pendingLie === 'green' ? feetToYards(raw) : raw
    }

    // Process answer required on real shots when tracking is on (penalties have no swing)
    if (trackProcess && !isPenalty && pendingProcess === null) {
      setError('Did you commit to your process on this shot? Tap Yes or No.')
      return
    }
    setError('')

    const newShot: ShotEntry = {
      shotNumber: shots.length + 1,
      distanceToPin: distYards,
      lieType: pendingLie,
      ...(LIES_WITH_QUALITY.includes(pendingLie) && pendingQuality !== 'good' ? { lieQuality: pendingQuality } : {}),
      ...(trackProcess && !isPenalty && pendingProcess !== null ? { process: pendingProcess } : {}),
      ...(askMiss && pendingMiss ? { miss: pendingMiss } : {}),
    }
    const newShots = [...shots, newShot]
    setShots(newShots)
    onShotsChange?.(newShots)
    setPendingDist('')
    setPendingQuality('good')
    setPendingProcess(null)
    setPendingMiss(null)
    setPendingLie(nextLieSuggestion(newShots, par))
  }

  function removeLastShot() {
    if (shots.length === 0) return
    const prev = shots[shots.length - 1]
    const updated = shots.slice(0, -1)
    setShots(updated)
    onShotsChange?.(updated)
    setPendingLie(prev.lieType)
    setPendingQuality(prev.lieQuality ?? 'good')
    setPendingProcess(prev.process ?? null)
    setPendingMiss(prev.miss ?? null)
    // Penalty shots have no user-entered distance — restore blank
    if (prev.lieType === 'penalty' || prev.needsDistance) {
      setPendingDist('')
    } else {
      setPendingDist(
        prev.lieType === 'green'
          ? String(yardsToFeet(prev.distanceToPin))
          : String(prev.distanceToPin)
      )
    }
  }

  function finalise(finalShots: ShotEntry[]) {
    if (finalShots.some(s => s.needsDistance)) {
      setError('Add the missing distance in the amber box above first.')
      return
    }
    onComplete({ ...deriveShotStats(finalShots, par), par, shots: finalShots })
  }

  const lieColor = (lie: LieType, selected: boolean) => {
    const map: Record<LieType, string> = {
      tee: '#22C55E', fairway: '#22C55E', rough: '#4ade80',
      bunker: '#F59E0B', fringe: '#86efac', green: '#22C55E', penalty: '#EF4444',
    }
    const c = map[lie]
    return {
      bg: selected ? `${c}20` : '#1A1D27',
      text: selected ? c : '#9A9DB0',
      border: selected ? `${c}60` : '#2E3247',
    }
  }

  // Finish the hole. With advanced tracking the entry form is taller, so once a
  // putt is in, Next hole sits straight under the shot list instead of below the form.
  const finishButtons = (
    <>
      {/* Hole Out — chip-in / holed from off the green (no green shots yet) */}
      {shots.length > 0 && !shots.some(s => s.lieType === 'green') && (
        <button
          type="button"
          onClick={() => finalise(shots)}
          className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
          style={{ backgroundColor: '#22263A', color: '#F59E0B', border: '1px solid #F59E0B40', minHeight: '48px' }}
        >
          Hole Out (chip-in)
        </button>
      )}

      {/* Next hole — appears after at least one putt on the green is recorded */}
      {shots.some(s => s.lieType === 'green') && (
        <button
          type="button"
          onClick={() => finalise(shots)}
          className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
          style={{ backgroundColor: '#22263A', color: '#22C55E', border: '1px solid #22C55E40', minHeight: '48px' }}
        >
          ✓ Next hole
        </button>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      {/* Par selector */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Par</p>
        <div className="grid grid-cols-3 gap-2">
          {([3, 4, 5] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChangePar(p)}
              className="py-3 rounded-xl font-bold text-lg"
              style={{
                backgroundColor: par === p ? '#CC2222' : '#1A1D27',
                color: par === p ? '#F0F0F0' : '#9A9DB0',
                border: `1px solid ${par === p ? '#CC2222' : '#2E3247'}`,
                minHeight: '52px',
                fontFamily: 'var(--font-dm-mono)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Shot history */}
      {shots.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Shots entered</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
            {shots.map((s, i) => {
              const { text } = lieColor(s.lieType, true)
              return (
                <div key={i} style={{ borderBottom: i < shots.length - 1 ? '1px solid #2E3247' : 'none' }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0', width: '20px' }}>
                      {s.shotNumber}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ backgroundColor: `${text}20`, color: text }}
                    >
                      {s.lieType}
                    </span>
                    {s.lieQuality && s.lieQuality !== 'good' && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          backgroundColor: s.lieQuality === 'severe' ? '#EF444420' : '#F59E0B20',
                          color: s.lieQuality === 'severe' ? '#EF4444' : '#F59E0B',
                        }}
                      >
                        {s.lieQuality}
                      </span>
                    )}
                    {rowCanHaveMiss(i) && (
                      <button
                        type="button"
                        onClick={() => setEditMiss(editMiss === i ? null : i)}
                        className="text-xs px-2 rounded-full font-medium"
                        style={{
                          minHeight: '32px',
                          backgroundColor: s.miss ? '#22263A' : 'transparent',
                          color: s.miss ? '#F0F0F0' : '#9A9DB0',
                          border: `1px ${s.miss ? 'solid' : 'dashed'} ${editMiss === i ? '#CC2222' : '#3A3F58'}`,
                        }}
                        aria-label={`Where the shot before row ${s.shotNumber} finished`}
                      >
                        {s.miss ? (rowShotWasDrive(i) && s.miss.x === 0 ? 'on line' : missLabel(s.miss).toLowerCase()) : '+ finish'}
                      </button>
                    )}
                    {typeof s.process === 'boolean' && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: s.process ? '#22C55E20' : '#EF444420',
                          color: s.process ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {s.process ? '✓ process' : '✗ process'}
                      </span>
                    )}
                  </div>
                  {s.needsDistance && s.lieType !== 'penalty' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`Distance for shot ${s.shotNumber} in ${s.lieType === 'green' ? 'feet' : 'yards'}`}
                        value={gapInputs[i] ?? ''}
                        onChange={e => setGapInputs(g => ({ ...g, [i]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fillGap(i) } }}
                        placeholder={s.lieType === 'green' ? 'feet' : 'yards'}
                        className="rounded-lg text-sm text-center outline-none"
                        style={{ width: '72px', height: '44px', backgroundColor: '#F59E0B15', border: '1px solid #F59E0B', color: '#F0F0F0', fontFamily: 'var(--font-dm-mono)' }}
                      />
                      <button
                        type="button"
                        onClick={() => fillGap(i)}
                        className="rounded-lg text-sm font-semibold"
                        style={{ minWidth: '52px', height: '44px', backgroundColor: '#F59E0B', color: '#0F1117' }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                      {s.lieType === 'penalty' ? '—' : displayDist(s.distanceToPin, s.lieType)}
                    </span>
                  )}
                </div>
                {editMiss === i && (
                  <div className="px-4 pb-3">
                    <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
                      {rowShotWasDrive(i) ? 'Which side did the drive finish?' : 'Where is this from the hole?'}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(rowShotWasDrive(i) ? MISS_ROW : MISS_GRID).map(c => {
                        const selected = s.miss?.x === c.x && s.miss?.y === c.y
                        const centre = c.x === 0 && c.y === 0
                        const color = centre ? '#22C55E' : '#F59E0B'
                        return (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => setRowMiss(i, selected ? null : { x: c.x, y: c.y })}
                            className="py-2 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: selected ? `${color}20` : '#22263A',
                              color: selected ? color : '#9A9DB0',
                              border: `1px solid ${selected ? `${color}60` : '#2E3247'}`,
                              minHeight: '44px',
                            }}
                          >
                            {rowShotWasDrive(i) && centre ? 'On line' : c.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {advanced && shots.some(sh => sh.lieType === 'green') && (
        <div>
          {finishButtons}
          <p className="text-xs mt-2 text-center" style={{ color: '#9A9DB0' }}>
            Holed the last putt? Tap Next hole. Missed it? Add where the ball is now below.
          </p>
        </div>
      )}

      {/* Add next shot */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>
          Shot {shots.length + 1} — where is the ball?
        </p>

        {/* Lie type */}
        <div className="flex flex-wrap gap-2 mb-4">
          {LIE_OPTIONS.map(({ value, label }) => {
            const { bg, text, border } = lieColor(value, pendingLie === value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setPendingLie(value); setPendingDist(''); setPendingQuality('good') }}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: bg, color: text, border: `1px solid ${border}`, minHeight: '40px' }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Lie quality — only for lies where quality matters */}
        {LIES_WITH_QUALITY.includes(pendingLie) && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Lie quality</p>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map(({ value, label, color }) => {
                const selected = pendingQuality === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPendingQuality(value)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: selected ? `${color}20` : '#1A1D27',
                      color: selected ? color : '#9A9DB0',
                      border: `1px solid ${selected ? `${color}60` : '#2E3247'}`,
                      minHeight: '40px',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Distance — hidden for penalty shots */}
        {isPenalty ? (
          <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444440' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#EF4444' }}>Penalty stroke</p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>Counts as 1 shot. No yardage needed — your next shot carries on from where you were.</p>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-xs mb-2" style={{ color: '#9A9DB0' }}>
              Distance to pin ({distUnit})
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={pendingDist}
              onChange={e => setPendingDist(e.target.value)}
              placeholder={distPlaceholder}
              min={0}
              max={distMax}
              className="w-full px-4 py-3 rounded-xl text-lg outline-none"
              style={{
                backgroundColor: '#1A1D27',
                border: '1px solid #2E3247',
                color: '#F0F0F0',
                fontFamily: 'var(--font-dm-mono)',
              }}
            />
          </div>
        )}

        {/* Elite advanced tracking — where the shot just played finished */}
        {askMiss && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
              {lastWasDrive
                ? 'Which side did the drive finish? (optional)'
                : lastWasPutt
                  ? 'Where is the ball from the hole? (optional)'
                  : 'Where is the ball from the pin? (optional)'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(lastWasDrive ? MISS_ROW : MISS_GRID).map(c => {
                const selected = pendingMiss?.x === c.x && pendingMiss?.y === c.y
                const centre = c.x === 0 && c.y === 0
                const color = centre ? '#22C55E' : '#F59E0B'
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setPendingMiss(selected ? null : { x: c.x, y: c.y })}
                    className="py-2 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: selected ? `${color}20` : '#1A1D27',
                      color: selected ? color : '#9A9DB0',
                      border: `1px solid ${selected ? `${color}60` : '#2E3247'}`,
                      minHeight: '44px',
                    }}
                  >
                    {lastWasDrive && centre ? 'On line' : c.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Mental process — Yes/No per shot, about commitment not outcome */}
        {trackProcess && !isPenalty && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
              Did you fully commit to your process on this shot?
            </p>
            <div className="flex gap-2">
              {([true, false] as const).map(v => {
                const selected = pendingProcess === v
                const color = v ? '#22C55E' : '#EF4444'
                return (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setPendingProcess(selected ? null : v)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: selected ? `${color}20` : '#1A1D27',
                      color: selected ? color : '#9A9DB0',
                      border: `1px solid ${selected ? `${color}60` : '#2E3247'}`,
                      minHeight: '44px',
                    }}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addShot}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}
          >
            {pendingLie === 'green' ? '+ Add putt' : '+ Add shot'}
          </button>
        </div>

        {(!advanced || !shots.some(sh => sh.lieType === 'green')) && finishButtons}
      </div>

      {/* Undo */}
      {shots.length > 0 && (
        <button
          type="button"
          onClick={removeLastShot}
          className="w-full py-2 rounded-xl text-sm"
          style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247' }}
        >
          ↩ Undo last shot
        </button>
      )}
    </div>
  )
}
