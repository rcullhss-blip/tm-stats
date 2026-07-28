'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SetupData, HoleData } from '@/lib/types'
import RoundSetup, { type RecentCourse } from '@/components/rounds/RoundSetup'
import HoleEntry from '@/components/rounds/HoleEntry'
import RoundSummary from '@/components/rounds/RoundSummary'

const DRAFT_KEY = 'tmstats_round_draft'

interface RoundDraft {
  setup: SetupData
  holes: HoleData[]
  current: number
  highest: number
  step: 'holes' | 'summary'
  savedAt: string
}

function readDraft(): RoundDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as RoundDraft
    if (!draft.setup?.courseName || !Array.isArray(draft.holes)) return null
    return draft
  } catch {
    return null
  }
}

function writeDraft(draft: RoundDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or unavailable — nothing we can do, entry continues in memory
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {}
}

interface Props {
  recentCourses?: RecentCourse[]
}

export default function NewRoundClient({ recentCourses = [] }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'holes' | 'summary'>('setup')
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [holeData, setHoleData] = useState<HoleData[]>([])
  const [editingFromSummary, setEditingFromSummary] = useState(false)
  const [resumePos, setResumePos] = useState<{ current: number; highest: number } | null>(null)
  const [draft, setDraft] = useState<RoundDraft | null>(null)
  const [draftChecked, setDraftChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Look for an unfinished round from a previous session
  useEffect(() => {
    setDraft(readDraft())
    setDraftChecked(true)
  }, [])

  // Persist every change so a locked phone / reload never loses the round
  const handleProgress = useCallback((holes: HoleData[], current: number, highest: number) => {
    if (!setup) return
    writeDraft({ setup, holes, current, highest, step: 'holes', savedAt: new Date().toISOString() })
  }, [setup])

  function resumeDraft() {
    if (!draft) return
    setSetup(draft.setup)
    setHoleData(draft.holes)
    setResumePos({ current: draft.current, highest: draft.highest })
    setStep(draft.step)
    setDraft(null)
  }

  function discardDraft() {
    clearDraft()
    setDraft(null)
  }

  async function handleSave(notes: string, mood: string, conditions: string, energy: string) {
    if (!setup) return
    setError('')
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const parTotal = holeData.reduce((sum, h) => sum + h.par, 0)
    const scoreTotal = holeData.reduce((sum, h) => sum + h.score, 0)

    // Insert round
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        user_id: user.id,
        date: setup.date,
        course_name: setup.courseName,
        holes: setup.holes,
        round_type: setup.roundType,
        input_mode: setup.inputMode,
        par_total: parTotal,
        score_total: scoreTotal,
        notes: notes || null,
        mood: (mood || null) as 'tough' | 'average' | 'good' | 'great' | null,
        conditions: conditions || null,
        energy_level: (energy || null) as 'fresh' | 'normal' | 'tired' | 'niggly' | null,
      })
      .select('id')
      .single()

    if (roundError || !round) {
      setError('Failed to save round — your data is safe on this device. Check your signal and try again.')
      setSaving(false)
      return
    }

    // Insert holes
    const holesInsert = holeData.map(h => ({
      round_id: round.id,
      hole_number: h.holeNumber,
      par: h.par,
      score: h.score,
      fir: h.fir,
      gir: h.gir,
      putts: h.putts,
      up_and_down: h.upAndDown,
      sand_save: h.sandSave,
      shots: h.shots ? JSON.parse(JSON.stringify(h.shots)) : null,
    }))

    const { error: holesError } = await supabase.from('holes').insert(holesInsert)

    if (holesError) {
      // Clean up the orphaned round row
      await supabase.from('rounds').delete().eq('id', round.id)
      setError('Failed to save round — your data is safe on this device. Check your signal and try again.')
      setSaving(false)
      return
    }

    clearDraft()
    router.push(`/rounds/${round.id}`)
  }

  // Wait for the draft check so the resume prompt doesn't flash in after setup renders
  if (!draftChecked) return null

  // Unfinished round found — offer to pick up where they left off
  if (draft && step === 'setup') {
    const enteredCount = draft.step === 'summary' ? draft.holes.length : draft.highest
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="p-5 rounded-2xl mb-4" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC2222' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>
            Unfinished round
          </p>
          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            {draft.setup.courseName}
          </h1>
          <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>
            {draft.step === 'summary'
              ? 'All holes entered — ready to review and save.'
              : `${enteredCount} of ${draft.setup.holes} holes entered · you were on hole ${draft.current + 1}`}
          </p>
          <button
            type="button"
            onClick={resumeDraft}
            className="w-full py-4 rounded-xl font-semibold text-base mb-3"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
          >
            Resume round →
          </button>
          <button
            type="button"
            onClick={discardDraft}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}
          >
            Discard and start fresh
          </button>
        </div>
      </div>
    )
  }

  if (step === 'setup') {
    return (
      <RoundSetup
        recentCourses={recentCourses}
        onNext={(data) => {
          setSetup(data)
          setResumePos(null)
          setStep('holes')
        }}
      />
    )
  }

  if (step === 'holes' && setup) {
    return (
      <HoleEntry
        setup={setup}
        onBack={() => {
          setEditingFromSummary(false)
          setStep('setup')
        }}
        onComplete={(holes) => {
          setHoleData(holes)
          setEditingFromSummary(false)
          setResumePos(null)
          writeDraft({ setup, holes, current: setup.holes - 1, highest: setup.holes - 1, step: 'summary', savedAt: new Date().toISOString() })
          setStep('summary')
        }}
        initialHoles={(editingFromSummary || resumePos) && holeData.length === setup.holes ? holeData : undefined}
        initialHole={resumePos?.current ?? 0}
        initialHighest={resumePos?.highest}
        editingFromSummary={editingFromSummary}
        onProgress={handleProgress}
      />
    )
  }

  if (step === 'summary' && setup) {
    return (
      <RoundSummary
        setup={setup}
        holes={holeData}
        saving={saving}
        error={error}
        onBack={() => {
          setEditingFromSummary(true)
          setStep('holes')
        }}
        onSave={handleSave}
      />
    )
  }

  return null
}
