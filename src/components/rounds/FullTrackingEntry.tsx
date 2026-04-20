'use client'

import { useState } from 'react'
import type { HoleData } from '@/lib/types'
import type { LieType, ShotEntry } from '@/lib/types'

interface Props {
  holeNumber: number
  par: 3 | 4 | 5
  initialShots?: ShotEntry[]   // Restore shots when navigating back
  onChangePar: (p: 3 | 4 | 5) => void
  onComplete: (data: Omit<HoleData, 'holeNumber'>) => void
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

function deriveShotStats(shots: ShotEntry[], par: 3 | 4 | 5): Omit<HoleData, 'holeNumber' | 'par'> {
  const score = shots.length

  // lieType = where the ball IS before that shot.
  // shots[0] = from tee, shots[1] = where tee shot landed, shots[2] = where approach landed, etc.

  // FIR: ball in fairway AFTER tee shot = shots[1].lieType (par 4/5 only)
  const fir: boolean | null =
    par === 3
      ? null
      : shots.length > 1
        ? shots[1].lieType === 'fairway'
        : false

  // GIR: ball on green in regulation = first green lie at index ≤ (par - 2)
  // par3 → shots[1] is green (on in 1), par4 → shots[2] (on in 2), par5 → shots[3] (on in 3)
  const girThreshold = par - 2          // par3=1, par4=2, par5=3
  const firstGreenIndex = shots.findIndex(s => s.lieType === 'green')
  const gir = firstGreenIndex !== -1 && firstGreenIndex <= girThreshold

  // Putts: shots on the green with dist > 0 (exclude the hole-out dist=0 marker)
  const putts = shots.filter(s => s.lieType === 'green' && s.distanceToPin > 0).length

  // Up and down: missed green AND holed out in 2 shots from off green (1 chip + 1 putt)
  const upAndDown: boolean | null =
    !gir && shots.length > 0
      ? (() => {
          const firstGreenIdx = shots.findIndex(s => s.lieType === 'green')
          // Chip-in from off green (no green shot recorded, last shot has dist=0)
          if (firstGreenIdx === -1) {
            const lastShot = shots[shots.length - 1]
            return lastShot?.distanceToPin === 0 ? true : null
          }
          // Count only real putts (dist > 0), not the hole-out marker
          const puttsCount = shots.filter((s, i) => i >= firstGreenIdx && s.lieType === 'green' && s.distanceToPin > 0).length
          // Up & down = exactly 1 putt after getting on (2 total shots from off green)
          return puttsCount <= 1
        })()
      : null

  // Sand save: had a bunker shot AND made up and down
  const hadBunker = shots.some((s, i) => i > 0 && s.lieType === 'bunker')
  const sandSave: boolean | null = hadBunker && upAndDown !== null ? upAndDown : null

  return { score, fir, gir, putts, upAndDown, sandSave }
}

function nextLieSuggestion(shots: ShotEntry[], par: 3 | 4 | 5): LieType {
  if (shots.length === 0) return 'tee'
  const prev = shots[shots.length - 1].lieType
  if (par === 3 && shots.length === 1) return 'green'
  if (prev === 'tee') return 'fairway'
  if (prev === 'fairway' || prev === 'rough' || prev === 'bunker' || prev === 'fringe') return 'green'
  if (prev === 'green') return 'green'
  return 'fairway'
}

export default function FullTrackingEntry({ holeNumber, par, initialShots, onChangePar, onComplete }: Props) {
  const [shots, setShots] = useState<ShotEntry[]>(initialShots ?? [])
  const [pendingLie, setPendingLie] = useState<LieType>(() => {
    if (initialShots && initialShots.length > 0) {
      return nextLieSuggestion(initialShots, par)
    }
    return 'tee'
  })
  const [pendingDist, setPendingDist] = useState('')
  const [error, setError] = useState('')

  const onGreen = pendingLie === 'green' || pendingLie === 'fringe'
  const distUnit = pendingLie === 'green' ? 'feet' : 'yards'
  const distPlaceholder = pendingLie === 'green' ? 'e.g. 12' : 'e.g. 145'
  const distMax = pendingLie === 'green' ? 200 : 600

  function addShot() {
    const raw = parseInt(pendingDist)
    if (isNaN(raw) || raw <= 0) {
      setError(`Enter the distance in ${distUnit}`)
      return
    }
    setError('')

    // Convert feet → yards for green shots; store everything in yards
    const distYards = pendingLie === 'green' ? feetToYards(raw) : raw

    const newShot: ShotEntry = {
      shotNumber: shots.length + 1,
      distanceToPin: distYards,
      lieType: pendingLie,
    }
    const newShots = [...shots, newShot]
    setShots(newShots)
    setPendingDist('')

    setPendingLie(nextLieSuggestion(newShots, par))
  }

  function removeLastShot() {
    if (shots.length === 0) return
    const prev = shots[shots.length - 1]
    const updated = shots.slice(0, -1)
    setShots(updated)
    setPendingLie(prev.lieType)
    // Restore the displayed value in its original unit
    setPendingDist(
      prev.lieType === 'green'
        ? String(yardsToFeet(prev.distanceToPin))
        : String(prev.distanceToPin)
    )
  }

  function finalise(finalShots: ShotEntry[]) {
    onComplete({ ...deriveShotStats(finalShots, par), par, shots: finalShots })
  }

  const lieColor = (lie: LieType, selected: boolean) => {
    const map: Record<LieType, string> = {
      tee: '#9A9DB0', fairway: '#22C55E', rough: '#4ade80',
      bunker: '#F59E0B', fringe: '#86efac', green: '#22C55E', penalty: '#EF4444',
    }
    const c = map[lie]
    return {
      bg: selected ? `${c}20` : '#1A1D27',
      text: selected ? c : '#9A9DB0',
      border: selected ? `${c}60` : '#2E3247',
    }
  }

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
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < shots.length - 1 ? '1px solid #2E3247' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0', width: '20px' }}>
                      {s.shotNumber}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ backgroundColor: `${text}20`, color: text }}
                    >
                      {s.lieType}
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                    {displayDist(s.distanceToPin, s.lieType)}
                  </span>
                </div>
              )
            })}
          </div>
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
                onClick={() => { setPendingLie(value); setPendingDist('') }}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: bg, color: text, border: `1px solid ${border}`, minHeight: '40px' }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Distance */}
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

        {/* Hole Out — chip-in / holed from off the green (no green shots yet) */}
        {shots.length > 0 && !shots.some(s => s.lieType === 'green') && (
          <button
            type="button"
            onClick={() => finalise(shots)}
            className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
            style={{ backgroundColor: '#22263A', color: '#F59E0B', border: '1px solid #F59E0B40', minHeight: '48px' }}
          >
            ⛳ Hole Out (chip-in)
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
