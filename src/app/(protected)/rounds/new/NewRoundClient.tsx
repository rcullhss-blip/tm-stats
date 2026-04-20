'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RoundType, InputMode, HoleRow, ShotEntry } from '@/lib/types'
import RoundSetup from '@/components/rounds/RoundSetup'
import HoleEntry from '@/components/rounds/HoleEntry'
import RoundSummary from '@/components/rounds/RoundSummary'

export interface SetupData {
  date: string
  courseName: string
  holes: 9 | 18
  roundType: RoundType
  inputMode: InputMode
}

export interface HoleData {
  holeNumber: number
  par: 3 | 4 | 5
  score: number
  fir: boolean | null    // null on par 3s
  gir: boolean | null
  putts: number | null
  upAndDown: boolean | null
  sandSave: boolean | null
  shots?: ShotEntry[]    // Full tracking mode only
}

export default function NewRoundClient() {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'holes' | 'summary'>('setup')
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [holeData, setHoleData] = useState<HoleData[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      setError('Failed to save round. Please try again.')
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
      setError('Failed to save round data. Please try again.')
      setSaving(false)
      return
    }

    router.push(`/rounds/${round.id}`)
  }

  if (step === 'setup') {
    return (
      <RoundSetup
        onNext={(data) => {
          setSetup(data)
          setStep('holes')
        }}
      />
    )
  }

  if (step === 'holes' && setup) {
    return (
      <HoleEntry
        setup={setup}
        onBack={() => setStep('setup')}
        onComplete={(holes) => {
          setHoleData(holes)
          setStep('summary')
        }}
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
        onBack={() => setStep('holes')}
        onSave={handleSave}
      />
    )
  }

  return null
}
