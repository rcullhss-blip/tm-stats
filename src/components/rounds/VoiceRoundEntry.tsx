'use client'

import { useEffect, useRef, useState } from 'react'
import type { SetupData } from '@/lib/types'
import type { VoiceHole } from '@/lib/voice-types'
import { buildVoiceDraft, type VoiceDraft, type VoiceHoleStatus } from '@/lib/voice-holes'

interface Props {
  setup: SetupData
  onBack: () => void
  onDone: (draft: VoiceDraft) => void
}

const MAX_SECONDS = 6 * 60
const MAX_BYTES = 4 * 1024 * 1024

const TIPS: { title: string; body: string }[] = [
  { title: 'Find somewhere quiet', body: 'Hold the phone like you are on a call. Wind and a busy bar make it mishear you.' },
  { title: 'Go hole by hole, in order', body: 'Start each hole with its number, par and yardage: "Hole 1, par 4, 380 yards." Once you have logged a course we remember the pars and yardages.' },
  { title: 'For every shot, say where it finished and what you had left', body: '"Driver into the fairway, 150 left. Hit it on to 20 feet."' },
  { title: 'Putts in feet, everything else in yards', body: 'Give the length of each putt: "First putt 20 feet, second from 3 feet." Say "tap-in" for anything inside two feet.' },
  { title: 'Say "penalty" if you took one', body: 'Then say where you played your next shot from.' },
  { title: 'Record nine holes at a time', body: 'Shorter recordings come out more accurate. Do the front nine, check the result, then record the back nine.' },
  { title: 'Only got your scores?', body: 'Say "Hole 3, par 3, made 4, two putts" for each hole and it logs a Quick round without Strokes Gained.' },
]

