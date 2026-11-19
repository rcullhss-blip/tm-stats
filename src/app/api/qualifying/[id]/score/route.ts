import { NextResponse } from 'next/server'
import { currentUserId, qualifierFor } from '@/lib/qualifying-server'
import { cleanCard } from '@/lib/qualifying'

// Enter or change one hole for one player. Anyone on the team can mark a card,
// the same as a playing partner would on paper.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { qualifier, service, role } = access

  const body = await request.json().catch(() => ({}))
  const roundNo = Number(body.roundNo)
  const hole = Number(body.hole)
  const score = body.score === null ? null : Number(body.score)
  const playerId = String(body.userId ?? '')

  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > qualifier.round_count) return NextResponse.json({ error: 'Unknown round' }, { status: 400 })
  if (!Number.isInteger(hole) || hole < 1 || hole > qualifier.holes) return NextResponse.json({ error: 'Unknown hole' }, { status: 400 })
  if (score !== null && (!Number.isInteger(score) || score < 1 || score > 15)) return NextResponse.json({ error: 'Score must be between 1 and 15' }, { status: 400 })

  const { data: card } = await service.from('qualifier_scores')
    .select('id, scores, round_id, submitted_at')
    .eq('qualifier_id', qualifier.id).eq('round_no', roundNo).eq('user_id', playerId)
    .maybeSingle()
  if (!card) return NextResponse.json({ error: 'That player is not in this qualifier' }, { status: 400 })

  // Once a round has been finished the card is the player's own round. Only the
  // coach can still correct it, and only until the player has it in their account.
  if (card.round_id) return NextResponse.json({ error: 'This round is finished. Scores are now on the player\'s own round.' }, { status: 409 })
  // A submitted card is handed in: only the coach can change it now
  if (card.submitted_at && role !== 'coach') {
    return NextResponse.json({ error: 'This card has been submitted. Ask your coach to change a score.' }, { status: 409 })
  }
  if (roundNo <= qualifier.rounds_finished && role !== 'coach') {
    return NextResponse.json({ error: 'This round is finished. Ask your coach to change a score.' }, { status: 409 })
  }

  // Change just this hole, in one step in the database. Several groups enter
  // scores from different phones at the same time, and writing the whole card
  // back could wipe out a hole another phone saved a moment earlier.
  const { error: rpcError } = await service.rpc('set_qualifier_score', { p_card: card.id, p_hole: hole, p_score: score })
  if (!rpcError) return NextResponse.json({ ok: true })

  // Fallback if the database function is missing: write the card back, but only
  // if nobody else has changed it since we read it; otherwise read and try again.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: fresh } = await service.from('qualifier_scores').select('scores, updated_at, round_id').eq('id', card.id).maybeSingle()
    if (!fresh || fresh.round_id) return NextResponse.json({ error: 'This round is finished.' }, { status: 409 })
    const scores = cleanCard(fresh.scores, qualifier.holes)
    scores[hole - 1] = score
    const { data: written, error } = await service.from('qualifier_scores')
      .update({ scores, updated_at: new Date().toISOString() })
      .eq('id', card.id).eq('updated_at', fresh.updated_at)
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (written && written.length > 0) return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Busy, try that score again' }, { status: 409 })
}
