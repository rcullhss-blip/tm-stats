import { NextResponse } from 'next/server'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { parseResults, ResultsParseError, type ResultSource } from '@/lib/results-parse'
import { matchRoster } from '@/lib/results-import'
import { aiAllowed, aiLimitResponse } from '@/lib/ai-guard'

export const maxDuration = 300

// Vercel caps a request body at about 4.5 MB
const MAX_BYTES = 4 * 1024 * 1024

// Coach uploads a tournament result (PDF, photo or pasted text). It is read
// into hole-by-hole scores and matched to the squad. Nothing is created here:
// the coach checks it on the next screen first.
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return NextResponse.json({ error: 'Only the coach can upload results' }, { status: 403 })
  // Reading a result costs money, so it is for approved coach accounts only.
  const { data: me } = await team.service.from('users').select('subscription_status').eq('id', userId).single()
  if (me?.subscription_status !== 'team') return NextResponse.json({ error: 'Result uploads open once your coach account is approved' }, { status: 403 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Reading results is not set up on this server' }, { status: 503 })
  if (!(await aiAllowed(userId, 'results'))) return aiLimitResponse()

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Send a file or paste the result' }, { status: 400 }) }

  let source: ResultSource | null = null
  const file = form.get('file')
  const text = form.get('text')
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'That file is over 4 MB. Upload one round at a time, or paste the scores as text.' }, { status: 413 })
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
    if (type === 'application/pdf') source = { kind: 'pdf', base64 }
    else if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') source = { kind: 'image', base64, mediaType: type }
    else return NextResponse.json({ error: 'Upload a PDF, or a JPG or PNG photo of the result' }, { status: 400 })
  } else if (typeof text === 'string' && text.trim().length >= 40) {
    source = { kind: 'text', text: text.slice(0, 120000) }
  }
  if (!source) return NextResponse.json({ error: 'Choose a file, or paste the result (it looks too short to be one)' }, { status: 400 })

  const { data: members } = await team.service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const ids: string[] = (members ?? []).map((m: { user_id: string }) => m.user_id)
  const { data: users } = ids.length > 0 ? await team.service.from('users').select('id, name, email').in('id', ids) : { data: [] }
  const roster: { id: string; name: string }[] = (users ?? []).map((u: { id: string; name: string | null; email: string }) => ({ id: u.id, name: u.name ?? u.email.split('@')[0] }))
  if (roster.length === 0) return NextResponse.json({ error: 'Add players to your team first, so the result can be matched to them' }, { status: 400 })

  try {
    const parsed = await parseResults(source)
    const matches = matchRoster(parsed.players.map(p => p.name), roster)
    return NextResponse.json({ ok: true, parsed, matches, roster })
  } catch (e) {
    if (e instanceof ResultsParseError) return NextResponse.json({ error: e.message }, { status: 422 })
    return NextResponse.json({ error: 'The file could not be read just now. Try again in a minute.' }, { status: 502 })
  }
}
