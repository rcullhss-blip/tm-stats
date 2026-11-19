'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HoleData, InputMode, RoundType, SetupData } from '@/lib/types'
import HoleEntry from '@/components/rounds/HoleEntry'
import RoundSummary from '@/components/rounds/RoundSummary'

interface CardHole { holeNumber: number; par: 3 | 4 | 5; score: number }

interface Props {
  roundId: string
  courseName: string
  eventName: string | null
  date: string
  roundType: RoundType
  holes: CardHole[]
  advancedEnabled: boolean
  yardages?: (number | null)[]
}

interface Draft { mode: InputMode; holes: HoleData[]; current: number; highest: number; step: 'holes' | 'summary' }

const draftKey = (roundId: string) => `tmstats_finish_${roundId}`

function fmtToPar(n: number): string {
  if (n === 0) return 'level par'
  return n > 0 ? `+${n}` : `${n}`
}

export default function FinishStatsClient({ roundId, courseName, eventName, date, roundType, holes, advancedEnabled, yardages }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'choose' | 'holes' | 'summary'>('choose')
  const [mode, setMode] = useState<InputMode>('quick')
  const [advanced, setAdvanced] = useState(false)
  const [holeData, setHoleData] = useState<HoleData[]>([])
  const [resume, setResume] = useState<{ current: number; highest: number } | null>(null)
  const [editingFromSummary, setEditingFromSummary] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalScore = holes.reduce((s, h) => s + h.score, 0)
  const totalPar = holes.reduce((s, h) => s + h.par, 0)

  // Pick up where they left off if the phone locked half way through
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(roundId))
      if (!raw) return
      const d = JSON.parse(raw) as Draft
      if (Array.isArray(d.holes) && d.holes.length === holes.length) setDraft(d)
    } catch {}
  }, [roundId, holes.length])

  const setup: SetupData = {
    date,
    courseName,
    holes: holes.length === 9 ? 9 : 18,
    roundType,
    inputMode: mode,
    parsPrefill: holes.map(h => h.par),
    advanced: mode === 'full' && advanced,
    yardagesPrefill: yardages,
  }

  function blankHoles(): HoleData[] {
    return holes.map(h => ({
      holeNumber: h.holeNumber, par: h.par, score: h.score,
      fir: null, gir: null, putts: Math.min(2, h.score), upAndDown: null, sandSave: null, bunker: null,
    }))
  }

  function start(chosen: InputMode) {
    setMode(chosen)
    setHoleData(blankHoles())
    setResume({ current: 0, highest: 0 })
    setStep('holes')
  }

  function resumeDraft() {
    if (!draft) return
    // Par and score always come from the card, whatever the saved draft says
    setMode(draft.mode)
    setHoleData(draft.holes.map((h, i) => ({ ...h, par: holes[i].par, score: holes[i].score })))
    setResume({ current: draft.current, highest: draft.highest })
    setStep(draft.step)
    setDraft(null)
  }

  const saveDraft = useCallback((d: Draft) => {
    try { localStorage.setItem(draftKey(roundId), JSON.stringify(d)) } catch {}
  }, [roundId])

  const handleProgress = useCallback((hs: HoleData[], current: number, highest: number) => {
    saveDraft({ mode, holes: hs, current, highest, step: 'holes' })
  }, [mode, saveDraft])

  async function handleSave(notes: string, mood: string, conditions: string, energy: string) {
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/rounds/${roundId}/finish-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputMode: mode, holes: holeData, notes, mood, conditions, energy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save your stats')
      try { localStorage.removeItem(draftKey(roundId)) } catch {}
      fetch(`/api/rounds/${roundId}/summary-email`, { method: 'POST', keepalive: true }).catch(() => {})
      router.push(`/rounds/${roundId}`)
    } catch (e) {
      setError(e instanceof Error ? `${e.message}. Your stats are safe on this device, try again.` : 'Could not save your stats. Try again.')
      setSaving(false)
    }
  }

  if (step === 'choose') {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Add your stats</p>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{eventName ?? courseName}</h1>
        <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>
          {eventName ? `${courseName} · ` : ''}{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        <div className="p-4 rounded-xl mb-5 flex items-center justify-between" style={{ backgroundColor: '#1A1D27' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Your scores are already in</p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Every hole has its par and score. You only add what happened.</p>
          </div>
          <div className="text-right pl-4">
            <p className="text-3xl font-medium leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{totalScore}</p>
            <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>{fmtToPar(totalScore - totalPar)}</p>
          </div>
        </div>

        {draft && (
          <button type="button" onClick={resumeDraft} className="w-full py-4 rounded-xl font-semibold text-base mb-3" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}>
            Carry on where you left off →
          </button>
        )}

        <button type="button" onClick={() => start('full')} className="w-full text-left p-4 rounded-xl mb-3" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222260', minHeight: '72px' }}>
          <p className="text-base font-semibold" style={{ color: '#F0F0F0' }}>Full tracking</p>
          <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Each shot: where it was and how far out. Gives you Strokes Gained for the round. About 15 to 20 minutes, and each hole moves on by itself once the shots match your score.</p>
        </button>
        {advancedEnabled && (
          <label className="flex items-center gap-3 px-4 mb-3" style={{ minHeight: '44px' }}>
            <input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#CC2222' }} />
            <span className="text-sm" style={{ color: '#9A9DB0' }}>Also record where each shot finished (left, right, short, long)</span>
          </label>
        )}
        <button type="button" onClick={() => start('quick')} className="w-full text-left p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', minHeight: '72px' }}>
          <p className="text-base font-semibold" style={{ color: '#F0F0F0' }}>Quick stats</p>
          <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Fairway, green and putts on each hole. About 2 minutes. No Strokes Gained.</p>
        </button>
      </div>
    )
  }

  if (step === 'holes') {
    return (
      <HoleEntry
        setup={setup}
        cardLocked
        stepLabel="Add your stats"
        onBack={() => { setEditingFromSummary(false); setStep('choose') }}
        onComplete={(hs) => {
          // The card's par and score win over anything the entry screens derived
          const locked = hs.map((h, i) => ({ ...h, par: holes[i].par, score: holes[i].score }))
          setHoleData(locked)
          setEditingFromSummary(false)
          setResume(null)
          saveDraft({ mode, holes: locked, current: holes.length - 1, highest: holes.length - 1, step: 'summary' })
          setStep('summary')
        }}
        initialHoles={holeData.length === holes.length ? holeData : undefined}
        initialHole={resume?.current ?? 0}
        initialHighest={resume?.highest}
        editingFromSummary={editingFromSummary}
        onProgress={handleProgress}
      />
    )
  }

  return (
    <RoundSummary
      setup={setup}
      holes={holeData}
      saving={saving}
      error={error}
      onBack={() => { setEditingFromSummary(true); setStep('holes') }}
      onSave={handleSave}
    />
  )
}
