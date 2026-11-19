import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { HoleData, ShotEntry } from '@/lib/types'

// A golfer adds their stats to a round whose pars and scores came from
// qualifying or an uploaded result. Par and score on every hole stay exactly
// as they are on the card: only the stats are written.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: round } = await service.from('rounds').select('id, user_id, holes, stats_pending, score_total, qualifier_id').eq('id', id).maybeSingle()
  if (!round || round.user_id !== user.id) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (!round.stats_pending) return NextResponse.json({ error: 'This round already has its stats' }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const inputMode = body.inputMode === 'full' ? 'full' : 'quick'
  const incoming: HoleData[] = Array.isArray(body.holes) ? body.holes : []

  const { data: holes } = await service.from('holes').select('id, hole_number, par, score').eq('round_id', id)
  let cardHoles: { id: string; hole_number: number; par: number; score: number }[] = holes ?? []

  // Only the total came in: the golfer's hole scores are checked against it and
  // the holes are created here, with the event's pars.
  const creating = cardHoles.length === 0
  if (creating) {
    if (!round.qualifier_id || !round.score_total) return NextResponse.json({ error: 'This round has no scores to add stats to' }, { status: 400 })
    const { data: q } = await service.from('qualifiers').select('pars').eq('id', round.qualifier_id).maybeSingle()
    const count = round.holes === 9 ? 9 : 18
    const scores: unknown[] = Array.isArray(body.cardScores) ? body.cardScores : []
    if (scores.length !== count || scores.some(v => typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 15)) {
      return NextResponse.json({ error: 'Every hole needs a score between 1 and 15' }, { status: 400 })
    }
    const sum = (scores as number[]).reduce((a, b) => a + b, 0)
    if (sum !== round.score_total) return NextResponse.json({ error: `Your hole scores add up to ${sum}, but the result says ${round.score_total}. Check each hole against your card.` }, { status: 400 })
    cardHoles = (scores as number[]).map((score, i) => {
      const p = Array.isArray(q?.pars) ? q.pars[i] : 4
      return { id: '', hole_number: i + 1, par: p === 3 || p === 5 ? p : 4, score }
    })
  }
  if (incoming.length !== cardHoles.length) return NextResponse.json({ error: 'Every hole needs its stats before saving' }, { status: 400 })

  const bool = (v: unknown): boolean | null => (v === true ? true : v === false ? false : null)

  const writes: { card: typeof cardHoles[number]; stats: Record<string, unknown> }[] = []
  for (const card of cardHoles) {
    const h = incoming.find(x => x.holeNumber === card.hole_number)
    if (!h) return NextResponse.json({ error: `Hole ${card.hole_number} is missing` }, { status: 400 })

    const shots: ShotEntry[] | null = inputMode === 'full' && Array.isArray(h.shots) ? h.shots : null
    if (inputMode === 'full') {
      if (!shots || shots.length === 0) return NextResponse.json({ error: `Hole ${card.hole_number} has no shots` }, { status: 400 })
      if (shots.some(s => s.needsDistance)) return NextResponse.json({ error: `Hole ${card.hole_number} has a shot with no distance` }, { status: 400 })
      // The shots must add up to the score on the card
      if (shots.length !== card.score) {
        return NextResponse.json({ error: `Hole ${card.hole_number}: your card says ${card.score} but ${shots.length} shots were entered` }, { status: 400 })
      }
    }
    if (inputMode === 'quick' && (bool(h.gir) === null || (card.par !== 3 && bool(h.fir) === null))) {
      return NextResponse.json({ error: `Hole ${card.hole_number} needs a Yes or No for fairway and green` }, { status: 400 })
    }
    const putts = typeof h.putts === 'number' && h.putts >= 0 && h.putts <= card.score ? h.putts : null

    const stats = {
      fir: card.par === 3 ? null : bool(h.fir),
      gir: bool(h.gir),
      putts,
      up_and_down: bool(h.upAndDown),
      sand_save: bool(h.sandSave),
      shots: shots ? JSON.parse(JSON.stringify(shots)) : null,
    }
    writes.push({ card, stats })
  }

  // Every hole has been checked: only now is anything saved, so a rejected
  // hole never leaves a round half written.
  if (creating) {
    const { error } = await service.from('holes').insert(writes.map(w => ({ round_id: id, hole_number: w.card.hole_number, par: w.card.par, score: w.card.score, ...w.stats })))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    for (const w of writes) {
      const { error } = await service.from('holes').update(w.stats).eq('id', w.card.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const update: Record<string, unknown> = { input_mode: inputMode, stats_pending: false }
  if (typeof body.mood === 'string' && ['tough', 'average', 'good', 'great'].includes(body.mood)) update.mood = body.mood
  if (typeof body.energy === 'string' && ['fresh', 'normal', 'tired', 'niggly'].includes(body.energy)) update.energy_level = body.energy
  if (typeof body.conditions === 'string' && body.conditions) update.conditions = body.conditions.slice(0, 50)
  if (typeof body.notes === 'string' && body.notes.trim()) update.notes = body.notes.trim().slice(0, 2000)
  const { error: roundError } = await service.from('rounds').update(update).eq('id', id)
  if (roundError) return NextResponse.json({ error: roundError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