const STATUS_STYLE: Record<VoiceHoleStatus, { bg: string; border: string; text: string }> = {
  complete: { bg: '#22C55E20', border: '#22C55E60', text: '#22C55E' },
  partial: { bg: '#F59E0B20', border: '#F59E0B60', text: '#F59E0B' },
  scores: { bg: '#22C55E20', border: '#22C55E60', text: '#22C55E' },
  missing: { bg: '#1A1D27', border: '#2E3247', text: '#4A4D60' },
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function VoiceRoundEntry({ setup, onBack, onDone }: Props) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [heard, setHeard] = useState<VoiceHole[]>([])
  const [transcripts, setTranscripts] = useState<string[]>([])
  const [showGuide, setShowGuide] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const draft = heard.length > 0 ? buildVoiceDraft(heard, setup.holes, setup.parsPrefill) : null
  const heardCount = draft ? draft.status.filter(s => s !== 'missing').length : 0
  const needsWork = draft ? draft.status.filter(s => s === 'partial').length : 0

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stream.getTracks().forEach(t => t.stop())
  }, [])

  // Stop automatically at the time limit so the recording stays small enough to send
  useEffect(() => {
    if (phase === 'recording' && seconds >= MAX_SECONDS) stopRecording()
  }, [phase, seconds])

  // Each new recording adds to what we already have; a hole described again replaces the earlier version.
  function merge(incoming: VoiceHole[]) {
    setHeard(prev => {
      const map = new Map(prev.map(h => [h.hole_number, h]))
      for (const h of incoming) map.set(h.hole_number, h)
      return [...map.values()].sort((a, b) => a.hole_number - b.hole_number)
    })
  }

  async function send(body: FormData) {
    setPhase('processing')
    setError('')
    body.set('holes', String(setup.holes))
    body.set('pars', JSON.stringify(setup.parsPrefill ?? []))
    body.set('yardages', JSON.stringify(setup.yardagesPrefill ?? []))
    try {
      const res = await fetch('/api/rounds/voice', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.')
      } else if (!Array.isArray(data.holes) || data.holes.length === 0) {
        setError('We could not pick out any holes from that. Have a look at the tips and try again.')
        if (data.transcript) setTranscripts(t => [...t, data.transcript])
      } else {
        merge(data.holes)
        if (data.transcript) setTranscripts(t => [...t, data.transcript])
        setShowGuide(false)
        setTyping(false)
        setTyped('')
      }
    } catch {
      setError('No signal. Your recording did not send, so try again when you have a connection.')
    }
    setPhase('idle')
  }

  async function startRecording() {
    setError('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio. You can type your round in below.')
      setTyping(true)
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('The microphone is blocked. Allow it in your browser settings, or type your round in below.')
      setTyping(true)
      return
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m))
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 })
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      if (blob.size === 0) { setPhase('idle'); setError('Nothing was recorded. Try again.'); return }
      if (blob.size > MAX_BYTES) {
        setPhase('idle')
        setError('That recording is too long to send in one go. Record nine holes at a time.')
        return
      }
      const body = new FormData()
      body.set('audio', new File([blob], type.includes('mp4') ? 'round.m4a' : 'round.webm', { type }))
      send(body)
    }
    recorderRef.current = recorder
    recorder.start(1000)
    setSeconds(0)
    setPhase('recording')
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }

  function sendTyped() {
    if (typed.trim().length < 12) { setError('Type a bit more than that, hole by hole.'); return }
    const body = new FormData()
    body.set('transcript', typed.trim())
    send(body)
  }

  const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onBack} className="flex items-center justify-center rounded-lg" style={{ color: '#9A9DB0', minHeight: '44px', minWidth: '44px' }}>
          ← Back
        </button>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Step 2 of 3</p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>{setup.courseName}</p>
        </div>
        <div style={{ minWidth: '44px' }} />
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Talk through your round</h1>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
        Describe each hole out loud. We fill in the shots, then you check every hole before anything is saved.
      </p>

      {/* How to get the best result */}
      <div className="rounded-2xl mb-5" style={card}>
        <button
          type="button"
          onClick={() => setShowGuide(g => !g)}
          className="w-full flex items-center justify-between px-4 text-left"
          style={{ minHeight: '52px' }}
          aria-expanded={showGuide}
        >
          <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>How to get the best result</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>{showGuide ? 'Hide' : 'Show'}</span>
        </button>
        {showGuide && (
          <div className="px-4 pb-4">
            <ol className="space-y-3">
              {TIPS.map((tip, i) => (
                <li key={tip.title} className="flex gap-3">
                  <span className="shrink-0 flex items-center justify-center rounded-full text-xs font-bold" style={{ width: 22, height: 22, backgroundColor: '#CC222220', color: '#CC2222', fontFamily: 'var(--font-dm-mono)' }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{tip.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>{tip.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#22263A', borderLeft: '3px solid #CC2222' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#CC2222' }}>A full hole sounds like this</p>
              <p className="text-sm" style={{ color: '#F0F0F0', lineHeight: 1.6 }}>
                &ldquo;Hole 1, par 4, 380 yards. Driver into the right rough, 160 left. Hit it just short on the fringe, 12 yards. Chipped to 4 feet and holed the putt.&rdquo;
              </p>
            </div>
            <p className="text-xs mt-3" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
              Nothing is guessed. If you forget a yardage, just carry on. It leaves a gap that you fill in when you check the hole.
            </p>
          </div>
        )}
      </div>

      {/* What we have so far */}
      {draft && (
        <div className="rounded-2xl p-4 mb-5" style={card}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>
            {heardCount} of {setup.holes} holes heard
          </p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
            {draft.inputMode === 'full' ? 'Shot detail found, so this will be a Full tracking round with Strokes Gained.' : 'Scores only, so this will be a Quick round.'}
            {needsWork > 0 ? ` ${needsWork} hole${needsWork === 1 ? ' needs' : 's need'} something adding (amber).` : ''}
          </p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}>
            {draft.status.map((s, i) => {
              const c = STATUS_STYLE[s]
              return (
                <div key={i} className="flex items-center justify-center rounded-lg text-xs font-medium" style={{ height: 34, backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text, fontFamily: 'var(--font-dm-mono)' }}>
                  {i + 1}
                </div>
              )
            })}
          </div>
          {transcripts.length > 0 && (
            <>
              <button type="button" onClick={() => setShowTranscript(t => !t)} className="text-xs underline mt-3" style={{ color: '#9A9DB0', minHeight: '44px' }}>
                {showTranscript ? 'Hide what we heard' : 'Show what we heard'}
              </button>
              {showTranscript && (
                <p className="text-xs" style={{ color: '#9A9DB0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{transcripts.join('\n\n')}</p>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444440' }} role="alert">
          <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {/* Record */}
      {phase === 'processing' ? (
        <div className="rounded-2xl p-5 mb-4" style={card} aria-live="polite">
          <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Listening back to your round…</p>
          <div className="space-y-2 animate-pulse">
            <div className="h-3 rounded" style={{ backgroundColor: '#22263A', width: '90%' }} />
            <div className="h-3 rounded" style={{ backgroundColor: '#22263A', width: '70%' }} />
            <div className="h-3 rounded" style={{ backgroundColor: '#22263A', width: '80%' }} />
          </div>
          <p className="text-xs mt-3" style={{ color: '#9A9DB0' }}>This usually takes under a minute. Keep this screen open.</p>
        </div>
      ) : phase === 'recording' ? (
        <button
          type="button"
          onClick={stopRecording}
          className="w-full rounded-2xl font-semibold text-base mb-4 flex items-center justify-center gap-3"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '72px' }}
        >
          <span className="animate-pulse rounded-full" style={{ width: 12, height: 12, backgroundColor: '#F0F0F0' }} />
          <span>Recording <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{clock(seconds)}</span>. Tap to finish</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="w-full rounded-2xl font-semibold text-base mb-4"
          style={draft
            ? { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '56px' }
            : { backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '72px' }}
        >
          {draft ? 'Record more holes' : 'Start recording'}
        </button>
      )}

      {draft && phase === 'idle' && (
        <button
          type="button"
          onClick={() => onDone(draft)}
          className="w-full py-4 rounded-xl font-semibold text-base mb-4"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
        >
          Check each hole →
        </button>
      )}

      {/* Typed fallback */}
      {phase === 'idle' && (
        typing ? (
          <div>
            <label htmlFor="voice-typed" className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Type your round, hole by hole</label>
            <textarea
              id="voice-typed"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl text-base outline-none"
              style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0' }}
              placeholder="Hole 1, par 4, 380 yards. Driver into the fairway, 150 left…"
            />
            <button type="button" onClick={sendTyped} className="w-full py-3 rounded-xl font-semibold text-sm mt-2" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '48px' }}>
              Fill in from this
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setTyping(true)} className="w-full text-sm underline" style={{ color: '#9A9DB0', minHeight: '44px' }}>
            Rather type it? Tap here
          </button>
        )
      )}
    </div>
  )
}
