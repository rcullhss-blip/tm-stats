'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SetupData } from '@/lib/types'
import type { RoundType, InputMode } from '@/lib/types'
import { courseNameKey, teeKey, buildPrefill, type LibraryTee } from '@/lib/course-library'

export interface RecentCourse {
  name: string
  holes: number
  lastRoundId: string
}

interface Props {
  onNext: (data: SetupData) => void
  recentCourses?: RecentCourse[]
  voiceEnabled?: boolean
  advancedEnabled?: boolean
}

const today = new Date().toISOString().split('T')[0]

// Course library (shared by all golfers): courses and the tee cards saved from rounds
interface LibraryCourse { id: string; name: string; name_key: string; holes: number | null }
interface LibraryTeeRow extends LibraryTee { tee_key: string; rounds_seen: number | null }
const COMMON_TEES = ['White', 'Yellow', 'Red']

export default function RoundSetup({ onNext, recentCourses = [], voiceEnabled = false, advancedEnabled = false }: Props) {
  const [date, setDate] = useState(today)
  const [courseName, setCourseName] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [roundType, setRoundType] = useState<RoundType>('practice')
  const [inputMode, setInputMode] = useState<InputMode>('quick')
  const [trackProcess, setTrackProcess] = useState(false)
  const [voice, setVoice] = useState(false)
  const [loadingPars, setLoadingPars] = useState(false)
  const [tee, setTee] = useState('')
  // Last library lookup, tagged with the name it was for, so a stale answer is never shown
  const [lib, setLib] = useState<{ key: string; matches: LibraryCourse[]; course: LibraryCourse | null; tees: LibraryTeeRow[] }>({ key: '', matches: [], course: null, tees: [] })

  // As the golfer types, look the course up in the library (ignores "Golf Club", "GC" and so on)
  const typedKey = courseNameKey(courseName)
  useEffect(() => {
    if (typedKey.length < 3) return
    let alive = true
    const timer = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = createClient() as any
        const { data } = await sb
          .from('courses')
          .select('id, name, name_key, holes')
          .ilike('name_key', `%${typedKey}%`)
          .order('name')
          .limit(6)
        if (!alive) return
        const matches: LibraryCourse[] = data ?? []
        const exact = matches.find(m => m.name_key === typedKey) ?? null
        if (!exact) { setLib({ key: typedKey, matches, course: null, tees: [] }); return }
        const { data: tees } = await sb
          .from('course_tees')
          .select('tee, tee_key, pars, yards, stroke_index, rounds_seen')
          .eq('course_id', exact.id)
          .order('rounds_seen', { ascending: false })
        if (alive) setLib({ key: typedKey, matches, course: exact, tees: tees ?? [] })
      } catch {
        // No signal, or the library is not set up yet: entry works exactly as before
        if (alive) setLib({ key: typedKey, matches: [], course: null, tees: [] })
      }
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [typedKey])

  const current = typedKey.length >= 3 && lib.key === typedKey ? lib : null
  const libMatches = current?.matches ?? []
  const libCourse = current?.course ?? null
  const libTees = current?.tees ?? []
  const chosenTee = libTees.find(t => t.tee_key === teeKey(tee)) ?? null
  const namedTees = libTees.filter(t => t.tee_key !== '').map(t => t.tee)
  const teeChoices = [...namedTees, ...COMMON_TEES.filter(c => !namedTees.some(n => teeKey(n) === teeKey(c)))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = courseName.trim()
    if (!name || loadingPars) return

    // Course memory: played here before → pre-fill the pars from the last round
    const match = recentCourses.find(c => c.name.trim().toLowerCase() === name.toLowerCase())
    let ownPars: (number | null)[] | undefined
    let ownYards: (number | null)[] | undefined
    if (match) {
      setLoadingPars(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('holes')
          .select('hole_number, par, shots')
          .eq('round_id', match.lastRoundId)
          .order('hole_number')
        if (data && data.length > 0) {
          ownPars = data.slice(0, holes).map(h => h.par)
          // Tee yardages, when the last round here was shot by shot (used by voice entry)
          ownYards = data.slice(0, holes).map(h => {
            const first = Array.isArray(h.shots) ? (h.shots[0] as { lieType?: string; distanceToPin?: number } | undefined) : undefined
            return first?.lieType === 'tee' && typeof first.distanceToPin === 'number' ? first.distanceToPin : null
          })
        }
      } catch {
        // No signal / fetch failed — carry on without the prefill
      }
      setLoadingPars(false)
    }

    // Best card first: library card for this tee, then the golfer's last round here,
    // then pars from any other tee. Everything stays editable on the hole screens.
    const others = libCourse ? libTees.filter(t => t !== chosenTee) : []
    const prefill = buildPrefill(holes, libCourse ? chosenTee : null, others, ownPars, ownYards)

    onNext({
      date,
      courseName: name,
      holes,
      roundType,
      inputMode: voice ? 'full' : inputMode,
      parsPrefill: prefill.pars,
      trackProcess: !voice && inputMode === 'full' ? trackProcess : false,
      voice,
      advanced: advancedEnabled && (voice || inputMode === 'full'),
      yardagesPrefill: prefill.yards,
      tee: tee.trim() || undefined,
      strokeIndexPrefill: prefill.strokeIndex,
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
          {/* Library suggestions: tap one to use the saved course card */}
          {!libCourse && libMatches.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #2E3247' }}>
              <p className="px-4 pt-2 pb-1 text-xs" style={{ color: '#9A9DB0', backgroundColor: '#1A1D27' }}>
                In the course library
              </p>
              {libMatches.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setCourseName(m.name)
                    if (m.holes === 9 || m.holes === 18) setHoles(m.holes)
                  }}
                  className="w-full px-4 text-left text-sm"
                  style={{ backgroundColor: '#1A1D27', color: '#F0F0F0', borderTop: '1px solid #2E3247', minHeight: '44px' }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
          {libCourse ? (
            <p className="text-xs mt-1.5" style={{ color: '#22C55E' }}>
              {chosenTee && chosenTee.yards?.some(y => y !== null)
                ? '✓ In the course library. Pars and yardages will be filled in. You can change any of them.'
                : '✓ In the course library. Pars will be filled in. You can change any of them.'}
            </p>
          ) : recentCourses.some(c => c.name.trim().toLowerCase() === courseName.trim().toLowerCase()) && (
            <p className="text-xs mt-1.5" style={{ color: '#22C55E' }}>
              ✓ Played here before. Pars will be filled in from your last round.
            </p>
          )}
        </div>

        {/* Tee (optional): helps the course library keep the right yardages */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Tee <span className="font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {teeChoices.map(t => {
              const selected = tee.trim() !== '' && teeKey(tee) === teeKey(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTee(selected ? '' : t)}
                  className="px-4 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: selected ? '#CC222220' : '#1A1D27',
                    color: selected ? '#CC2222' : '#9A9DB0',
                    border: `1px solid ${selected ? '#CC222240' : '#2E3247'}`,
                    minHeight: '44px',
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <input
            type="text"
            value={tee}
            onChange={e => setTee(e.target.value)}
            maxLength={40}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="Or type your tee, e.g. Blue"
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
              onClick={() => { setInputMode('quick'); setVoice(false) }}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: !voice && inputMode === 'quick' ? '#22263A' : '#1A1D27',
                border: `1px solid ${!voice && inputMode === 'quick' ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Quick entry</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                Score, FIR, GIR, putts — fast. Basic stats only.
              </p>
            </button>

            <button
              type="button"
              onClick={() => { setInputMode('full'); setVoice(false) }}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: !voice && inputMode === 'full' ? '#22263A' : '#1A1D27',
                border: `1px solid ${!voice && inputMode === 'full' ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Full tracking</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                    Enter each shot with distance + lie. Unlocks Strokes Gained.
                  </p>
                  {advancedEnabled && (
                    <p className="text-xs mt-1" style={{ color: '#22C55E' }}>
                      Elite: one extra tap per shot for where it finished. Skip any you like.
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded ml-2 shrink-0"
                  style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}
                >
                  SG
                </span>
              </div>
            </button>

            {voiceEnabled && <button
              type="button"
              onClick={() => setVoice(true)}
              className="w-full p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: voice ? '#22263A' : '#1A1D27',
                border: `1px solid ${voice ? '#CC2222' : '#2E3247'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Talk it through</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                    Describe your round out loud, then check each hole. No typing.
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded ml-2 shrink-0"
                  style={{ backgroundColor: '#CC222220', color: '#CC2222' }}
                >
                  Testing
                </span>
              </div>
            </button>}
          </div>
        </div>

        {/* Mental process tracking — full tracking only */}
        {inputMode === 'full' && !voice && (
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
