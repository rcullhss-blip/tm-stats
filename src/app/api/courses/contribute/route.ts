import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  courseNameKey, teeKey, teeLabel, mergeHoleValues, sameHoleValues,
  validPar, yardsFromShots, mergePars, MAX_HOLES, type HoleValues,
} from '@/lib/course-library'

// Adds a just-saved round's course card (par and tee yardage per hole) to the
// shared course library. Called by the app, fire and forget, after a round is
// saved. Reads the round back from the database (never trusts the phone's
// numbers), only for the signed-in golfer's own round. The library never
// records who contributed.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { roundId?: unknown; tee?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  const roundId = typeof body.roundId === 'string' ? body.roundId : ''
  const teeRaw = typeof body.tee === 'string' ? body.tee.slice(0, 40) : ''
  if (!roundId) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any

  const { data: round } = await sb
    .from('rounds')
    .select('id, course_name, holes')
    .eq('id', roundId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const name = String(round.course_name ?? '').trim().slice(0, 120)
  const key = courseNameKey(name)
  if (!key) return NextResponse.json({ ok: true, skipped: 'no course name' })

  const { data: holeRows } = await sb
    .from('holes')
    .select('hole_number, par, shots')
    .eq('round_id', roundId)
  const pars: HoleValues = Array(MAX_HOLES).fill(null)
  const yards: HoleValues = Array(MAX_HOLES).fill(null)
  for (const h of holeRows ?? []) {
    const i = Number(h.hole_number) - 1
    if (!Number.isInteger(i) || i < 0 || i >= MAX_HOLES) continue
    pars[i] = validPar(h.par)
    yards[i] = yardsFromShots(h.shots)
  }
  if (!pars.some(p => p !== null)) return NextResponse.json({ ok: true, skipped: 'no holes' })

  // The course: add it the first time anyone plays it
  const holesPlayed = round.holes === 9 ? 9 : 18
  let { data: course } = await sb.from('courses').select('id, holes').eq('name_key', key).maybeSingle()
  if (!course) {
    const { data: inserted, error } = await sb
      .from('courses')
      .insert({ name, name_key: key, holes: holesPlayed })
      .select('id, holes')
      .single()
    if (error) {
      // Someone else added it a moment ago (unique name_key), or the tables are not set up yet
      const { data: again } = await sb.from('courses').select('id, holes').eq('name_key', key).maybeSingle()
      if (!again) return NextResponse.json({ ok: false, skipped: 'library unavailable' })
      course = again
    } else {
      course = inserted
    }
  } else if (holesPlayed > (course.holes ?? 0)) {
    await sb.from('courses').update({ holes: holesPlayed, updated_at: new Date().toISOString() }).eq('id', course.id)
  }

  // The tee card: fill gaps, newest value wins, blanks never wipe anything out
  const tKey = teeKey(teeRaw)
  const { data: existing } = await sb
    .from('course_tees')
    .select('id, pars, par_votes, yards, rounds_seen')
    .eq('course_id', course.id)
    .eq('tee_key', tKey)
    .maybeSingle()

  // Pars change only when three rounds agree; yardages fill gaps and the newest wins
  const { pars: mergedPars, votes: parVotes } = mergePars(existing?.pars, existing?.par_votes, pars)
  const mergedYards = mergeHoleValues(existing?.yards, yards)
  const now = new Date().toISOString()

  if (existing) {
    const changed = !sameHoleValues(existing.pars, mergedPars) || !sameHoleValues(existing.yards, mergedYards)
    await sb.from('course_tees').update({
      ...(changed ? { pars: mergedPars, yards: mergedYards } : {}),
      par_votes: parVotes,
      rounds_seen: (existing.rounds_seen ?? 0) + 1,
      updated_at: now,
    }).eq('id', existing.id)
  } else {
    await sb.from('course_tees').insert({
      course_id: course.id,
      tee: teeLabel(teeRaw),
      tee_key: tKey,
      pars: mergedPars,
      par_votes: parVotes,
      yards: mergedYards,
      rounds_seen: 1,
      updated_at: now,
    })
  }

  return NextResponse.json({ ok: true })
}
