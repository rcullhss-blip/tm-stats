'use client'

import { useState, useTransition } from 'react'
import type { RoundRow, HoleRow } from '@/lib/types'
import { saveRoundEdits } from '@/app/(protected)/rounds/[id]/edit/actions'

interface Props {
  round: RoundRow
  holes: HoleRow[]
}

function PillToggle({ name, value, onChange, disabled = false }: {
  name: string; value: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean
}) {
  return (
    <div className="flex gap-1">
      {([true, false] as const).map(v => (
        <button
          key={String(v)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === v ? null : v)}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: value === v ? (v ? '#22C55E20' : '#EF444420') : '#22263A',
            color: value === v ? (v ? '#22C55E' : '#EF4444') : disabled ? '#2E3247' : '#9A9DB0',
            border: `1px solid ${value === v ? (v ? '#22C55E40' : '#EF444440') : '#2E3247'}`,
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {v ? 'Y' : 'N'}
        </button>
      ))}
      <input type="hidden" name={name} value={value === null ? '' : String(value)} />
    </div>
  )
}

function Stepper({ name, value, onChange, min = 0, max = 15 }: {
  name: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div className="flex items-center">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="flex items-center justify-center rounded-l-lg font-bold"
        style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '36px', height: '36px', border: '1px solid #2E3247' }}>
        −
      </button>
      <div className="flex items-center justify-center text-sm font-medium"
        style={{ fontFamily: 'var(--font-dm-mono)', backgroundColor: '#1A1D27', color: '#F0F0F0', width: '36px', height: '36px', border: '1px solid #2E3247', borderLeft: 'none', borderRight: 'none' }}>
        {value}
      </div>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="flex items-center justify-center rounded-r-lg font-bold"
        style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '36px', height: '36px', border: '1px solid #2E3247' }}>
        +
      </button>
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

type HoleState = {
  par: 3 | 4 | 5
  score: number
  fir: boolean | null
  gir: boolean | null
  putts: number
  upAndDown: boolean | null
  sandSave: boolean | null
}

