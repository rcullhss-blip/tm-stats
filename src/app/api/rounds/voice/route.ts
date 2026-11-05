import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeRoundAudio } from '@/lib/voice-transcribe'
import { parseRoundTranscript, VoiceParseError } from '@/lib/voice-parse'

export const maxDuration = 120

const MAX_AUDIO_BYTES = 4 * 1024 * 1024 // stays under the platform's upload limit
const MAX_TRANSCRIPT_CHARS = 12000

function numberList(raw: FormDataEntryValue | null, max: number): (number | null)[] {
  try {
    const parsed = JSON.parse(String(raw ?? '[]'))
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 18).map(v => (typeof v === 'number' && v > 0 && v <= max ? v : null))
  } catch {
    return []
  }
}

// Voice round entry: takes a recording (or typed text) of a golfer talking
// through their round and returns the holes it could make out. Nothing is
// saved here; the app loads the result into the normal entry screens for the
// golfer to check and approve.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'That recording was too large to send. Try nine holes at a time.' }, { status: 413 })
  }

  const holeCount = Number(form.get('holes')) === 9 ? 9 : 18
  const knownPars = numberList(form.get('pars'), 5)
  const knownYardages = numberList(form.get('yardages'), 700)

  let transcript = String(form.get('transcript') ?? '').trim()
  const audio = form.get('audio')

  if (!transcript) {
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: 'No recording received.' }, { status: 400 })
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'That recording is too long to send in one go. Record nine holes at a time.' }, { status: 413 })
    }
    try {
      transcript = await transcribeRoundAudio(audio)
    } catch {
      return NextResponse.json({ error: 'We could not hear that recording. Try again somewhere quieter.' }, { status: 502 })
    }
  }

  if (transcript.length < 12) {
    return NextResponse.json({ error: 'We could not make out any golf in that. Try again, a bit closer to the phone.' }, { status: 422 })
  }
  transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS)

  try {
    const result = await parseRoundTranscript({ transcript, holeCount, knownPars, knownYardages })
    return NextResponse.json({ transcript, holes: result.holes })
  } catch (error) {
    const message = error instanceof VoiceParseError ? error.message : 'Something went wrong reading that back. Try again.'
    return NextResponse.json({ error: message, transcript }, { status: 502 })
  }
}
