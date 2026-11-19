import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readScorecard, ScorecardReadError } from '@/lib/scorecard-read'

export const maxDuration = 60
const MAX_BYTES = 4 * 1024 * 1024

// A golfer sends a photo of their scorecard; their hole scores come back for
// them to check. Nothing is saved here.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Reading scorecards is not set up on this server' }, { status: 503 })

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Send a photo' }, { status: 400 }) }
  const file = form.get('photo')
  const holes = Number(form.get('holes')) === 9 ? 9 : 18
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Take or choose a photo of your scorecard' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'That photo is too big. Try again, it is usually fine from the camera.' }, { status: 413 })
  const type = file.type
  if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') return NextResponse.json({ error: 'Use a JPG or PNG photo' }, { status: 400 })

  const { data: me } = await supabase.from('users').select('name').eq('id', user.id).single()
  try {
    const result = await readScorecard({ base64: Buffer.from(await file.arrayBuffer()).toString('base64'), mediaType: type, holes, playerName: me?.name ?? null })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    if (e instanceof ScorecardReadError) return NextResponse.json({ error: e.message }, { status: 422 })
    return NextResponse.json({ error: 'The photo could not be read just now. Type the scores in instead, or try again in a minute.' }, { status: 502 })
  }
}