export default function RoundEditForm({ round, holes }: Props) {
  const [pending, startTransition] = useTransition()

  const [holeStates, setHoleStates] = useState<HoleState[]>(
    holes.map(h => ({
      par: h.par,
      score: h.score,
      fir: h.fir,
      gir: h.gir,
      putts: h.putts ?? 0,
      upAndDown: h.up_and_down,
      sandSave: h.sand_save,
    }))
  )

  function updateHole(index: number, updates: Partial<HoleState>) {
    setHoleStates(prev => {
      const next = [...prev]
      const updated = { ...next[index], ...updates }
      if (updated.par === 3) updated.fir = null
      if (updated.gir === true) updated.upAndDown = null
      next[index] = updated
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { await saveRoundEdits(round.id, fd) })
  }

  const totalScore = holeStates.reduce((s, h) => s + h.score, 0)
  const totalPar = holeStates.reduce((s, h) => s + h.par, 0)
  const diff = totalScore - totalPar

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Round header */}
      <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Round details</p>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Course</label>
          <input type="text" name="course_name" defaultValue={round.course_name} required
            className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
            style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Date</label>
            <input type="date" name="date" defaultValue={round.date} required
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Type</label>
            <select name="round_type" defaultValue={round.round_type}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>
              <option value="practice">Practice</option>
              <option value="competition">Competition</option>
              <option value="tournament">Tournament</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Mood</label>
            <select name="mood" defaultValue={round.mood ?? ''}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>
              <option value="">—</option>
              <option value="tough">Tough</option>
              <option value="average">Average</option>
              <option value="good">Good</option>
              <option value="great">Great</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Energy</label>
            <select name="energy_level" defaultValue={round.energy_level ?? ''}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>
              <option value="">—</option>
              <option value="fresh">Fresh</option>
              <option value="normal">Normal</option>
              <option value="tired">Tired</option>
              <option value="niggly">Niggly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Notes</label>
          <textarea name="notes" defaultValue={round.notes ?? ''} rows={3}
            placeholder="Round notes…"
            className="w-full px-3 py-2.5 rounded-xl outline-none text-sm resize-none"
            style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }} />
        </div>
      </div>

      {/* Score summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ backgroundColor: '#1A1D27' }}>
        <span className="text-sm" style={{ color: '#9A9DB0' }}>Total score</span>
        <span className="text-xl font-bold" style={{
          fontFamily: 'var(--font-dm-mono)',
          color: diff < 0 ? '#22C55E' : diff === 0 ? '#F0F0F0' : diff <= 5 ? '#9A9DB0' : '#EF4444'
        }}>
          {totalScore} ({diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff})
        </span>
      </div>

      {/* Holes */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Holes</p>
        <div className="space-y-3">
          {holes.map((hole, index) => {
            const hs = holeStates[index]
            const n = hole.hole_number
            const holeDiff = hs.score - hs.par
            return (
              <div key={hole.id} className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold" style={{ color: '#F0F0F0' }}>Hole {n}</span>
                  <span className="text-sm font-medium" style={{
                    fontFamily: 'var(--font-dm-mono)',
                    color: holeDiff < 0 ? '#22C55E' : holeDiff === 0 ? '#F0F0F0' : holeDiff <= 2 ? '#9A9DB0' : '#EF4444'
                  }}>
                    {hs.score} ({holeDiff === 0 ? 'E' : holeDiff > 0 ? `+${holeDiff}` : holeDiff})
                  </span>
                </div>

                {/* Par */}
                <div className="mb-3">
                  <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Par</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([3, 4, 5] as const).map(p => (
                      <button key={p} type="button" onClick={() => updateHole(index, { par: p })}
                        className="py-2 rounded-lg text-sm font-bold"
                        style={{
                          backgroundColor: hs.par === p ? '#CC2222' : '#22263A',
                          color: hs.par === p ? '#F0F0F0' : '#9A9DB0',
                          border: `1px solid ${hs.par === p ? '#CC2222' : '#2E3247'}`,
                        }}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name={`hole_${n}_par`} value={hs.par} />
                </div>

                {/* Score + Putts row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Score</p>
                    <Stepper name={`hole_${n}_score`} value={hs.score} onChange={v => updateHole(index, { score: v })} min={1} max={15} />
                  </div>
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Putts</p>
                    <Stepper name={`hole_${n}_putts`} value={hs.putts} onChange={v => updateHole(index, { putts: v })} min={0} max={6} />
                  </div>
                </div>

                {/* FIR / GIR row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {hs.par !== 3 && (
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>FIR</p>
                      <PillToggle name={`hole_${n}_fir`} value={hs.fir} onChange={v => updateHole(index, { fir: v })} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>GIR</p>
                    <PillToggle name={`hole_${n}_gir`} value={hs.gir} onChange={v => updateHole(index, { gir: v, upAndDown: v ? null : hs.upAndDown })} />
                  </div>
                </div>

                {/* U&D / Sand save */}
                {hs.gir === false && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Up & down</p>
                      <PillToggle name={`hole_${n}_ud`} value={hs.upAndDown} onChange={v => updateHole(index, { upAndDown: v })} />
                    </div>
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: '#9A9DB0' }}>Sand save</p>
                      <PillToggle name={`hole_${n}_ss`} value={hs.sandSave} onChange={v => updateHole(index, { sandSave: v })} />
                    </div>
                  </div>
                )}

                {/* Hidden fallbacks for missing fields */}
                {hs.par === 3 && <input type="hidden" name={`hole_${n}_fir`} value="" />}
                {hs.gir !== false && <input type="hidden" name={`hole_${n}_ud`} value="" />}
                {hs.gir !== false && <input type="hidden" name={`hole_${n}_ss`} value="" />}
              </div>
            )
          })}
        </div>
      </div>

      <button type="submit" disabled={pending}
        className="w-full py-4 rounded-xl font-semibold text-base"
        style={{ backgroundColor: pending ? '#7a1414' : '#CC2222', color: '#F0F0F0', minHeight: '56px', opacity: pending ? 0.7 : 1 }}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
