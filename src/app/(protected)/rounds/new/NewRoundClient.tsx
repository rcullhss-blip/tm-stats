'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SetupData, HoleData } from '@/lib/types'
import RoundSetup, { type RecentCourse } from '@/components/rounds/RoundSetup'
import HoleEntry from '@/components/rounds/HoleEntry'
import RoundSummary from '@/components/rounds/RoundSummary'
import VoiceRoundEntry from '@/components/rounds/VoiceRoundEntry'
import { queueRound, uploadRound, contributeCourse, type PendingRound } from '@/lib/round-outbox'

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
  voiceEnabled?: boolean
  advancedEnabled?: boolean
  // Free plan: rounds still to log before the limit (null on paid plans)
  freeRoundsLeft?: number | null
}

export default function NewRoundClient({ recentCourses = [], voiceEnabled = false, advancedEnabled = false, freeRoundsLeft = null }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'voice' | 'holes' | 'summary'>('setup')
  // Each step starts at the top of the page, not where the last one was scrolled to
  useEffect(() => { window.scrollTo(0, 0) }, [step])
  // Per-hole notes from voice entry: what the golfer still needs to check or add
  const [voiceNotes, setVoiceNotes] = useState<(string | null)[] | null>(null)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [holeData, setHoleData] = useState<HoleData[]>([])
  const [editingFromSummary, setEditingFromSummary] = useState(false)
  const [resumePos, setResumePos] = useState<{ current: number; highest: number } | null>(null)
  const [draft, setDraft] = useState<RoundDraft | null>(null)
  const [draftChecked, setDraftChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Where the golfer tried to go mid-round; set while the "leave this round?" box is open
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const midRound = step === 'holes' || step === 'summary' || step === 'voice'

  // Mid-round, tapping a link elsewhere in the app (bottom bar, top bar) asks first.
  // The round is kept on this phone either way, so leaving never loses it.
  useEffect(() => {
    if (!midRound) return
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === '/rounds/new') return
      e.preventDefault()
      e.stopPropagation()
      setLeaveTo(url.pathname + url.search)
    }
    // The phone's back gesture / browser back: stay, and ask
    history.pushState({ tmRound: true }, '')
    function onPop() {
      history.pushState({ tmRound: true }, '')
      setLeaveTo('back')
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
  }, [midRound])

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

    // The signed-in user from this phone (works with no signal, unlike asking the server)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { router.push('/login'); return }

    // Voice entry safety net: a shot still waiting for its distance must never be saved
    const gapHole = holeData.find(h => h.shots?.some(s => s.needsDistance))
    if (gapHole) {
      setError(`Hole ${gapHole.holeNumber} still has a shot with no distance. Go back and add it.`)
      setSaving(false)
      return
    }

    const parTotal = holeData.reduce((sum, h) => sum + h.par, 0)
    const scoreTotal = holeData.reduce((sum, h) => sum + h.score, 0)
    // The round's id is made here, so a retry with no signal can never save it twice
    const roundId = crypto.randomUUID()
    const pending: PendingRound = {
      round: {
        id: roundId,
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
      },
      holes: holeData.map(h => ({
        round_id: roundId,
        hole_number: h.holeNumber,
        par: h.par,
        score: h.score,
        fir: h.fir,
        gir: h.gir,
        putts: h.putts,
        up_and_down: h.upAndDown,
        sand_save: h.sandSave,
        shots: h.shots ? JSON.parse(JSON.stringify(h.shots)) : null,
      })),
      queuedAt: new Date().toISOString(),
      tee: setup.tee || undefined,
    }

    let saved = false
    try { saved = await uploadRound(pending) } catch { saved = false }
    if (!saved) {
      // No signal (or the server did not answer): keep it on this phone and upload later
      queueRound(pending)
      clearDraft()
      router.push('/rounds?queued=1')
      return
    }
    const round = { id: roundId }

    clearDraft()
    // Email the golfer (and their coach) a PDF breakdown. Fire and forget: the
    // round is already saved, so a failed email must never get in the way.
    fetch(`/api/rounds/${round.id}/summary-email`, { method: 'POST', keepalive: true }).catch(() => {})
    // Add this course's pars and yardages to the shared course library
    contributeCourse(round.id, setup.tee)
    router.push(`/rounds/${round.id}`)
  }

  const leaveBox = leaveTo && (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-8" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm p-5 rounded-2xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-base font-semibold mb-1" style={{ color: '#F0F0F0' }}>Leave this round?</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>It is not saved to your account yet. It stays on this phone, so you can carry on from Log round later.</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setLeaveTo(null)} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}>Keep going</button>
          <button type="button" onClick={() => { const to = leaveTo; setLeaveTo(null); router.push(to === 'back' ? '/dashboard' : to) }} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Leave</button>
        </div>
      </div>
    </div>
  )

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
            onClick={() => (confirmDiscard ? discardDraft() : setConfirmDiscard(true))}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: confirmDiscard ? '#EF4444' : 'transparent', color: confirmDiscard ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${confirmDiscard ? '#EF4444' : '#2E3247'}`, minHeight: '48px' }}
          >
            {confirmDiscard ? 'Yes, delete this round' : 'Discard and start fresh'}
          </button>
          {confirmDiscard && (
            <p className="text-xs mt-2 text-center" style={{ color: '#9A9DB0' }}>The holes you have entered will be gone. Tap again to confirm, or Resume above.</p>
          )}
        </div>
      </div>
    )
  }

  if (step === 'setup') {
    return (
      <>
      {freeRoundsLeft !== null && freeRoundsLeft <= 2 && (
        <div className="px-4 pt-4 max-w-lg mx-auto">
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B40' }}>
            <p className="text-sm" style={{ color: '#F59E0B', lineHeight: 1.5 }}>
              {freeRoundsLeft === 1 ? 'This is your last free round.' : '2 free rounds left.'} The free plan has 5 rounds in total, 9-hole rounds included. Pro has no limit.
            </p>
          </div>
        </div>
      )}
      <RoundSetup
        recentCourses={recentCourses}
        voiceEnabled={voiceEnabled}
        advancedEnabled={advancedEnabled}
        onNext={(data) => {
          setSetup(data)
          setResumePos(null)
          setVoiceNotes(null)
          setStep(data.voice ? 'voice' : 'holes')
        }}
      />
      </>
    )
  }

  if (step === 'voice' && setup) {
    return (
      <>
      {leaveBox}
      <VoiceRoundEntry
        setup={setup}
        onBack={() => setStep('setup')}
        onDone={(voiceDraft) => {
          // Load what was heard into the normal entry screens, starting at hole 1,
          // so the golfer clicks through and approves every hole.
          setSetup({ ...setup, inputMode: voiceDraft.inputMode, voice: false })
          setHoleData(voiceDraft.holes)
          setVoiceNotes(voiceDraft.notes)
          setResumePos({ current: 0, highest: 0 })
          setStep('holes')
        }}
      />
      </>
    )
  }

  if (step === 'holes' && setup) {
    return (
      <>
      {leaveBox}
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
        voiceNotes={voiceNotes ?? undefined}
      />
      </>
    )
  }

  if (step === 'summary' && setup) {
    return (
      <>
      {leaveBox}
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
      </>
    )
  }

  return null
}
