'use client'

import { useState } from 'react'
import type { SetupData } from '@/lib/types'
import type { RoundType, InputMode } from '@/lib/types'

interface Props {
  onNext: (data: SetupData) => void
}

const today = new Date().toISOString().split('T')[0]

export default function RoundSetup({ onNext }: Props) {
  const [date, setDate] = useState(today)
  const [courseName, setCourseName] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [roundType, setRoundType] = useState<RoundType>('practice')
  const [inputMode, setInputMode] = useState<InputMode>('quick')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseName.trim()) return
    onNext({ date, courseName: courseName.trim(), holes, roundType, inputMode })
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

        <button
          type="submit"
          className="w-full py-4 rounded-xl font-semibold text-base"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
        >
          Continue →
        </button>
      </form>
    </div>
  )
}
