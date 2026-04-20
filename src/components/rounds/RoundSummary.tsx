'use client'

import { useState } from 'react'
import type { SetupData, HoleData } from '@/lib/types'

interface Props {
  setup: SetupData
  holes: HoleData[]
  saving: boolean
  error: string
  onBack: () => void
  onSave: (notes: string, mood: string, conditions: string, energy: string) => void
}

const moodOptions = ['tough', 'average', 'good', 'great'] as const
const conditionOptions = ['sunny', 'windy', 'rainy', 'cold', 'hot'] as const
const energyOptions = ['fresh', 'normal', 'tired', 'niggly'] as const

function scoreToPar(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreColor(diff: number): string {
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 2) return '#9A9DB0'
  return '#EF4444'
}

export default function RoundSummary({ setup, holes, saving, error, onBack, onSave }: Props) {
  const [notes, setNotes] = useState('')
  const [mood, setMood] = useState('')
  const [conditions, setConditions] = useState<string[]>([])
  const [energy, setEnergy] = useState('')

  const totalPar = holes.reduce((s, h) => s + h.par, 0)
  const totalScore = holes.reduce((s, h) => s + h.score, 0)
  const totalDiff = totalScore - totalPar

  const fairwaysHit = holes.filter(h => h.par !== 3 && h.fir === true).length
  const fairwaysTotal = holes.filter(h => h.par !== 3).length
  const girs = holes.filter(h => h.gir === true).length
  const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
  const upDowns = holes.filter(h => h.upAndDown === true).length
  const upDownAttempts = holes.filter(h => h.gir === false).length

  const eagles = holes.filter(h => h.score <= h.par - 2).length
  const birdies = holes.filter(h => h.score === h.par - 1).length
  const pars = holes.filter(h => h.score === h.par).length
  const bogeys = holes.filter(h => h.score === h.par + 1).length
  const doubles = holes.filter(h => h.score >= h.par + 2).length

  function toggleCondition(c: string) {
    setConditions(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  function handleSave() {
    onSave(notes, mood, conditions.join(','), energy)
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center"
          style={{ color: '#9A9DB0', minHeight: '44px', minWidth: '44px' }}
        >
          ← Back
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Round summary
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          {setup.courseName} · {setup.holes} holes
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(n => (
          <div key={n} className="h-1 flex-1 rounded-full" style={{ backgroundColor: '#CC2222' }} />
        ))}
      </div>

      {/* Score hero */}
      <div
        className="text-center p-6 rounded-2xl mb-6"
        style={{ backgroundColor: '#1A1D27' }}
      >
        <p className="text-sm mb-1" style={{ color: '#9A9DB0' }}>Total score</p>
        <p
          className="text-6xl font-bold mb-1"
          style={{
            fontFamily: 'var(--font-dm-mono)',
            color: scoreColor(totalDiff),
          }}
        >
          {totalScore}
        </p>
        <p className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}>
          {scoreToPar(totalScore, totalPar)}
        </p>
        <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>Par {totalPar}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {fairwaysTotal > 0 && (
          <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {fairwaysTotal > 0 ? `${Math.round((fairwaysHit / fairwaysTotal) * 100)}%` : '—'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>FIR</p>
          </div>
        )}
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
            {Math.round((girs / holes.length) * 100)}%
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>GIR</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
            {totalPutts || '—'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Putts</p>
        </div>
        {upDownAttempts > 0 && (
          <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {Math.round((upDowns / upDownAttempts) * 100)}%
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>U&amp;D</p>
          </div>
        )}
      </div>

      {/* Scoring distribution */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Scoring</p>
        <div className="flex gap-2 justify-around">
          {[
            { label: 'Eagle+', count: eagles, color: '#22C55E' },
            { label: 'Birdie', count: birdies, color: '#22C55E' },
            { label: 'Par', count: pars, color: '#F0F0F0' },
            { label: 'Bogey', count: bogeys, color: '#9A9DB0' },
            { label: 'Dbl+', count: doubles, color: '#EF4444' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color }}>
                {count}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Round notes section */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Round notes
        </h2>

        {/* Mood */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>How did you play?</p>
          <div className="flex gap-2">
            {moodOptions.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? '' : m)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
                style={{
                  backgroundColor: mood === m ? '#CC222220' : '#1A1D27',
                  color: mood === m ? '#CC2222' : '#9A9DB0',
                  border: `1px solid ${mood === m ? '#CC222240' : '#2E3247'}`,
                  minHeight: '44px',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Conditions</p>
          <div className="flex gap-2 flex-wrap">
            {conditionOptions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCondition(c)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
                style={{
                  backgroundColor: conditions.includes(c) ? '#CC222220' : '#1A1D27',
                  color: conditions.includes(c) ? '#CC2222' : '#9A9DB0',
                  border: `1px solid ${conditions.includes(c) ? '#CC222240' : '#2E3247'}`,
                  minHeight: '44px',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>How did you feel?</p>
          <div className="flex gap-2">
            {energyOptions.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEnergy(energy === e ? '' : e)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
                style={{
                  backgroundColor: energy === e ? '#CC222220' : '#1A1D27',
                  color: energy === e ? '#CC2222' : '#9A9DB0',
                  border: `1px solid ${energy === e ? '#CC222240' : '#2E3247'}`,
                  minHeight: '44px',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Free text notes */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Notes <span className="font-normal">(optional)</span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="Anything worth remembering — swing changes, conditions, how you felt, specific holes…"
          />
        </div>
      </div>

      {/* Hole-by-hole table */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Hole by hole
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
        >
          <div
            className="grid text-xs font-medium py-2 px-3"
            style={{
              color: '#9A9DB0',
              gridTemplateColumns: '40px 40px 50px 50px 50px 50px',
              borderBottom: '1px solid #2E3247',
            }}
          >
            <span>Hole</span>
            <span>Par</span>
            <span>Score</span>
            <span>FIR</span>
            <span>GIR</span>
            <span>Putts</span>
          </div>
          {holes.map((h, i) => {
            const diff = h.score - h.par
            return (
              <div
                key={h.holeNumber}
                className="grid items-center py-2.5 px-3"
                style={{
                  gridTemplateColumns: '40px 40px 50px 50px 50px 50px',
                  borderBottom: i < holes.length - 1 ? '1px solid #2E3247' : 'none',
                }}
              >
                <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{h.holeNumber}</span>
                <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{h.par}</span>
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(diff) }}
                >
                  {h.score}
                </span>
                <span className="text-sm" style={{ color: h.par === 3 ? '#4A4D60' : h.fir === true ? '#22C55E' : h.fir === false ? '#EF4444' : '#9A9DB0' }}>
                  {h.par === 3 ? '—' : h.fir === true ? '✓' : h.fir === false ? '✗' : '—'}
                </span>
                <span className="text-sm" style={{ color: h.gir === true ? '#22C55E' : h.gir === false ? '#EF4444' : '#9A9DB0' }}>
                  {h.gir === true ? '✓' : h.gir === false ? '✗' : '—'}
                </span>
                <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                  {h.putts ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-center mb-4" style={{ color: '#EF4444' }}>{error}</p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
      >
        {saving ? 'Saving round…' : 'Save round'}
      </button>
    </div>
  )
}
