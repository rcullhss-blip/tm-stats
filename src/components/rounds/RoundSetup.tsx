'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SetupData } from '@/lib/types'
import type { RoundType, InputMode } from '@/lib/types'

export interface RecentCourse {
  name: string
  holes: number
  lastRoundId: string
}

interface Props {
  onNext: (data: SetupData) => void
  recentCourses?: RecentCourse[]
}

const today = new Date().toISOString().split('T')[0]

export default function RoundSetup({ onNext, recentCourses = [] }: Props) {
  const [date, setDate] = useState(today)
  const [courseName, setCourseName] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [roundType, setRoundType] = useState<RoundType>('practice')
  const [inputMode, setInputMode] = useState<InputMode>('quick')
  const [trackProcess, setTrackProcess] = useState(false)
  const [loadingPars, setLoadingPars] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = courseName.trim()
    if (!name || loadingPars) return

    // Course memory: played here before → pre-fill the pars from the last round
    const match = recentCourses.find(c => c.name.trim().toLowerCase() === name.toLowerCase())
    let parsPrefill: (3 | 4 | 5)[] | undefined
    if (match) {
      setLoadingPars(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('holes')
          .select('hole_number, par')
          .eq('round_id', match.lastRoundId)
          .order('hole_number')
        if (data && data.length > 0) {
          parsPrefill = data.slice(0, holes).map(h => h.par as 3 | 4 | 5)
        }
      } catch {
        // No signal / fetch failed — carry on without the prefill
      }
      setLoadingPars(false)
    }

    onNext({
      date,
      courseName: name,
      holes,
      roundType,
      inputMode,
      parsPrefill,
      trackProcess: inputMode === 'full' ? trackProcess : false,
    })
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            New round
          </h1>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Step 1 of 3 — Course details</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: n === 1 ? '#CC2222' : '#2E3247' }}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
              fontFamily: 'var(--font-dm-mono)',
            }}
          />
        </div>

        {/* Course name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Course
          </label>
          {recentCourses.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {recentCourses.map(c => {
                const selected = courseName.trim().toLowerCase() === c.name.trim().toLowerCase()
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setCourseName(c.name)
                      if (c.holes === 9 || c.holes === 18) setHoles(c.holes)
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: selected ? '#CC222220' : '#1A1D27',
                      color: selected ? '#CC2222' : '#9A9DB0',
                      border: `1px solid ${selected ? '#CC222240' : '#2E3247'}`,
                      minHeight: '40px',
                    }}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}
          <input
            type="text"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="e.g. Macclesfield Golf Club"
          />
          {recentCourses.some(c => c.name.trim().toLowerCase() === courseName.trim().toLowerCase()) && (
            <p className="text-xs mt-1.5" style={{ color: '#22C55E' }}>
              ✓ Played here before — pars will be pre-filled from your last round
            </p>
          )}
        </div>

        {/* Holes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Holes
          </label>
          <div className="grid grid-cols-2 gap-3">
            {([9, 18] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setHoles(n)}
                className="py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{
                  backgroundColor: holes === n ? '#CC2222' : '#1A1D27',
                  color: holes === n ? '#F0F0F0' : '#9A9DB0',
                  border: `1px solid ${holes === n ? '#CC2222' : '#2E3247'}`,
                  minHeight: '48px',
                }}
              >
                {n} holes
              </button>
            ))}
          </div>
        </div>

        {/* Round type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Round type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['practice', 'competition', 'tournament'] as RoundType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setRoundType(type)}
                className="py-3 rounded-xl text-sm font-medium transition-colors capitalize"
                style={{
                  backgroundColor: roundType === type ? '#22263A' : '#1A1D27',
                  color: roundType === type ? '#F0F0F0' : '#9A9DB0',
                  border: `1px solid ${roundType === type ? '#CC2222' : '#2E3247'}`,
                  minHeight: '48px',
                }}
              >
                {type === 'practice' ? 'Practice' : type === 'competition' ? 'Comp' : 'Tourn'}
              </button>
            ))}
          </div>
        </div>

        {/* Input mode */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Tracking mode
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setInputMode('quick')}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: inputMode === 'quick' ? '#22263A' : '#1A1D27',
                border: `1px solid ${inputMode === 'quick' ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Quick entry</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                Score, FIR, GIR, putts — fast. Basic stats only.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('full')}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: inputMode === 'full' ? '#22263A' : '#1A1D27',
                border: `1px solid ${inputMode === 'full' ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Full tracking</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                    Enter each shot with distance + lie. Unlocks Strokes Gained.
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded ml-2 shrink-0"
                  style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}
                >
                  SG
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mental process tracking — full tracking only */}
        {inputMode === 'full' && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
              Mental process tracking <span className="font-normal">(optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setTrackProcess(!trackProcess)}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: trackProcess ? '#22263A' : '#1A1D27',
                border: `1px solid ${trackProcess ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Track your process</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                    A Yes/No on every shot: did you fully commit to your pre-shot process?
                    It&apos;s about commitment, not the result — a bad shot with full commitment is still a Yes.
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded ml-2 shrink-0"
                  style={{
                    backgroundColor: trackProcess ? '#22C55E20' : '#22263A',
                    color: trackProcess ? '#22C55E' : '#9A9DB0',
                  }}
                >
                  {trackProcess ? 'On' : 'Off'}
                </span>
              </div>
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loadingPars}
          className="w-full py-4 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
        >
          {loadingPars ? 'Loading course…' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
