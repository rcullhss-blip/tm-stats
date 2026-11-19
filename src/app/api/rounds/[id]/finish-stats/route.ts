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
  const { data: round } = await service.from('rounds').select('id, user_id, holes, stats_pending').eq('id', id).maybeSingle()
  if (!round || round.user_id !== user.id) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (!round.stats_pending) return NextResponse.json({ error: 'This round already has its stats' }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const inputMode = body.inputMode === 'full' ? 'full' : 'quick'
  const incoming: HoleData[] = Array.isArray(body.holes) ? body.holes : []

  const { data: holes } = await service.from('holes').select('id, hole_number, par, score').eq('round_id', id)
  const cardHoles: { id: string; hole_number: number; par: number; score: number }[] = holes ?? []
  if (incoming.length !== cardHoles.length) return NextResponse.json({ error: 'Every hole needs its stats before saving' }, { status: 400 })

  const bool = (v: unknown): boolean | null => (v === true ? true : v === false ? false : null)

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

    const { error } = await service.from('holes').update({
      fir: card.par === 3 ? null : bool(h.fir),
      gir: bool(h.gir),
      putts,
      up_and_down: bool(h.upAndDown),
      sand_save: bool(h.sandSave),
      shots: shots ? JSON.parse(JSON.stringify(shots)) : null,
    }).eq('id', card.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
