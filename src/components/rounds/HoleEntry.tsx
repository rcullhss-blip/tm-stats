'use client'

import { useState, useRef, useEffect } from 'react'
import type { SetupData, HoleData } from '@/lib/types'
import FullTrackingEntry from './FullTrackingEntry'
import HowToPlayGuide from './HowToPlayGuide'

interface Props {
  setup: SetupData
  onBack: () => void
  onComplete: (holes: HoleData[]) => void
  initialHoles?: HoleData[]
  initialHole?: number
  editingFromSummary?: boolean
}

function defaultHole(holeNumber: number): HoleData {
  return {
    holeNumber,
    par: 4,
    score: 4,
    fir: null,
    gir: null,
    putts: null,
    upAndDown: null,
    sandSave: null,
  }
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 15,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs" style={{ color: '#9A9DB0' }}>{label}</span>
      )}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex items-center justify-center rounded-l-xl font-bold text-xl"
          style={{
            backgroundColor: '#22263A',
            color: '#F0F0F0',
            width: '52px',
            height: '52px',
            border: '1px solid #2E3247',
          }}
        >
          −
        </button>
        <div
          className="flex items-center justify-center font-medium text-xl"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            backgroundColor: '#1A1D27',
            color: '#F0F0F0',
            width: '56px',
            height: '52px',
            border: '1px solid #2E3247',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex items-center justify-center rounded-r-xl font-bold text-xl"
          style={{
            backgroundColor: '#22263A',
            color: '#F0F0F0',
            width: '52px',
            height: '52px',
            border: '1px solid #2E3247',
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

function PillToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean | null
  onChange: (v: boolean | null) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map(v => (
        <button
          key={String(v)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === v ? null : v)}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor:
              value === v
                ? v ? '#22C55E20' : '#EF444420'
                : '#22263A',
            color:
              value === v
                ? v ? '#22C55E' : '#EF4444'
                : disabled ? '#4A4D60' : '#9A9DB0',
            border: `1px solid ${value === v ? (v ? '#22C55E40' : '#EF444440') : '#2E3247'}`,
            minHeight: '44px',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

export default function HoleEntry({ setup, onBack, onComplete, initialHoles, initialHole = 0, editingFromSummary = false }: Props) {
  const holeCount = setup.holes
  const [current, setCurrent] = useState(initialHole)
  const [holes, setHoles] = useState<HoleData[]>(
    initialHoles ?? Array.from({ length: holeCount }, (_, i) => defaultHole(i + 1))
  )
  const scorecardRef = useRef<HTMLDivElement>(null)
  const activeTileRef = useRef<HTMLDivElement>(null)

  const hole = holes[current]

  function updateHole(updates: Partial<HoleData>) {
    setHoles(prev => {
      const next = [...prev]
      const updated = { ...next[current], ...updates }

      // Auto-rules
      // FIR is null on par 3
      if (updated.par === 3) {
        updated.fir = null
      }
      // If FIR explicitly updated and par is 3, reset to null
      if ('fir' in updates && updated.par === 3) {
        updated.fir = null
      }

      // Sand save only relevant if up_and_down = true and there was a bunker
      // (we'll let user control both; auto-link will be in full tracking mode)

      next[current] = updated
      return next
    })
  }

  function handleNext() {
    if (current < holeCount - 1) {
      setCurrent(c => c + 1)
    } else {
      onComplete(holes)
    }
  }

  function handleBack() {
    if (current > 0) {
      setCurrent(c => c - 1)
    } else {
      onBack()
    }
  }

  const isLast = current === holeCount - 1
  const scoreToPar = hole.score - hole.par
  const scoreParLabel = scoreToPar === 0 ? 'Par' : scoreToPar < 0 ? ['Birdie', 'Eagle', 'Albatross'][Math.abs(scoreToPar) - 1] || `${Math.abs(scoreToPar)} under` : scoreToPar === 1 ? 'Bogey' : scoreToPar === 2 ? 'Double' : `+${scoreToPar}`
  const scoreParColor = scoreToPar < 0 ? '#22C55E' : scoreToPar === 0 ? '#F0F0F0' : scoreToPar <= 2 ? '#9A9DB0' : '#EF4444'

  // Scroll scorecard strip to keep active tile in view
  useEffect(() => {
    if (activeTileRef.current && scorecardRef.current) {
      activeTileRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [current])

  // Running to-par across completed holes
  const completedScore = holes.slice(0, current).reduce((sum, h) => sum + h.score, 0)
  const completedPar = holes.slice(0, current).reduce((sum, h) => sum + h.par, 0)
  const runningToPar = completedScore - completedPar
  const runningLabel = current === 0 ? 'E' : runningToPar === 0 ? 'E' : runningToPar > 0 ? `+${runningToPar}` : `${runningToPar}`
  const runningColor = runningToPar < 0 ? '#22C55E' : runningToPar === 0 ? '#9A9DB0' : runningToPar <= 3 ? '#9A9DB0' : '#EF4444'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Editing banner */}
      {editingFromSummary && (
        <div
          className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B40' }}
        >
          <span style={{ color: '#F59E0B', fontSize: '16px' }}>✏️</span>
          <p className="text-xs font-medium" style={{ color: '#F59E0B' }}>
            Editing round — use Back/Next to find the hole to fix, then tap through to the summary when done.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center justify-center rounded-lg"
          style={{ color: '#9A9DB0', minHeight: '44px', minWidth: '44px' }}
        >
          ← Back
        </button>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: '#9A9DB0' }}>
            Step 2 of 3
          </p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>
            {setup.courseName}
          </p>
        </div>
        <HowToPlayGuide />
      </div>

      {/* Progress + running to-par */}
      <div className="mb-6">
        <div className="flex gap-1 mb-2">
          {Array.from({ length: holeCount }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full"
              style={{
                backgroundColor:
                  i < current ? '#CC2222' :
                  i === current ? '#CC2222' :
                  '#2E3247',
                opacity: i === current ? 1 : i < current ? 0.6 : 1,
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: '#4A4D60' }}>
            Hole {current + 1} of {holeCount}
          </p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs" style={{ color: '#4A4D60' }}>Running total:</p>
            <p
              className="text-sm font-bold"
              style={{ fontFamily: 'var(--font-dm-mono)', color: runningColor }}
            >
              {runningLabel}
            </p>
          </div>
        </div>

        {/* Scrollable scorecard strip */}
        <div
          ref={scorecardRef}
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {holes.map((h, i) => {
            const diff = h.score - h.par
            const isCurrent = i === current
            const isDone = i < current
            const scoreColor = !isDone ? '#4A4D60' : diff < 0 ? '#22C55E' : diff === 0 ? '#F0F0F0' : diff === 1 ? '#9A9DB0' : '#EF4444'
            return (
              <div
                key={i}
                ref={isCurrent ? activeTileRef : null}
                className="flex-shrink-0 flex flex-col items-center rounded-lg"
                style={{
                  width: '36px',
                  paddingTop: '5px',
                  paddingBottom: '5px',
                  backgroundColor: isCurrent ? '#CC222220' : isDone ? '#1A1D27' : 'transparent',
                  border: isCurrent ? '1px solid #CC2222' : isDone ? '1px solid #2E3247' : '1px solid transparent',
                }}
              >
                <p className="text-xs leading-none mb-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '9px' }}>
                  H{i + 1}
                </p>
                <p className="text-sm font-bold leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor }}>
                  {isDone ? h.score : isCurrent ? '·' : '—'}
                </p>
                <p className="text-xs leading-none mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '9px' }}>
                  {isDone || isCurrent ? `P${h.par}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hole header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Hole {hole.holeNumber}
          </h2>
        </div>
        <div className="text-right">
          <p
            className="text-3xl font-medium"
            style={{ fontFamily: 'var(--font-dm-mono)', color: scoreParColor }}
          >
            {hole.score}
          </p>
          <p className="text-sm" style={{ color: scoreParColor }}>
            {scoreParLabel}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Par selector — quick mode only (full tracking has its own) */}
        {setup.inputMode === 'quick' && (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Par</p>
            <div className="grid grid-cols-3 gap-2">
              {([3, 4, 5] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateHole({ par: p, score: p, fir: p === 3 ? null : null })}
                  className="py-3 rounded-xl font-bold text-lg transition-colors"
                  style={{
                    backgroundColor: hole.par === p ? '#CC2222' : '#1A1D27',
                    color: hole.par === p ? '#F0F0F0' : '#9A9DB0',
                    border: `1px solid ${hole.par === p ? '#CC2222' : '#2E3247'}`,
                    minHeight: '52px',
                    fontFamily: 'var(--font-dm-mono)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Score stepper — quick mode only; full tracking auto-counts shots */}
        {setup.inputMode === 'quick' && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Score</p>
            <Stepper
              value={hole.score}
              onChange={score => updateHole({ score })}
              min={1}
              max={15}
            />
          </div>
        )}

        {/* Quick mode fields */}
        {setup.inputMode === 'quick' && (
          <>
            {/* FIR — only par 4/5 */}
            {hole.par !== 3 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
                  Fairway hit?
                </p>
                <PillToggle
                  value={hole.fir}
                  onChange={(fir) => updateHole({ fir: fir ?? null })}
                />
              </div>
            )}

            {/* GIR */}
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
                Green in regulation?
              </p>
              <PillToggle
                value={hole.gir}
                onChange={(gir) => updateHole({ gir: gir ?? null, upAndDown: gir ? null : hole.upAndDown })}
              />
            </div>

            {/* Putts */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Putts</p>
              <Stepper
                value={hole.putts ?? 2}
                onChange={putts => updateHole({ putts })}
                min={0}
                max={6}
              />
            </div>

            {/* Up and down — only if GIR = false */}
            {hole.gir === false && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
                  Up and down?
                </p>
                <PillToggle
                  value={hole.upAndDown}
                  onChange={(upAndDown) => updateHole({ upAndDown: upAndDown ?? null })}
                />
              </div>
            )}

            {/* Sand save — only if up and down was from bunker */}
            {hole.gir === false && hole.upAndDown !== null && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#9A9DB0' }}>
                  Sand save?
                </p>
                <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
                  Were you in a greenside bunker?
                </p>
                <PillToggle
                  value={hole.sandSave}
                  onChange={(sandSave) => updateHole({ sandSave: sandSave ?? null })}
                />
              </div>
            )}
          </>
        )}

        {/* Full tracking mode */}
        {setup.inputMode === 'full' && (
          <FullTrackingEntry
            key={current}
            holeNumber={hole.holeNumber}
            par={hole.par}
            initialShots={hole.shots ?? []}
            onChangePar={p => updateHole({ par: p, score: p, fir: null, gir: null, putts: null, shots: [] })}
            onComplete={(data) => {
              const updatedHoles = holes.map((h, i) =>
                i === current ? { ...h, ...data } : h
              )
              setHoles(updatedHoles)
              if (current < holeCount - 1) {
                setCurrent(c => c + 1)
              } else {
                onComplete(updatedHoles)
              }
            }}
          />
        )}
      </div>

      {/* Next/finish button — only in quick mode (full mode auto-advances on hole out) */}
      {setup.inputMode === 'quick' && (
        <div className="mt-8">
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-4 rounded-xl font-semibold text-base"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
          >
            {isLast ? 'Review round →' : `Next: Hole ${current + 2} →`}
          </button>
        </div>
      )}
    </div>
  )
}
